import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard, SHIELD_FACE_ID } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";
import type { GameError } from "../model/errors.js";
import { NATURAL_CONVERT_SYMBOLS } from "../model/effects.js";
import {
  asSymbolInstanceId,
  type AttackId,
  type CardInstanceId,
  type CreatureId,
  type DieId,
  type FaceCardId,
  type PlayerId,
  type SymbolInstanceId,
} from "../model/ids.js";
import { fail, ok, type ReduceResult } from "../model/result.js";
import {
  TURN_PHASE_ORDER,
  type ChainLink,
  type EnergyTrack,
  type GameState,
  type TurnPhase,
} from "../model/state.js";
import { isAttributeSymbol, requirementEntries, type AttributeTokens } from "../model/symbols.js";
import type { Attribute, DualKindAttribute } from "../model/attributes.js";
import type { SymbolType } from "../model/symbols.js";
import { createRng, type RNG } from "../rng/rng.js";
import {
  attackDamageBonus,
  forgeExceedsAttributeLimit,
  isReactionCard,
  resolveEnergyPayment,
  ritualDurationOf,
} from "../rules/cards.js";
import {
  discountedPlayCost,
  attackIgnoreShieldAmount,
  type DiscountMatch,
} from "../rules/discounts.js";
import { livingCreaturesOf, opponentOf } from "../rules/creatures.js";
import { diceOf, isDieStunned, keepsPreviousResult } from "../rules/dice.js";
import {
  energyAfterOvershootPass,
  passEnergy,
  spendEnergy,
  type EnergySpendOutcome,
} from "../rules/energy.js";
import {
  countInstalledCopies,
  eligibleFacesForForge,
  eligiblePoolFacesForReplace,
  isLegalForgeKindForAttribute,
  returnFaceToPoolIfOrphaned,
  takeFaceFromPool,
} from "../rules/faces.js";
import { planConsumption, requirementShortfall } from "../rules/symbols.js";
import { targetingError } from "../rules/targeting.js";
import { creatureMatchesFilter, legalDiceForFilter, legalDieSlotsForFilter } from "../rules/targets.js";
import { addToken, holdsTokens, removeTokens } from "../rules/tokens.js";
import type { GameAction } from "./actions.js";
import {
  buildAttackLink,
  buildEffectLink,
  buildEquipLink,
  buildOverloadLink,
  buildRitualPlaceLink,
  cardCommittedToChain,
  linkMatchesNegateCard,
  isRitualNegatableLinkKind,
  noteDeferredTurnEnd,
  openReactionWindow,
  pushChainLink,
  topChainLink,
} from "./chain.js";
import { createDraft, emit, nextInstanceId, patchCreature, patchDie, patchPlayer, type Draft } from "./draft.js";
import {
  applyDeferredEffect,
  applyDieSlotChoice,
  applyOptionalOverchargeAccept,
  applyPoolSymbolWildcard,
  applyRemoveToxinForDamage,
  checkVictory,
  clearResourceLocks,
  clearToxinReceiveCapsForOwner,
  createSymbol,
  dealDamage,
  drainResolution,
  grantShield,
  pushEffect,
  replayableGraveyardTactics,
  tickToxins,
} from "./resolution.js";
import {
  clearTurnTriggerState,
  fireEquipmentOnRollSymbol,
  fireOnAttack,
  queueAbsorbTriggers,
} from "./triggers.js";
import {
  attachEquipment,
  attachOverload,
  clearOverloadsOnFace,
  destroyOverload,
  discardSpecificCards,
  drawCards,
  moveCard,
  overloadFitsFace,
  placeRitual,
  searchableDeckCards,
  setRitualOrientation,
  shuffleDeck,
} from "./zones.js";

/**
 * The single place a game can advance (SPDD §54).
 *
 * Pure: no clock, no randomness beyond the injected RNG, no I/O, no framework.
 * An illegal action returns the *original* state object untouched, so callers
 * can rely on reference identity to detect that nothing happened.
 */
export function reduce(state: GameState, action: GameAction, rng: RNG): ReduceResult {
  if (state.status === "finished") return fail(state, "GAME_FINISHED");

  const reactionWindow =
    state.pendingDecision?.type === "reaction-priority" ? state.pendingDecision : null;

  // During a reaction window the priority seat may act even if they are not the
  // turn player. Outside a window, only the active player may act.
  if (reactionWindow !== null) {
    if (action.playerId !== reactionWindow.priorityPlayerId) {
      return fail(state, "NOT_PRIORITY_PLAYER");
    }
  } else if (state.activePlayerId !== action.playerId) {
    return fail(state, "NOT_ACTIVE_PLAYER");
  }

  // A pending choice blocks every action except completing that choice.
  if (state.pendingDecision !== null) {
    const pending = state.pendingDecision;
    let allowed = false;
    if (pending.type === "reaction-priority") {
      allowed =
        action.type === "PASS_PRIORITY" ||
        action.type === "PLAY_CARD" ||
        action.type === "ACTIVATE_RITUAL";
    } else if (
      (pending.type === "search-deck" || pending.type === "search-graveyard") &&
      action.type === "RESOLVE_SEARCH"
    ) {
      allowed = true;
    } else if (pending.type === "discard-cards" && action.type === "RESOLVE_DISCARD") {
      allowed = true;
    } else if (
      pending.type === "choose-creature" &&
      action.type === "RESOLVE_CHOOSE_CREATURE"
    ) {
      allowed = true;
    } else if (
      pending.type === "choose-ritual" &&
      action.type === "RESOLVE_CHOOSE_RITUAL"
    ) {
      allowed = true;
    } else if (pending.type === "forge-faces" && action.type === "RESOLVE_FORGE_FACES") {
      allowed = true;
    } else if (
      pending.type === "replace-synthetic-face" &&
      action.type === "RESOLVE_REPLACE_SYNTHETIC_FACE"
    ) {
      allowed = true;
    } else if (pending.type === "choose-die" && action.type === "RESOLVE_CHOOSE_DIE") {
      allowed = true;
    } else if (pending.type === "convert-symbols" && action.type === "RESOLVE_CONVERT_SYMBOLS") {
      allowed = true;
    } else if (pending.type === "copy-pool-symbol" && action.type === "RESOLVE_COPY_POOL_SYMBOL") {
      allowed = true;
    } else if (
      pending.type === "replay-graveyard-tactic" &&
      action.type === "RESOLVE_REPLAY_GRAVEYARD"
    ) {
      allowed = true;
    } else if (pending.type === "look-top-deck" && action.type === "RESOLVE_LOOK_TOP_DECK") {
      allowed = true;
    } else if (pending.type === "peek-deck" && action.type === "RESOLVE_PEEK_DECK") {
      allowed = true;
    } else if (pending.type === "dark-pact" && action.type === "RESOLVE_DARK_PACT") {
      allowed = true;
    } else if (pending.type === "mind-control" && action.type === "RESOLVE_MIND_CONTROL") {
      allowed = true;
    } else if (pending.type === "split-damage" && action.type === "RESOLVE_SPLIT_DAMAGE") {
      allowed = true;
    } else if (pending.type === "optional-reroll" && action.type === "RESOLVE_OPTIONAL_REROLL") {
      allowed = true;
    } else if (pending.type === "choose-die-slot" && action.type === "RESOLVE_CHOOSE_DIE_SLOT") {
      allowed = true;
    } else if (
      pending.type === "choose-pool-symbol" &&
      action.type === "RESOLVE_CHOOSE_POOL_SYMBOL"
    ) {
      allowed = true;
    } else if (
      pending.type === "remove-toxin-amount" &&
      action.type === "RESOLVE_REMOVE_TOXIN_AMOUNT"
    ) {
      allowed = true;
    } else if (
      pending.type === "optional-overcharge" &&
      action.type === "RESOLVE_OPTIONAL_OVERCHARGE"
    ) {
      allowed = true;
    } else if (
      pending.type === "optional-bonus-attack" &&
      action.type === "RESOLVE_OPTIONAL_BONUS_ATTACK"
    ) {
      allowed = true;
    }
    if (!allowed) return fail(state, "PENDING_DECISION");
  }

  const draft = createDraft(state);
  const error = applyAction(draft, action, rng);
  if (error !== null) return fail(state, error);

  draft.rng = rng.snapshot();
  return ok(draft);
}

/**
 * Convenience wrapper that derives the RNG from the state it is advancing.
 * This is what the store and the host use; keeping the seeded cursor inside
 * GameState is what makes a match replayable from its action log alone.
 */
export const advance = (state: GameState, action: GameAction): ReduceResult =>
  reduce(state, action, createRng(state.rng));

