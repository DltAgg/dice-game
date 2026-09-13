import type { BattlefieldPosition, CreatureState, FrontlineLane } from "../model/creatures.js";
import type { PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { creaturesOf, livingCreaturesOf } from "./creatures.js";

type LaneQueryState = Pick<GameState, "creatures" | "players">;

const LANES: readonly FrontlineLane[] = [0, 1];

/** Living frontline occupant of `lane`, else `null` (defeated or empty). */
export function livingFrontlinerInLane(
  state: LaneQueryState,
  playerId: PlayerId,
  lane: FrontlineLane,
): CreatureState | null {
  return (
    livingCreaturesOf(state as GameState, playerId).find(
      (creature) => creature.position === "frontline" && creature.lane === lane,
    ) ?? null
  );
}

/**
 * Fixed frontline seats for UI. Index 0 / 1 are columns — never pack left.
 * Defeated or absent seats are `null`.
 */
export function frontlineLaneSlots(
  state: LaneQueryState,
  playerId: PlayerId,
): readonly [CreatureState | null, CreatureState | null] {
  return [livingFrontlinerInLane(state, playerId, 0), livingFrontlinerInLane(state, playerId, 1)];
}

/** Living creatures in the back row, in `creatureIds` order. */
export function backRowCreatures(state: LaneQueryState, playerId: PlayerId): readonly CreatureState[] {
  return creaturesOf(state as GameState, playerId).filter(
    (creature) => !creature.defeated && creature.position === "back",
  );
}

/** True when at least one numbered frontline seat has no living occupant. */
export function hasFrontlineBreach(state: LaneQueryState, playerId: PlayerId): boolean {
  const [lane0, lane1] = frontlineLaneSlots(state, playerId);
  return lane0 === null || lane1 === null;
}

/** Empty numbered seats, assign order 0 then 1. */
export function emptyFrontlineLanes(
  state: LaneQueryState,
  playerId: PlayerId,
): readonly FrontlineLane[] {
  const slots = frontlineLaneSlots(state, playerId);
  return LANES.filter((lane) => slots[lane] === null);
}

/**
 * ASSUMED swap / `[Reposition]` seat trade (spec `029` / OPEN_DESIGN).
 * Non-legendaries keep `lane` for life. Legendary in the back is `null`.
 */
export function nextLaneForPositionChange(args: {
  readonly currentLane: FrontlineLane | null;
  readonly to: BattlefieldPosition;
  readonly isLegendary: boolean;
  readonly enteringLane: FrontlineLane | null;
  readonly emptyLanes: readonly FrontlineLane[];
}): FrontlineLane | null {
  if (args.to === "back") {
    return args.isLegendary ? null : args.currentLane;
  }
  if (args.currentLane === 0 || args.currentLane === 1) {
    return args.currentLane;
  }
  if (args.enteringLane === 0 || args.enteringLane === 1) {
    return args.enteringLane;
  }
  return args.emptyLanes[0] ?? 0;
}
