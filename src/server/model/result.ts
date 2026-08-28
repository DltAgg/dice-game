import type { GameError } from "./errors.js";
import type { GameState } from "./state.js";

/**
 * SPDD §35: an illegal action must leave the state unchanged. The failure case
 * carries the *original* state object so that the guarantee is testable by
 * reference identity rather than by deep comparison.
 */
export type ReduceResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: GameError; readonly state: GameState };

export const ok = (state: GameState): ReduceResult => ({ ok: true, state });

export const fail = (state: GameState, error: GameError): ReduceResult => ({
  ok: false,
  error,
  state,
});