function applyAction(draft: Draft, action: GameAction, rng: RNG): GameError | null {
  switch (action.type) {
    case "ROLL_DICE":
      return rollDice(draft, action.playerId, rng);
    case "ABSORB_SYMBOL":
      return absorbSymbol(draft, action.playerId, action.creatureId, action.symbolId);
    case "ABSORB_SYMBOL_TO_RITUAL":
      return absorbSymbolToRitual(draft, action.playerId, action.cardInstanceId, action.symbolId);
    case "ATTACK":
      return attack(draft, action.playerId, action.attackerId, action.attackId, action.targetId);
    case "FORGE_CARD":
      return forgeCard(
        draft,
        action.playerId,
        action.cardInstanceId,
        action.dieId,
        action.slotIndexes,
        action.faceCardId,
        action.energyPaid,
      );
    case "PLAY_CARD":
      return playCard(
        draft,
        action.playerId,
        action.cardInstanceId,
        action.declaredTargetCreatureId ?? null,
        action.declaredFaceCardId ?? null,
        action.energyPaid,
      );
    case "ACTIVATE_RITUAL":
      return activateRitual(
        draft,
        action.playerId,
        action.cardInstanceId,
        action.declaredTargetCreatureId ?? null,
      );
    case "RETAIN_DIE":
      return retainDie(draft, action.playerId, action.dieId, action.retain);
    case "RESOLVE_SEARCH":
      return resolveSearch(draft, action.playerId, action.cardInstanceIds, rng);
    case "RESOLVE_DISCARD":
      return resolveDiscard(draft, action.playerId, action.cardInstanceIds);
    case "RESOLVE_CHOOSE_CREATURE":
      return resolveChooseCreature(draft, action.playerId, action.creatureId);
    case "RESOLVE_CHOOSE_RITUAL":
      return resolveChooseRitual(draft, action.playerId, action.cardInstanceId);
    case "RESOLVE_FORGE_FACES":
      return resolveForgeFaces(
        draft,
        action.playerId,
        action.dieId,
        action.slotIndexes,
        action.faceCardId,
      );
    case "RESOLVE_REPLACE_SYNTHETIC_FACE":
      return resolveReplaceSyntheticFace(
        draft,
        action.playerId,
        action.dieId,
        action.slotIndex,
        action.faceCardId,
      );
    case "RESOLVE_CHOOSE_DIE":
      return resolveChooseDie(draft, action.playerId, action.dieId);
    case "RESOLVE_CONVERT_SYMBOLS":
      return resolveConvertSymbols(draft, action.playerId, action.replacements);
    case "RESOLVE_COPY_POOL_SYMBOL":
      return resolveCopyPoolSymbol(draft, action.playerId, action.symbol);
    case "RESOLVE_REPLAY_GRAVEYARD":
      return resolveReplayGraveyard(draft, action.playerId, action.cardInstanceId);
    case "RESOLVE_LOOK_TOP_DECK":
      return resolveLookTopDeck(draft, action.playerId, action.keepId);
    case "RESOLVE_PEEK_DECK":
      return resolvePeekDeck(draft, action.playerId, action.putOnBottom);
    case "RESOLVE_DARK_PACT":
      return resolveDarkPact(draft, action.playerId, action.cardInstanceIds, rng);
    case "RESOLVE_MIND_CONTROL":
      return resolveMindControl(draft, action.playerId, action.mode, action.faceCardIds);
    case "RESOLVE_SPLIT_DAMAGE":
      return resolveSplitDamage(draft, action.playerId, action.assignments);
    case "RESOLVE_OPTIONAL_REROLL":
      return resolveOptionalReroll(draft, action.playerId, action.accept, rng);
    case "RESOLVE_CHOOSE_DIE_SLOT":
      return resolveChooseDieSlot(draft, action.playerId, action.dieId, action.slotIndex);
    case "RESOLVE_CHOOSE_POOL_SYMBOL":
      return resolveChoosePoolSymbol(draft, action.playerId, action.symbolId);
    case "RESOLVE_REMOVE_TOXIN_AMOUNT":
      return resolveRemoveToxinAmount(draft, action.playerId, action.amount);
    case "RESOLVE_OPTIONAL_OVERCHARGE":
      return resolveOptionalOvercharge(draft, action.playerId, action.accept);
    case "RESOLVE_OPTIONAL_BONUS_ATTACK":
      return resolveOptionalBonusAttack(
        draft,
        action.playerId,
        action.accept,
        action.attackId,
        action.targetId,
      );
    case "ACTIVATE_FACE":
      return activateFace(draft, action.playerId, action.dieId, action.slotIndex);
    case "PASS_PRIORITY":
      return passPriority(draft, action.playerId);
    case "ADVANCE_PHASE":
      return advancePhase(draft);
    case "END_TURN":
      return endTurn(draft, action.playerId);
  }
}

/* ---------------------------------------------------------------- roll --- */

/**
 * Bible §16 rolls the dice and generates symbols as consecutive steps. Symbol
 * generation carries no decision, so it happens here and shows up as its own
 * events rather than as a phase the player has to click through.
 */
function rollDice(draft: Draft, playerId: PlayerId, rng: RNG): GameError | null {
  if (draft.phase !== "roll") return "INVALID_PHASE";

  const rolled: Array<{
    readonly dieId: DieId;
    readonly slotIndex: number;
    readonly faceCardId: FaceCardId;
    readonly symbol: SymbolType;
    readonly suppressInherent: boolean;
  }> = [];

  draft.facesAppearedThisRoll = [];

  for (const die of diceOf(draft, playerId)) {
    if (isDieStunned(die)) {
      emit(draft, { type: "die-skipped", dieId: die.id, reason: "stunned" });
      continue;
    }

    let slotIndex: number;
    let keptByRetain = false;
    if (keepsPreviousResult(die) && die.rolledSlotIndex !== null) {
      slotIndex = die.rolledSlotIndex;
      keptByRetain = true;
      emit(draft, { type: "die-skipped", dieId: die.id, reason: "retained" });
      // Single-turn retain: the keep is spent by this roll.
      patchDie(draft, die.id, { retained: false });
      emit(draft, { type: "die-released", dieId: die.id, playerId });
    } else {
      slotIndex = rng.integer(0, FACE_SLOTS_PER_DIE - 1);
      patchDie(draft, die.id, { rolledSlotIndex: slotIndex });
    }

    const liveDie = draft.dice[die.id] ?? die;
    const slot = liveDie.slots[slotIndex];
    if (slot === undefined) continue;
    const face = getFaceCard(slot.faceCardId);
    if (face === undefined) continue;

    // Consume suppressInherentNextRoll on every slot of this die this roll.
    let suppressInherent = false;
    let slotsChanged = false;
    const clearedSlots = liveDie.slots.map((candidate) => {
      if (candidate.suppressInherentNextRoll !== true) return candidate;
      slotsChanged = true;
      if (candidate.index === slotIndex) suppressInherent = true;
      return { ...candidate, suppressInherentNextRoll: false };
    });
    if (slotsChanged) {
      patchDie(draft, die.id, { slots: clearedSlots });
    }

    if (!keptByRetain) {
      emit(draft, { type: "die-rolled", dieId: die.id, slotIndex, symbol: face.symbol });
    }

    const symbolId = asSymbolInstanceId(nextInstanceId(draft, "symbol"));
    const locked = (draft.dice[die.id]?.slots[slotIndex] ?? slot).resourceLockedThisTurn === true;
    draft.symbols[symbolId] = {
      id: symbolId,
      ownerId: playerId,
      symbol: face.symbol,
      status: "rolled",
      sourceDieId: die.id,
      absorbedByCreatureId: null,
      ...(locked ? { usable: false } : {}),
    };
    emit(draft, {
      type: "symbol-generated",
      symbolId,
      symbol: face.symbol,
      ownerId: playerId,
      source: "roll",
    });
    rolled.push({
      dieId: die.id,
      slotIndex,
      faceCardId: slot.faceCardId,
      symbol: face.symbol,
      suppressInherent,
    });
    draft.facesAppearedThisRoll = [
      ...draft.facesAppearedThisRoll,
      {
        dieId: die.id,
        slotIndex,
        faceCardId: slot.faceCardId,
        kind: face.kind,
      },
    ];
  }

  // Fire onRoll after every inherent pip exists so "another symbol in the pool"
  // conditions (Gear, Resonance) see the full roll.
  for (const entry of rolled) {
    if (!entry.suppressInherent) {
      fireFaceOnRoll(draft, playerId, entry.dieId, entry.slotIndex);
    }
    fireOverloadsForShownFace(draft, playerId, entry.faceCardId, entry.dieId, entry.slotIndex);
    fireEquipmentOnRollSymbol(draft, playerId, entry.symbol);
  }

  drainResolution(draft);
  return enterPhase(draft, "absorption");
}

function fireFaceOnRoll(
  draft: Draft,
  controllerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  if (slot === undefined) return;
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined || face.onRoll.length === 0) return;

  for (const effect of [...face.onRoll].reverse()) {
    pushEffect(draft, controllerId, effect, null, null, null, dieId, slotIndex);
  }
}

/**
 * Any overload sitting on this face card fires once for each die that shows
 * that face after the roll. Die faces only reference the card; overloads live
 * on the card.
 */
function fireOverloadsForShownFace(
  draft: Draft,
  controllerId: PlayerId,
  faceCardId: FaceCardId,
  dieId: DieId,
  slotIndex: number,
): void {
  const player = draft.players[controllerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.overload) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId !== faceCardId) continue;
    const region = getCard(card.cardId)?.overload;
    if (region === undefined) continue;
    for (const effect of [...region.onRoll].reverse()) {
      pushEffect(draft, controllerId, effect, null, null, null, dieId, slotIndex);
    }
  }
}

/**
 * Bible §21: the player chooses whether a die keeps its showing face for one
 * subsequent roll. Retention clears automatically after that keep is spent;
 * releasing early is what lets the die roll freely before then.
 */
function retainDie(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  retain: boolean,
): GameError | null {
  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.ownerId !== playerId) return "INVALID_TARGET";

  if (retain) {
    if (isDieStunned(die)) return "DIE_STUNNED";
    if (die.rolledSlotIndex === null) return "INVALID_TARGET";
    if (die.retained) return null;
    patchDie(draft, dieId, { retained: true });
    emit(draft, { type: "die-retained", dieId, playerId });
    return null;
  }

  if (!die.retained) return null;
  patchDie(draft, dieId, { retained: false });
  emit(draft, { type: "die-released", dieId, playerId });
  return null;
}

/**
 * Completes a pending deck or graveyard search. Deck searches require exactly
 * `amount` eligible cards (then shuffle); graveyard searches allow up to
 * `amount` cards returned to hand.
 */
function resolveSearch(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceIds: readonly CardInstanceId[],
  rng: RNG,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null) return "INVALID_PHASE";
  if (pending.type !== "search-deck" && pending.type !== "search-graveyard") {
    return "INVALID_PHASE";
  }
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const unique = new Set(cardInstanceIds);
  if (unique.size !== cardInstanceIds.length) return "INVALID_SEARCH";

  if (pending.type === "search-deck") {
    if (cardInstanceIds.length !== pending.amount) return "INVALID_SEARCH";

    const eligible = new Set(searchableDeckCards(draft, playerId, pending.filter));
    for (const id of cardInstanceIds) {
      if (!eligible.has(id)) return "INVALID_SEARCH";
    }

    for (const id of cardInstanceIds) {
      moveCard(draft, id, "hand");
    }

    shuffleDeck(draft, playerId, rng);
    draft.pendingDecision = null;
    emit(draft, { type: "search-resolved", playerId, cardInstanceIds: [...cardInstanceIds] });
    return resumeAfterEffectPause(draft);
  }

  if (pending.type === "search-graveyard") {
    if (cardInstanceIds.length > pending.amount) return "INVALID_SEARCH";

    const graveyard = new Set(draft.players[playerId]?.graveyard ?? []);
    for (const id of cardInstanceIds) {
      if (!graveyard.has(id)) return "INVALID_SEARCH";
      if (pending.maxEnergyCost !== undefined) {
        const card = draft.cards[id];
        const definition = card === undefined ? undefined : getCard(card.cardId);
        if (definition === undefined || definition.energyCost > pending.maxEnergyCost) {
          return "INVALID_SEARCH";
        }
      }
    }

    for (const id of cardInstanceIds) {
      moveCard(draft, id, "hand");
    }

    draft.pendingDecision = null;
    emit(draft, { type: "search-resolved", playerId, cardInstanceIds: [...cardInstanceIds] });
    return resumeAfterEffectPause(draft);
  }

  return "INVALID_PHASE";
}

/**
 * Completes a pending discard. The controller names exactly the pending amount
 * of cards currently in hand; those move to the graveyard, then resolution
 * resumes (and a deferred Energy overshoot may end the turn).
 */
