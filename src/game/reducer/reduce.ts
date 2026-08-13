import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";
import type { GameError } from "../model/errors.js";
import {
  asSymbolInstanceId,
  type AbilityId,
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
import { isAttributeSymbol } from "../model/symbols.js";
import { createRng, type RNG } from "../rng/rng.js";
import {
  attackDamageBonus,
  forgeExceedsAttributeLimit,
  resolveEnergyPayment,
  ritualDurationOf,
} from "../rules/cards.js";
import { opponentOf } from "../rules/creatures.js";
import { diceOf, isDieStunned, keepsPreviousResult } from "../rules/dice.js";
import { passEnergy, spendEnergy, type EnergySpendOutcome } from "../rules/energy.js";
import {
  countInstalledCopies,
  eligibleFacesForForge,
  returnFaceToPoolIfOrphaned,
  takeFaceFromPool,
} from "../rules/faces.js";
import { planConsumption } from "../rules/symbols.js";
import { targetingError } from "../rules/targeting.js";
import { addToken, holdsTokens, removeTokens } from "../rules/tokens.js";
import type { GameAction } from "./actions.js";
import {
  buildAttackLink,
  buildEffectLink,
  buildEquipLink,
  buildOverloadLink,
  buildRitualPlaceLink,
  cardCommittedToChain,
  isNegatableLinkKind,
  noteDeferredTurnEnd,
  openReactionWindow,
  pushChainLink,
  topChainLink,
} from "./chain.js";
import { createDraft, emit, nextInstanceId, patchCreature, patchDie, type Draft } from "./draft.js";
import {
  applyDeferredEffect,
  checkVictory,
  drainResolution,
  grantShield,
  pushEffect,
  tickToxins,
} from "./resolution.js";
import {
  fireEquipmentOnRollSymbol,
  queueAbsorbTriggers,
} from "./triggers.js";
import {
  attachEquipment,
  attachOverload,
  clearOverloadsOnFace,
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
    case "RESOLVE_ENGINE_ABILITY":
      return resolveEngineAbility(draft, action.playerId, action.creatureId, action.abilityId);
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

    const slot = die.slots[slotIndex];
    if (slot === undefined) continue;
    const face = getFaceCard(slot.faceCardId);
    if (face === undefined) continue;

    if (!keptByRetain) {
      emit(draft, { type: "die-rolled", dieId: die.id, slotIndex, symbol: face.symbol });
    }

    const symbolId = asSymbolInstanceId(nextInstanceId(draft, "symbol"));
    draft.symbols[symbolId] = {
      id: symbolId,
      ownerId: playerId,
      symbol: face.symbol,
      status: "rolled",
      sourceDieId: die.id,
      absorbedByCreatureId: null,
    };
    emit(draft, {
      type: "symbol-generated",
      symbolId,
      symbol: face.symbol,
      ownerId: playerId,
      source: "roll",
    });

    // Overloads fire on the roll itself — once per die that shows the overloaded
    // face card (shared across dice). Absorb vs pool does not gate them.
    fireFaceOnRoll(draft, playerId, die.id, slotIndex);
    fireOverloadsForShownFace(draft, playerId, slot.faceCardId);
    fireEquipmentOnRollSymbol(draft, playerId, face.symbol);
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
    pushEffect(draft, controllerId, effect, null, null);
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
): void {
  const player = draft.players[controllerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.overload) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId !== faceCardId) continue;
    const region = getCard(card.cardId)?.overload;
    if (region === undefined) continue;
    for (const effect of [...region.onRoll].reverse()) {
      pushEffect(draft, controllerId, effect, null, null);
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
  if (cardInstanceIds.length !== pending.amount) return "INVALID_DISCARD";

  const hand = new Set(draft.players[playerId]?.hand ?? []);
  for (const id of cardInstanceIds) {
    if (!hand.has(id)) return "INVALID_DISCARD";
  }

  const turnEnds = pending.turnEnds;
  if (turnEnds) {
    noteDeferredTurnEnd(draft, playerId, true);
  }
  discardSpecificCards(draft, playerId, cardInstanceIds);
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
  creatureId: CreatureId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-creature") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "NOT_ACTIVE_PLAYER";

  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return "INVALID_CHOICE";
  if (pending.filter === "ally" && creature.ownerId !== playerId) return "INVALID_CHOICE";
  if (pending.filter === "enemy" && creature.ownerId === playerId) return "INVALID_CHOICE";

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

/* ------------------------------------------------------------ engine --- */

function resolveEngineAbility(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
  abilityId: AbilityId,
): GameError | null {
  if (draft.phase !== "engine") return "INVALID_PHASE";

  const creature = draft.creatures[creatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  if (creature.ownerId !== playerId) return "INVALID_TARGET";
  if (creature.defeated) return "CREATURE_DEFEATED";

  const definition = getCreatureDefinition(creature.definitionId);
  const ability = definition?.engineAbilities.find((candidate) => candidate.id === abilityId);
  if (ability === undefined) return "CARD_NOT_AVAILABLE";

  const payment = planConsumption(draft, playerId, ability.consumes);
  if (payment === null) return "INSUFFICIENT_SYMBOLS";

  consumeSymbols(draft, payment, "engine-ability");
  pushEffect(draft, playerId, ability.effect, creatureId, null);
  drainResolution(draft);
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
  if (draft.phase !== "combat") return "INVALID_PHASE";

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
  const effect =
    baseEffect.type === "damage"
      ? {
          ...baseEffect,
          amount: baseEffect.amount + attackDamageBonus(draft, attackerId) + turnBonus,
        }
      : baseEffect;

  if (turnBonus > 0) {
    const nextBonus = { ...draft.attackBonusThisTurn };
    delete nextBonus[playerId];
    draft.attackBonusThisTurn = nextBonus;
  }

  pushChainLink(
    draft,
    buildAttackLink({
      controllerId: playerId,
      attackerId,
      attackId: attackDefinition.id,
      targetId,
      attackEffect: effect,
    }),
  );
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

  if (!holdsMarker(draft, playerId)) return "INSUFFICIENT_ENERGY";

  const eligible = eligibleFacesForForge(
    draft,
    playerId,
    forge.kind,
    forge.attribute,
    definition,
  );
  if (!eligible.includes(faceCardId)) return "FACE_NOT_AVAILABLE";

  // Bible §13: first install takes the card from the face pool; further copies
  // of an already-installed face do not.
  const alreadyInstalled = countInstalledCopies(draft, faceCardId, playerId) > 0;
  if (!alreadyInstalled && !takeFaceFromPool(draft, playerId, faceCardId)) {
    return "FACE_NOT_AVAILABLE";
  }

  // Face cards keep their overloads while any die face still references them.
  // When the last copy is orphaned back to the pool, overloads leave with it.
  const currentDie = draft.dice[dieId];
  if (currentDie === undefined) return "UNKNOWN_ENTITY";

  const displaced: Array<{ faceCardId: typeof faceCardId; ownerId: PlayerId }> = [];
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

  // Forge rule: one card drawn per face installed, own die or opponent's.
  drawCards(draft, playerId, slotIndexes.length);

  // The card is consumed by being installed, so it goes to the graveyard rather
  // than staying available to be played for its effect as well.
  moveCard(draft, cardInstanceId, "graveyard");
  const cost = resolveEnergyPayment(definition, energyPaid);
  if (cost === null) return "INVALID_TARGET";
  return settleTurnAfterSpend(draft, playerId, payEnergy(draft, playerId, cost));
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
  if (inReactionWindow && !definition.subtypes.includes("reaction")) {
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
    return "INSUFFICIENT_SYMBOLS";
  }

  // Negate / prevent reactions need a legal top link.
  if (region.effects.some((effect) => effect.type === "negate-tactic")) {
    const top = topChainLink(draft);
    if (top === undefined || top.negated || !isNegatableLinkKind(top.kind)) {
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

  const spend = payEnergyFlexible(draft, playerId, cost, inReactionWindow);
  if (spend === null) return "INSUFFICIENT_ENERGY";

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

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });
  // Stay in hand until the chain link resolves (or is negated → GY).
  const spend = payEnergy(draft, playerId, cost);
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

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });
  const spend = payEnergy(draft, playerId, cost);
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

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });
  const spend = payEnergy(draft, playerId, cost);
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
 * Activates a ready Ritual. Non-continuous rituals (Instant / Reaction) leave
 * for the graveyard after resolving; continuous ones exhaust until the owner's
 * next turn.
 */
