/** Felt/stone badge for creatures with `definition.legendary === true`. Display only. */
export function LegendaryBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded border border-[var(--accent)]/45 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] ${className}`}
    >
      Legendary
    </span>
  );
}
