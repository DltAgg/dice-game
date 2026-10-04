import { getCard } from "../../content/cards.js";
import type { CardDefinition } from "../../model/cards.js";
import type { ChainLink } from "../../model/state.js";
import type { GameError } from "../../model/errors.js";
import type {
  CardInstanceId,
  CreatureId,
  DieId,
  FaceCardId,
  PlayerId,
} from "../../model/ids.js";
import { isReactionCard, lifecycleOf } from "../../rules/cards.js";
import { behaviorPlayError } from "../../rules/cardBehavior.js";
import { cardRestrictionError } from "../../rules/fighters.js";
import { playEffectsRefusal } from "../../rules/reforge.js";
import {
  buildEffectLink,
  buildEquipLink,
  buildOverloadLink,
  buildRitualPlaceLink,
  cardCommittedToChain,
  isRitualNegatableLinkKind,
  linkMatchesNegateCard,
  openReactionWindow,
  pushChainLink,
  topChainLink,
} from "../chain.js";
import { emit, type Draft } from "../draft.js";
import { spendMeter } from "../meter.js";
import { payCardRequires, payHeaderCost } from "../payments.js";
import { moveCard, overloadFitsFace } from "../zones.js";

/**
 * The effect region — Instant resolve, Equipment / Overload attach, or Ritual
 * place. A card with none of those modelled regions can still be forged, so
 * refusing it here is what stops an unimplemented subtype resolving to nothing.
 */
export function playCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  declaredTargetCreatureId: CreatureId | null,
  declaredFaceCardId: FaceCardId | null,
  options: {
    readonly mode?: "normal" | "exceptional";
    readonly dieId?: DieId | null;
    readonly slotIndex?: number | null;
    readonly techniqueId?: string | null;
  } = {},
): GameError | null {
  const inReactionWindow = draft.pendingDecision?.type === "reaction-priority";
  if (!inReactionWindow && draft.phase !== "actions") return "INVALID_PHASE";

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "hand") return "CARD_NOT_AVAILABLE";
  if (cardCommittedToChain(draft, cardInstanceId)) return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  if (definition === undefined) return "UNKNOWN_ENTITY";

  const restriction = cardRestrictionError(draft, playerId, definition);
  if (restriction !== null) return restriction;

  const mode = options.mode ?? "normal";
  const behaviorError = behaviorPlayError(draft, playerId, definition, {
    mode,
    dieId: options.dieId ?? null,
    slotIndex: options.slotIndex ?? null,
    faceCardId: declaredFaceCardId,
    techniqueId: options.techniqueId ?? null,
    targetCreatureId: declaredTargetCreatureId,
  });
  if (behaviorError !== null) return behaviorError;

  // During a reaction window only a Response, a ritual reaction, or a
  // Modify that names a subject may be added.
  if (
    inReactionWindow &&
    !isReactionCard(definition) &&
    definition.modifySubject === undefined
  ) {
    return "CARD_NOT_AVAILABLE";
  }

  if (definition.equipment !== undefined) {
    if (inReactionWindow) return "CARD_NOT_AVAILABLE";
    return equipCard(draft, playerId, cardInstanceId, definition, declaredTargetCreatureId);
  }
  if (definition.overload !== undefined) {
    if (inReactionWindow) return "CARD_NOT_AVAILABLE";
    return overloadCard(draft, playerId, cardInstanceId, definition, declaredFaceCardId);
  }
  if (definition.ritual !== undefined) {
    if (inReactionWindow) return "CARD_NOT_AVAILABLE";
    return placeRitualCard(draft, playerId, cardInstanceId, definition);
  }

  const region = definition.effect;
  if (region === undefined && definition.modifySubject === undefined) return "CARD_HAS_NO_EFFECT";
  const effects = region?.effects ?? [];

  if (declaredTargetCreatureId !== null) {
    const target = draft.creatures[declaredTargetCreatureId];
    if (target === undefined) return "UNKNOWN_ENTITY";
    if (target.defeated) return "CREATURE_DEFEATED";
  }

  // `[Requires]` gate first (hold, not burn), then header `[Spend]`.
  if (region !== undefined && region.requires !== undefined) {
    const requiresError = payCardRequires(draft, playerId, region.requires);
    if (requiresError !== null) return requiresError;
  }

  // Negate / prevent reactions need a legal top link.
  for (const effect of effects) {
    if (effect.type !== "negate-card") continue;
    const top = topChainLink(draft);
    if (top === undefined || !linkMatchesNegateCard(draft, top, effect.cardTypes)) {
      return "INVALID_CHAIN_TARGET";
    }
  }
  if (effects.some((effect) => effect.type === "negate-ritual")) {
    const top = topChainLink(draft);
    if (top === undefined || top.negated || !isRitualNegatableLinkKind(top.kind)) {
      return "INVALID_CHAIN_TARGET";
    }
  }
  if (
    effects.some(
      (effect) =>
        effect.type === "grant-attack-prevent" || effect.type === "prevent-attack-reflect",
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
  if (effects.some((effect) => effect.type === "arm-prevent-draw")) {
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

  const reforgeError = playEffectsRefusal(draft, playerId, definition);
  if (reforgeError !== null) return reforgeError;

  const headerCostError = payHeaderCost(draft, playerId, definition, true);
  if (headerCostError !== null) return headerCostError;
  const meterError = spendMeter(draft, playerId, definition.meterCost ?? 0);
  if (meterError !== null) return meterError;
  if (mode === "exceptional") {
    const exceptional = spendMeter(draft, playerId, definition.exceptionalMeterCost ?? 0);
    if (exceptional !== null) return exceptional;
  }

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: card.cardId });
  // A moveset Modify stays in hand until it resolves onto the Fighter.
  // One-shot leaves the hand for the graveyard now. A named destination is
  // applied when the link resolves. Persistent stays in the in-play list.
  if (definition.modifySubject !== "moveset") {
    if (lifecycleOf(definition) === "persistent") {
      moveCard(draft, cardInstanceId, "ritual");
    } else {
      moveCard(draft, cardInstanceId, "graveyard");
    }
  }

  const baseLink = {
    ...buildEffectLink({
      kind: "tactic-effect" as const,
      controllerId: playerId,
      cardInstanceId,
      effects,
      sourceCreatureId: null,
      declaredTargetCreatureId,
    }),
    seizesOffense: definition.seizesOffense === true,
  };
  pushChainLink(
    draft,
    definition.type === "modify" && definition.modifySubject !== undefined
      ? {
          ...baseLink,
          modify: {
            subject: definition.modifySubject,
            dieId: options.dieId ?? null,
            slotIndex: options.slotIndex ?? null,
            faceCardId: declaredFaceCardId,
            techniqueId: options.techniqueId ?? null,
          },
        }
      : baseLink,
  );
  const keepPriority =
    definition.type === "response" ||
    definition.modifySubject !== undefined ||
    draft.chainStack.some((link) => link.kind === "combat-action");
  openReactionWindow(draft, playerId, keepPriority ? "same" : "opponent");
  return null;
}

