import { getCard } from "../../content/cards.js";
import { getCreatureDefinition } from "../../content/creatures.js";
import { getFaceCard } from "../../content/faces.js";
import { FACE_SLOTS_PER_DIE } from "../../model/dice.js";
import type { GameError } from "../../model/errors.js";
import { NATURAL_CONVERT_SYMBOLS } from "../../model/effects.js";
import type {
  AttackId,
  CardInstanceId,
  CreatureId,
  DieId,
  FaceCardId,
  PlayerId,
  SymbolInstanceId,
} from "../../model/ids.js";
import type { DualKindAttribute } from "../../model/attributes.js";
import type { SymbolRequirement, SymbolType } from "../../model/symbols.js";
import type { RNG } from "../../rng/rng.js";
import {
  forgeExceedsAttributeLimit,
  replayableGraveyardTactics,
  searchableInGraveyard,
} from "../../rules/cards.js";
import { livingCreaturesOf, opponentOf } from "../../rules/creatures.js";
import { diceOf } from "../../rules/dice.js";
import {
  countInstalledCopies,
  eligibleFacesForForge,
  eligiblePoolFacesForReplace,
  isLegalForgeKindForAttribute,
  overwrittenSlot,
  returnFaceToPoolIfOrphaned,
  slotCannotBeReplacedByForge,
  takeFaceFromPool,
  withForgeLockResetOnInstall,
} from "../../rules/faces.js";
import { creatureMatchesFilter, legalDiceForFilter, legalDieSlotsForFilter } from "../../rules/targets.js";
import {
  addTokens,
  isLegalTokenDiscardPick,
  removeTokens,
} from "../../rules/tokens.js";
import { attack } from "../commands/attack.js";
import { installFacesOnDie } from "../commands/forge.js";
import { resumeAfterEffectPause } from "../commands/priority.js";
import { emit, patchDie, patchPlayer, type Draft } from "../draft.js";
import {
  applyDeferredEffect,
  applyDieSlotChoice,
  applyOptionalOverchargeAccept,
  applyPoolSymbolWildcard,
  createSymbol,
  dealDamage,
  pushEffect,
} from "../resolution.js";
import {
  clearOverloadsOnFace,
  destroyEquipment,
  destroyOverload,
  discardSpecificCards,
  moveCard,
  refreshRitualOrientations,
  searchableDeckCards,
  shuffleDeck,
} from "../zones.js";

/**
 * Completes a pending deck or graveyard search. Deck searches require exactly
 * `amount` eligible cards (then shuffle); graveyard searches allow up to
 * `amount` cards returned to hand.
 */
