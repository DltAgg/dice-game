import { useEffect, useMemo, useState } from "react";
import {
  buildBuiltinDecks,
  validateSavedDeck,
  type SavedDeck,
} from "@/decks";
import { useDeckStore } from "@/store/deckStore";
import { useMatchStore } from "@/store/matchStore";

export function Lobby() {
  const decks = useDeckStore((s) => s.decks);
  const refresh = useDeckStore((s) => s.refresh);
  const startLocal = useMatchStore((s) => s.startLocal);
  const hostRoom = useMatchStore((s) => s.hostRoom);
  const joinRoom = useMatchStore((s) => s.joinRoom);
  const p1DeckId = useMatchStore((s) => s.p1DeckId);
  const p2DeckId = useMatchStore((s) => s.p2DeckId);
  const setMatchDecks = useMatchStore((s) => s.setMatchDecks);
  const connectionStatus = useMatchStore((s) => s.connectionStatus);
  const playBlockReason = useMatchStore((s) => s.playBlockReason);
  const clearPlayBlockReason = useMatchStore((s) => s.clearPlayBlockReason);

  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deckOptions =
    decks.length > 0
      ? decks
      : buildBuiltinDecks().map((deck) => ({
          id: deck.id,
          name: deck.name,
          builtin: true as const,
        }));

  const legalityById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateSavedDeck>>();
    for (const deck of decks) {
      map.set(deck.id, validateSavedDeck(deck));
    }
    return map;
  }, [decks]);

  const p1Legal = legalityById.get(p1DeckId)?.ok !== false;
  const p2Legal = legalityById.get(p2DeckId)?.ok !== false;
  const p1Reason = legalityById.get(p1DeckId);
  const p2Reason = legalityById.get(p2DeckId);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    clearPlayBlockReason();
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Play
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Local hotseat on one machine, or host/join a PeerJS room. Only legal loadouts can be
          played (you can still save WIP decks from Decks).
        </p>
      </header>

      <section className="space-y-3 rounded border border-stone-800 bg-stone-950/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Local hotseat
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <DeckSelect
            label="P1 deck"
            value={p1DeckId}
            options={deckOptions}
            legalityById={legalityById}
            onChange={(id) => {
              clearPlayBlockReason();
              setMatchDecks(id, p2DeckId);
            }}
          />
          <DeckSelect
            label="P2 deck"
            value={p2DeckId}
            options={deckOptions}
            legalityById={legalityById}
            onChange={(id) => {
              clearPlayBlockReason();
              setMatchDecks(p1DeckId, id);
            }}
          />
        </div>
        {!p1Legal && p1Reason !== undefined && !p1Reason.ok && (
          <p className="text-xs text-red-300">P1: {p1Reason.reason}</p>
        )}
        {!p2Legal && p2Reason !== undefined && !p2Reason.ok && (
          <p className="text-xs text-red-300">P2: {p2Reason.reason}</p>
        )}
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !p1Legal || !p2Legal}
          onClick={() => startLocal(p1DeckId, p2DeckId)}
        >
          Start local match
        </button>
      </section>

      <section className="space-y-3 rounded border border-stone-800 bg-stone-950/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Online — host
        </h2>
        <DeckSelect
          label="Your deck (P1)"
          value={p1DeckId}
          options={deckOptions}
          legalityById={legalityById}
          onChange={(id) => {
            clearPlayBlockReason();
            setMatchDecks(id, p2DeckId);
          }}
        />
        {!p1Legal && p1Reason !== undefined && !p1Reason.ok && (
          <p className="text-xs text-red-300">{p1Reason.reason}</p>
        )}
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !p1Legal}
          onClick={() => void run(() => hostRoom(p1DeckId))}
        >
          Host room
        </button>
      </section>

      <section className="space-y-3 rounded border border-stone-800 bg-stone-950/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Online — join
        </h2>
        <DeckSelect
          label="Your deck (P2)"
          value={p2DeckId}
          options={deckOptions}
          legalityById={legalityById}
          onChange={(id) => {
            clearPlayBlockReason();
            setMatchDecks(p1DeckId, id);
          }}
        />
        {!p2Legal && p2Reason !== undefined && !p2Reason.ok && (
          <p className="text-xs text-red-300">{p2Reason.reason}</p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-400">Room code</span>
          <input
            className="rounded border border-stone-700 bg-stone-950 px-3 py-2 font-mono uppercase tracking-widest text-stone-100"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="ABC123"
            maxLength={8}
          />
        </label>
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !p2Legal || joinCode.trim().length < 4}
          onClick={() => void run(() => joinRoom(joinCode, p2DeckId))}
        >
          Join room
        </button>
      </section>

      {playBlockReason !== null && (
        <p className="text-sm text-red-300">{playBlockReason}</p>
      )}
      {connectionStatus !== "local" && (
        <p className="text-sm text-stone-500">Status: {connectionStatus}</p>
      )}
    </main>
  );
}

function DeckSelect({
  label,
  value,
  options,
  legalityById,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Pick<SavedDeck, "id" | "name">[];
  legalityById: ReadonlyMap<string, ReturnType<typeof validateSavedDeck>>;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-stone-400">{label}</span>
      <select
        className="rounded border border-stone-700 bg-stone-950 px-2 py-2 text-stone-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((deck) => {
          const legal = legalityById.get(deck.id)?.ok !== false;
          return (
            <option key={deck.id} value={deck.id}>
              {deck.name}
              {legal ? "" : " (illegal)"}
            </option>
          );
        })}
      </select>
    </label>
  );
}

const btnPrimary =
  "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/30 disabled:opacity-40";
