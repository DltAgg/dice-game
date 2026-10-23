import type { ReactNode } from "react";

/**
 * A Fighter state shown beside the name. Add a kind here when a new state
 * should appear in that row (fallen, poisoned, and similar).
 */
export type FighterStatus = "cannot-tag-in" | "silenced";

const STATUS: Record<
  FighterStatus,
  {
    readonly label: string;
    readonly ariaLabel: string;
    readonly tone: string;
    readonly prohibited?: boolean;
    /** Same hue and alpha as the badge border. */
    readonly slash?: string;
  }
> = {
  "cannot-tag-in": {
    label: "Tag in",
    ariaLabel: "Cannot Tag in",
    tone: "border-red-400/40 bg-red-950/50 text-red-200",
    prohibited: true,
    slash: "bg-red-400/40",
  },
  silenced: {
    label: "Silenced",
    ariaLabel: "Silenced",
    tone: "border-violet-400/40 bg-violet-950/50 text-violet-200",
  },
};

export function fighterStatuses(flags: {
  readonly cannotTagIn?: boolean;
  readonly silenced?: boolean;
}): readonly FighterStatus[] {
  const statuses: FighterStatus[] = [];
  if (flags.cannotTagIn === true) statuses.push("cannot-tag-in");
  if (flags.silenced === true) statuses.push("silenced");
  return statuses;
}

export function FighterStatusBadge({ status }: { status: FighterStatus }) {
  const spec = STATUS[status];
  return (
    <span
      role="img"
      aria-label={spec.ariaLabel}
      title={spec.ariaLabel}
      className={`inline-block rounded border px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] ${spec.tone}`}
    >
      <span className="relative inline-block">
        <span aria-hidden>{spec.label}</span>
        {spec.prohibited === true && (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-[-6px] top-1/2 h-[1.5px] -translate-y-1/2 rotate-[15deg] ${spec.slash ?? "bg-current"}`}
          />
        )}
      </span>
    </span>
  );
}

/** Fighter name on the left, status badges on the right. */
export function FighterNameRow({
  name,
  nameClassName = "text-stone-100",
  afterName,
  statuses,
}: {
  name: string;
  nameClassName?: string;
  afterName?: ReactNode;
  statuses: readonly FighterStatus[];
}) {
  return (
    <p className="flex items-center gap-2">
      <span className={`min-w-0 truncate font-medium ${nameClassName}`}>{name}</span>
      {afterName}
      {statuses.length > 0 && (
        <span className="ml-auto flex shrink-0 flex-wrap justify-end gap-1">
          {statuses.map((status) => (
            <FighterStatusBadge key={status} status={status} />
          ))}
        </span>
      )}
    </p>
  );
}
