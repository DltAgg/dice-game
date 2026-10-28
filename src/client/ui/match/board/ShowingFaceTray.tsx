import { useEffect, useState, type ReactNode } from "react";
import {
  dieForCreature,
  getCreatureDefinition,
  showingFaceCard,
  type CreatureId,
  type DieId,
  type FaceCardDefinition,
  type GameState,
  type PlayerId,
} from "@server";
import { btnHandPrimary } from "../styles";
import {
  hitButtonLabel,
  showingFaceChips,
  type ShowingFaceChip,
  stagedShowingDrop,
} from "./showingFaceDrop";
import { ShowingFaceHover } from "./ShowingFaceTooltip";

/**
 * The acting player's three showing face names, and two drop boxes.
 * Any legal showing face can be dropped as a hit. A Technique still needs
 * the Active Fighter's face plus a matching second face.
 */
export function ShowingFaceTray({
  state,
  playerId,
  label,
  actingPlayerId,
  canAct,
  onUseFace,
  onUseTechnique,
}: {
  state: GameState;
  playerId: PlayerId;
  label: string;
  actingPlayerId: PlayerId;
  canAct: boolean;
  onUseFace: (creatureId: CreatureId) => void;
  onUseTechnique: (creatureId: CreatureId, techniqueId: string, secondaryDieId: DieId) => void;
}) {
  const [slots, setSlots] = useState<[CreatureId | null, CreatureId | null]>([null, null]);
  const player = state.players[playerId];
  const interactive =
    canAct &&
    playerId === actingPlayerId &&
    state.status === "in-progress" &&
    state.pendingDecision === null &&
    state.phase === "actions";

  useEffect(() => {
    setSlots([null, null]);
  }, [state.turn, state.phase, player?.activeCreatureId, state.pendingDecision]);

  const chips = showingFaceChips(state, playerId);
  const chipById = new Map(chips.map((chip) => [chip.creatureId, chip]));
  const staged = stagedShowingDrop(state, playerId, slots);
  const activeCreature = player === undefined ? undefined : state.creatures[player.activeCreatureId];
  const activeDef =
    activeCreature === undefined ? undefined : getCreatureDefinition(activeCreature.definitionId);

  const faceFor = (chip: ShowingFaceChip) => showingFaceCard(state, chip.dieId);
  const hitChip = staged.kind === "hit" ? chipById.get(staged.creatureId) : undefined;

  const assign = (index: 0 | 1, creatureId: CreatureId) => {
    setSlots((prev) => {
      const next: [CreatureId | null, CreatureId | null] = [prev[0], prev[1]];
      const other = index === 0 ? 1 : 0;
      if (next[other] === creatureId) next[other] = null;
      next[index] = creatureId;
      return next;
    });
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-800 bg-black/25 p-3">
      <h2 className="mb-2 shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
        {" · showing"}
      </h2>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <HoveredFaceName key={chip.creatureId} face={faceFor(chip)} active={chip.active}>
            <button
              type="button"
              draggable={interactive}
              aria-label={chip.active ? `${chip.name}, Active Fighter` : chip.name}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", chip.creatureId);
                event.dataTransfer.effectAllowed = "copy";
              }}
              className={
                chip.active
                  ? "cursor-grab rounded border border-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 text-sm text-[var(--accent)]"
                  : "cursor-grab rounded border border-stone-600 bg-stone-950 px-2 py-1 text-sm text-stone-100"
              }
            >
              {chip.name}
            </button>
          </HoveredFaceName>
        ))}
        {chips.length === 0 && <p className="text-sm text-stone-600">No face showing</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {([0, 1] as const).map((index) => {
          const creatureId = slots[index];
          const chip = creatureId === null ? undefined : chipById.get(creatureId);
          return (
            <div
              key={index}
              onDragOver={
                interactive
                  ? (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }
                  : undefined
              }
              onDrop={
                interactive
                  ? (event) => {
                      event.preventDefault();
                      const dropped = event.dataTransfer.getData("text/plain");
                      if (dropped !== "" && chipById.has(dropped as CreatureId)) {
                        assign(index, dropped as CreatureId);
                      }
                    }
                  : undefined
              }
              className="flex min-h-16 flex-col items-center justify-center rounded border border-dashed border-stone-600 bg-black/30 p-2 text-center"
              aria-label={`Drop face ${String(index + 1)}`}
            >
              {chip === undefined ? (
                <p className="text-[0.65rem] uppercase tracking-wide text-stone-600">Drop a face</p>
              ) : (
                <HoveredFaceName face={faceFor(chip)} active={chip.active}>
                  <button
                    type="button"
                    className="text-sm text-stone-100 hover:text-[var(--accent)]"
                    onClick={() =>
                      setSlots((prev) => {
                        const next: [CreatureId | null, CreatureId | null] = [prev[0], prev[1]];
                        next[index] = null;
                        return next;
                      })
                    }
                  >
                    {chip.name}
                  </button>
                </HoveredFaceName>
              )}
            </div>
          );
        })}
      </div>
      {interactive && staged.kind === "pending" && (
        <p className="mt-2 text-[0.7rem] text-stone-500">{staged.message}</p>
      )}
      {interactive && staged.kind === "hit" && (
        <button
          type="button"
          className={`${btnHandPrimary} mt-2`}
          onClick={() => {
            onUseFace(staged.creatureId);
            setSlots([null, null]);
          }}
        >
          {hitButtonLabel(hitChip === undefined ? undefined : faceFor(hitChip), hitChip?.name ?? "Face")}
        </button>
      )}
      {interactive && staged.kind === "technique" && (
        <div className="mt-2 flex flex-col gap-1">
          {staged.matches.map((match) => {
            const added = state.creatures[staged.creatureId]?.addedTechniques;
            const technique =
              activeDef?.techniques?.find((entry) => entry.id === match.techniqueId) ??
              added?.find((entry) => entry.id === match.techniqueId);
            return (
              <button
                key={`${match.techniqueId}:${match.secondaryDieId}`}
                type="button"
                className={btnHandPrimary}
                onClick={() => {
                  const secondary = dieForCreature(state, slots[0] === staged.creatureId ? slots[1]! : slots[0]!);
                  if (secondary === undefined) return;
                  onUseTechnique(staged.creatureId, match.techniqueId, secondary.id);
                  setSlots([null, null]);
                }}
              >
                {technique?.name ?? "Technique"}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HoveredFaceName({
  face,
  active,
  children,
}: {
  face: FaceCardDefinition | undefined;
  active: boolean;
  children: ReactNode;
}) {
  if (face === undefined) return children;
  return (
    <ShowingFaceHover face={face} active={active}>
      {children}
    </ShowingFaceHover>
  );
}