export function resolveSearch(
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
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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

    const eligible = new Set(
      searchableInGraveyard(draft, playerId, pending.maxPlayCost),
    );
    for (const id of cardInstanceIds) {
      if (!eligible.has(id)) return "INVALID_SEARCH";
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
 * resumes (and any deferred turn-end effects may fire).
 */
export function resolveDiscard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceIds: readonly CardInstanceId[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "discard-cards") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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
        0,
        pending.sourceCardInstanceId,
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
export function resolveChooseCreature(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId | null,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-creature") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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
export function resolveChooseRitual(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-ritual") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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
 * Completes a pending equipment choice (`destroy-equipment` with 2+ pieces).
 */
export function resolveChooseEquipment(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-equipment") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const creature = draft.creatures[pending.creatureId];
  if (creature === undefined || creature.defeated) return "INVALID_CHOICE";
  if (!creature.equipmentIds.includes(cardInstanceId)) return "INVALID_CHOICE";

  draft.pendingDecision = null;
  emit(draft, { type: "choose-equipment-resolved", playerId, cardInstanceId });
  destroyEquipment(draft, cardInstanceId);
  return resumeAfterEffectPause(draft);
}

/**
 * Completes a pending token-drain choice. The named pips must total the pending
 * amount and be a subset of the target creature owner's attribute pile
 * (spec `016`; creature id is targeting context only). Drain adds them to the
 * controller's pile.
 */
export function resolveChooseAttributeTokens(
  draft: Draft,
  playerId: PlayerId,
  discarded: SymbolRequirement,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-attribute-tokens") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const creature = draft.creatures[pending.creatureId];
  if (creature === undefined || creature.defeated) return "INVALID_CHOICE";
  const pileOwnerId = creature.ownerId;
  const pile = draft.players[pileOwnerId]?.attributePool ?? {};
  if (!isLegalTokenDiscardPick(pile, discarded, pending.amount)) {
    return "INVALID_CHOICE";
  }

  const mode = pending.mode ?? "drain";
  if (mode !== "drain") return "INVALID_CHOICE";

  const next = removeTokens(pile, discarded);
  const controllerPile = draft.players[playerId]?.attributePool ?? {};
  patchPlayer(draft, pileOwnerId, { attributePool: next });
  patchPlayer(draft, playerId, { attributePool: addTokens(controllerPile, discarded) });
  refreshRitualOrientations(draft, pileOwnerId);
  refreshRitualOrientations(draft, playerId);
  draft.pendingDecision = null;
  emit(draft, {
    type: "choose-attribute-tokens-resolved",
    playerId,
    creatureId: pending.creatureId,
    discarded,
  });
  emit(draft, {
    type: "attribute-tokens-drained",
    fromPlayerId: pileOwnerId,
    toPlayerId: playerId,
    drained: discarded,
    creatureId: pending.creatureId,
  });
  return resumeAfterEffectPause(draft);
}

/**
 * Completes a pending forge-from-effect. The controller names one legal die,
 * the pending number of slots, and one eligible face card.
 */
export function resolveForgeFaces(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardId: FaceCardId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "forge-faces") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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
    slotIndexes.some((index) => {
      const slot = die.slots[index];
      return slot !== undefined && slotCannotBeReplacedByForge(slot);
    })
  ) {
    return "INVALID_FACE";
  }

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
export function resolveReplaceSyntheticFace(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  faceCardId: FaceCardId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "replace-synthetic-face") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.ownerId !== playerId) return "INVALID_TARGET";

  const slot = die.slots[slotIndex];
  if (slot === undefined) return "INVALID_FACE";
  if (slotCannotBeReplacedByForge(slot)) return "INVALID_FACE";

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
  const slots = withForgeLockResetOnInstall(
    die.slots.map((candidate) =>
      candidate.index === slotIndex
        ? overwrittenSlot(candidate, faceCardId, playerId)
        : candidate,
    ),
    faceCardId,
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

export function resolveChooseDie(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId | null,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-die") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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

export function resolveConvertSymbols(
  draft: Draft,
  playerId: PlayerId,
  replacements: readonly {
    readonly symbolId: SymbolInstanceId;
    readonly into: DualKindAttribute;
  }[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "convert-symbols") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";
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

export function resolveCopyPoolSymbol(
  draft: Draft,
  playerId: PlayerId,
  symbol: SymbolType,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "copy-pool-symbol") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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

export function resolveReplayGraveyard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "replay-graveyard-tactic") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";
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
      pushEffect(draft, playerId, effect, null, null, null, null, null, 0, cardInstanceId);
    }
  }
  return resumeAfterEffectPause(draft);
}

export function resolveLookTopDeck(
  draft: Draft,
  playerId: PlayerId,
  keepId: CardInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "look-top-deck") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";
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

export function resolvePeekDeck(
  draft: Draft,
  playerId: PlayerId,
  putOnBottom: boolean,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "peek-deck") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const player = draft.players[playerId];
  draft.pendingDecision = null;
  if (putOnBottom && player !== undefined && player.deck[0] === pending.cardInstanceId) {
    patchPlayer(draft, playerId, {
      deck: [...player.deck.slice(1), pending.cardInstanceId],
    });
  }
  return resumeAfterEffectPause(draft);
}

export function resolveDarkPact(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceIds: readonly [CardInstanceId, CardInstanceId],
  rng: RNG,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "dark-pact") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";
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

