import { getCard } from "../content/cards.js";
import type { CardDefinition } from "../model/cards.js";
import type { EffectDefinition } from "../model/effects.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { ChainLink, GameState } from "../model/state.js";
import {
  isRitualNegatableLinkKind,
  linkMatchesNegateCard,
} from "../reducer/chain.js";
import type { Draft } from "../reducer/draft.js";
import { handOf, isReactionCard, ritualsOf } from "./cards.js";

/** Top of the reaction chain (LILO), or `undefined` when empty. */
export function topChainLinkOf(state: GameState): ChainLink | undefined {
  return state.chainStack[state.chainStack.length - 1];
}

/**
 * Whether a response body's negate effects are legal against the current top
 * link. Mirrors the chain-target checks in `PLAY_CARD` / `ACTIVATE_RITUAL`
 * (spec `008`). Does not check pile tokens, phase, or reaction subtype.
 */
export function negateEffectsLegalAgainstTop(
  state: GameState,
  effects: readonly EffectDefinition[],
): boolean {
  const top = topChainLinkOf(state);
  const draft = state as Draft;
  for (const effect of effects) {
    if (effect.type === "negate-card") {
      if (top === undefined || !linkMatchesNegateCard(draft, top, effect.cardTypes)) {
        return false;
      }
    }
    if (effect.type === "negate-ritual") {
      if (top === undefined || top.negated || !isRitualNegatableLinkKind(top.kind)) {
        return false;
      }
    }
  }
  return true;
}

/** Hand reaction legal to offer during a reaction window (chain-target gate). */
export function isLegalHandReaction(state: GameState, definition: CardDefinition): boolean {
  if (!isReactionCard(definition) || definition.effect === undefined) {
    return false;
  }
  return negateEffectsLegalAgainstTop(state, definition.effect.effects);
}

/** Ready ritual-reaction legal to offer during a reaction window (chain-target gate). */
export function isLegalRitualReaction(state: GameState, definition: CardDefinition): boolean {
  if (!isReactionCard(definition) || definition.ritual === undefined) {
    return false;
  }
  return negateEffectsLegalAgainstTop(state, definition.ritual.effects);
}

/**
 * Prevent reactions (Barrier / Judgement / Glimmer) need an attack targeting
 * this seat's creature. Mirrors PLAY_CARD chain-target checks (spec `009`).
 * Cards with no prevent effects are vacuously legal here.
 */
export function preventEffectsLegalAgainstChain(
  state: GameState,
  playerId: PlayerId,
  effects: readonly EffectDefinition[],
): boolean {
  const needsTopAttackPrevent = effects.some(
    (effect) =>
      effect.type === "grant-attack-prevent" || effect.type === "prevent-attack-reflect",
  );
  if (needsTopAttackPrevent) {
    const top = topChainLinkOf(state);
    if (top === undefined || top.kind !== "attack" || top.attackTargetId === null) {
      return false;
    }
    const attackTarget = state.creatures[top.attackTargetId];
    if (attackTarget === undefined || attackTarget.ownerId !== playerId) {
      return false;
    }
  }

  const needsArmedPreventDraw = effects.some((effect) => effect.type === "arm-prevent-draw");
  if (needsArmedPreventDraw) {
    let attackTargetId: CreatureId | null = null;
    for (let i = state.chainStack.length - 1; i >= 0; i -= 1) {
      const link = state.chainStack[i];
      if (link?.kind === "attack" && link.attackTargetId !== null) {
        attackTargetId = link.attackTargetId;
        break;
      }
    }
    if (attackTargetId === null) return false;
    const attackTarget = state.creatures[attackTargetId];
    if (attackTarget === undefined || attackTarget.ownerId !== playerId) {
      return false;
    }
  }

  return true;
}

/**
 * Same gate as MatchBoard `canRespond`: chain-legal hand Reaction, including
 * prevent vs the current chain (reactions may pay `playCost` without the
 * marker).
 */
export function isEnabledHandReaction(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
): boolean {
  if (!isLegalHandReaction(state, definition)) return false;
  return preventEffectsLegalAgainstChain(state, playerId, definition.effect?.effects ?? []);
}

/**
 * Same gate as MatchBoard ritual `canActivate` in a reaction window: ready is
 * the caller's job; this is chain-legal ritual-reaction with an activate body.
 */
export function isEnabledRitualReaction(state: GameState, definition: CardDefinition): boolean {
  if ((definition.ritual?.effects.length ?? 0) === 0) return false;
  return isLegalRitualReaction(state, definition);
}

/**
 * Whether the priority seat has any Respond / ritual-activate offer the board
 * would enable. Query only — does not pass, spend, or mutate.
 */
export function hasLegalReactionOffer(state: GameState, playerId: PlayerId): boolean {
  for (const card of handOf(state, playerId)) {
    const definition = getCard(card.cardId);
    if (definition !== undefined && isEnabledHandReaction(state, playerId, definition)) {
      return true;
    }
  }
  for (const card of ritualsOf(state, playerId)) {
    if (card.ritualOrientation !== "ready") continue;
    const definition = getCard(card.cardId);
    if (definition !== undefined && isEnabledRitualReaction(state, definition)) {
      return true;
    }
  }
  return false;
}