function resolveDiscard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceIds: readonly CardInstanceId[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "discard-cards") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const unique = new Set(cardInstanceIds);
  if (unique.size !== cardInstanceIds.length) return "INVALID_DISCARD";
  if (pending.optional === true) {
    if (cardInstanceIds.length > pending.amount) return "INVALID_DISCARD";
  } else if (cardInstanceIds.length !== pending.amount) {
    return "INVALID_DISCARD";
  }

  const hand = new Set(draft.players[playerId]?.hand ?? []);
  for (const id of cardInstanceIds) {
    if (!hand.has(id)) return "INVALID_DISCARD";
  }

  const turnEnds = pending.turnEnds;
  if (turnEnds) {
    noteDeferredTurnEnd(draft, playerId, true);
  }
  discardSpecificCards(draft, playerId, cardInstanceIds);
  if (pending.thenEffects !== undefined && cardInstanceIds.length > 0) {
    for (const effect of [...pending.thenEffects].reverse()) {
      pushEffect(
        draft,
        playerId,
        effect,
        pending.sourceCreatureId ?? null,
        pending.declaredTargetCreatureId ?? null,
        null,
        pending.sourceDieId ?? null,
        pending.sourceSlotIndex ?? null,
      );
    }
  }
  draft.pendingDecision = null;
  emit(draft, { type: "discard-resolved", playerId, cardInstanceIds: [...cardInstanceIds] });

  return resumeAfterEffectPause(draft);
}

/**
 * Completes a pending creature choice (overload heal and similar). The chosen
 * creature is stamped onto the deferred effect as its declared target, then
 * resolution resumes.
 */
function resolveChooseCreature(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId | null,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-creature") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  if (creatureId === null) {
    if (pending.optional !== true) return "INVALID_CHOICE";
    draft.pendingDecision = null;
    emit(draft, { type: "choose-creature-resolved", playerId, creatureId: null });
    return resumeAfterEffectPause(draft);
  }

  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return "INVALID_CHOICE";
  if (
    !creatureMatchesFilter(
      draft,
      playerId,
      pending.filter,
      pending.deferred.sourceCreatureId,
      creatureId,
    )
  ) {
    return "INVALID_CHOICE";
  }

  draft.pendingDecision = null;
  emit(draft, { type: "choose-creature-resolved", playerId, creatureId });

  const deferred = {
    ...pending.deferred,
    declaredTargetCreatureId: creatureId,
  };
  // Re-enter applyEffect with a declared target so choose-* cannot loop.
  applyDeferredEffect(draft, deferred);
  return resumeAfterEffectPause(draft);
}

/**
 * Completes a pending ritual choice (destroy-ritual). The chosen card is
 * stamped onto the deferred effect, then resolution resumes.
 */
function resolveChooseRitual(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-ritual") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const card = draft.cards[cardInstanceId];
  if (card === undefined || card.zone !== "ritual") return "INVALID_CHOICE";
  if (pending.filter === "opponent" && card.ownerId === playerId) return "INVALID_CHOICE";

  draft.pendingDecision = null;
  emit(draft, { type: "choose-ritual-resolved", playerId, cardInstanceId });

  const deferred = {
    ...pending.deferred,
    declaredTargetCardInstanceId: cardInstanceId,
  };
  applyDeferredEffect(draft, deferred);
  return resumeAfterEffectPause(draft);
}

/**
 * Completes a pending forge-from-effect. The controller names one legal die,
 * the pending number of slots, and one eligible face card.
 */
function resolveForgeFaces(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardId: FaceCardId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "forge-faces") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const unique = new Set(slotIndexes);
  if (unique.size !== slotIndexes.length || slotIndexes.length !== pending.faces) {
    return "WRONG_FACE_COUNT";
  }

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";

  const ownerId = pending.target === "own-die" ? playerId : opponentOf(draft, playerId);
  if (die.ownerId !== ownerId) return "INVALID_TARGET";
  if (slotIndexes.some((index) => die.slots[index] === undefined)) return "INVALID_FACE";

  if (
    forgeExceedsAttributeLimit(die, slotIndexes, pending.attribute, pending.faces, draft.config)
  ) {
    return "ATTRIBUTE_LIMIT_REACHED";
  }

  if (!isLegalForgeKindForAttribute(pending.kind, pending.attribute)) {
    return "INVALID_TARGET";
  }

  const eligible = eligibleFacesForForge(draft, playerId, pending.kind, pending.attribute);
  if (!eligible.includes(faceCardId)) return "FACE_NOT_AVAILABLE";

  const installed = installFacesOnDie(draft, playerId, dieId, slotIndexes, faceCardId, null);
  if (installed !== null) return installed;

  draft.pendingDecision = null;
  emit(draft, {
    type: "forge-faces-resolved",
    playerId,
    dieId,
    slotIndexes: [...slotIndexes],
    faceCardId,
  });
  return resumeAfterEffectPause(draft);
}

/**
 * Completes a pending replace-synthetic-face (Reforge). Uninstalls the named
 * slot's matching face to the pool and installs a different pool face onto the
 * same slot. Not a forge — no forge-draw.
 */
function resolveReplaceSyntheticFace(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  faceCardId: FaceCardId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "replace-synthetic-face") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.ownerId !== playerId) return "INVALID_TARGET";

  const slot = die.slots[slotIndex];
  if (slot === undefined) return "INVALID_FACE";

  const installedFace = getFaceCard(slot.faceCardId);
  if (
    installedFace === undefined ||
    installedFace.kind !== pending.kind ||
    installedFace.symbol !== pending.attribute
  ) {
    return "INVALID_CHOICE";
  }

  if (faceCardId === slot.faceCardId) return "INVALID_CHOICE";

  const eligible = eligiblePoolFacesForReplace(
    draft,
    playerId,
    pending.kind,
    pending.attribute,
    slot.faceCardId,
  );
  if (!eligible.includes(faceCardId)) return "FACE_NOT_AVAILABLE";

  if (!takeFaceFromPool(draft, playerId, faceCardId)) {
    return "FACE_NOT_AVAILABLE";
  }

  const displaced = { faceCardId: slot.faceCardId, ownerId: slot.faceCardOwnerId };
  const slots = die.slots.map((candidate) =>
    candidate.index === slotIndex
      ? { ...candidate, faceCardId, faceCardOwnerId: playerId }
      : candidate,
  );
  patchDie(draft, dieId, { slots });

  returnFaceToPoolIfOrphaned(draft, displaced.faceCardId, displaced.ownerId);
  if (countInstalledCopies(draft, displaced.faceCardId, displaced.ownerId) === 0) {
    clearOverloadsOnFace(draft, displaced.faceCardId, displaced.ownerId);
  }

  draft.pendingDecision = null;
  emit(draft, {
    type: "replace-synthetic-face-resolved",
    playerId,
    dieId,
    slotIndex,
    removedFaceCardId: displaced.faceCardId,
    installedFaceCardId: faceCardId,
  });
  return resumeAfterEffectPause(draft);
}

function resolveChooseDie(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId | null,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-die") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  if (dieId === null) {
    if (pending.optional !== true) return "INVALID_CHOICE";
    draft.pendingDecision = null;
    return resumeAfterEffectPause(draft);
  }

  if (!legalDiceForFilter(draft, playerId, pending.filter).includes(dieId)) {
    return "INVALID_CHOICE";
  }

  draft.pendingDecision = null;
  applyDeferredEffect(draft, { ...pending.deferred, sourceDieId: dieId });
  return resumeAfterEffectPause(draft);
}

function resolveConvertSymbols(
  draft: Draft,
  playerId: PlayerId,
  replacements: readonly {
    readonly symbolId: SymbolInstanceId;
    readonly into: DualKindAttribute;
  }[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "convert-symbols") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";
  if (replacements.length > pending.amount) return "INVALID_CHOICE";

  const unique = new Set(replacements.map((entry) => entry.symbolId));
  if (unique.size !== replacements.length) return "INVALID_CHOICE";
  const eligible = new Set(pending.eligibleSymbolIds);

  for (const entry of replacements) {
    if (!eligible.has(entry.symbolId)) return "INVALID_CHOICE";
    if (!NATURAL_CONVERT_SYMBOLS.includes(entry.into)) return "INVALID_CHOICE";
    const symbol = draft.symbols[entry.symbolId];
    if (symbol === undefined) return "UNKNOWN_ENTITY";
    if (symbol.ownerId !== playerId) return "INVALID_TARGET";
    if (symbol.status !== "rolled" && symbol.status !== "available") return "SYMBOL_UNAVAILABLE";
    draft.symbols[entry.symbolId] = { ...symbol, symbol: entry.into };
  }

  draft.pendingDecision = null;
  return resumeAfterEffectPause(draft);
}

function resolveCopyPoolSymbol(
  draft: Draft,
  playerId: PlayerId,
  symbol: SymbolType,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "copy-pool-symbol") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const inPool = Object.values(draft.symbols).some(
    (candidate) =>
      candidate.ownerId === playerId &&
      candidate.symbol === symbol &&
      (candidate.status === "rolled" || candidate.status === "available"),
  );
  if (!inPool) return "INVALID_CHOICE";

  createSymbol(draft, playerId, symbol, "available", "effect");
  draft.pendingDecision = null;
  return resumeAfterEffectPause(draft);
}

function resolveReplayGraveyard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "replay-graveyard-tactic") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";
  if (!replayableGraveyardTactics(draft, playerId).includes(cardInstanceId)) {
    return "INVALID_CHOICE";
  }

  const card = draft.cards[cardInstanceId];
  const definition = card === undefined ? undefined : getCard(card.cardId);
  const effects =
    definition?.type === "ritual"
      ? definition.ritual?.effects
      : definition?.effect?.effects;
  draft.pendingDecision = null;
  if (effects !== undefined) {
    for (const effect of [...effects].reverse()) {
      pushEffect(draft, playerId, effect, null, null);
    }
  }
  return resumeAfterEffectPause(draft);
}

function resolveLookTopDeck(
  draft: Draft,
  playerId: PlayerId,
  keepId: CardInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "look-top-deck") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";
  if (!pending.cardInstanceIds.includes(keepId)) return "INVALID_CHOICE";

  const rest = pending.cardInstanceIds.filter((id) => id !== keepId);
  draft.pendingDecision = null;
  moveCard(draft, keepId, "hand");
  const player = draft.players[playerId];
  if (player !== undefined && rest.length > 0) {
    const remaining = player.deck.filter((id) => !rest.includes(id));
    patchPlayer(draft, playerId, { deck: [...remaining, ...rest] });
  }
  return resumeAfterEffectPause(draft);
}

function resolvePeekDeck(
  draft: Draft,
  playerId: PlayerId,
  putOnBottom: boolean,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "peek-deck") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const player = draft.players[playerId];
  draft.pendingDecision = null;
  if (putOnBottom && player !== undefined && player.deck[0] === pending.cardInstanceId) {
    patchPlayer(draft, playerId, {
      deck: [...player.deck.slice(1), pending.cardInstanceId],
    });
  }
  return resumeAfterEffectPause(draft);
}

