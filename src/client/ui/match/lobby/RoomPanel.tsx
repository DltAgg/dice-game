import { validateSavedDeck, type SavedDeck } from "@client/decks";
import type { RoomSnapshot, SeatId } from "@client/networking";
import { btnGhost, btnPrimary } from "./buttons";
import { DeckSelect } from "./DeckSelect";

export function RoomPanel({
  mode,
  roomCode,
  room,
  clientId,
  localPlayerId,
  connectionStatus,
  busy,
  isRoomOwner,
  p1DeckId,
  p2DeckId,
  deckOptions,
  legalityById,
  p1Legal,
  p2Legal,
  onClaim,
  onRelease,
  onStart,
  onLeave,
  onBackToMatch,
  onChangeP1Deck,
  onChangeP2Deck,
}: {
  readonly mode: "host" | "client" | "local";
  readonly roomCode: string;
  readonly room: RoomSnapshot | null;
  readonly clientId: string;
  readonly localPlayerId: string | null;
  readonly connectionStatus: string;
  readonly busy: boolean;
  readonly isRoomOwner: boolean;
  readonly p1DeckId: string;
  readonly p2DeckId: string;
  readonly deckOptions: readonly Pick<SavedDeck, "id" | "name">[];
  readonly legalityById: ReadonlyMap<string, ReturnType<typeof validateSavedDeck>>;
  readonly p1Legal: boolean;
  readonly p2Legal: boolean;
  readonly onClaim: (seat: SeatId) => void;
  readonly onRelease: () => void;
  readonly onStart: () => void;
  readonly onLeave: () => void;
  readonly onBackToMatch: () => void;
  readonly onChangeP1Deck: (id: string) => void;
  readonly onChangeP2Deck: (id: string) => void;
}) {
  const started = room?.started === true;
  const bothReady = room?.seats.p1?.ready === true && room.seats.p2?.ready === true;
  const youAreSpectator = localPlayerId === null;
  const roleLabel = youAreSpectator ? "spectator" : localPlayerId;

  return (
    <section className="space-y-4 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Room
          </h2>
          <p className="mt-1 font-mono text-2xl tracking-[0.2em] text-[var(--accent)]">{roomCode}</p>
          <p className="mt-1 text-sm text-stone-300">
            You are <span className="text-[var(--accent)]">{roleLabel}</span>
            {mode === "host" ? " · room owner" : null}
            {" · "}
            {connectionStatus}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {started && (
            <button type="button" className={btnPrimary} onClick={onBackToMatch}>
              Back to match
            </button>
          )}
          <button type="button" className={btnGhost} onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <SeatCard
          seat="p1"
          occupant={room?.seats.p1 ?? null}
          clientId={clientId}
          youAreSpectator={youAreSpectator}
          started={started}
          busy={busy}
          deckId={p1DeckId}
          deckOptions={deckOptions}
          legalityById={legalityById}
          deckLegal={p1Legal}
          onChangeDeck={onChangeP1Deck}
          onClaim={() => onClaim("p1")}
          onRelease={onRelease}
        />
        <SeatCard
          seat="p2"
          occupant={room?.seats.p2 ?? null}
          clientId={clientId}
          youAreSpectator={youAreSpectator}
          started={started}
          busy={busy}
          deckId={p2DeckId}
          deckOptions={deckOptions}
          legalityById={legalityById}
          deckLegal={p2Legal}
          onChangeDeck={onChangeP2Deck}
          onClaim={() => onClaim("p2")}
          onRelease={onRelease}
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Spectators
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-stone-300">
          {(room?.spectators ?? []).length === 0 ? (
            <li className="text-stone-500">None</li>
          ) : (
            (room?.spectators ?? []).map((member) => (
              <li key={member.clientId} className="font-mono text-xs">
                {member.clientId}
                {member.clientId === clientId ? " (you)" : ""}
                {room?.hostClientId === member.clientId ? " · owner" : ""}
              </li>
            ))
          )}
        </ul>
      </div>

      {isRoomOwner && !started && (
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !bothReady}
          onClick={onStart}
        >
          Start match
        </button>
      )}
      {isRoomOwner && !started && !bothReady && (
        <p className="text-xs text-stone-500">Start when both seats are filled with legal loadouts.</p>
      )}
    </section>
  );
}

function SeatCard({
  seat,
  occupant,
  clientId,
  youAreSpectator,
  started,
  busy,
  deckId,
  deckOptions,
  legalityById,
  deckLegal,
  onChangeDeck,
  onClaim,
  onRelease,
}: {
  readonly seat: SeatId;
  readonly occupant: RoomSnapshot["seats"]["p1"];
  readonly clientId: string;
  readonly youAreSpectator: boolean;
  readonly started: boolean;
  readonly busy: boolean;
  readonly deckId: string;
  readonly deckOptions: readonly Pick<SavedDeck, "id" | "name">[];
  readonly legalityById: ReadonlyMap<string, ReturnType<typeof validateSavedDeck>>;
  readonly deckLegal: boolean;
  readonly onChangeDeck: (id: string) => void;
  readonly onClaim: () => void;
  readonly onRelease: () => void;
}) {
  const open = occupant === null;
  const isYou = occupant?.clientId === clientId;
  const label = seat.toUpperCase();

  return (
    <div className="space-y-2 rounded border border-stone-800 bg-stone-950/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      {open ? (
        <p className="text-sm text-stone-400">Open seat</p>
      ) : (
        <p className="font-mono text-xs text-stone-200">
          {occupant.clientId}
          {isYou ? " (you)" : ""}
          {occupant.ready ? " · ready" : ""}
        </p>
      )}
      {!started && (open || isYou) && (
        <DeckSelect
          label={`${label} loadout`}
          value={deckId}
          options={deckOptions}
          legalityById={legalityById}
          onChange={onChangeDeck}
        />
      )}
      {!started && open && youAreSpectator && (
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !deckLegal}
          onClick={onClaim}
        >
          Claim {label}
        </button>
      )}
      {!started && isYou && (
        <button type="button" className={btnGhost} disabled={busy} onClick={onRelease}>
          Leave seat (spectate)
        </button>
      )}
    </div>
  );
}
