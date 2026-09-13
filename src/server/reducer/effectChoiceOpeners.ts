import type { EffectDefinition } from "../model/effects.js";
import type { PendingEffect } from "../model/state.js";
import { tryOpenBounceChoice } from "./bounceApply.js";
import { tryOpenDesynthesizeChoice } from "./desynthesize.js";
import { tryOpenSilenceChoice } from "./silenceApply.js";
import type { Draft } from "./draft.js";

/**
 * Mixed choosers that pause resolution before the opcode body. Each returns
 * `null` when the effect is not its kind; `true` paused; `false` legal whiff.
 * Kept out of `resolution.ts` so adding a chooser does not grow the freeze.
 */
export function tryOpenEffectChoice(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
): boolean | null {
  const silence = tryOpenSilenceChoice(draft, pending, effect);
  if (silence !== null) return silence;
  const bounce = tryOpenBounceChoice(draft, pending, effect);
  if (bounce !== null) return bounce;
  const desynthesize = tryOpenDesynthesizeChoice(draft, pending, effect);
  if (desynthesize !== null) return desynthesize;
  return null;
}