function resolveDarkPact(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceIds: readonly [CardInstanceId, CardInstanceId],
  rng: RNG,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "dark-pact") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";
  if (cardInstanceIds[0] === cardInstanceIds[1]) return "INVALID_CHOICE";

  const deck = new Set(draft.players[playerId]?.deck ?? []);
  const attributes: string[] = [];
  for (const id of cardInstanceIds) {
    if (!deck.has(id)) return "INVALID_CHOICE";
    const card = draft.cards[id];
    const definition = card === undefined ? undefined : getCard(card.cardId);
    if (definition === undefined || definition.type !== "ritual") return "INVALID_CHOICE";
    attributes.push(definition.attribute);
  }
  if (attributes[0] === attributes[1]) return "INVALID_CHOICE";

  for (const id of cardInstanceIds) {
    moveCard(draft, id, "graveyard");
  }
  shuffleDeck(draft, playerId, rng);
  draft.pendingDecision = null;
  return resumeAfterEffectPause(draft);
}

function resolveMindControl(
  draft: Draft,
  playerId: PlayerId,
  mode: "strip-one-face" | "strip-one-each",
  faceCardIds: readonly FaceCardId[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "mind-control") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const unique = [...new Set(faceCardIds)];
  const legal = opposingOverloadedFaceIds(draft, playerId);
  for (const faceCardId of unique) {
    if (!legal.includes(faceCardId)) return "INVALID_CHOICE";
  }

  if (mode === "strip-one-face") {
    if (unique.length !== 1) return "INVALID_CHOICE";
    const faceCardId = unique[0];
    if (faceCardId === undefined) return "INVALID_CHOICE";
    for (const overloadId of overloadsAttachedToFace(draft, faceCardId)) {
      destroyOverload(draft, overloadId);
    }
  } else {
    if (unique.length < 1 || unique.length > 2) return "INVALID_CHOICE";
    for (const faceCardId of unique) {
      const overload = earliestOverloadOnFace(draft, faceCardId);
      if (overload === undefined) return "INVALID_CHOICE";
      destroyOverload(draft, overload);
    }
  }

  draft.pendingDecision = null;
  return resumeAfterEffectPause(draft);
}

function opposingOverloadedFaceIds(draft: Draft, controllerId: PlayerId): readonly FaceCardId[] {
  const opponentId = opponentOf(draft, controllerId);
  const ids = new Set<FaceCardId>();
  for (const die of diceOf(draft, opponentId)) {
    for (const slot of die.slots) {
      if (overloadsAttachedToFace(draft, slot.faceCardId).length > 0) ids.add(slot.faceCardId);
    }
  }
  return [...ids];
}

function overloadsAttachedToFace(draft: Draft, faceCardId: FaceCardId): readonly CardInstanceId[] {
  return Object.values(draft.cards)
    .filter((card) => card.zone === "overload" && card.attachedToFaceCardId === faceCardId)
    .map((card) => card.id);
}

function earliestOverloadOnFace(draft: Draft, faceCardId: FaceCardId): CardInstanceId | undefined {
  return [...overloadsAttachedToFace(draft, faceCardId)].sort((a, b) => (a < b ? -1 : 1))[0];
}

function resolveSplitDamage(
  draft: Draft,
  playerId: PlayerId,
  assignments: readonly { readonly creatureId: CreatureId; readonly amount: number }[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "split-damage") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const unique = new Set(assignments.map((entry) => entry.creatureId));
  if (unique.size !== assignments.length) return "INVALID_CHOICE";
  const positive = assignments.filter((entry) => entry.amount > 0);
  if (positive.length > pending.maxTargets) return "INVALID_CHOICE";
  const total = assignments.reduce((sum, entry) => sum + entry.amount, 0);
  if (total !== pending.amount) return "INVALID_CHOICE";
  if (assignments.some((entry) => entry.amount < 0)) return "INVALID_CHOICE";

  for (const entry of assignments) {
    if (!isLegalSplitTarget(draft, pending.attackerId, pending.range, playerId, entry.creatureId)) {
      return "INVALID_CHOICE";
    }
  }

  const ignoreShield = pending.ignoreShield ?? 0;
  for (const entry of assignments) {
    if (entry.amount <= 0) continue;
    dealDamage(draft, entry.creatureId, entry.amount, { ignoreShield });
  }

  if (pending.thenEffects !== undefined) {
    for (const effect of [...pending.thenEffects].reverse()) {
      pushEffect(draft, playerId, effect, pending.sourceCreatureId, null);
    }
  }

  draft.pendingDecision = null;
  return resumeAfterEffectPause(draft);
}

function isLegalSplitTarget(
  draft: Draft,
  attackerId: CreatureId | null,
  range: boolean,
  controllerId: PlayerId,
  creatureId: CreatureId,
): boolean {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return false;
  if (attackerId === null) return true;
  if (creature.ownerId === controllerId) return false;
  if (creature.position === "back" && !range) {
    const front = livingCreaturesOf(draft, creature.ownerId).filter(
      (candidate) => candidate.position === "frontline",
    );
    if (front.length > 0) return false;
  }
  return true;
}

function resolveOptionalReroll(
  draft: Draft,
  playerId: PlayerId,
  accept: boolean,
  rng: RNG,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "optional-reroll") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const dieId = pending.dieId;
  const originalFace = pending.faceCardId;
  draft.pendingDecision = null;

  if (!accept) return resumeAfterEffectPause(draft);

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  const slotIndex = rng.integer(0, FACE_SLOTS_PER_DIE - 1);
  patchDie(draft, dieId, { rolledSlotIndex: slotIndex });
  const slot = draft.dice[dieId]?.slots[slotIndex];
  const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
  if (face !== undefined) {
    emit(draft, { type: "die-rolled", dieId, slotIndex, symbol: face.symbol });
    for (const symbol of Object.values(draft.symbols)) {
      if (symbol.sourceDieId !== dieId) continue;
      if (symbol.status !== "rolled" && symbol.status !== "available") continue;
      draft.symbols[symbol.id] = { ...symbol, symbol: face.symbol };
      break;
    }
  }

  if (slot?.faceCardId === originalFace) {
    const allies = livingCreaturesOf(draft, playerId);
    for (const ally of allies.slice(0, 2)) {
      dealDamage(draft, ally.id, 1);
    }
  }

  return resumeAfterEffectPause(draft);
}

function resolveChooseDieSlot(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId | null,
  slotIndex: number | null,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-die-slot") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  if (dieId === null || slotIndex === null) {
    if (pending.optional !== true) return "INVALID_CHOICE";
    draft.pendingDecision = null;
    return resumeAfterEffectPause(draft);
  }

  const legal = legalDieSlotsForFilter(draft, playerId, pending.filter, {
    ...(pending.contextDieId !== undefined ? { contextDieId: pending.contextDieId } : {}),
    ...(pending.excludedSlotIndex !== undefined
      ? { excludedSlotIndex: pending.excludedSlotIndex }
      : {}),
  });
  if (!legal.some((entry) => entry.dieId === dieId && entry.slotIndex === slotIndex)) {
    return "INVALID_CHOICE";
  }

  const deferred = pending.deferred;
  draft.pendingDecision = null;
  const openedAnother = applyDieSlotChoice(draft, deferred, dieId, slotIndex);
  if (openedAnother) return null;
  return resumeAfterEffectPause(draft);
}

function resolveChoosePoolSymbol(
  draft: Draft,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-pool-symbol") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";
  if (!pending.eligibleSymbolIds.includes(symbolId)) return "INVALID_CHOICE";

  draft.pendingDecision = null;
  applyPoolSymbolWildcard(draft, playerId, symbolId);
  return resumeAfterEffectPause(draft);
}

function resolveRemoveToxinAmount(
  draft: Draft,
  playerId: PlayerId,
  amount: number,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "remove-toxin-amount") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";
  if (!Number.isInteger(amount) || amount < 0 || amount > pending.maxAmount) {
    return "INVALID_CHOICE";
  }

  draft.pendingDecision = null;
  applyRemoveToxinForDamage(draft, playerId, pending.creatureId, amount);
  return resumeAfterEffectPause(draft);
}

function resolveOptionalOvercharge(
  draft: Draft,
  playerId: PlayerId,
  accept: boolean,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "optional-overcharge") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  draft.pendingDecision = null;
  if (accept) {
    applyOptionalOverchargeAccept(
      draft,
      playerId,
      pending.amount,
      pending.dieId,
      pending.slotIndex,
    );
  }
  return resumeAfterEffectPause(draft);
}

function resolveOptionalBonusAttack(
  draft: Draft,
  playerId: PlayerId,
  accept: boolean,
  attackId: AttackId | undefined,
  targetId: CreatureId | undefined,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "optional-bonus-attack") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  draft.pendingDecision = null;
  if (!accept) return resumeAfterEffectPause(draft);
  if (attackId === undefined || targetId === undefined) return "INVALID_CHOICE";

  const creature = draft.creatures[pending.creatureId];
  if (creature === undefined || creature.defeated) return "CREATURE_DEFEATED";
  if (creature.attacksUsedThisCombat > 0) return "ATTACK_ALREADY_USED";

  const definition = getCreatureDefinition(creature.definitionId);
  const attackDefinition = definition?.attacks.find((candidate) => candidate.id === attackId);
  if (attackDefinition === undefined) return "CARD_NOT_AVAILABLE";
  if (attackDefinition.kind !== "basic") return "INVALID_CHOICE";
  if (attackDefinition.effect === undefined) return "CARD_HAS_NO_EFFECT";

  // Absorption-phase exception for Instinct (OPEN_DESIGN ASSUMED).
  const priorPhase = draft.phase;
  draft.phase = "actions";
  const error = attack(draft, playerId, pending.creatureId, attackId, targetId);
  draft.phase = priorPhase;
  if (error !== null) return error;
  return resumeAfterEffectPause(draft);
}

