import {
  currentLife,
  livingCreaturesOf,
  opponentOf,
  totalTokens,
  type GameState,
  type PlayerId,
} from "@server";

export const EVAL_WIN = 100_000;
export const EVAL_LOSS = -100_000;

function side(state: GameState, playerId: PlayerId): number {
  const living = livingCreaturesOf(state, playerId);
  let life = 0;
  let shields = 0;
  let toxin = 0;
  let attacksLeft = 0;
  for (const creature of living) {
    life += currentLife(creature);
    shields += creature.shields;
    toxin += creature.toxinMarkers;
    const allowance =
      state.config.attacksPerCreaturePerCombat + creature.extraAttacksThisTurn;
    attacksLeft += Math.max(0, allowance - creature.attacksUsedThisCombat);
  }
  const player = state.players[playerId];
  const pile = totalTokens(player?.attributePool ?? {});
  const hand = player?.hand.length ?? 0;
  const board =
    (player?.equipment.length ?? 0) +
    (player?.overload.length ?? 0) +
    (player?.ritual.length ?? 0);
  return (
    living.length * 120 +
    life * 8 +
    shields * 6 +
    pile * 3 +
    hand * 2 +
    board * 5 +
    attacksLeft * 4 -
    toxin * 7
  );
}

/** Position value for `playerId` (positive = winning). Terminal wins dominate. */
export function evaluate(state: GameState, playerId: PlayerId): number {
  if (state.status === "finished") {
    if (state.winner === playerId) return EVAL_WIN;
    if (state.winner === null) return 0;
    return EVAL_LOSS;
  }
  return side(state, playerId) - side(state, opponentOf(state, playerId));
}

/** Maps eval into (-1, 1) so UCB1 does not drown in life totals. */
export function normalizeEval(value: number): number {
  if (value >= EVAL_WIN / 2) return 1;
  if (value <= EVAL_LOSS / 2) return -1;
  return Math.tanh(value / 400);
}
