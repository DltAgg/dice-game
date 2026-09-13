import { useEffect, useMemo, useState } from "react";
import {
  buildBuiltinDecks,
  validateSavedDeck,
} from "@client/decks";
import { useDeckStore } from "@client/store/deckStore";
import { useMatchStore } from "@client/store/matchStore";
import { readOnlineSessionHint } from "@client/store/onlineSessionHint";
import { btnPrimary } from "./lobby/buttons";
import { DeckSelect } from "./lobby/DeckSelect";
import { RoomPanel } from "./lobby/RoomPanel";
import { VsAiPanel } from "./lobby/VsAiPanel";

export function Lobby() {
  const decks = useDeckStore((s) => s.decks);
  const refresh = useDeckStore((s) => s.refresh);
  const startLocal = useMatchStore((s) => s.startLocal);
  const startVsAi = useMatchStore((s) => s.startVsAi);
  const hostRoom = useMatchStore((s) => s.hostRoom);
  const joinRoom = useMatchStore((s) => s.joinRoom);
  const claimSeat = useMatchStore((s) => s.claimSeat);
  const releaseSeat = useMatchStore((s) => s.releaseSeat);
  const startOnlineMatch = useMatchStore((s) => s.startOnlineMatch);
  const leaveOnline = useMatchStore((s) => s.leaveOnline);
  const p1DeckId = useMatchStore((s) => s.p1DeckId);
  const p2DeckId = useMatchStore((s) => s.p2DeckId);
  const setMatchDecks = useMatchStore((s) => s.setMatchDecks);
  const connectionStatus = useMatchStore((s) => s.connectionStatus);
  const playBlockReason = useMatchStore((s) => s.playBlockReason);
  const clearPlayBlockReason = useMatchStore((s) => s.clearPlayBlockReason);
  const mode = useMatchStore((s) => s.mode);
  const roomCode = useMatchStore((s) => s.roomCode);
  const roomSnapshot = useMatchStore((s) => s.roomSnapshot);
  const clientId = useMatchStore((s) => s.clientId);
  const localPlayerId = useMatchStore((s) => s.localPlayerId);
  const setView = useMatchStore((s) => s.setView);

  const sessionHint = readOnlineSessionHint();
  const [joinCode, setJoinCode] = useState(
    () => sessionHint?.role === "client" ? sessionHint.roomCode : "",
  );
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

  const p1Reason = legalityById.get(p1DeckId);
  const p2Reason = legalityById.get(p2DeckId);
  const p1Legal = p1Reason?.ok === true;
  const p2Legal = p2Reason?.ok === true;
  const inOnlineRoom = mode !== "local" && roomCode !== null;

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
          Local hotseat, play vs AI on one machine, or host a PeerJS room. Joiners start as
          spectators; P1 and P2 are claimed seats. The room owner runs the match even while
          observing. Spectators see both hands and cannot act.
        </p>
      </header>

      {inOnlineRoom && (
        <RoomPanel
          mode={mode}
          roomCode={roomCode}
          room={roomSnapshot}
          clientId={clientId}
          localPlayerId={localPlayerId}
          connectionStatus={connectionStatus}
          busy={busy}
          isRoomOwner={mode === "host"}
          p1DeckId={p1DeckId}
          p2DeckId={p2DeckId}
          deckOptions={deckOptions}
          legalityById={legalityById}
          p1Legal={p1Legal}
          p2Legal={p2Legal}
          onClaim={(seat) => claimSeat(seat, seat === "p1" ? p1DeckId : p2DeckId)}
          onRelease={releaseSeat}
          onStart={startOnlineMatch}
          onLeave={leaveOnline}
          onBackToMatch={() => setView("match")}
          onChangeP1Deck={(id) => {
            clearPlayBlockReason();
            // Seated players must re-claim so the host stores the new WireLoadout.
            if (localPlayerId === "p1") claimSeat("p1", id);
            else setMatchDecks(id, p2DeckId);
          }}
          onChangeP2Deck={(id) => {
            clearPlayBlockReason();
            if (localPlayerId === "p2") claimSeat("p2", id);
            else setMatchDecks(p1DeckId, id);
          }}
        />
      )}

      <section className="space-y-3 rounded border border-stone-800 bg-stone-950/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Local hotseat
        </h2>
        <p className="text-xs text-stone-500">
          Each loadout needs exactly one legendary creature. Illegal decks show the engine reason
          below.
        </p>
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
        {!p1Legal && (
          <p className="text-xs text-red-300">
            {p1Reason !== undefined && !p1Reason.ok
              ? `P1: ${p1Reason.reason}`
              : "P1: pick a saved legal loadout."}
          </p>
        )}
        {!p2Legal && (
          <p className="text-xs text-red-300">
            {p2Reason !== undefined && !p2Reason.ok
              ? `P2: ${p2Reason.reason}`
              : "P2: pick a saved legal loadout."}
          </p>
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

      {!inOnlineRoom && (
        <VsAiPanel
          p1DeckId={p1DeckId}
          p2DeckId={p2DeckId}
          deckOptions={deckOptions}
          legalityById={legalityById}
          busy={busy}
          onStart={(args) => startVsAi(args)}
        />
      )}

      {!inOnlineRoom && (
        <>
          <section className="space-y-3 rounded border border-stone-800 bg-stone-950/50 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Online — host
            </h2>
            <p className="text-sm text-stone-400">
              Opens a room as the owner. You join as a spectator and may claim P1 or P2, or stay
              observing to collect metrics.
            </p>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy}
              onClick={() => void run(() => hostRoom())}
            >
              Host room
            </button>
            {sessionHint?.role === "host" && mode === "local" && (
              <button
                type="button"
                className={btnPrimary}
                disabled={busy}
                onClick={() => void run(() => hostRoom(sessionHint.deckId, { resume: true }))}
              >
                Resume room {sessionHint.roomCode}
              </button>
            )}
          </section>

          <section className="space-y-3 rounded border border-stone-800 bg-stone-950/50 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Online — join
            </h2>
            <p className="text-sm text-stone-400">
              You enter as a spectator. Claim an open seat with a legal loadout when you want to
              play.
            </p>
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
              disabled={busy || joinCode.trim().length < 4}
              onClick={() => void run(() => joinRoom(joinCode))}
            >
              Join room
            </button>
            {sessionHint?.role === "client" && mode === "local" && (
              <button
                type="button"
                className={btnPrimary}
                disabled={busy}
                onClick={() => void run(() => joinRoom(sessionHint.roomCode, sessionHint.deckId))}
              >
                Rejoin {sessionHint.roomCode}
              </button>
            )}
          </section>
        </>
      )}

      {playBlockReason !== null && (
        <p className="text-sm text-red-300">{playBlockReason}</p>
      )}
      {connectionStatus !== "local" && (
        <p className="text-sm text-stone-500">Status: {connectionStatus}</p>
      )}
    </main>
  );
}
