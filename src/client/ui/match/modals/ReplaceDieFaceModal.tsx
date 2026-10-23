import { useState } from "react";
import {
  getCreatureDefinition,
  getFaceCard,
  type DieId,
  type FaceCardDefinition,
  type FaceCardId,
  type GameState,
  type ModifyPlayChoice,
} from "@server";
import { ShowingFaceHover } from "../board/ShowingFaceTooltip";
import { btnClass } from "../styles";
import { BoardModal } from "./BoardModal";
import {
  incomingReplacementFaces,
  slotGroupsForFace,
  type DieSlotGroup,
} from "./replaceDieFacePrompt";

/**
 * Modal for a Modify that overwrites one die slot.
 * Each row is one slot: its number, then the face name and showing-face tooltip.
 */
export function ReplaceDieFaceModal({
  state,
  cardName,
  choices,
  onChoose,
  onCancel,
}: {
  state: GameState;
  cardName: string;
  choices: readonly ModifyPlayChoice[];
  onChoose: (choice: ModifyPlayChoice) => void;
  onCancel: () => void;
}) {
  const incomingIds = incomingReplacementFaces(choices);
  const [pickedId, setPickedId] = useState<FaceCardId | null>(null);
  const incomingId =
    incomingIds.length === 1
      ? incomingIds[0]
      : pickedId !== null && incomingIds.includes(pickedId)
        ? pickedId
        : null;
  const incomingKnown = incomingId !== undefined && incomingId !== null;
  const incomingFace = incomingKnown ? getFaceCard(incomingId) : undefined;
  const incomingName = !incomingKnown ? null : (incomingFace?.name ?? "that face");

  return (
    <BoardModal title={cardName} onDismiss={onCancel}>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        {incomingName === null ? (
          "Select the face that will replace a slot."
        ) : incomingFace === undefined ? (
          `Select a face to be replaced by ${incomingName}.`
        ) : (
          <>
            {"Select a face to be replaced by "}
            <ShowingFaceHover face={incomingFace}>
              <span className="text-stone-100">{incomingFace.name}</span>
            </ShowingFaceHover>
            {"."}
          </>
        )}
      </p>
      {incomingId === undefined || incomingId === null ? (
        <FaceNameChoices
          faces={incomingIds.flatMap((faceCardId) => {
            const face = getFaceCard(faceCardId);
            return face === undefined ? [] : [{ id: faceCardId, face }];
          })}
          onPick={setPickedId}
        />
      ) : (
        <>
          {incomingIds.length > 1 && (
            <button type="button" className={`${btnClass} mt-4`} onClick={() => setPickedId(null)}>
              Change face
            </button>
          )}
          <SlotFaceChoices
            state={state}
            groups={slotGroupsForFace(choices, incomingId)}
            onChoose={onChoose}
          />
        </>
      )}
      <button type="button" className={`${btnClass} mt-4 w-full`} onClick={onCancel}>
        Cancel
      </button>
    </BoardModal>
  );
}

function FaceNameChoices({
  faces,
  onPick,
}: {
  faces: readonly { id: FaceCardId; face: FaceCardDefinition }[];
  onPick: (faceCardId: FaceCardId) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {faces.map((entry) => (
        <ShowingFaceHover key={entry.id} face={entry.face}>
          <button type="button" className={faceChipClass(false)} onClick={() => onPick(entry.id)}>
            {entry.face.name}
          </button>
        </ShowingFaceHover>
      ))}
    </div>
  );
}

function SlotFaceChoices({
  state,
  groups,
  onChoose,
}: {
  state: GameState;
  groups: readonly DieSlotGroup[];
  onChoose: (choice: ModifyPlayChoice) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => {
        const fighter = fighterName(state, group.dieId);
        return (
          <div key={group.dieId}>
            {fighter !== null && (
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                {fighter}
              </p>
            )}
            <ol className="list-none space-y-1.5">
              {(state.dice[group.dieId]?.slots ?? []).map((slot) => {
                const choice = group.choices.find((entry) => entry.slotIndex === slot.index);
                return (
                  <li key={`${group.dieId}:${String(slot.index)}`}>
                    <SlotFaceButton
                      state={state}
                      dieId={group.dieId}
                      slotIndex={slot.index}
                      choice={choice}
                      onChoose={onChoose}
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

function SlotFaceButton({
  state,
  dieId,
  slotIndex,
  choice,
  onChoose,
}: {
  state: GameState;
  dieId: DieId;
  slotIndex: number;
  choice: ModifyPlayChoice | undefined;
  onChoose: (choice: ModifyPlayChoice) => void;
}) {
  const die = state.dice[dieId];
  const slot = die?.slots[slotIndex];
  const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
  const showing = die !== undefined && die.rolledSlotIndex === slotIndex;
  const name = face?.name ?? "Face";
  const legal = choice !== undefined;
  const slotNumber = String(slotIndex + 1);
  const label = showing ? `Slot ${slotNumber}, ${name}, showing` : `Slot ${slotNumber}, ${name}`;
  const nameNode = (
    <span className={legal ? "text-sm text-stone-100" : "text-sm text-stone-500"}>{name}</span>
  );

  return (
    <button
      type="button"
      className={slotRowClass(showing, legal)}
      aria-label={label}
      disabled={!legal}
      onClick={() => {
        if (choice !== undefined) onChoose(choice);
      }}
    >
      <span className="w-5 shrink-0 text-xs tabular-nums text-stone-500">{slotNumber}</span>
      {face === undefined ? nameNode : <ShowingFaceHover face={face}>{nameNode}</ShowingFaceHover>}
      {showing && (
        <span className="ml-auto text-[0.65rem] uppercase tracking-wide text-[var(--accent)]">
          Showing
        </span>
      )}
    </button>
  );
}

function fighterName(state: GameState, dieId: DieSlotGroup["dieId"]): string | null {
  const bound = state.dice[dieId]?.boundCreatureId;
  if (bound === null || bound === undefined) return null;
  const creature = state.creatures[bound];
  if (creature === undefined) return null;
  return getCreatureDefinition(creature.definitionId)?.name ?? null;
}

function faceChipClass(showing: boolean): string {
  return showing
    ? "rounded border border-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/20"
    : "rounded border border-stone-600 bg-stone-950 px-2 py-1 text-sm text-stone-100 hover:border-[var(--accent)]";
}

function slotRowClass(showing: boolean, legal: boolean): string {
  const base = "flex w-full items-center gap-3 rounded border px-3 py-2 text-left";
  if (!legal) return `${base} cursor-not-allowed border-stone-800 bg-stone-950/40 opacity-50`;
  if (showing) return `${base} border-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20`;
  return `${base} border-stone-700 bg-stone-900 hover:border-[var(--accent)]`;
}
