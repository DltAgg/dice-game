import { useState } from "react";
import type { AiStrength } from "@ai";
import { validateSavedDeck, type SavedDeck, type SavedDeckId } from "@client/decks";
import { MATCH_P1, MATCH_P2 } from "@client/store/localMatchEngine";
import type { PlayerId } from "@server";
import { btnPrimary } from "./buttons";
import { DeckSelect } from "./DeckSelect";

const STRENGTHS: readonly AiStrength[] = ["fast", "standard", "strong"];

export function VsAiPanel({
  p1DeckId,
  p2DeckId,
  deckOptions,
  legalityById,
  busy,
  onStart,
}: {
  readonly p1DeckId: SavedDeckId;
  readonly p2DeckId: SavedDeckId;
  readonly deckOptions: readonly Pick<SavedDeck, "id" | "name">[];
  readonly legalityById: ReadonlyMap<string, ReturnType<typeof validateSavedDeck>>;
  readonly busy: boolean;
  readonly onStart: (args: {
    readonly humanSeat: PlayerId;
    readonly humanDeckId: SavedDeckId;
    readonly aiDeckId: SavedDeckId;
    readonly strength: AiStrength;
  }) => void;
}) {
  const [humanSeat, setHumanSeat] = useState<PlayerId>(MATCH_P1);
  const [humanDeckId, setHumanDeckId] = useState<SavedDeckId>(p1DeckId);
  const [aiDeckId, setAiDeckId] = useState<SavedDeckId>(p2DeckId);
  const [strength, setStrength] = useState<AiStrength>("standard");

  const humanReason = legalityById.get(humanDeckId);
  const aiReason = legalityById.get(aiDeckId);
  const humanLegal = humanReason?.ok === true;
  const aiLegal = aiReason?.ok === true;

  return (
    <section className="space-y-3 rounded border border-stone-800 bg-stone-950/50 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Play vs AI
      </h2>
      <p className="text-xs text-stone-500">
        You take one seat on this machine. The other seat is the headless AI. Illegal decks show
        the engine reason below.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-400">Your seat</span>
        <select
          className="rounded border border-stone-700 bg-stone-950 px-2 py-2 text-stone-100"
          value={humanSeat}
          onChange={(event) => setHumanSeat(event.target.value === MATCH_P2 ? MATCH_P2 : MATCH_P1)}
        >
          <option value={MATCH_P1}>P1</option>
          <option value={MATCH_P2}>P2</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <DeckSelect
          label="Human deck"
          value={humanDeckId}
          options={deckOptions}
          legalityById={legalityById}
          onChange={(id) => setHumanDeckId(id)}
        />
        <DeckSelect
          label="AI deck"
          value={aiDeckId}
          options={deckOptions}
          legalityById={legalityById}
          onChange={(id) => setAiDeckId(id)}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-400">AI strength</span>
        <select
          className="rounded border border-stone-700 bg-stone-950 px-2 py-2 text-stone-100"
          value={strength}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "fast" || next === "standard" || next === "strong") setStrength(next);
          }}
        >
          {STRENGTHS.map((value) => (
            <option key={value} value={value}>
              {value === "fast" ? "Fast" : value === "strong" ? "Strong" : "Standard"}
            </option>
          ))}
        </select>
      </label>
      {!humanLegal && (
        <p className="text-xs text-red-300">
          {humanReason !== undefined && !humanReason.ok
            ? `Human: ${humanReason.reason}`
            : "Human: pick a saved legal loadout."}
        </p>
      )}
      {!aiLegal && (
        <p className="text-xs text-red-300">
          {aiReason !== undefined && !aiReason.ok
            ? `AI: ${aiReason.reason}`
            : "AI: pick a saved legal loadout."}
        </p>
      )}
      <button
        type="button"
        className={btnPrimary}
        disabled={busy || !humanLegal || !aiLegal}
        onClick={() =>
          onStart({
            humanSeat,
            humanDeckId,
            aiDeckId,
            strength,
          })
        }
      >
        Start vs AI
      </button>
    </section>
  );
}
