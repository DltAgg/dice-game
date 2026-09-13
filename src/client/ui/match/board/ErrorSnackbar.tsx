export function ErrorSnackbar({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss: () => void;
}) {
  if (error === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-72 z-50 flex justify-center px-4 sm:bottom-80">
      <div className="pointer-events-auto flex max-w-lg items-start gap-3 rounded-lg border border-red-500/50 bg-red-950/95 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur">
        <p className="font-mono text-sm text-red-100">Rejected: {error}</p>
        <button
          type="button"
          className="shrink-0 text-xs uppercase tracking-wide text-red-300 hover:text-white"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