function activateFace(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.ownerId !== playerId) return "INVALID_TARGET";
  if (die.rolledSlotIndex !== slotIndex) return "INVALID_FACE";
  const slot = die.slots[slotIndex];
  if (slot === undefined) return "INVALID_FACE";
  const face = getFaceCard(slot.faceCardId);
  if (face?.activated === undefined) return "CARD_HAS_NO_EFFECT";

  let corruptionFaces = 0;
  for (const candidate of die.slots) {
    const definition = getFaceCard(candidate.faceCardId);
    if (definition?.kind === "synthetic" && definition.symbol === "corruption") {
      corruptionFaces += 1;
    }
  }

  const cost =
    face.activated.energyBase + face.activated.energyPerCorruptionOnDie * corruptionFaces;
  if (!holdsMarker(draft, playerId)) return "INSUFFICIENT_ENERGY";
  const spend = payEnergy(draft, playerId, cost);

  const displaced = { faceCardId: slot.faceCardId, ownerId: slot.faceCardOwnerId };
  const slots = die.slots.map((candidate) =>
    candidate.index === slotIndex
      ? {
          ...candidate,
          faceCardId: SHIELD_FACE_ID,
          faceCardOwnerId: playerId,
          pestilenceCounters: 0,
        }
      : candidate,
  );
  patchDie(draft, dieId, { slots });
  returnFaceToPoolIfOrphaned(draft, displaced.faceCardId, displaced.ownerId);
  if (countInstalledCopies(draft, displaced.faceCardId, displaced.ownerId) === 0) {
    clearOverloadsOnFace(draft, displaced.faceCardId, displaced.ownerId);
  }

  return settleTurnAfterSpend(draft, playerId, spend);
}

/**
 * Bible §13 install: first copy takes the face from the pool; further copies
 * of an already-installed face do not. Displaced faces return if orphaned.
 * Draws one card per face installed.
 */
function installFacesOnDie(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardId: FaceCardId,
  cardInstanceId: CardInstanceId | null,
): GameError | null {
  const alreadyInstalled = countInstalledCopies(draft, faceCardId, playerId) > 0;
  if (!alreadyInstalled && !takeFaceFromPool(draft, playerId, faceCardId)) {
    return "FACE_NOT_AVAILABLE";
  }

  const currentDie = draft.dice[dieId];
  if (currentDie === undefined) return "UNKNOWN_ENTITY";

  const displaced: Array<{ faceCardId: FaceCardId; ownerId: PlayerId }> = [];
  const slots = currentDie.slots.map((slot) => {
    if (!slotIndexes.includes(slot.index)) return slot;
    displaced.push({ faceCardId: slot.faceCardId, ownerId: slot.faceCardOwnerId });
    return { ...slot, faceCardId, faceCardOwnerId: playerId };
  });
  patchDie(draft, dieId, { slots });

  for (const old of displaced) {
    returnFaceToPoolIfOrphaned(draft, old.faceCardId, old.ownerId);
    if (countInstalledCopies(draft, old.faceCardId, old.ownerId) === 0) {
      clearOverloadsOnFace(draft, old.faceCardId, old.ownerId);
    }
  }

  for (const slotIndex of slotIndexes) {
    emit(draft, { type: "face-forged", playerId, cardInstanceId, dieId, slotIndex, faceCardId });
  }

  drawCards(draft, playerId, slotIndexes.length);
  return null;
}

/* ------------------------------------------------------------ absorb --- */

/**
 * Bible §7. The symbol leaves engine resolution for good, and the die sits on
 * the creature until end of turn. Attributes harden into tokens then; Shields
 * grant immediately — they do not fuel attacks, so the end-of-turn delay that
 * blocks same-turn attacking does not apply to them.
 */
function absorbSymbol(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
  symbolId: SymbolInstanceId,
): GameError | null {
  if (draft.phase !== "absorption") return "INVALID_PHASE";

  const symbol = draft.symbols[symbolId];
  if (symbol === undefined) return "UNKNOWN_ENTITY";
  if (symbol.ownerId !== playerId) return "INVALID_TARGET";
  if (symbol.status !== "rolled") return "SYMBOL_UNAVAILABLE";
  if (symbol.usable === false) return "SYMBOL_UNAVAILABLE";

  const creature = draft.creatures[creatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  if (creature.ownerId !== playerId) return "INVALID_TARGET";
  if (creature.defeated) return "CREATURE_DEFEATED";

  draft.symbols[symbolId] = {
    ...symbol,
    status: "absorbed",
    absorbedByCreatureId: creatureId,
  };

  if (symbol.sourceDieId !== null) {
    patchDie(draft, symbol.sourceDieId, { attachedToCreatureId: creatureId });
  }

  emit(draft, { type: "symbol-absorbed", symbolId, creatureId });

  if (!isAttributeSymbol(symbol.symbol)) {
    grantShield(draft, creatureId, 1);
  }

  queueAbsorbTriggers(draft, playerId, creatureId, symbol.symbol, symbol.sourceDieId);
  drainResolution(draft);
  return null;
}

/**
 * Spend a rolled attribute symbol on a field ritual's Active-when gate.
 * Same absorption window as creature absorb; the symbol is consumed (not
 * banked on a creature) and never reaches the engine pool.
 */
function absorbSymbolToRitual(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  symbolId: SymbolInstanceId,
): GameError | null {
  if (draft.phase !== "absorption") return "INVALID_PHASE";

  const symbol = draft.symbols[symbolId];
  if (symbol === undefined) return "UNKNOWN_ENTITY";
  if (symbol.ownerId !== playerId) return "INVALID_TARGET";
  if (symbol.status !== "rolled") return "SYMBOL_UNAVAILABLE";
  if (symbol.usable === false) return "SYMBOL_UNAVAILABLE";
  if (!isAttributeSymbol(symbol.symbol)) return "INVALID_TARGET";

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "ritual") return "CARD_NOT_AVAILABLE";
  if (card.ritualOrientation === "exhausted") return "CARD_NOT_AVAILABLE";

  const region = getCard(card.cardId)?.ritual;
  if (region?.activeWhen === undefined) return "CARD_NOT_AVAILABLE";

  const attribute = symbol.symbol;
  let creditAs = attribute;
  const needed = region.activeWhen[attribute] ?? 0;
  if (needed < 1) {
    const missing = firstMissingActiveWhen(region.activeWhen, card.ritualProgress ?? {});
    const wildcards = draft.requirementWildcardsThisTurn[playerId] ?? [];
    const wildcardIndex = wildcards.findIndex(
      (wildcard) => wildcard.fromSymbol === undefined || wildcard.fromSymbol === symbol.symbol,
    );
    if (missing === undefined || wildcardIndex < 0) return "INVALID_TARGET";
    creditAs = missing;
    consumeRequirementWildcardAt(draft, playerId, wildcardIndex);
  }

  const progress = card.ritualProgress ?? {};
  const credited = card.ritualProgressCreditedThisTurn ?? [];
  if (credited.includes(creditAs)) return "SYMBOL_UNAVAILABLE";
  if ((progress[creditAs] ?? 0) >= (region.activeWhen[creditAs] ?? 0)) return "INVALID_TARGET";

  consumeSymbols(draft, [symbolId], "ritual-progress");

  const nextProgress: AttributeTokens = {
    ...progress,
    [creditAs]: (progress[creditAs] ?? 0) + 1,
  };
  draft.cards[cardInstanceId] = {
    ...card,
    ritualProgress: nextProgress,
    ritualProgressCreditedThisTurn: [...credited, creditAs],
  };

  refreshRitualOrientations(draft, playerId);
  return null;
}

/* ------------------------------------------------------------ combat --- */

function attack(
  draft: Draft,
  playerId: PlayerId,
  attackerId: CreatureId,
  attackId: AttackId,
  targetId: CreatureId,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";

  const attacker = draft.creatures[attackerId];
  if (attacker === undefined) return "UNKNOWN_ENTITY";
  if (attacker.ownerId !== playerId) return "INVALID_TARGET";
  if (attacker.defeated) return "CREATURE_DEFEATED";
  if (attacker.attacksUsedThisCombat >= draft.config.attacksPerCreaturePerCombat) {
    return "ATTACK_ALREADY_USED";
  }

  const definition = getCreatureDefinition(attacker.definitionId);
  const attackDefinition = definition?.attacks.find((candidate) => candidate.id === attackId);
  if (attackDefinition === undefined) return "CARD_NOT_AVAILABLE";
  if (attackDefinition.effect === undefined) return "CARD_HAS_NO_EFFECT";

  const targeting = targetingError(draft, attackerId, attackDefinition, targetId);
  if (targeting !== null) return targeting;

  // Paid from the attacker's own absorbed fuel, never from the shared pool.
  // `requires` is only checked, so a fuelled creature stays fuelled; `discards`
  // is what an attack actually burns.
  const { requires, discards } = attackDefinition;
  if (!holdsTokens(attacker, requires)) return "ATTACK_NOT_FUELLED";
  if (discards !== undefined && !holdsTokens(attacker, discards)) return "ATTACK_NOT_FUELLED";

  emit(draft, { type: "attack-declared", attackerId, attackId: attackDefinition.id, targetId });
  patchCreature(draft, attackerId, {
    attacksUsedThisCombat: attacker.attacksUsedThisCombat + 1,
  });
  if (discards !== undefined) {
    patchCreature(draft, attackerId, {
      attributeTokens: removeTokens(attacker.attributeTokens, discards),
    });
    emit(draft, { type: "attribute-tokens-discarded", creatureId: attackerId, discarded: discards });
  }

  const baseEffect = attackDefinition.effect;
  const turnBonus = draft.attackBonusThisTurn[playerId] ?? 0;
  const creatureBonus = attacker.nextAttackBonus;
  const effect =
    baseEffect.type === "damage"
      ? {
          ...baseEffect,
          amount:
            baseEffect.amount +
            attackDamageBonus(draft, attackerId, attackDefinition.kind) +
            turnBonus +
            creatureBonus,
        }
      : baseEffect;

  if (turnBonus > 0) {
    const nextBonus = { ...draft.attackBonusThisTurn };
    delete nextBonus[playerId];
    draft.attackBonusThisTurn = nextBonus;
  }
  if (creatureBonus > 0) {
    patchCreature(draft, attackerId, { nextAttackBonus: 0 });
  }

  pushChainLink(
    draft,
    buildAttackLink({
      controllerId: playerId,
      attackerId,
      attackId: attackDefinition.id,
      targetId,
      attackEffect: effect,
      attackFollowUpEffects: attackDefinition.followUpEffects ?? [],
    }),
  );
  fireOnAttack(draft, attackerId, attackDefinition.kind, targetId);
  drainResolution(draft);
  openReactionWindow(draft, playerId);
  return null;
}

/* -------------------------------------------------------------- cards --- */

/**
 * The forge region (bible §13). Replacing a face is the only way an engine
 * changes, and the player names which slots to give up because that sacrifice
 * is the decision the card is really asking about.
 *
 * The Energy cost is paid here as well as on PLAY_CARD. One printed cost on one
 * card is read as the cost of using it either way — see docs/OPEN_DESIGN.md,
 * where this is recorded as an assumption rather than a settled rule.
 */
function forgeCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardId: FaceCardId,
  energyPaid: number | undefined,
): GameError | null {
  // Play and forge share the actions window.
  if (draft.phase !== "actions") return "INVALID_PHASE";

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "hand") return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  if (definition === undefined) return "UNKNOWN_ENTITY";

  const { forge } = definition;
  const unique = new Set(slotIndexes);
  if (unique.size !== slotIndexes.length || slotIndexes.length !== forge.faces) {
    return "WRONG_FACE_COUNT";
  }

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";

  if (forge.target === "own-die") {
    if (die.ownerId !== playerId) return "INVALID_TARGET";
  } else if (die.ownerId === playerId) {
    return "INVALID_TARGET";
  }
  if (slotIndexes.some((index) => die.slots[index] === undefined)) return "INVALID_FACE";

  if (forgeExceedsAttributeLimit(die, slotIndexes, forge.attribute, forge.faces, draft.config)) {
    return "ATTRIBUTE_LIMIT_REACHED";
  }

  if (!isLegalForgeKindForAttribute(forge.kind, forge.attribute)) {
    return "INVALID_TARGET";
  }

  if (!holdsMarker(draft, playerId)) return "INSUFFICIENT_ENERGY";

  const eligible = eligibleFacesForForge(
    draft,
    playerId,
    forge.kind,
    forge.attribute,
    definition,
  );
  if (!eligible.includes(faceCardId)) return "FACE_NOT_AVAILABLE";

  const installed = installFacesOnDie(
    draft,
    playerId,
    dieId,
    slotIndexes,
    faceCardId,
    cardInstanceId,
  );
  if (installed !== null) return installed;

  // The card is consumed by being installed, so it goes to the graveyard rather
  // than staying available to be played for its effect as well.
  moveCard(draft, cardInstanceId, "graveyard");
  const cost = resolveEnergyPayment(definition, energyPaid);
  if (cost === null) return "INVALID_TARGET";
  const discount = draft.forgeDiscountThisTurn[playerId] ?? 0;
  const paid = Math.max(0, cost - discount);
  if (discount > 0) {
    const next = { ...draft.forgeDiscountThisTurn };
    delete next[playerId];
    draft.forgeDiscountThisTurn = next;
  }
  return settleTurnAfterSpend(draft, playerId, payEnergy(draft, playerId, paid));
}

/**
 * The effect region — Instant resolve, Equipment / Overload attach, or Ritual
 * place. A card with none of those modelled regions can still be forged, so
 * refusing it here is what stops an unimplemented subtype resolving to nothing.
 */
function playCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  declaredTargetCreatureId: CreatureId | null,
  declaredFaceCardId: FaceCardId | null,
  energyPaid: number | undefined,
): GameError | null {
  const inReactionWindow = draft.pendingDecision?.type === "reaction-priority";
  if (!inReactionWindow && draft.phase !== "actions") return "INVALID_PHASE";

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "hand") return "CARD_NOT_AVAILABLE";
  if (cardCommittedToChain(draft, cardInstanceId)) return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  if (definition === undefined) return "UNKNOWN_ENTITY";

  // During a reaction window only hand reactions may respond.
  if (inReactionWindow && !isReactionCard(definition)) {
    return "CARD_NOT_AVAILABLE";
  }

  if (definition.equipment !== undefined) {
    if (inReactionWindow) return "CARD_NOT_AVAILABLE";
    return equipCard(draft, playerId, cardInstanceId, definition, declaredTargetCreatureId, energyPaid);
  }
  if (definition.overload !== undefined) {
    if (inReactionWindow) return "CARD_NOT_AVAILABLE";
    return overloadCard(draft, playerId, cardInstanceId, definition, declaredFaceCardId, energyPaid);
  }
  if (definition.ritual !== undefined) {
    if (inReactionWindow) return "CARD_NOT_AVAILABLE";
    return placeRitualCard(draft, playerId, cardInstanceId, definition, energyPaid);
  }

  const region = definition.effect;
  if (region === undefined) return "CARD_HAS_NO_EFFECT";

  if (declaredTargetCreatureId !== null) {
    const target = draft.creatures[declaredTargetCreatureId];
    if (target === undefined) return "UNKNOWN_ENTITY";
    if (target.defeated) return "CREATURE_DEFEATED";
  }

  if (region.requires !== undefined && planConsumption(draft, playerId, region.requires) === null) {
    const shortfall = requirementShortfall(draft, playerId, region.requires);
    const wildcards = draft.requirementWildcardsThisTurn[playerId] ?? [];
    if (shortfall > wildcards.length) return "INSUFFICIENT_SYMBOLS";
    consumeRequirementWildcards(draft, playerId, shortfall);
  }

  // Negate / prevent reactions need a legal top link.
  for (const effect of region.effects) {
    if (effect.type !== "negate-card") continue;
    const top = topChainLink(draft);
    if (top === undefined || !linkMatchesNegateCard(draft, top, effect.cardTypes)) {
      return "INVALID_CHAIN_TARGET";
    }
  }
  if (region.effects.some((effect) => effect.type === "negate-ritual")) {
    const top = topChainLink(draft);
    if (top === undefined || top.negated || !isRitualNegatableLinkKind(top.kind)) {
      return "INVALID_CHAIN_TARGET";
    }
  }
  if (
    region.effects.some(
      (effect) =>
        effect.type === "grant-damage-prevent" || effect.type === "prevent-attack-reflect",
    )
  ) {
    const top = topChainLink(draft);
    if (top === undefined || top.kind !== "attack") return "INVALID_CHAIN_TARGET";
    if (top.attackTargetId === null) return "INVALID_CHAIN_TARGET";
    const attackTarget = draft.creatures[top.attackTargetId];
    if (attackTarget === undefined || attackTarget.ownerId !== playerId) {
      return "INVALID_TARGET";
    }
  }
  if (region.effects.some((effect) => effect.type === "arm-prevent-draw")) {
    // Glimmer may sit above other reactions; only require an attack on the chain.
    let attackTargetId: CreatureId | null = null;
    for (let i = draft.chainStack.length - 1; i >= 0; i -= 1) {
      const link = draft.chainStack[i];
      if (link?.kind === "attack" && link.attackTargetId !== null) {
        attackTargetId = link.attackTargetId;
        break;
      }
    }
    if (attackTargetId === null) return "INVALID_CHAIN_TARGET";
    const attackTarget = draft.creatures[attackTargetId];
    if (attackTarget === undefined || attackTarget.ownerId !== playerId) {
      return "INVALID_TARGET";
    }
  }

  const cost = resolveEnergyPayment(definition, energyPaid, region.additionalEnergy ?? 0);
  if (cost === null) return "INVALID_TARGET";

  const discounted = discountedPlayCost(draft, playerId, definition, cost);
  const spend = payEnergyFlexible(draft, playerId, discounted.cost, inReactionWindow);
  if (spend === null) return "INSUFFICIENT_ENERGY";
  markDiscountMatchesSpent(draft, discounted.matches);

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: card.cardId });
  moveCard(draft, cardInstanceId, "graveyard");
  noteDeferredTurnEnd(draft, playerId, spend.turnEnds);

  pushChainLink(
    draft,
    buildEffectLink({
      kind: "tactic-effect",
      controllerId: playerId,
      cardInstanceId,
      effects: region.effects,
      sourceCreatureId: null,
      declaredTargetCreatureId,
    }),
  );
  openReactionWindow(draft, playerId);
  return null;
}

function equipCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  definition: NonNullable<ReturnType<typeof getCard>>,
  declaredTargetCreatureId: CreatureId | null,
  energyPaid: number | undefined,
): GameError | null {
  const region = definition.equipment;
  if (region === undefined) return "CARD_HAS_NO_EFFECT";
  if (declaredTargetCreatureId === null) return "INVALID_TARGET";

  const target = draft.creatures[declaredTargetCreatureId];
  if (target === undefined) return "UNKNOWN_ENTITY";
  if (target.defeated) return "CREATURE_DEFEATED";

  if (region.mayTargetOpponent) {
    if (target.ownerId === playerId) return "INVALID_TARGET";
  } else if (target.ownerId !== playerId) {
    return "INVALID_TARGET";
  }

  if (region.creatureAttributes !== undefined) {
    const creatureDefinition = getCreatureDefinition(target.definitionId);
    const allowed = region.creatureAttributes.some((attribute) =>
      creatureDefinition?.attributes.includes(attribute),
    );
    if (!allowed) return "INVALID_TARGET";
  }

  if (!holdsMarker(draft, playerId)) return "INSUFFICIENT_ENERGY";

  const cost = resolveEnergyPayment(definition, energyPaid);
  if (cost === null) return "INVALID_TARGET";
  const discounted = discountedPlayCost(draft, playerId, definition, cost);

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });
  // Stay in hand until the chain link resolves (or is negated → GY).
  const spend = payEnergy(draft, playerId, discounted.cost);
  markDiscountMatchesSpent(draft, discounted.matches);
  noteDeferredTurnEnd(draft, playerId, spend.turnEnds);

  pushChainLink(
    draft,
    buildEquipLink({
      controllerId: playerId,
      cardInstanceId,
      targetCreatureId: declaredTargetCreatureId,
    }),
  );
  openReactionWindow(draft, playerId);
  return null;
}

function overloadCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  definition: CardDefinition,
  declaredFaceCardId: FaceCardId | null,
  energyPaid: number | undefined,
): GameError | null {
  if (declaredFaceCardId === null) return "INVALID_TARGET";
  if (!overloadFitsFace(draft, cardInstanceId, declaredFaceCardId, playerId)) {
    return "INVALID_TARGET";
  }

  if (!holdsMarker(draft, playerId)) return "INSUFFICIENT_ENERGY";

  const cost = resolveEnergyPayment(definition, energyPaid);
  if (cost === null) return "INVALID_TARGET";
  const discounted = discountedPlayCost(draft, playerId, definition, cost);

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });
  const spend = payEnergy(draft, playerId, discounted.cost);
  markDiscountMatchesSpent(draft, discounted.matches);
  noteDeferredTurnEnd(draft, playerId, spend.turnEnds);

  pushChainLink(
    draft,
    buildOverloadLink({
      controllerId: playerId,
      cardInstanceId,
      faceCardId: declaredFaceCardId,
    }),
  );
  openReactionWindow(draft, playerId);
  return null;
}

function placeRitualCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  definition: CardDefinition,
  energyPaid: number | undefined,
): GameError | null {
  if (!holdsMarker(draft, playerId)) return "INSUFFICIENT_ENERGY";

  const cost = resolveEnergyPayment(definition, energyPaid);
  if (cost === null) return "INVALID_TARGET";
  const discounted = discountedPlayCost(draft, playerId, definition, cost);

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });
  const spend = payEnergy(draft, playerId, discounted.cost);
  markDiscountMatchesSpent(draft, discounted.matches);
  noteDeferredTurnEnd(draft, playerId, spend.turnEnds);

  pushChainLink(
    draft,
    buildRitualPlaceLink({
      controllerId: playerId,
      cardInstanceId,
    }),
  );
  openReactionWindow(draft, playerId);
  return null;
}

