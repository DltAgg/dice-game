import {
  useEffect,
  useId,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  formatEffectRegion,
  formatFaceKind,
  formatTypeLine,
  getCard,
  getFaceCard,
  type FaceCardId,
} from "@server";
import {
  formatPlayCostCompact,
} from "../intents/format";

export function BoardModal({
  title,
  subtitle,
  causedBy,
  children,
  onDismiss,
  onConfirm,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  causedBy?: ReactNode;
  children: ReactNode;
  onDismiss?: (() => void) | undefined;
  onConfirm?: (() => void) | undefined;
  wide?: boolean | undefined;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onDismiss !== undefined) {
        event.preventDefault();
        onDismiss();
      }
      if (event.key === "Enter" && onConfirm !== undefined) {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.tagName === "BUTTON" ||
            target.tagName === "SELECT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "INPUT" ||
            target.tagName === "A")
        ) {
          return;
        }
        event.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss, onConfirm]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={
          wide
            ? "max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl"
            : "max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id={titleId}
          className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]"
        >
          {title}
        </h2>
        {subtitle !== undefined && (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{subtitle}</p>
        )}
        {causedBy}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function TacticChoiceContent({
  def,
  fallbackId,
}: {
  def: ReturnType<typeof getCard>;
  fallbackId: string;
}) {
  if (def === undefined) {
    return <p className="text-sm font-medium text-stone-100">{fallbackId}</p>;
  }

  return (
    <>
      <p className="text-sm font-medium text-stone-100">{def.name}</p>
      <p className="text-xs text-stone-500">
        {formatPlayCostCompact(def)} · {def.subtypes.join("/")}
      </p>
      <p className="mt-1 text-[0.7rem] text-stone-400">{formatTypeLine(def)}</p>
      {formatEffectRegion(def).length > 0 && (
        <p className="mt-1 text-[0.7rem] leading-relaxed text-stone-400">
          {formatEffectRegion(def).join(" ")}
        </p>
      )}
    </>
  );
}

export function FaceChoiceContent({ faceCardId }: { faceCardId: FaceCardId }) {
  const face = getFaceCard(faceCardId);
  if (face === undefined) {
    return <p className="text-sm font-medium text-stone-100">{faceCardId}</p>;
  }

  const kindLabel = formatFaceKind(face.kind);

  return (
    <>
      <p className="text-sm font-medium text-stone-100">{face.name}</p>
      <p className="text-xs capitalize text-stone-500">
        {kindLabel} · {face.symbol}
        {face.maxOverloads > 0 ? ` · +${String(face.maxOverloads)} overload` : ""}
      </p>
      {face.rulesText !== "" && (
        <p className="mt-1 text-[0.7rem] leading-relaxed text-stone-400">{face.rulesText}</p>
      )}
    </>
  );
}
