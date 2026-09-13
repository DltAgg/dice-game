import { useState } from "react";
import {
  attributeLabel,
  eligiblePoolFacesForReforge,
  getFaceCard,
  legalSlotsForReplaceSyntheticFace,
  type DieId,
  type FaceCardId,
  type GameState,
} from "@server";
import { slotStatusLine } from "../intents/faceStatus";
import { FacePickModal } from "./FacePickModal";
import { CausedByLine } from "../tooltips/decisionSource";
import { FaceInspectHover } from "../tooltips/inspectHovers";

export function ReplaceSyntheticFacePrompt({
  state,
  pending,
  onResolve,
}: {
  state: GameState;
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "replace-synthetic-face" }>;
  onResolve: (pick: {
    readonly dieId: DieId;
    readonly slotIndexes: readonly number[];
    readonly faceCardIds: readonly FaceCardId[];
  }) => void;
}) {
  const spec = {
    faces: pending.faces,
    attribute: pending.attribute,
    ...(pending.fromAttribute !== undefined ? { fromAttribute: pending.fromAttribute } : {}),
  };
  const legalSlots = legalSlotsForReplaceSyntheticFace(state, pending.controllerId, spec);
  const pool = eligiblePoolFacesForReforge(state, pending.controllerId, pending.attribute);
  const destLabel = attributeLabel(pending.attribute);
  const sourceLabel =
    pending.fromAttribute !== undefined ? attributeLabel(pending.fromAttribute) : null;

  const [dieId, setDieId] = useState<DieId | undefined>();
  const [slotIndexes, setSlotIndexes] = useState<readonly number[]>([]);
  const [faceCardIds, setFaceCardIds] = useState<readonly FaceCardId[]>([]);

  const labelForDie = (id: DieId): string => {
    const player = state.players[pending.controllerId];
    if (player === undefined) return id;
    const index = player.dieIds.indexOf(id);
    return index >= 0 ? `Your die ${String(index + 1)}` : id;
  };

  const toggleSlot = (nextDie: DieId, slotIndex: number) => {
    if (dieId !== undefined && nextDie !== dieId) {
      setDieId(nextDie);
      setSlotIndexes([slotIndex]);
      return;
    }
    setDieId(nextDie);
    setSlotIndexes((current) => {
      if (current.includes(slotIndex)) return current.filter((index) => index !== slotIndex);
      if (current.length >= pending.faces) return current;
      return [...current, slotIndex];
    });
  };

  if (dieId === undefined || slotIndexes.length < pending.faces) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            {sourceLabel === null ? "Reforge" : "Cross forge"}
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {sourceLabel === null
              ? `Choose ${String(pending.faces)} replaceable face${pending.faces === 1 ? "" : "s"} on one of your dice. You will install ${String(pending.faces)} synthetic ${destLabel} face${pending.faces === 1 ? "" : "s"} from your pool (no forge-draw).`
              : `Choose ${String(pending.faces)} ${sourceLabel} face${pending.faces === 1 ? "" : "s"} on one of your dice. You will install ${String(pending.faces)} synthetic ${destLabel} face${pending.faces === 1 ? "" : "s"} from your pool (no forge-draw).`}
          </p>
          {slotIndexes.length > 0 && dieId !== undefined && (
            <p className="mt-2 text-xs text-amber-200/80">
              {labelForDie(dieId)} · {String(slotIndexes.length)}/{String(pending.faces)} selected
            </p>
          )}
          <CausedByLine state={state} />
          <ul className="mt-4 space-y-2">
            {legalSlots.map((slot) => {
              const die = state.dice[slot.dieId];
              const faceSlot = die?.slots[slot.slotIndex];
              const face = faceSlot !== undefined ? getFaceCard(faceSlot.faceCardId) : undefined;
              const status =
                faceSlot !== undefined ? slotStatusLine(faceSlot, { state, dieId: slot.dieId }) : null;
              const selected = dieId === slot.dieId && slotIndexes.includes(slot.slotIndex);
              return (
                <li key={`${slot.dieId}:${String(slot.slotIndex)}`}>
                  <button
                    type="button"
                    className={
                      selected
                        ? "w-full rounded border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 text-left"
                        : "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                    }
                    onClick={() => toggleSlot(slot.dieId, slot.slotIndex)}
                  >
                    <p className="text-sm font-medium text-stone-100">
                      {face !== undefined ? (
                        <FaceInspectHover face={face} placement="below" />
                      ) : (
                        "?"
                      )}
                    </p>
                    <p className="text-xs capitalize text-stone-500">
                      {labelForDie(slot.dieId)} · slot {String(slot.slotIndex + 1)}
                      {face !== undefined ? ` · ${face.kind} · ${face.symbol}` : ""}
                    </p>
                    {status !== null && (
                      <p className="mt-1 text-[0.65rem] text-rose-300/90">{status}</p>
                    )}
                  </button>
                </li>
              );
            })}
            {legalSlots.length === 0 && (
              <li className="text-sm text-red-300">No eligible faces to replace.</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  const remaining = pool.filter((id) => !faceCardIds.includes(id));
  const nextIndex = faceCardIds.length + 1;
  return (
    <FacePickModal
      state={state}
      playerId={pending.controllerId}
      kind="synthetic"
      attribute={pending.attribute}
      eligibleIds={remaining}
      subtitle={`Install synthetic ${destLabel} ${String(nextIndex)} of ${String(pending.faces)} from your pool onto ${labelForDie(dieId)} (no forge-draw).`}
      onPick={(faceCardId) => {
        const next = [...faceCardIds, faceCardId];
        if (next.length < pending.faces) {
          setFaceCardIds(next);
          return;
        }
        onResolve({ dieId, slotIndexes, faceCardIds: next });
      }}
      onBack={() => {
        if (faceCardIds.length > 0) {
          setFaceCardIds(faceCardIds.slice(0, -1));
          return;
        }
        setSlotIndexes([]);
        setDieId(undefined);
      }}
      backLabel={faceCardIds.length > 0 ? "Change face" : "Change slots"}
    />
  );
}