/**
 * Activates a ready Ritual that has an activate body (`ritual.effects`).
 * Standing-only continuous rituals cannot be activated. Non-continuous rituals
 * (Instant / Reaction) leave for the graveyard after resolving; continuous
 * ones with an activate body exhaust until the owner's next turn (banked
 * Active-when symbols stay).
 */
function activateRitual(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  declaredTargetCreatureId: CreatureId | null,
): GameError | null {
  const inReactionWindow = draft.pendingDecision?.type === "reaction-priority";
  // Ready rituals may activate in any phase except roll (and in reaction windows).
  if (!inReactionWindow && draft.phase === "roll") {
    return "INVALID_PHASE";
  }

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "ritual") return "CARD_NOT_AVAILABLE";
  if (card.ritualOrientation !== "ready") return "CARD_NOT_AVAILABLE";
  if (cardCommittedToChain(draft, cardInstanceId)) return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  const region = definition?.ritual;
  if (region === undefined || region.effects.length === 0) return "CARD_HAS_NO_EFFECT";

  // During a window only ritual-reactions (or type reaction) may respond.
  if (inReactionWindow && (definition === undefined || !isReactionCard(definition))) {
    return "CARD_NOT_AVAILABLE";
  }

  if (
    region.activeWhen !== undefined &&
    !ritualProgressMeets(card.ritualProgress ?? {}, region.activeWhen)
  ) {
    return "INSUFFICIENT_SYMBOLS";
  }

  if (declaredTargetCreatureId !== null) {
    const target = draft.creatures[declaredTargetCreatureId];
    if (target === undefined) return "UNKNOWN_ENTITY";
    if (target.defeated) return "CREATURE_DEFEATED";
  }

  for (const effect of region.effects) {
    if (effect.type !== "negate-card") continue;
    const top = topChainLink(draft);
    if (top === undefined || !linkMatchesNegateCard(draft, top, effect.cardTypes)) {
      return "INVALID_CHAIN_TARGET";
    }
  }
  if (region.effects.some((effect) => effect.type === "negate-ritual")) {
    const top = topChainLink(draft);
    if (top === undefined || top.negated || !isRitualNegatableLinkKind(top.kind)) {
      return "INVALID_CHAIN_TARGET";
    }
  }

  const extra = region.additionalEnergy ?? 0;
  if (extra > 0) {
    const spend = payEnergyFlexible(draft, playerId, extra, inReactionWindow);
    if (spend === null) return "INSUFFICIENT_ENERGY";
    noteDeferredTurnEnd(draft, playerId, spend.turnEnds);
  }

  emit(draft, { type: "ritual-activated", cardInstanceId, playerId });

  pushChainLink(
    draft,
    buildEffectLink({
      kind: "ritual-activate",
      controllerId: playerId,
      cardInstanceId,
      effects: region.effects,
      sourceCreatureId: null,
      declaredTargetCreatureId,
      ritualDuration: definition !== undefined ? ritualDurationOf(definition) : null,
    }),
  );
  openReactionWindow(draft, playerId);
  return null;
}

/**
 * Flip preparing → ready when banked Active-when progress meets the gate.
 * Progress itself is only gained via ABSORB_SYMBOL_TO_RITUAL (or cards with
 * no Active when, which are ready as soon as they hit the field).
 */
function refreshRitualOrientations(draft: Draft, playerId: PlayerId): void {
  const player = draft.players[playerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.ritual) {
    const card = draft.cards[cardInstanceId];
    const region = card === undefined ? undefined : getCard(card.cardId)?.ritual;
    if (card === undefined || region === undefined) continue;
    if (card.ritualOrientation !== "preparing") continue;

    const progress = card.ritualProgress ?? {};
    const active =
      region.activeWhen === undefined || ritualProgressMeets(progress, region.activeWhen);
    if (active) {
      setRitualOrientation(draft, cardInstanceId, "ready");
    }
  }
}

function ritualProgressMeets(
  progress: AttributeTokens,
  requirement: import("../model/symbols.js").SymbolRequirement,
): boolean {
  return requirementEntries(requirement).every(
    ([attribute, count]) => (progress[attribute] ?? 0) >= count,
  );
}

/**
 * Once-per-turn rituals come off diagonal at the start of the owner's turn.
 * Banked Active-when symbols stay unless an effect explicitly discards them;
 * the ritual returns to ready when the gate is still met.
 */
function resetExhaustedRituals(draft: Draft, playerId: PlayerId): void {
  const player = draft.players[playerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.ritual) {
    const card = draft.cards[cardInstanceId];
    if (card === undefined) continue;

    if (card.ritualOrientation === "exhausted") {
      const region = getCard(card.cardId)?.ritual;
      const progress = card.ritualProgress ?? {};
      const ready =
        region === undefined ||
        region.activeWhen === undefined ||
        ritualProgressMeets(progress, region.activeWhen);
      const orientation = ready ? "ready" : "preparing";
      draft.cards[cardInstanceId] = {
        ...card,
        ritualOrientation: orientation,
        ritualProgressCreditedThisTurn: [],
      };
      emit(draft, {
        type: "ritual-orientation-changed",
        cardInstanceId,
        orientation,
      });
      continue;
    }

    // New turn: allow another cumulative pip per attribute.
    if ((card.ritualProgressCreditedThisTurn?.length ?? 0) > 0) {
      draft.cards[cardInstanceId] = {
        ...card,
        ritualProgressCreditedThisTurn: [],
      };
    }
  }
}

/**
 * Bible §18. A spend is refused outright only when the player does not hold the
 * marker; going past zero is legal and ends the turn, which is what makes Energy
 * a pacing mechanism rather than a wallet.
 */
const holdsMarker = (draft: Draft, playerId: PlayerId): boolean =>
  draft.energy.holderId === playerId;

function payEnergy(draft: Draft, playerId: PlayerId, amount: number): EnergySpendOutcome {
  const spend = spendEnergy(draft.energy, amount, opponentOf(draft, playerId), draft.config.energy);
  draft.energy = spend.track;
  emit(draft, {
    type: "energy-spent",
    playerId,
    amount,
    remaining: spend.turnEnds ? 0 : spend.track.value,
  });
  return spend;
}

/**
 * Reaction-priority Energy: seats are opposing sides of one track.
 * Holder pays by the normal spend (toward the opponent). Non-holder pays by
 * pushing Energy **to the holder** (+cost, capped at trackMax) — never by
 * eating the holder’s remaining value. See OPEN_DESIGN “Reaction Energy”.
 */
function payEnergyFlexible(
  draft: Draft,
  playerId: PlayerId,
  amount: number,
  asReaction: boolean,
): EnergySpendOutcome | null {
  if (!asReaction && !holdsMarker(draft, playerId)) return null;

  if (asReaction && !holdsMarker(draft, playerId)) {
    const holderId = draft.energy.holderId;
    const capped = Math.min(draft.energy.value + amount, draft.config.energy.trackMax);
    const gained = capped - draft.energy.value;
    draft.energy = { holderId, value: capped };
    emit(draft, {
      type: "energy-spent",
      playerId,
      amount,
      remaining: 0,
    });
    if (gained > 0) {
      emit(draft, {
        type: "energy-gained",
        playerId: holderId,
        amount: gained,
        remaining: capped,
      });
    }
    return { track: draft.energy, turnEnds: false, passedToOpponent: 0 };
  }

  return payEnergy(draft, playerId, amount);
}

function passPriority(draft: Draft, playerId: PlayerId): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "reaction-priority") return "INVALID_PHASE";
  if (pending.priorityPlayerId !== playerId) return "NOT_PRIORITY_PLAYER";

  const consecutivePasses = pending.consecutivePasses + 1;
  if (consecutivePasses >= 2) {
    draft.pendingDecision = null;
    emit(draft, {
      type: "priority-passed",
      playerId,
      nextPriorityPlayerId: null,
    });
    return drainChain(draft);
  }

  const nextPriorityPlayerId = opponentOf(draft, playerId);
  draft.pendingDecision = {
    type: "reaction-priority",
    priorityPlayerId: nextPriorityPlayerId,
    consecutivePasses,
  };
  emit(draft, {
    type: "priority-passed",
    playerId,
    nextPriorityPlayerId,
  });
  return null;
}

function resumeAfterEffectPause(draft: Draft): GameError | null {
  drainResolution(draft);
  if (draft.pendingDecision !== null) return null;
  return drainChain(draft);
}

/**
 * After both seats pass, resolve the remaining chain LILO without reopening
 * windows between links (ASSUMED in `008`).
 */
function drainChain(draft: Draft): GameError | null {
  while (draft.chainStack.length > 0) {
    if (draft.pendingDecision !== null) return null;

    const link = draft.chainStack.pop();
    if (link === undefined) break;

    conductLink(draft, link);
    if (draft.pendingDecision !== null) return null;
  }

  return settleDeferredTurnEnd(draft);
}

function conductLink(draft: Draft, link: ChainLink): void {
  const negated = link.negated;
  emit(draft, {
    type: "chain-link-resolved",
    linkId: link.id,
    kind: link.kind,
    negated,
  });

  if (negated) {
    if (link.kind === "ritual-activate") {
      // Activation costs were paid; exhaust / GY even when the body is negated.
      finishRitualActivation(draft, link);
    } else if (
      link.kind === "ritual-place" ||
      link.kind === "equip-attach" ||
      link.kind === "overload-attach"
    ) {
      if (link.cardInstanceId !== null) {
        moveCard(draft, link.cardInstanceId, "graveyard");
      }
    }
    return;
  }

  switch (link.kind) {
    case "tactic-effect": {
      for (const effect of [...link.effects].reverse()) {
        pushEffect(
          draft,
          link.controllerId,
          effect,
          link.sourceCreatureId,
          link.declaredTargetCreatureId,
        );
      }
      drainResolution(draft);
      return;
    }
    case "ritual-activate": {
      for (const effect of [...link.effects].reverse()) {
        pushEffect(
          draft,
          link.controllerId,
          effect,
          link.sourceCreatureId,
          link.declaredTargetCreatureId,
        );
      }
      drainResolution(draft);
      // Exhaust / GY after the body has opened any search (amount uses pre-GY size).
      finishRitualActivation(draft, link);
      return;
    }
    case "ritual-place": {
      if (link.cardInstanceId === null) return;
      moveCard(draft, link.cardInstanceId, "ritual");
      placeRitual(draft, link.cardInstanceId);
      refreshRitualOrientations(draft, link.controllerId);
      return;
    }
    case "equip-attach": {
      if (link.cardInstanceId === null || link.equipTargetCreatureId === null) return;
      moveCard(draft, link.cardInstanceId, "equipment");
      attachEquipment(draft, link.cardInstanceId, link.equipTargetCreatureId);
      return;
    }
    case "overload-attach": {
      if (link.cardInstanceId === null || link.overloadFaceCardId === null) return;
      moveCard(draft, link.cardInstanceId, "overload");
      attachOverload(draft, link.cardInstanceId, link.overloadFaceCardId);
      return;
    }
    case "attack": {
      if (link.attackEffect === null || link.attackerId === null || link.attackTargetId === null) {
        return;
      }
      const ignoreShield = attackIgnoreShieldAmount(draft, link.attackerId, link.controllerId);
      const followUps = link.attackFollowUpEffects;
      if (draft.bladeRainArmed[link.controllerId] === true) {
        const nextArmed = { ...draft.bladeRainArmed };
        delete nextArmed[link.controllerId];
        draft.bladeRainArmed = nextArmed;
        const amount = link.attackEffect.type === "damage" ? link.attackEffect.amount : 0;
        const attacker = draft.creatures[link.attackerId];
        const attackDef =
          attacker === undefined
            ? undefined
            : getCreatureDefinition(attacker.definitionId)?.attacks.find(
                (candidate) => candidate.id === link.attackId,
              );
        draft.pendingDecision = {
          type: "split-damage",
          controllerId: link.controllerId,
          amount,
          maxTargets: 6,
          attackerId: link.attackerId,
          range: attackDef?.range ?? false,
          sourceCreatureId: link.attackerId,
          ignoreShield,
          thenEffects: followUps,
        };
        return;
      }
      for (const follow of [...followUps].reverse()) {
        pushEffect(draft, link.controllerId, follow, link.attackerId, link.attackTargetId);
      }
      pushEffect(
        draft,
        link.controllerId,
        link.attackEffect,
        link.attackerId,
        link.attackTargetId,
        null,
        null,
        null,
        ignoreShield,
      );
      drainResolution(draft);
      return;
    }
  }
}

