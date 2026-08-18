import type { GameAction, GameError, GameState } from "@/game";
import { applyObservation, type Observation } from "./observe.js";
import { eventsSince } from "./snapshot.js";
import type { Clock, MatchMode, MatchRecording, MetricsRepository, ObservationContext } from "./types.js";

export interface CollectorOptions {
  readonly repo: MetricsRepository;
  readonly clock: Clock;
  readonly newId: () => string;
}

export interface ObserveInput {
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

export interface MetricsCollector {
  readonly current: () => MatchRecording | null;
  hydrate(matchId: string | null): Promise<void>;
  observe(input: ObserveInput): Promise<MatchRecording>;
}

export function createMetricsCollector(options: CollectorOptions): MetricsCollector {
  const { repo, clock, newId } = options;
  let current: MatchRecording | null = null;
  let queue: Promise<void> = Promise.resolve();

  const enqueue = (work: () => Promise<void>): Promise<void> => {
    const run = queue.then(work, work);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const persist = async (recording: MatchRecording): Promise<void> => {
    await repo.save(recording);
  };

  return {
    current: () => current,

    async hydrate(matchId) {
      await enqueue(async () => {
        if (matchId === null) {
          current = null;
          return;
        }
        const existing = await repo.findByMatchId(matchId);
        current = existing ?? null;
      });
    },

    async observe(input) {
      let result!: MatchRecording;
      await enqueue(async () => {
        if (current !== null && current.matchId !== input.state.matchId) {
          // New match on this browser: do not reuse the old recording id.
        } else if (current === null) {
          const existing = await repo.findByMatchId(input.state.matchId);
          current = existing ?? null;
        }

        const prevState =
          input.prevState !== null && input.prevState.matchId === input.state.matchId
            ? input.prevState
            : null;

        if (
          current !== null &&
          current.matchId === input.state.matchId &&
          input.action === null &&
          input.accepted &&
          eventsSince(prevState, input.state).length === 0
        ) {
          result = current;
          return;
        }

        const ctx: ObservationContext = {
          nowMs: clock.now(),
          recordingId: current?.matchId === input.state.matchId ? current.recordingId : newId(),
          recordedAs: input.recordedAs,
          roomCode: input.roomCode,
          localPlayerId: input.localPlayerId,
          p1DeckId: input.p1DeckId,
          p2DeckId: input.p2DeckId,
          p1DeckName: input.p1DeckName,
          p2DeckName: input.p2DeckName,
        };

        const observation: Observation = {
          prevState,
          state: input.state,
          action: input.action,
          accepted: input.accepted,
          error: input.error,
        };

        const applied = applyObservation(current, observation, ctx);
        if (applied.abandoned !== null) {
          await persist(applied.abandoned);
        }
        current = applied.recording;
        await persist(current);
        result = current;
      });
      return result;
    },
  };
}
