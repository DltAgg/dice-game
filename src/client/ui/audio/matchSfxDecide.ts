import type { GameAction, GameState, PlayerId } from "@server";
import { hasLegalReactionOffer } from "@server";

/** Subset of store mode — avoids importing the Zustand store into decide logic. */
export type MatchSfxMode = "local" | "host" | "client";

export type MatchSfxCue = "end-turn" | "priority";

/**
 * Pure: which cues to fire for a state transition. Observes GameState / log /
 * pendingDecision — does not reimplement chain rules.
 */
export function matchSfxCuesFor(args: {
  readonly prevState: GameState | null;
  readonly state: GameState;
  readonly action: GameAction | null;
  readonly accepted: boolean;
  readonly mode: MatchSfxMode;
  readonly localPlayerId: PlayerId | null;
}): readonly MatchSfxCue[] {
  if (!args.accepted) return [];

  const cues: MatchSfxCue[] = [];
  if (shouldPlayEndTurn(args)) cues.push("end-turn");
  if (shouldPlayPriority(args)) cues.push("priority");
  return cues;
}

function isOnline(mode: MatchSfxMode): boolean {
  return mode === "host" || mode === "client";
}

/** Online: local seat only. Hotseat: either seat ending is fine. Spectators: mute. */
function shouldPlayEndTurn(args: {
  readonly prevState: GameState | null;
  readonly state: GameState;
  readonly action: GameAction | null;
  readonly mode: MatchSfxMode;
  readonly localPlayerId: PlayerId | null;
}): boolean {
  if (isOnline(args.mode) && args.localPlayerId === null) return false;

  if (args.action?.type === "END_TURN") {
    if (!isOnline(args.mode)) return true;
    return args.action.playerId === args.localPlayerId;
  }

  const endedBy = turnEndedPlayerIds(args.prevState, args.state);
  if (endedBy.length === 0) return false;
  if (!isOnline(args.mode)) return true;
  const local = args.localPlayerId;
  return local !== null && endedBy.includes(local);
}

/**
 * Hotseat: dock follows the priority seat, so any gain plays.
 * Online: only when the local seat gains priority.
 * Skip empty windows (authority auto-passes them; no Respond offer).
 */
function shouldPlayPriority(args: {
  readonly prevState: GameState | null;
  readonly state: GameState;
  readonly mode: MatchSfxMode;
  readonly localPlayerId: PlayerId | null;
}): boolean {
  const pending = args.state.pendingDecision;
  if (pending?.type !== "reaction-priority") return false;

  const who = pending.priorityPlayerId;
  const prevPending = args.prevState?.pendingDecision;
  const prevWho =
    prevPending?.type === "reaction-priority" ? prevPending.priorityPlayerId : null;
  if (prevWho === who) return false;

  // Incomplete fixtures (unit tests) omit `players` — keep the cue.
  if (args.state.players !== undefined && !hasLegalReactionOffer(args.state, who)) {
    return false;
  }

  if (!isOnline(args.mode)) return true;
  if (args.localPlayerId === null) return false;
  return who === args.localPlayerId;
}

function turnEndedPlayerIds(prev: GameState | null, next: GameState): readonly PlayerId[] {
  if (prev === null || prev.matchId !== next.matchId) return [];
  if (next.log === prev.log || next.log.length <= prev.log.length) return [];
  const ids: PlayerId[] = [];
  for (const entry of next.log.slice(prev.log.length)) {
    if (entry.event.type === "turn-ended") ids.push(entry.event.playerId);
  }
  return ids;
}