function finishRitualActivation(draft: Draft, link: ChainLink): void {
  if (link.cardInstanceId === null) return;
  const card = draft.cards[link.cardInstanceId];
  if (card === undefined || card.zone !== "ritual") return;

  if (link.ritualDuration === "continuous") {
    setRitualOrientation(draft, link.cardInstanceId, "exhausted");
  } else {
    // Instant, reaction, or unspecified → one-shot: leave the field.
    moveCard(draft, link.cardInstanceId, "graveyard");
  }
}

function settleDeferredTurnEnd(draft: Draft): GameError | null {
  // Always clear the bookkeeping flag; the real check is the track below.
  draft.deferredTurnEndPlayerId = null;

  // Energy overshoot may flip the marker when a link’s cost is paid, but a later
  // reaction can move it back (opposing +/-). Turn end is decided only after the
  // whole chain (and any nested choices) have finished — if the turn player
  // holds the marker again, the turn continues.
  if (draft.energy.holderId === draft.activePlayerId) {
    return null;
  }

  return passTurnOnOvershoot(draft, draft.activePlayerId);
}

/**
 * §18 ends the turn once the current action has finished rather than
 * interrupting it, so this runs after the card has fully resolved. The track
 * comes from the draft rather than from the spend, because an effect may have
 * moved it in between.
 */
function settleTurnAfterSpend(
  draft: Draft,
  playerId: PlayerId,
  spend: EnergySpendOutcome,
): GameError | null {
  if (!spend.turnEnds) return null;
  return passTurnOnOvershoot(draft, playerId);
}

function passTurnOnOvershoot(draft: Draft, playerId: PlayerId): GameError | null {
  const track = energyAfterOvershootPass(draft.energy, draft.config.energy);
  emit(draft, {
    type: "energy-passed",
    toPlayerId: track.holderId,
    amount: track.value,
    cause: "overshoot",
  });
  return finishTurn(draft, playerId, track);
}

/* ------------------------------------------------------------- phase --- */

function advancePhase(draft: Draft): GameError | null {
  const index = TURN_PHASE_ORDER.indexOf(draft.phase);
  const next = TURN_PHASE_ORDER[index + 1];
  // The final phase is left by ending the turn, not by advancing past it.
  if (next === undefined) return "INVALID_PHASE";
  return enterPhase(draft, next);
}

function enterPhase(draft: Draft, phase: TurnPhase): GameError | null {
  draft.phase = phase;

  // Closing the absorption window releases every symbol the creatures did not
  // take into the available pool for card `[Requires: …]` and similar spends.
  // Absorbed symbols are deliberately left behind.
  if (phase === "actions") {
    for (const symbol of Object.values(draft.symbols)) {
      if (symbol.status === "rolled") {
        draft.symbols[symbol.id] = { ...symbol, status: "available" };
      }
    }
  }

  emit(draft, { type: "phase-entered", phase });
  return null;
}

/* ---------------------------------------------------------- end turn --- */

function endTurn(draft: Draft, playerId: PlayerId): GameError | null {
  const nextPlayerId = opponentOf(draft, playerId);
  const track = passEnergy(nextPlayerId, draft.config.energy);

  emit(draft, {
    type: "energy-passed",
    toPlayerId: nextPlayerId,
    amount: track.value,
    cause: "voluntary-pass",
  });
  return finishTurn(draft, playerId, track);
}

/**
 * The one path a turn ends by, whether the player passed or spent past zero.
 * The incoming player is whoever ends up holding the marker, so the two cases
 * differ only in how much Energy they arrive with.
 */
function finishTurn(draft: Draft, playerId: PlayerId, track: EnergyTrack): GameError | null {
  payOutAbsorbedSymbols(draft);
  detachDice(draft);
  expireTurnSymbols(draft);
  resetCombatCounters(draft);
  draft.attackBonusThisTurn = {};
  draft.attackToxinThisTurn = {};
  draft.preventDrawArmed = {};
  draft.ignoreShieldThisTurn = {};
  draft.forgeDiscountThisTurn = {};
  draft.requirementWildcardsThisTurn = {};
  draft.bladeRainArmed = {};
  draft.facesAppearedThisRoll = [];
  draft.resolveNextFaceEffectTwice = {};
  clearResourceLocks(draft);
  clearTurnTriggerState(draft);

  draft.energy = track;
  emit(draft, { type: "turn-ended", playerId });

  draft.turn += 1;
  draft.activePlayerId = track.holderId;
  emit(draft, { type: "turn-started", turn: draft.turn, playerId: track.holderId });

  clearToxinReceiveCapsForOwner(draft, track.holderId);
  // Toxin counters tick at the start of the creature's owner's turn.
  tickToxins(draft, track.holderId);
  // Exhausted once-per-turn rituals come off diagonal; banked Active-when
  // symbols persist unless an effect discarded them.
  resetExhaustedRituals(draft, track.holderId);

  // Drawn on entering your own turn, so the opening hand is not topped up
  // before the first player has had a turn to use it.
  drawCards(draft, track.holderId, draft.config.cardsDrawnPerTurn);

  checkVictory(draft);
  return enterPhase(draft, "roll");
}

/**
 * Bible §7 step 4: absorbed attributes harden into tokens once the turn ends.
 * That delay is what stops a creature attacking on the turn it was fuelled.
 * Shields are granted at absorption time instead (see absorbSymbol).
 */
function payOutAbsorbedSymbols(draft: Draft): void {
  for (const symbol of Object.values(draft.symbols)) {
    if (symbol.status !== "absorbed") continue;
    if (!isAttributeSymbol(symbol.symbol)) continue;
    const creatureId = symbol.absorbedByCreatureId;
    if (creatureId === null) continue;

    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;

    patchCreature(draft, creatureId, {
      attributeTokens: addToken(creature.attributeTokens, symbol.symbol),
    });
    emit(draft, {
      type: "attribute-token-gained",
      creatureId,
      attribute: symbol.symbol,
      amount: 1,
    });
  }
}

function detachDice(draft: Draft): void {
  for (const die of Object.values(draft.dice)) {
    if (die.attachedToCreatureId !== null) {
      draft.dice[die.id] = { ...die, attachedToCreatureId: null };
    }
  }
}

/**
 * Symbols are temporary (bible §15) and, with storing dropped, nothing exempts
 * them. What a player wanted to keep had to be absorbed onto a creature, where
 * it now lives as a token or a shield rather than as a symbol.
 */
function expireTurnSymbols(draft: Draft): void {
  const expired: SymbolInstanceId[] = [];
  for (const symbol of Object.values(draft.symbols)) {
    expired.push(symbol.id);
    delete draft.symbols[symbol.id];
  }
  if (expired.length > 0) emit(draft, { type: "symbols-expired", symbolIds: expired });
}

function resetCombatCounters(draft: Draft): void {
  for (const creature of Object.values(draft.creatures)) {
    if (creature.attacksUsedThisCombat !== 0) {
      draft.creatures[creature.id] = { ...creature, attacksUsedThisCombat: 0 };
    }
  }
}

/* ------------------------------------------------------------ shared --- */

function consumeSymbols(
  draft: Draft,
  symbolIds: readonly SymbolInstanceId[],
  reason: "ritual-progress",
): void {
  for (const id of symbolIds) {
    const symbol = draft.symbols[id];
    if (symbol === undefined) continue;
    draft.symbols[id] = { ...symbol, status: "consumed" };
  }
  emit(draft, { type: "symbols-consumed", symbolIds: [...symbolIds], reason });
}

function markDiscountMatchesSpent(draft: Draft, matches: readonly DiscountMatch[]): void {
  for (const match of matches) {
    const creature = draft.creatures[match.creatureId];
    if (creature === undefined) continue;
    if (creature.spentOncePerTurnTriggers.includes(match.key)) continue;
    patchCreature(draft, match.creatureId, {
      spentOncePerTurnTriggers: [...creature.spentOncePerTurnTriggers, match.key],
    });
  }
}

function consumeRequirementWildcards(draft: Draft, playerId: PlayerId, count: number): void {
  if (count <= 0) return;
  const current = draft.requirementWildcardsThisTurn[playerId] ?? [];
  const remaining = current.slice(count);
  const next = { ...draft.requirementWildcardsThisTurn, [playerId]: remaining };
  if (remaining.length === 0) delete next[playerId];
  draft.requirementWildcardsThisTurn = next;
}

function consumeRequirementWildcardAt(draft: Draft, playerId: PlayerId, index: number): void {
  const current = [...(draft.requirementWildcardsThisTurn[playerId] ?? [])];
  if (index < 0 || index >= current.length) return;
  current.splice(index, 1);
  const next = { ...draft.requirementWildcardsThisTurn, [playerId]: current };
  if (current.length === 0) delete next[playerId];
  draft.requirementWildcardsThisTurn = next;
}

function firstMissingActiveWhen(
  requirement: import("../model/symbols.js").SymbolRequirement,
  progress: AttributeTokens,
): Attribute | undefined {
  for (const [attribute, count] of requirementEntries(requirement)) {
    if ((progress[attribute] ?? 0) < count) return attribute;
  }
  return undefined;
}
