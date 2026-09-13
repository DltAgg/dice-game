import {
  useEffect,
  useState,
} from "react";
import {
  getCard,
  graveyardOf,
  type GameState,
  type PlayerId,
} from "@server";
import {
  BoardModal,
  FaceChoiceContent,
  TacticChoiceContent,
} from "../modals/BoardModal";
import {
  btnClass,
} from "../styles";

export function DockPeekButton({
  label,
  count,
  open,
  ariaLabel,
  onOpen,
}: {
  label: string;
  count: number;
  open: boolean;
  ariaLabel: string;
  onOpen: () => void;
}) {
  return (
    <section
      className={
        open
          ? "flex min-h-[4.25rem] flex-1 flex-col rounded-lg border border-[var(--accent)] bg-black/30 p-2"
          : "flex min-h-[4.25rem] flex-1 flex-col rounded-lg border border-stone-800/80 bg-black/30 p-2"
      }
    >
      <button
        type="button"
        className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={onOpen}
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
          {label}
        </span>
        <span className="text-lg font-medium leading-none tabular-nums text-stone-100">
          {count}
        </span>
        <span className="text-[0.6rem] uppercase tracking-wide text-stone-500">View</span>
      </button>
    </section>
  );
}

export function ZoneDocks({
  state,
  playerId,
}: {
  state: GameState;
  playerId: PlayerId;
}) {
  const [open, setOpen] = useState<"graveyard" | "faces" | null>(null);
  const gy = graveyardOf(state, playerId);
  const facePool = state.players[playerId]?.facePool ?? [];

  useEffect(() => {
    setOpen(null);
  }, [playerId]);

  return (
    <>
      <div className="flex w-[4.5rem] shrink-0 flex-col gap-2 self-stretch">
        <DockPeekButton
          label="GY"
          count={gy.length}
          open={open === "graveyard"}
          ariaLabel={`View graveyard (${String(gy.length)})`}
          onOpen={() => setOpen("graveyard")}
        />
        <DockPeekButton
          label="Faces"
          count={facePool.length}
          open={open === "faces"}
          ariaLabel={`View face deck (${String(facePool.length)})`}
          onOpen={() => setOpen("faces")}
        />
      </div>
      {open === "graveyard" && (
        <BoardModal
          title="Graveyard"
          subtitle={`${String(gy.length)} card${gy.length === 1 ? "" : "s"} in your graveyard.`}
          onDismiss={() => setOpen(null)}
        >
          <ul className="mt-4 space-y-2">
            {gy.map((card) => (
              <li
                key={card.id}
                className="rounded border border-stone-700 bg-stone-900 px-3 py-2"
              >
                <TacticChoiceContent def={getCard(card.cardId)} fallbackId={card.cardId} />
              </li>
            ))}
            {gy.length === 0 && (
              <li className="text-sm text-stone-500">Empty graveyard</li>
            )}
          </ul>
          <button type="button" className={`${btnClass} mt-4`} onClick={() => setOpen(null)}>
            Close
          </button>
        </BoardModal>
      )}
      {open === "faces" && (
        <BoardModal
          title="Face deck"
          subtitle={`${String(facePool.length)} card${facePool.length === 1 ? "" : "s"} left to forge onto a die.`}
          onDismiss={() => setOpen(null)}
        >
          <ul className="mt-4 space-y-2">
            {facePool.map((faceCardId, index) => (
              <li
                key={`${faceCardId}-${String(index)}`}
                className="rounded border border-stone-700 bg-stone-900 px-3 py-2"
              >
                <FaceChoiceContent faceCardId={faceCardId} />
              </li>
            ))}
            {facePool.length === 0 && (
              <li className="text-sm text-stone-500">No face cards left in your pool.</li>
            )}
          </ul>
          <button type="button" className={`${btnClass} mt-4`} onClick={() => setOpen(null)}>
            Close
          </button>
        </BoardModal>
      )}
    </>
  );
}