export function resolveMindControl(
  draft: Draft,
  playerId: PlayerId,
  mode: "strip-one-face" | "strip-one-each",
  faceCardIds: readonly FaceCardId[],
  overloadInstanceIds: readonly CardInstanceId[] | undefined,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "mind-control") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const unique = [...new Set(faceCardIds)];
  const legal = opposingOverloadedFaceIds(draft, playerId);
  for (const faceCardId of unique) {
    if (!legal.includes(faceCardId)) return "INVALID_CHOICE";
  }

  if (mode === "strip-one-face") {
    // Print: remove every Overload from 1 opposing face — no extra pick.
    if (unique.length !== 1) return "INVALID_CHOICE";
    const faceCardId = unique[0];
    if (faceCardId === undefined) return "INVALID_CHOICE";
    for (const overloadId of overloadsAttachedToFace(draft, faceCardId)) {
      destroyOverload(draft, overloadId);
    }
  } else {
    if (unique.length < 1 || unique.length > 2) return "INVALID_CHOICE";
    const named = overloadInstanceIds;
    if (named !== undefined) {
      if (named.length !== unique.length) return "INVALID_CHOICE";
      if (new Set(named).size !== named.length) return "INVALID_CHOICE";
    }
    const chosen: CardInstanceId[] = [];
    for (const faceCardId of unique) {
      const attached = overloadsAttachedToFace(draft, faceCardId);
      if (attached.length === 0) return "INVALID_CHOICE";
      let pick: CardInstanceId | undefined;
      if (named !== undefined) {
        pick = named.find((id) => attached.includes(id));
        if (pick === undefined) return "INVALID_CHOICE";
      } else if (attached.length === 1) {
        pick = attached[0];
      } else {
        // Face has 2+ overloads: controller must name which instance.
        return "INVALID_CHOICE";
      }
      if (pick === undefined) return "INVALID_CHOICE";
      chosen.push(pick);
    }
    if (named !== undefined) {
      for (const id of named) {
        if (!chosen.includes(id)) return "INVALID_CHOICE";
      }
    }
    for (const overloadId of chosen) {
      destroyOverload(draft, overloadId);
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

export function resolveSplitDamage(
  draft: Draft,
  playerId: PlayerId,
  assignments: readonly { readonly creatureId: CreatureId; readonly amount: number }[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "split-damage") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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
  const fromAttack = pending.fromAttack === true;
  for (const entry of assignments) {
    if (entry.amount <= 0) continue;
    dealDamage(draft, entry.creatureId, entry.amount, { ignoreShield, fromAttack });
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

export function resolveOptionalReroll(
  draft: Draft,
  playerId: PlayerId,
  accept: boolean,
  rng: RNG,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "optional-reroll") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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

  if (slot?.faceCardId === originalFace && pending.sameFaceAllyDamage !== undefined) {
    const allies = livingCreaturesOf(draft, playerId);
    for (const ally of allies.slice(0, 2)) {
      dealDamage(draft, ally.id, pending.sameFaceAllyDamage);
    }
  }

  return resumeAfterEffectPause(draft);
}

export function resolveChooseDieSlot(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId | null,
  slotIndex: number | null,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-die-slot") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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

export function resolveChoosePoolSymbol(
  draft: Draft,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-pool-symbol") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";
  if (!pending.eligibleSymbolIds.includes(symbolId)) return "INVALID_CHOICE";

  draft.pendingDecision = null;
  applyPoolSymbolWildcard(draft, playerId, symbolId);
  return resumeAfterEffectPause(draft);
}

export function resolveOptionalOvercharge(
  draft: Draft,
  playerId: PlayerId,
  accept: boolean,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "optional-overcharge") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  draft.pendingDecision = null;
  if (accept) {
    applyOptionalOverchargeAccept(
      draft,
      playerId,
      pending.symbol,
      pending.amount,
      pending.dieId,
      pending.slotIndex,
    );
  }
  return resumeAfterEffectPause(draft);
}

export function resolveOptionalBonusAttack(
  draft: Draft,
  playerId: PlayerId,
  accept: boolean,
  attackId: AttackId | undefined,
  targetId: CreatureId | undefined,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "optional-bonus-attack") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

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

  // Instinct optional basic shares the combined actions window. Same pending
  // type; no extra action.
  const error = attack(draft, playerId, pending.creatureId, attackId, targetId);
  if (error !== null) return error;
  return resumeAfterEffectPause(draft);
}
