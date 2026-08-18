import type { GameAction, GameError, GameState } from "@/game";
import { metricsCollector } from "@/metrics/session";
import type { MatchMode } from "@/metrics";

export interface TrackMetricsInput {
  readonly prevState: GameState | null;
  readonly state: GameState;
  readonly action: GameAction | null;
  readonly accepted: boolean;
  readonly error: GameError | null;
  readonly recordedAs: MatchMode;
  readonly roomCode: string | null;
  readonly localPlayerId: string | null;
  readonly p1DeckId: string;
  readonly p2DeckId: string;
  readonly p1DeckName: string;
  readonly p2DeckName: string;
}

export function trackMetrics(input: TrackMetricsInput): void {
  void metricsCollector.observe(input).catch(() => {
    // Telemetry must never block play.
  });
}