function activateRitual(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  declaredTargetCreatureId: CreatureId | null,
): GameError | null {
  const inReactionWindow = draft.pendingDecision?.type === "reaction-priority";
  if (!inReactionWindow && draft.phase !== "engine" && draft.phase !== "actions") {
    return "INVALID_PHASE";
  }

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "ritual") return "CARD_NOT_AVAILABLE";
  if (card.ritualOrientation !== "ready") return "CARD_NOT_AVAILABLE";
  if (cardCommittedToChain(draft, cardInstanceId)) return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  const region = definition?.ritual;
  if (region === undefined) return "CARD_HAS_NO_EFFECT";

  // During a window only ritual-reactions may respond.
  if (inReactionWindow && !definition?.subtypes.includes("reaction")) {
    return "CARD_NOT_AVAILABLE";
  }

  if (
    region.activeWhen !== undefined &&
    planConsumption(draft, playerId, region.activeWhen) === null
  ) {
    return "INSUFFICIENT_SYMBOLS";
  }

  if (declaredTargetCreatureId !== null) {
    const target = draft.creatures[declaredTargetCreatureId];
    if (target === undefined) return "UNKNOWN_ENTITY";
    if (target.defeated) return "CREATURE_DEFEATED";
  }

  if (region.effects.some((effect) => effect.type === "negate-tactic")) {
    const top = topChainLink(draft);
    if (top === undefined || top.negated || !isNegatableLinkKind(top.kind)) {
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
 * Flip ritual orientations against the current symbol pool. Preparing → ready
 * when Active when is met; ready → preparing if the condition lapses. Exhausted
 * rituals are not refreshed here — `resetExhaustedRituals` clears them at the
 * start of the owner's turn, before any symbols exist.
 */
function refreshRituals(draft: Draft, playerId: PlayerId): void {
  const player = draft.players[playerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.ritual) {
    const card = draft.cards[cardInstanceId];
    const region = card === undefined ? undefined : getCard(card.cardId)?.ritual;
    if (card === undefined || region === undefined) continue;

    const active =
      region.activeWhen === undefined ||
      planConsumption(draft, playerId, region.activeWhen) !== null;
    const orientation = card.ritualOrientation;

    if (orientation === "preparing" && active) {
      setRitualOrientation(draft, cardInstanceId, "ready");
    } else if (orientation === "ready" && !active) {
      setRitualOrientation(draft, cardInstanceId, "preparing");
    }
  }
}

/** Once-per-turn rituals come off diagonal at the start of the owner's turn. */
function resetExhaustedRituals(draft: Draft, playerId: PlayerId): void {
  const player = draft.players[playerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.ritual) {
    const card = draft.cards[cardInstanceId];
    if (card?.ritualOrientation === "exhausted") {
      setRitualOrientation(draft, cardInstanceId, "preparing");
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
      refreshRituals(draft, link.controllerId);
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
      pushEffect(
        draft,
        link.controllerId,
        link.attackEffect,
        link.attackerId,
        link.attackTargetId,
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

  const playerId = draft.activePlayerId;
  emit(draft, {
    type: "energy-passed",
    toPlayerId: draft.energy.holderId,
    amount: draft.energy.value,
    cause: "overshoot",
  });
  return finishTurn(draft, playerId, draft.energy);
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

  emit(draft, {
    type: "energy-passed",
    toPlayerId: draft.energy.holderId,
    amount: draft.energy.value,
    cause: "overshoot",
  });
  return finishTurn(draft, playerId, draft.energy);
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
  // take to the engine. Absorbed symbols are deliberately left behind.
  if (phase === "engine") {
    for (const symbol of Object.values(draft.symbols)) {
      if (symbol.status === "rolled") {
        draft.symbols[symbol.id] = { ...symbol, status: "available" };
      }
    }
    // Rituals check Active when against the pool that just became available.
    refreshRituals(draft, draft.activePlayerId);
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
  draft.preventDrawArmed = {};

  draft.energy = track;
  emit(draft, { type: "turn-ended", playerId });

  draft.turn += 1;
  draft.activePlayerId = track.holderId;
  emit(draft, { type: "turn-started", turn: draft.turn, playerId: track.holderId });

  // Toxin counters tick at the start of the creature's owner's turn.
  tickToxins(draft, track.holderId);
  // Exhausted once-per-turn rituals come off diagonal; Active when is checked
  // later, when the engine phase opens the symbol pool.
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
  reason: "engine-ability",
): void {
  for (const id of symbolIds) {
    const symbol = draft.symbols[id];
    if (symbol === undefined) continue;
    draft.symbols[id] = { ...symbol, status: "consumed" };
  }
  emit(draft, { type: "symbols-consumed", symbolIds: [...symbolIds], reason });
}
