import {
  useState,
} from "react";
import {
  getCard,
  getFaceCard,
  type CardInstance,
  type CardInstanceId,
  type FaceCardId,
  type GameState,
  type PlayerId,
} from "@server";
import {
  opposingOverloadedFaces,
} from "../intents/legalChoices";
import {
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function MindControlModal({
  state,
  controllerId,
  onConfirm,
}: {
  state: GameState;
  controllerId: PlayerId;
  onConfirm: (
    mode: "strip-one-face" | "strip-one-each",
    faceCardIds: readonly FaceCardId[],
    overloadInstanceIds?: readonly CardInstanceId[],
  ) => void;
}) {
  const [mode, setMode] = useState<"strip-one-face" | "strip-one-each">("strip-one-face");
  const [pick, setPick] = useState<readonly FaceCardId[]>([]);
  const [overloadPick, setOverloadPick] = useState<Readonly<Partial<Record<string, CardInstanceId>>>>(
    {},
  );
  const faces = opposingOverloadedFaces(state, controllerId);
  const maxPick = mode === "strip-one-face" ? 1 : 2;

  const toggle = (faceCardId: FaceCardId, overloads: readonly CardInstance[]) => {
    setPick((prev) => {
      if (prev.includes(faceCardId)) {
        setOverloadPick((current) => {
          const next = { ...current };
          delete next[faceCardId];
          return next;
        });
        return prev.filter((id) => id !== faceCardId);
      }
      if (prev.length >= maxPick) return prev;
      if (overloads.length === 1 && overloads[0] !== undefined) {
        setOverloadPick((current) => ({ ...current, [faceCardId]: overloads[0]!.id }));
      }
      return [...prev, faceCardId];
    });
  };

  const stripEachReady =
    pick.length >= 1 &&
    pick.length <= 2 &&
    pick.every((faceCardId) => {
      const row = faces.find((entry) => entry.faceCardId === faceCardId);
      if (row === undefined) return false;
      if (row.overloads.length === 1) return true;
      const chosen = overloadPick[faceCardId];
      return chosen !== undefined && row.overloads.some((card) => card.id === chosen);
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Mind Control
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Strip overloads from opposing faces that currently have them.
        </p>
        <CausedByLine state={state} />
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className={
              mode === "strip-one-face"
                ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left text-sm text-[var(--accent)]"
                : "rounded border border-stone-700 px-3 py-2 text-left text-sm text-stone-200 hover:border-stone-500"
            }
            onClick={() => {
              setMode("strip-one-face");
              setPick((prev) => prev.slice(0, 1));
            }}
          >
            Strip all overloads from 1 face
          </button>
          <button
            type="button"
            className={
              mode === "strip-one-each"
                ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left text-sm text-[var(--accent)]"
                : "rounded border border-stone-700 px-3 py-2 text-left text-sm text-stone-200 hover:border-stone-500"
            }
            onClick={() => setMode("strip-one-each")}
          >
            Strip 1 overload from each of up to 2 faces
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {faces.map(({ faceCardId, overloads }) => {
            const face = getFaceCard(faceCardId);
            const checked = pick.includes(faceCardId);
            return (
              <li key={faceCardId} className="rounded border border-stone-800 p-2">
                <button
                  type="button"
                  className={
                    checked
                      ? "w-full rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left"
                      : "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-stone-500"
                  }
                  disabled={!checked && pick.length >= maxPick}
                  onClick={() => toggle(faceCardId, overloads)}
                >
                  <p className="text-sm font-medium text-stone-100">{face?.name ?? faceCardId}</p>
                  <p className="text-xs text-stone-500">
                    {String(overloads.length)} overload{overloads.length === 1 ? "" : "s"}
                  </p>
                </button>
                {mode === "strip-one-each" && checked && overloads.length > 1 && (
                  <ul className="mt-2 space-y-1 pl-2">
                    {overloads.map((card) => {
                      const def = getCard(card.cardId);
                      const selected = overloadPick[faceCardId] === card.id;
                      return (
                        <li key={card.id}>
                          <button
                            type="button"
                            className={
                              selected
                                ? "w-full rounded border border-[var(--accent)] px-2 py-1 text-left text-xs text-[var(--accent)]"
                                : "w-full rounded border border-stone-700 px-2 py-1 text-left text-xs text-stone-300 hover:border-stone-500"
                            }
                            onClick={() =>
                              setOverloadPick((current) => ({ ...current, [faceCardId]: card.id }))
                            }
                          >
                            {def?.name ?? card.cardId}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
          {faces.length === 0 && (
            <li className="text-sm text-red-300">No opposing faces with overloads.</li>
          )}
        </ul>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={mode === "strip-one-face" ? pick.length !== 1 : !stripEachReady}
          onClick={() => {
            if (mode === "strip-one-face") {
              onConfirm(mode, pick);
              return;
            }
            const ids = pick.flatMap((faceCardId) => {
              const row = faces.find((entry) => entry.faceCardId === faceCardId);
              if (row === undefined) return [];
              const named = overloadPick[faceCardId];
              if (named !== undefined) return [named];
              const [only] = row.overloads;
              return only === undefined ? [] : [only.id];
            });
            onConfirm(mode, pick, ids);
          }}
        >
          Confirm Mind Control
        </button>
      </div>
    </div>
  );
}
