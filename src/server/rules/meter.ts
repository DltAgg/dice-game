import type { PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";

/** Current Meter for a seat (spec `029`). Missing player → 0. */
export function meterOf(
  state: Pick<GameState, "players">,
  playerId: PlayerId,
): number {
  return state.players[playerId]?.meter ?? 0;
}

/** Clamp an amount into `0..cap` inclusive. */
export function clampMeter(amount: number, cap: number): number {
  if (cap < 0) return 0;
  if (amount < 0) return 0;
  if (amount > cap) return cap;
  return amount;
}

export function canSpendMeter(
  state: Pick<GameState, "players">,
  playerId: PlayerId,
  amount: number,
): boolean {
  if (amount <= 0) return true;
  return meterOf(state, playerId) >= amount;
}
