import {
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  formatEffectRegion,
  formatForgeLine,
  formatTypeLine,
  getCard,
  getFaceCard,
} from "@server";
import { KeywordRemindersTooltip, KeywordRichText } from "@client/ui/keywords/KeywordReminders";
import { facePrintText, tacticPrintText } from "@client/ui/keywords/reminders";
import {
  formatPlayCostHover,
} from "../intents/format";
import {
  FIXED_INSPECT_ASIDE_CLASS,
  FIXED_INSPECT_TOOLTIP_CLASS,
} from "../styles";
import {
  fixedTooltipPairStyle,
  fixedTooltipStyle,
  INSPECT_TOOLTIP_GAP_PX,
  INSPECT_TOOLTIP_WIDTH_PX,
  useAnchoredTooltip,
  useAnchoredTooltipPair,
} from "./anchoredTooltip";

export function NameInspectHover({
  name,
  negated = false,
  placement = "above",
  children,
  aside,
}: {
  name: string;
  negated?: boolean;
  placement?: "above" | "below";
  children: ReactNode;
  /** When set, shows a primary + Keywords aside tooltip pair. */
  aside?: ReactNode;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const usePair = aside !== undefined;
  const pos = useAnchoredTooltip(
    hovered && !usePair,
    rootRef,
    INSPECT_TOOLTIP_WIDTH_PX,
    INSPECT_TOOLTIP_GAP_PX,
    placement,
    "start",
  );
  const pairPos = useAnchoredTooltipPair(
    hovered && usePair,
    rootRef,
    INSPECT_TOOLTIP_WIDTH_PX,
    INSPECT_TOOLTIP_GAP_PX,
    placement,
  );

  return (
    <span
      ref={rootRef}
      className="inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={
          negated
            ? "cursor-help font-medium text-amber-100/70 underline decoration-dotted line-through"
            : "cursor-help font-medium text-amber-50 underline decoration-dotted"
        }
      >
        {name}
      </span>
      {pos !== null &&
        createPortal(
          <div
            className={FIXED_INSPECT_TOOLTIP_CLASS}
            style={fixedTooltipStyle(pos)}
            role="tooltip"
          >
            {children}
          </div>,
          document.body,
        )}
      {pairPos !== null &&
        createPortal(
          <>
            <div
              className={FIXED_INSPECT_TOOLTIP_CLASS}
              style={fixedTooltipPairStyle(pairPos, "primary")}
              role="tooltip"
            >
              {children}
            </div>
            <div
              className={FIXED_INSPECT_ASIDE_CLASS}
              style={fixedTooltipPairStyle(pairPos, "secondary")}
              role="tooltip"
            >
              {aside}
            </div>
          </>,
          document.body,
        )}
    </span>
  );
}

export function TacticInspectHover({
  def,
  negated = false,
  placement = "above",
}: {
  def: NonNullable<ReturnType<typeof getCard>>;
  negated?: boolean;
  placement?: "above" | "below";
}) {
  return (
    <NameInspectHover
      name={def.name}
      negated={negated}
      placement={placement}
      aside={<KeywordRemindersTooltip print={tacticPrintText(def)} />}
    >
      <p className="text-sm font-medium text-stone-100">{def.name}</p>
      <p className="mt-1 text-xs text-stone-400">
        {formatPlayCostHover(def)}
        {negated ? " · negated" : ""}
      </p>
      <div className="mt-2 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
        <p>
          <KeywordRichText text={formatTypeLine(def)} />
        </p>
        <p className="mt-1 text-stone-500">
          <KeywordRichText text={formatForgeLine(def.forge)} />
        </p>
        <div
          className="my-2 -mx-3 h-px bg-gradient-to-r from-transparent via-[#b4a79c]/70 to-transparent"
          role="separator"
          aria-hidden
        />
        {formatEffectRegion(def).map((line) => (
          <p key={line}>
            <KeywordRichText text={line} />
          </p>
        ))}
      </div>
    </NameInspectHover>
  );
}

export function FaceInspectHover({
  face,
  placement = "above",
}: {
  face: NonNullable<ReturnType<typeof getFaceCard>>;
  placement?: "above" | "below";
}) {
  return (
    <NameInspectHover
      name={face.name}
      placement={placement}
      aside={<KeywordRemindersTooltip print={facePrintText(face)} />}
    >
      <p className="text-sm font-medium text-stone-100">{face.name}</p>
      <p className="mt-1 text-xs capitalize text-stone-400">
        {face.kind} · {face.symbol}
      </p>
      {face.rulesText !== "" && (
        <p className="mt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
          <KeywordRichText text={face.rulesText} />
        </p>
      )}
    </NameInspectHover>
  );
}
