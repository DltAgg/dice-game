import type { GameError } from "../../model/errors.js";
import type { CardInstanceId, CreatureId, PlayerId } from "../../model/ids.js";
import type { ChainLink } from "../../model/state.js";
import { isReactionCard, ritualDurationOf } from "../../rules/cards.js";
import { pileRequirementShortfall } from "../../rules/tokens.js";
import {
  buildEffectLink,
  cardCommittedToChain,
  isRitualNegatableLinkKind,
  linkMatchesNegateCard,
  openReactionWindow,
  pushChainLink,
  topChainLink,
} from "../chain.js";
import { emit, type Draft } from "../draft.js";
import { payPileSpend } from "../payments.js";
import { moveCard, setRitualOrientation } from "../zones.js";

/**
 * Activates a ready Ritual that has an activate body (`ritual.effects`).
 * Standing-only continuous rituals cannot be activated. Continuous and
 * reaction rituals with an activate body stay and exhaust until the owner's
 * next turn. Active-when is a one-time unlock — ready rituals do not re-check
 * the pile gate on activate. Leftover instant-subtype rituals still leave for
 * the graveyard after resolving.
 */
export function activateRitual(
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

  if (region.spend !== undefined) {
    const pile = draft.players[playerId]?.attributePool ?? {};
    const wildcards = draft.requirementWildcardsThisTurn[playerId]?.length ?? 0;
    if (pileRequirementShortfall(pile, region.spend) > wildcards) {
      return "INSUFFICIENT_SYMBOLS";
    }
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

  if (region.spend !== undefined) {
    const spendError = payPileSpend(draft, playerId, region.spend);
    if (spendError !== null) return spendError;
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
 * Once-per-turn rituals come off diagonal at the start of the owner's turn.
 * Active-when is a one-time unlock: exhausted rituals that were already ready
 * return to ready; only `preparing` rituals still need the pile gate (via
 * `refreshRitualOrientations`).
 */
export function resetExhaustedRituals(draft: Draft, playerId: PlayerId): void {
  const player = draft.players[playerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.ritual) {
    const card = draft.cards[cardInstanceId];
    if (card === undefined || card.ritualOrientation !== "exhausted") continue;
    setRitualOrientation(draft, cardInstanceId, "ready");
  }
}

export function finishRitualActivation(draft: Draft, link: ChainLink): void {
  if (link.cardInstanceId === null) return;
  const card = draft.cards[link.cardInstanceId];
  if (card === undefined || card.zone !== "ritual") return;

  if (link.ritualDuration === "continuous") {
    setRitualOrientation(draft, link.cardInstanceId, "exhausted");
  } else {
    // Leftover instant subtype or unspecified → one-shot: leave the field.
    moveCard(draft, link.cardInstanceId, "graveyard");
  }
}
