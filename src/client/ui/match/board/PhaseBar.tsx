import {
  TURN_PHASE_ORDER,
  type GameState,
  type TurnPhase,
} from "@server";

export const PHASE_LABELS: Record<TurnPhase, string> = {
  roll: "Roll",
  actions: "Actions",
};

export function PhaseBar({
  state,
  canAct,
  onGoToPhase,
  onEndTurn,
}: {
  state: GameState;
  canAct: boolean;
  onGoToPhase: (phase: TurnPhase) => void;
  onEndTurn: () => void;
}) {
  const currentIndex = TURN_PHASE_ORDER.indexOf(state.phase);
  const controlsLocked =
    !canAct || state.status === "finished" || state.pendingDecision !== null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-[var(--accent)]/30 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {TURN_PHASE_ORDER.map((phase, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const canJump = !controlsLocked && !isPast && !isCurrent && state.phase !== "roll";
          return (
            <button
              key={phase}
              type="button"
              disabled={controlsLocked || !canJump}
              aria-current={isCurrent ? "step" : undefined}
              title={
                isCurrent
                  ? `Current phase: ${PHASE_LABELS[phase]}`
                  : canJump
                    ? `Skip to ${PHASE_LABELS[phase]}`
                    : PHASE_LABELS[phase]
              }
              className={
                isCurrent
                  ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-2.5 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-100"
                  : canJump
                    ? "rounded border border-stone-600 bg-stone-900/80 px-2.5 py-1 text-xs text-stone-200 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    : "rounded border border-stone-800 bg-stone-950/50 px-2.5 py-1 text-xs text-stone-600"
              }
              onClick={() => {
                if (canJump) onGoToPhase(phase);
              }}
            >
              {PHASE_LABELS[phase]}
            </button>
          );
        })}
        <button
          type="button"
          disabled={controlsLocked}
          title="End turn"
          className={
            controlsLocked
              ? "rounded border border-stone-800 bg-stone-950/50 px-2.5 py-1 text-xs text-stone-600"
              : "rounded border border-amber-700/60 bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-200 hover:border-amber-500 hover:text-amber-100"
          }
          onClick={onEndTurn}
        >
          End turn
        </button>
      </div>
    </div>
  );
}
