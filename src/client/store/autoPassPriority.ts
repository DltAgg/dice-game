import {
  hasLegalReactionOffer,
  type GameAction,
  type GameState,
  type PlayerId,
} from "@server";

type MatchMode = "local" | "host" | "client";

/**
 * Empty reaction window → the same `PASS_PRIORITY` the Pass button sends.
 * Seat-gated: online only the bound local seat; hotseat whoever holds priority.
 * Never invents legality — `hasLegalReactionOffer` is the engine query.
 */
export function autoPassPriorityAction(args: {
  readonly state: GameState;
  readonly mode: MatchMode;
  readonly localPlayerId: PlayerId | null;
  readonly canAct: boolean;
}): Extract<GameAction, { readonly type: "PASS_PRIORITY" }> | null {
  if (!args.canAct) return null;
  const pending = args.state.pendingDecision;
  if (pending?.type !== "reaction-priority") return null;

  const seat = pending.priorityPlayerId;
  if (args.mode !== "local") {
    if (args.localPlayerId === null) return null;
    if (args.localPlayerId !== seat) return null;
  }

  if (hasLegalReactionOffer(args.state, seat)) return null;
  return { type: "PASS_PRIORITY", playerId: seat };
}

/** Dispatch `PASS_PRIORITY` when the local acting seat has no legal offer. */
export function tryAutoPassPriority(args: {
  readonly state: GameState;
  readonly mode: MatchMode;
  readonly localPlayerId: PlayerId | null;
  readonly canAct: boolean;
  readonly dispatch: (action: GameAction) => boolean;
}): boolean {
  const action = autoPassPriorityAction(args);
  if (action === null) return false;
  return args.dispatch(action);
}
