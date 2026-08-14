import type { CardDefinition } from "../model/cards.js";
import type { EffectDefinition } from "../model/effects.js";
import type { ChainLink, GameState } from "../model/state.js";
import {
  isNegatableLinkKind,
  isRitualNegatableLinkKind,
} from "../reducer/chain.js";

/** Top of the reaction chain (LILO), or `undefined` when empty. */
export function topChainLinkOf(state: GameState): ChainLink | undefined {
  return state.chainStack[state.chainStack.length - 1];
}

/**
 * Whether a response body's negate effects are legal against the current top
 * link. Mirrors the chain-target checks in `PLAY_CARD` / `ACTIVATE_RITUAL`
 * (spec `008`). Does not check energy, phase, or reaction subtype.
 */
export function negateEffectsLegalAgainstTop(
  state: GameState,
  effects: readonly EffectDefinition[],
): boolean {
  const top = topChainLinkOf(state);
  if (effects.some((effect) => effect.type === "negate-tactic")) {
    if (top === undefined || top.negated || !isNegatableLinkKind(top.kind)) {
      return false;
    }
  }
  if (effects.some((effect) => effect.type === "negate-ritual")) {
    if (top === undefined || top.negated || !isRitualNegatableLinkKind(top.kind)) {
      return false;
    }
  }
  return true;
}

/** Hand reaction legal to offer during a reaction window (chain-target gate). */
export function isLegalHandReaction(state: GameState, definition: CardDefinition): boolean {
  if (!definition.subtypes.includes("reaction") || definition.effect === undefined) {
    return false;
  }
  return negateEffectsLegalAgainstTop(state, definition.effect.effects);
}

/** Ready ritual-reaction legal to offer during a reaction window (chain-target gate). */
export function isLegalRitualReaction(state: GameState, definition: CardDefinition): boolean {
  if (!definition.subtypes.includes("reaction") || definition.ritual === undefined) {
    return false;
  }
  return negateEffectsLegalAgainstTop(state, definition.ritual.effects);
}
