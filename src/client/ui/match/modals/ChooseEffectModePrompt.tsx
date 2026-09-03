import type { GameState } from "@server";
import { CausedByLine } from "../tooltips/decisionSource";

export function ChooseEffectModePrompt({
  state,
  pending,
  onResolve,
}: {
  state: GameState;
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "choose-effect-mode" }>;
  onResolve: (modeIndex: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-sm overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose a mode
        </h2>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {pending.modeLabels.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                className="w-full rounded border border-stone-700 bg-stone-900 px-4 py-3 text-left text-sm font-medium text-stone-100 hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
                onClick={() => onResolve(index)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
