import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameEvent } from "../model/events.js";
import type { OffensiveStateName, SequenceRole } from "../model/offensive.js";
import type { GameState } from "../model/state.js";
import { canSpendMeter } from "./meter.js";

/** Once-per-turn key set when Tag is declared. Combo reads this name. */
export const TAG_TURN_KEY = "tag-this-turn";

/** Once-per-turn key for the opening reroll (spec `030`). */
export const TURN_REROLL_KEY = "turn-reroll";

/**
 * Once-per-turn key written by Tag. Declaring a finisher is illegal while
 * it is set. The Tag command owns the write; this check only reads the key.
 */
export const TAG_THIS_TURN_KEY = "tag-this-turn";

/**
 * No sequence (`open`) accepts a starter or a finisher. A sequence in
 * progress (`combo`) accepts an extender or a finisher. `finished` accepts
 * nothing. A finisher from `open` still ends the sequence.
 */
export function sequenceRoleFits(state: OffensiveStateName, role: SequenceRole): boolean {
  if (state === "open") return role === "starter" || role === "finisher";
  if (state === "combo") return role === "extender" || role === "finisher";
  return false;
}

/** A finisher cannot be declared on a turn that already Tagged. */
export function finisherBlockedByTag(
  state: Pick<GameState, "players">,
  playerId: PlayerId,
  role: SequenceRole,
): boolean {
  if (role !== "finisher") return false;
  const player = state.players[playerId];
  if (player === undefined) return false;
  return player.spentOncePerTurnKeys.includes(TAG_THIS_TURN_KEY);
}

/**
 * The one reroll is available in `roll` after the opening roll, until it is
 * spent. A pending decision closes it for that choice (spec `030`).
 */
export function canRerollDice(state: GameState, playerId: PlayerId): boolean {
  if (state.phase !== "roll") return false;
  if (state.pendingDecision !== null) return false;
  if (state.activePlayerId !== playerId) return false;
  if (!state.rerollAvailable) return false;
  const player = state.players[playerId];
  if (player === undefined) return false;
  return !player.spentOncePerTurnKeys.includes(TURN_REROLL_KEY);
}

/**
 * True once this roll phase's opening `ROLL_DICE` has happened.
 * `rerollAvailable` is that signal. The spent `turn-reroll` key covers the
 * same fact if a later action cleared the flag.
 */
export function openingRollDone(state: GameState): boolean {
  if (state.rerollAvailable) return true;
  const player = state.players[state.activePlayerId];
  if (player === undefined) return false;
  return player.spentOncePerTurnKeys.includes(TURN_REROLL_KEY);
}

/** True when this sequence action was already declared or has resolved. */
export function sequenceActionUsed(state: GameState, actionId: string): boolean {
  if (state.usedSequenceActionIds.includes(actionId)) return true;
  return state.chainStack.some((link) => link.sequenceActionId === actionId);
}

/**
 * Turn number when a `[Tag out]` Tag-in lock ends. Applied on the
 * opponent's turn: the controller's next turn is `turn + 1`, and the
 * lock lasts through that turn (`turn < turn + 2`).
 */
export function tagInLockUntilTurn(turn: number): number {
  return turn + 2;
}

/** True while this Fighter cannot be Tagged in. */
export function tagInLocked(
  state: Pick<GameState, "turn" | "creatures">,
  creatureId: CreatureId,
): boolean {
  const until = state.creatures[creatureId]?.tagInLockedUntilTurn;
  return until !== undefined && state.turn < until;
}

/**
 * Opening: your turn, no Chain, before any face, technique, assist, card,
 * attack, or sequence end. The opening roll and the one reroll leave
 * `actEngaged` false, so they do not close it.
 * Closing: you are stopping a sequence you could still continue (`combo`,
 * and you are the Aggressor). Not the rest of the actions phase.
 * A Chain, a second Tag, or a Finisher already resolved this turn closes both.
 */
export function tagWindow(
  state: GameState,
  playerId: PlayerId,
): "opening" | "closing" | null {
  if (state.status === "finished") return null;
  if (state.phase !== "actions") return null;
  if (state.pendingDecision !== null) return null;
  if ((state.chainStack?.length ?? 0) > 0) return null;
  if (state.activePlayerId !== playerId) return null;
  const player = state.players[playerId];
  if (player === undefined) return null;
  if (player.spentOncePerTurnKeys.includes(TAG_TURN_KEY)) return null;
  if (resolvedFinisherThisTurn(state, playerId)) return null;
  if (state.actEngaged !== true) return "opening";
  if (state.offensiveState === "combo" && state.aggressorPlayerId === playerId) {
    return "closing";
  }
  return null;
}

function resolvedFinisherThisTurn(state: GameState, playerId: PlayerId): boolean {
  const log = state.log;
  if (!Array.isArray(log)) return false;
  let start = 0;
  for (let i = 0; i < log.length; i++) {
    if (log[i]?.event.type === "turn-started") start = i;
  }
  let declared = false;
  for (let i = start; i < log.length; i++) {
    const event = log[i]?.event;
    if (event === undefined) continue;
    if (isFinisherDeclaration(state, playerId, event)) declared = true;
    if (declared && event.type === "offensive-state-changed" && event.offensiveState === "open") {
      return true;
    }
  }
  return false;
}

function isFinisherDeclaration(state: GameState, playerId: PlayerId, event: GameEvent): boolean {
  if (event.type === "face-used" && event.playerId === playerId) {
    return getFaceCard(event.faceCardId)?.sequenceRole === "finisher";
  }
  if (event.type === "technique-used" && event.playerId === playerId) {
    const creature = state.creatures[event.creatureId];
    if (creature === undefined) return false;
    const techniques = getCreatureDefinition(creature.definitionId)?.techniques;
    return (
      techniques?.some(
        (technique) => technique.id === event.techniqueId && technique.sequenceRole === "finisher",
      ) ?? false
    );
  }
  return false;
}

export function sequenceMeterAffordable(
  state: Pick<GameState, "players">,
  playerId: PlayerId,
  meterCost: number | undefined,
): boolean {
  return canSpendMeter(state, playerId, meterCost ?? 0);
}