/** One-shot destination override. Default discard already happened at play. */
export function relocateResolvedOneShot(draft: Draft, link: ChainLink): void {
  if (link.cardInstanceId === null) return;
  const card = draft.cards[link.cardInstanceId];
  if (card === undefined) return;
  const definition = getCard(card.cardId);
  const zone = definition?.afterResolveZone;
  if (definition === undefined || lifecycleOf(definition) !== "one-shot" || zone === undefined) {
    return;
  }
  if (card.zone === zone) return;
  moveCard(draft, card.id, zone);
}

function equipCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  definition: NonNullable<ReturnType<typeof getCard>>,
  declaredTargetCreatureId: CreatureId | null,
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

  const headerCostError = payHeaderCost(draft, playerId, definition, true);
  if (headerCostError !== null) return headerCostError;
  const meterError = spendMeter(draft, playerId, definition.meterCost ?? 0);
  if (meterError !== null) return meterError;

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });
  // Stay in hand until the chain link resolves (or is negated → GY).

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
): GameError | null {
  if (declaredFaceCardId === null) return "INVALID_TARGET";
  if (!overloadFitsFace(draft, cardInstanceId, declaredFaceCardId, playerId)) {
    return "INVALID_TARGET";
  }

  const headerCostError = payHeaderCost(draft, playerId, definition, true);
  if (headerCostError !== null) return headerCostError;
  const meterError = spendMeter(draft, playerId, definition.meterCost ?? 0);
  if (meterError !== null) return meterError;

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });

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
): GameError | null {
  const headerCostError = payHeaderCost(draft, playerId, definition, true);
  if (headerCostError !== null) return headerCostError;
  const meterError = spendMeter(draft, playerId, definition.meterCost ?? 0);
  if (meterError !== null) return meterError;

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: definition.id });

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
