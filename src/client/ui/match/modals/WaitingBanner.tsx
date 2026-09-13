export function WaitingBanner({ children }: { children: string }) {
  return (
    <p className="rounded border border-stone-700 bg-stone-950/70 px-4 py-3 text-sm text-stone-300">
      {children}
    </p>
  );
}
