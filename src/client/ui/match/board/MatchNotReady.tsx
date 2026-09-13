import type { MatchMode } from "@client/store/matchStore";
import { btnClass } from "../styles";

export function MatchNotReady({
  mode,
  roomCode,
  connectionStatus,
  localDeckName,
  onLobby,
  onLeave,
}: {
  readonly mode: MatchMode;
  readonly roomCode: string | null;
  readonly connectionStatus: string;
  readonly localDeckName: string | null;
  readonly onLobby: () => void;
  readonly onLeave: () => void;
}) {
  const isOnline = mode !== "local";

  return (
    <div className="relative mx-auto flex max-w-lg flex-col gap-4 px-4 pb-16 pt-28 sm:px-6">
      <div className="fixed inset-x-0 top-14 z-40 border-b border-stone-800/80 bg-[var(--felt-deep)]/95 shadow-lg shadow-black/30 backdrop-blur" data-match-top-bar>
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--ink)] sm:text-3xl">
              {isOnline ? (mode === "host" ? "Hosting…" : "Joining…") : "No match yet"}
            </h1>
            {isOnline ? (
              <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
                Room <span className="font-mono text-[var(--accent)]">{roomCode}</span>
                {" · "}
                {connectionStatus}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
                Start from Play — this tab does not begin a game.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button type="button" className={btnClass} onClick={onLobby}>
              {isOnline ? "Lobby" : "Play"}
            </button>
            {isOnline ? (
              <button type="button" className={btnClass} onClick={onLeave}>
                Leave
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded border border-stone-700 bg-stone-950/60 p-6">
        <p className="text-sm text-stone-300">
          {isOnline
            ? mode === "host"
              ? "Share the room code from Play. Claim seats there — hosting does not put you in P1. The board opens when the room owner starts the match."
              : "Connecting to the host. You join as a spectator; claim P1 or P2 from Play if a seat is open."
            : "Local hotseat and Play vs AI start from Play. Opening this tab does not start a match."}
        </p>
        {localDeckName !== null && (
          <p className="mt-4 text-sm text-stone-100">
            Your deck: <span className="text-[var(--accent)]">{localDeckName}</span>
          </p>
        )}
        {mode === "host" && roomCode !== null && (
          <p className="mt-2 font-mono text-2xl tracking-[0.2em] text-[var(--accent)]">{roomCode}</p>
        )}
      </div>
    </div>
  );
}
