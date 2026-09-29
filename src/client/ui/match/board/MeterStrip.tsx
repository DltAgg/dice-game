import type { GameState, PlayerId } from "@server";

export function MeterStrip({
  state,
  playerId,
}: {
  state: GameState;
  playerId: PlayerId;
}) {
  const player = state.players[playerId];
  if (player === undefined) return null;
  const cap = state.config.meterCap;
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300">
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Meter
        </span>
        <span className="font-mono text-[var(--accent)]">
          {player.meter}/{cap}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Combo
        </span>
        <span className="font-mono text-amber-200/90">{player.comboCount}</span>
      </span>
    </div>
  );
}
