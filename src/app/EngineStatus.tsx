import { useMemo } from "react";
import {
  CARDS,
  CREATURES,
  FACE_CARDS,
  PROTOTYPE_DECK,
  PROTOTYPE_SQUAD,
  advance,
  asPlayerId,
  createMatch,
  currentLife,
  livingCreaturesOf,
  type GameState,
} from "@/game";
import { CardCatalogue } from "@/ui/cards/CardCatalogue";

/**
 * Smoke page for the engine and the tactic-card layout. The match board is a
 * later milestone; this page proves the reducer runs in the browser and that
 * the Figma card grammar prints correctly in English.
 */

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

function buildSampleTurn(): GameState {
  const start = createMatch({
    matchId: "browser-smoke",
    seed: Date.now() % 100_000,
    players: [
      { id: P1, squad: PROTOTYPE_SQUAD, deck: PROTOTYPE_DECK },
      { id: P2, squad: PROTOTYPE_SQUAD, deck: PROTOTYPE_DECK },
    ],
  });

  const rolled = advance(start, { type: "ROLL_DICE", playerId: P1 });
  return rolled.ok ? rolled.state : start;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-stone-800/80 py-2">
      <span className="text-sm text-stone-400">{label}</span>
      <span className="font-mono text-sm text-stone-100">{value}</span>
    </div>
  );
}

export function EngineStatus() {
  const state = useMemo(buildSampleTurn, []);

  const rolledSymbols = Object.values(state.symbols)
    .map((symbol) => symbol.symbol)
    .join(", ");

  const handSize = state.players[P1]?.hand.length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header>
        <p className="font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--ink)]">
          Dice Skirmish
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
          Headless engine plus the English creature and tactic card layouts from Figma.
          Absorb or resolve — forge or play. The match board arrives later.
        </p>
      </header>

      <section className="mt-12 max-w-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">
          Content loaded
        </h2>
        <div className="mt-2">
          <Row label="Face card definitions" value={String(Object.keys(FACE_CARDS).length)} />
          <Row label="Face pool (p1)" value={String(state.players[P1]?.facePool.length ?? 0)} />
          <Row label="Creature definitions" value={String(Object.keys(CREATURES).length)} />
          <Row label="Tactic card definitions" value={String(Object.keys(CARDS).length)} />
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">
          A real match, one action deep
        </h2>
        <div className="mt-2">
          <Row label="Phase" value={state.phase} />
          <Row label="Turn" value={String(state.turn)} />
          <Row
            label="Energy"
            value={`${state.energy.holderId} holds ${String(state.energy.value)}`}
          />
          <Row label="Symbols rolled" value={rolledSymbols || "none"} />
          <Row label="Hand size (p1)" value={String(handSize)} />
          <Row
            label="Squad p1"
            value={livingCreaturesOf(state, P1)
              .map((creature) => `${creature.position[0] ?? "?"}·${String(currentLife(creature))}`)
              .join("  ")}
          />
          <Row label="Log entries" value={String(state.log.length)} />
        </div>
      </section>

      <CardCatalogue />
    </main>
  );
}
