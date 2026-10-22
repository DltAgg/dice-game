import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { FaceCardDefinition } from "@server";
import { KeywordRichText } from "@client/ui/keywords/KeywordReminders";
import { FIXED_INSPECT_TOOLTIP_CLASS } from "../styles";
import {
  fixedTooltipStyle,
  INSPECT_TOOLTIP_GAP_PX,
  INSPECT_TOOLTIP_WIDTH_PX,
  useAnchoredTooltip,
} from "../tooltips/anchoredTooltip";
import { showingFaceTooltip } from "./showingFaceTooltip";

/**
 * Hover for a showing-face name. The child stays the drag or clear control.
 */
export function ShowingFaceHover({
  face,
  active = false,
  children,
}: {
  face: FaceCardDefinition;
  active?: boolean;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const pos = useAnchoredTooltip(
    hovered,
    rootRef,
    INSPECT_TOOLTIP_WIDTH_PX,
    INSPECT_TOOLTIP_GAP_PX,
    "above",
    "start",
  );
  const detail = showingFaceTooltip(face);

  return (
    <span
      ref={rootRef}
      className="inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragStart={() => setHovered(false)}
    >
      {children}
      {pos !== null &&
        createPortal(
          <div className={FIXED_INSPECT_TOOLTIP_CLASS} style={fixedTooltipStyle(pos)} role="tooltip">
            <p className="text-sm font-medium text-stone-100">{face.name}</p>
            {active && <p className="mt-0.5 text-[0.65rem] text-[var(--accent)]">Active Fighter</p>}
            {detail.line !== "" && (
              <p className="mt-1 text-[0.7rem] text-stone-300">{detail.line}</p>
            )}
            {detail.abilities.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                {detail.abilities.map((ability) => (
                  <p key={ability.label}>
                    <span className="text-stone-500">{ability.label}:</span>{" "}
                    <KeywordRichText text={ability.text} />
                  </p>
                ))}
              </div>
            )}
            {detail.notes.length > 0 && (
              <div className="mt-2 space-y-1 text-[0.7rem] leading-relaxed text-stone-400">
                {detail.notes.map((note) => (
                  <p key={note}>
                    <KeywordRichText text={note} />
                  </p>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
