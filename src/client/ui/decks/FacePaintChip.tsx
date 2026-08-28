export function FacePaintChip({
  name,
  disabled,
  onPaint,
  onPreview,
}: {
  name: string;
  disabled: boolean;
  onPaint: () => void;
  onPreview: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 hover:border-stone-500 disabled:opacity-40"
      onClick={onPaint}
      onMouseEnter={onPreview}
    >
      {name}
    </button>
  );
}
