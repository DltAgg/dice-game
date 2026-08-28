import { getCard } from "../../content/cards.js";
import { getCreatureDefinition } from "../../content/creatures.js";
import type { CardDefinition } from "../../model/cards.js";
import type { GameError } from "../../model/errors.js";
import type {
  CardInstanceId,
  CreatureId,
  FaceCardId,
  PlayerId,
} from "../../model/ids.js";
import { isReactionCard } from "../../rules/cards.js";
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
  if (region === undefined) return "CARD_HAS_NO_EFFECT";

  if (declaredTargetCreatureId !== null) {
    const target = draft.creatures[declaredTargetCreatureId];
    if (target === undefined) return "UNKNOWN_ENTITY";
    if (target.defeated) return "CREATURE_DEFEATED";
  }

  if (region.requires !== undefined) {
    const requiresError = payCardRequires(draft, playerId, region.requires);
    if (requiresError !== null) return requiresError;
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

  const headerCostError = payHeaderCost(draft, playerId, definition, true);
  if (headerCostError !== null) return headerCostError;

  emit(draft, { type: "card-played", playerId, cardInstanceId, cardId: card.cardId });
  moveCard(draft, cardInstanceId, "graveyard");

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

  const headerCostError = payHeaderCost(draft, playerId, definition, true);
  if (headerCostError !== null) return headerCostError;

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
