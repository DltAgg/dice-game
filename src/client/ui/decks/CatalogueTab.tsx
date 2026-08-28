export function CatalogueTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "rounded px-2.5 py-1 text-xs text-[var(--accent)] bg-[var(--accent)]/15"
          : "rounded px-2.5 py-1 text-xs text-stone-500 hover:text-stone-300"
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}
