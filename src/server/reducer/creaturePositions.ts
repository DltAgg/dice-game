import type { BattlefieldPosition } from "../model/creatures.js";
import type { CreatureId } from "../model/ids.js";
import { isLegendaryCreature } from "../rules/creatures.js";
import { emptyFrontlineLanes, nextLaneForPositionChange } from "../rules/lanes.js";
import { patchCreature, type Draft } from "./draft.js";
import { fireOnChangePosition } from "./triggers.js";

export type EnteringLaneOptions = {
  /** Swap partner's lane — the numbered seat this creature is entering. */
  readonly enteringLane?: 0 | 1 | null;
};

/**
 * Single mover entry point so standing `on-change-position` triggers always fire
 * (Hunter's Collar). Callers must not patch `position` / `lane` directly.
 */
export function setCreaturePosition(
  draft: Draft,
  creatureId: CreatureId,
  to: BattlefieldPosition,
  options?: EnteringLaneOptions,
): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return;
  if (creature.position === to) return;
  const from = creature.position;
  const lane = nextLaneForPositionChange({
    currentLane: creature.lane,
    to,
    isLegendary: isLegendaryCreature(creature),
    enteringLane: options?.enteringLane ?? null,
    emptyLanes: emptyFrontlineLanes(draft, creature.ownerId),
  });
  patchCreature(draft, creatureId, { position: to, lane });
  fireOnChangePosition(draft, creatureId, from, to);
}

/**
 * Swap two living **allied** creatures via `setCreaturePosition`. Opposing
 * pairs whiff (enemy push/move is banned). Same creature or same position is a
 * no-op (Garuda already frontline swapping with another frontline).
 */
export function swapCreaturePositions(
  draft: Draft,
  firstId: CreatureId,
  secondId: CreatureId,
): void {
  if (firstId === secondId) return;
  const first = draft.creatures[firstId];
  const second = draft.creatures[secondId];
  if (first === undefined || second === undefined) return;
  if (first.defeated || second.defeated) return;
  if (first.ownerId !== second.ownerId) return;
  const firstTo = second.position;
  const secondTo = first.position;
  const firstEntering = second.lane;
  const secondEntering = first.lane;
  setCreaturePosition(draft, firstId, firstTo, { enteringLane: firstEntering });
  setCreaturePosition(draft, secondId, secondTo, { enteringLane: secondEntering });
}
