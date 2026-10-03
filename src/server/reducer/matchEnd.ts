import type { PlayerId } from "../model/ids.js";
import { emit, type Draft } from "./draft.js";

/** The named player loses. Deck-out and a full wipe both end here. */
export function loseMatch(draft: Draft, loserId: PlayerId): void {
  if (draft.status === "finished") return;
  const winner = draft.playerOrder.find((id) => id !== loserId) ?? null;
  draft.status = "finished";
  draft.winner = winner;
  if (winner !== null) emit(draft, { type: "match-finished", winnerId: winner });
}
