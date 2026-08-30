import { getCard } from "../../content/cards.js";
import type { GameError } from "../../model/errors.js";
import type { CardInstanceId, CreatureId, PlayerId } from "../../model/ids.js";
import type { ChainLink } from "../../model/state.js";
import type { AttributeTokens, SymbolRequirement } from "../../model/symbols.js";
import { isReactionCard, ritualDurationOf } from "../../rules/cards.js";
import {
  holdsTokensWithWildcards,
  pileRequirementShortfall,
} from "../../rules/tokens.js";
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
import { consumeRequirementWildcards, payPileSpend } from "../payments.js";
import { moveCard, setRitualOrientation } from "../zones.js";

/**
 * Activates a ready Ritual that has an activate body (`ritual.effects`).
 * Standing-only continuous rituals cannot be activated. Non-continuous rituals
 * (Instant / Reaction) leave for the graveyard after resolving; continuous
 * ones with an activate body exhaust until the owner's next turn (banked
 * Active-when symbols stay).
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

  if (
    region.activeWhen !== undefined &&
    !holdsTokensWithWildcards(
      draft.players[playerId]?.attributePool ?? {},
      region.activeWhen,
      draft.requirementWildcardsThisTurn[playerId]?.length ?? 0,
    )
  ) {
    return "INSUFFICIENT_SYMBOLS";
  }

  if (region.spend !== undefined) {
    const pile = draft.players[playerId]?.attributePool ?? {};
    const activeWhenShort =
      region.activeWhen === undefined
        ? 0
        : pileRequirementShortfall(pile, region.activeWhen);
    const wildcards = draft.requirementWildcardsThisTurn[playerId]?.length ?? 0;
    const remaining = wildcards - activeWhenShort;
    if (pileRequirementShortfall(pile, region.spend) > remaining) {
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

  if (region.activeWhen !== undefined) {
    const pile = draft.players[playerId]?.attributePool ?? {};
    const short = pileRequirementShortfall(pile, region.activeWhen);
    if (short > 0) consumeRequirementWildcards(draft, playerId, short);
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
 * Flip preparing → ready when the owner's attribute pile (plus Resonance
 * wildcards) meets Active-when (spec `016`). Rituals with no Active-when are
 * ready as soon as they hit the field. Implementation lives in `zones.ts` so
 * resolution can refresh too.
 */
function pileMeetsActiveWhen(
  progress: AttributeTokens,
  requirement: SymbolRequirement,
  wildcardCount = 0,
): boolean {
  return holdsTokensWithWildcards(progress, requirement, wildcardCount);
}

/**
 * Once-per-turn rituals come off diagonal at the start of the owner's turn.
 * Ready vs preparing is re-checked against the owner's attribute pile.
 */
export function resetExhaustedRituals(draft: Draft, playerId: PlayerId): void {
  const player = draft.players[playerId];
  if (player === undefined) return;
  const pile = player.attributePool;
  const wildcards = draft.requirementWildcardsThisTurn[playerId]?.length ?? 0;

  for (const cardInstanceId of player.ritual) {
    const card = draft.cards[cardInstanceId];
    if (card === undefined) continue;

    if (card.ritualOrientation === "exhausted") {
      const region = getCard(card.cardId)?.ritual;
      const ready =
        region === undefined ||
        region.activeWhen === undefined ||
        pileMeetsActiveWhen(pile, region.activeWhen, wildcards);
      const orientation = ready ? "ready" : "preparing";
      draft.cards[cardInstanceId] = {
        ...card,
        ritualOrientation: orientation,
      };
      emit(draft, {
        type: "ritual-orientation-changed",
        cardInstanceId,
        orientation,
      });
    }
  }
}

export function finishRitualActivation(draft: Draft, link: ChainLink): void {
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
