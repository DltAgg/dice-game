import type { GameAction, GameError, GameState, PlayerId } from "@server";
import { UI_CONFIG } from "@client/ui/config";
import { matchSfxCuesFor, type MatchSfxMode } from "./matchSfxDecide.js";
import { hookMatchSfxGestureUnlock, playEndTurnSfx, playPrioritySfx } from "./synth.js";

export function observeMatchSfx(args: {
  readonly prevState: GameState | null;
  readonly state: GameState;
  readonly action: GameAction | null;
  readonly accepted: boolean;
  readonly error: GameError | null;
  readonly mode: MatchSfxMode;
  readonly localPlayerId: PlayerId | null;
}): void {
  void args.error;
  if (!UI_CONFIG.matchSfxEnabled) return;
  if (typeof window === "undefined") return;

  hookMatchSfxGestureUnlock();

  const cues = matchSfxCuesFor({
    prevState: args.prevState,
    state: args.state,
    action: args.action,
    accepted: args.accepted,
    mode: args.mode,
    localPlayerId: args.localPlayerId,
  });

  for (const cue of cues) {
    if (cue === "end-turn") playEndTurnSfx();
    else playPrioritySfx();
  }
}
