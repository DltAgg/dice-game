import { btnTiny } from "./deckBuilderStyles";

export function DeckRow({
  title,
  subtitle,
  copies,
  maxCopies,
  active,
  readonly,
  addDisabled = false,
  onHover,
  onAssign,
  canAssign = false,
  onAdd,
  onRemove,
}: {
  title: string;
  subtitle: string;
  copies: number;
  maxCopies: number;
  active: boolean;
  readonly: boolean;
  addDisabled?: boolean;
  onHover: () => void;
  onAssign?: () => void;
  canAssign?: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={
        active
          ? "flex items-center justify-between gap-2 rounded border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-3 py-2"
          : "flex items-center justify-between gap-2 rounded border border-stone-800 bg-stone-950/70 px-3 py-2 hover:border-stone-600"
      }
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-stone-100">{title}</p>
        <p className="truncate text-xs capitalize text-stone-500">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onAssign !== undefined && (
          <button
            type="button"
            className={btnTiny}
            disabled={readonly || !canAssign}
            aria-label={`Place ${title} on the selected opening slot`}
            onClick={(event) => {
              event.stopPropagation();
              onAssign();
            }}
          >
            Place
          </button>
        )}
        <button
          type="button"
          className={btnTiny}
          disabled={readonly || copies === 0}
          aria-label={`Remove one ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-xs text-stone-400">{copies}</span>
        <button
          type="button"
          className={btnTiny}
          disabled={readonly || copies >= maxCopies || addDisabled}
          aria-label={`Add one ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
