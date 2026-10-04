import {
  BASIC_FACE_CARDS,
  getFaceCard,
  type FaceCardId,
  type StartingDiceLayout,
} from "@server";
import { FacePaintChip } from "./FacePaintChip";
import type { PreviewTarget } from "./deckBuilderSearch";

export function OpeningDiceSection({
  readonly,
  startingDice,
  paintTarget,
  faceDeckSpecials,
  leftoverPool,
  onSelectSlot,
  onPaint,
  onPreview,
}: {
  readonly readonly: boolean;
  readonly startingDice: StartingDiceLayout;
  readonly paintTarget: { readonly die: 0 | 1; readonly slot: number } | null;
  readonly faceDeckSpecials: readonly FaceCardId[];
  readonly leftoverPool: readonly FaceCardId[];
  readonly onSelectSlot: (die: 0 | 1, slot: number) => void;
  readonly onPaint: (id: FaceCardId) => void;
  readonly onPreview: (preview: PreviewTarget) => void;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Opening dice
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Select a slot, then a basic or a face-deck special below (or Place on a face row).
        Leftover pool is mid-game forge inventory — click a leftover special to install it.
        {readonly ? " Builtin decks are read-only; Save as new to edit opening dice." : ""}
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {startingDice.map((die, dieIndex) => (
          <div key={`die-${String(dieIndex)}`} className="rounded-xl border border-stone-800 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
              Die {dieIndex + 1}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {die.map((id, slot) => {
                const face = getFaceCard(id);
                const selectedSlot = paintTarget?.die === dieIndex && paintTarget.slot === slot;
                return (
                  <button
                    key={`d${String(dieIndex)}-s${String(slot)}`}
                    type="button"
                    disabled={readonly}
                    className={
                      selectedSlot
                        ? "rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-2 py-2 text-left"
                        : "rounded border border-stone-700 bg-stone-950 px-2 py-2 text-left hover:border-stone-500"
                    }
                    onClick={() => onSelectSlot(dieIndex as 0 | 1, slot)}
                    onMouseEnter={() => onPreview({ kind: "face", id })}
                  >
                    <p className="truncate text-sm text-stone-100">{face?.name ?? id}</p>
                    <p className="truncate text-[10px] capitalize text-stone-500">
                      {face?.name ?? id}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Basics
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {BASIC_FACE_CARDS.map((face) => (
          <FacePaintChip
            key={face.id}
            name={face.name}
            disabled={readonly || paintTarget === null}
            onPaint={() => onPaint(face.id)}
            onPreview={() => onPreview({ kind: "face", id: face.id })}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Face-deck specials
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {faceDeckSpecials.length === 0 && (
          <p className="text-xs text-stone-600">
            No named specials in the face deck yet — add some from the Faces catalogue, then place
            them here.
          </p>
        )}
        {faceDeckSpecials.map((id) => {
          const face = getFaceCard(id);
          return (
            <FacePaintChip
              key={id}
              name={face?.name ?? id}
              disabled={readonly || paintTarget === null}
              onPaint={() => onPaint(id)}
              onPreview={() => onPreview({ kind: "face", id })}
            />
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Leftover pool ({leftoverPool.length})
      </p>
      <ul className="mt-1 flex flex-wrap gap-2">
        {leftoverPool.length === 0 && (
          <li className="text-xs text-stone-600">Empty — every face-deck special is installed.</li>
        )}
        {leftoverPool.map((id, index) => {
          const face = getFaceCard(id);
          return (
            <li key={`${id}-${String(index)}`}>
              <FacePaintChip
                name={face?.name ?? id}
                disabled={readonly || paintTarget === null}
                onPaint={() => onPaint(id)}
                onPreview={() => onPreview({ kind: "face", id })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
