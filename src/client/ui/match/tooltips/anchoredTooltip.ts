import {
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

export const CREATURE_TOOLTIP_WIDTH_PX = 256; // w-64
export const CREATURE_TOOLTIP_GAP_PX = 8;
export const INSPECT_TOOLTIP_WIDTH_PX = 256;
export const INSPECT_TOOLTIP_GAP_PX = 8;
export const TOOLTIP_VIEW_MARGIN_PX = 8;
/** Never squeeze a tooltip into a strip shorter than this — flip to the other side. */
export const TOOLTIP_MIN_USABLE_PX = 220;

/** Lowest Y (viewport px) tooltips may occupy — clears sticky nav + match title bar. */
export function measureTooltipTopSafeY(): number {
  let safeY = TOOLTIP_VIEW_MARGIN_PX;
  const nav = document.querySelector("nav");
  if (nav instanceof HTMLElement) {
    safeY = Math.max(safeY, nav.getBoundingClientRect().bottom);
  }
  for (const el of document.querySelectorAll("[data-match-top-bar]")) {
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    safeY = Math.max(safeY, rect.bottom);
  }
  return safeY + TOOLTIP_VIEW_MARGIN_PX;
}

export function tooltipSpaceAbove(anchor: DOMRect, gap: number): number {
  return Math.max(0, anchor.top - gap - measureTooltipTopSafeY());
}

/**
 * Prefer `placement`, but never choose a side with less than TOOLTIP_MIN_USABLE_PX
 * when the other side is roomier — that was collapsing top-row tooltips to ~48px.
 */
export function chooseTooltipSide(
  placement: "above" | "below",
  spaceAbove: number,
  spaceBelow: number,
): "above" | "below" {
  const aboveOk = spaceAbove >= TOOLTIP_MIN_USABLE_PX;
  const belowOk = spaceBelow >= TOOLTIP_MIN_USABLE_PX;
  if (placement === "above") {
    if (aboveOk && spaceAbove >= spaceBelow) return "above";
    if (belowOk) return "below";
    return spaceAbove >= spaceBelow ? "above" : "below";
  }
  if (belowOk && spaceBelow >= spaceAbove) return "below";
  if (aboveOk) return "above";
  return spaceBelow >= spaceAbove ? "below" : "above";
}

export type AnchoredTooltipPos = {
  readonly left: number;
  readonly maxHeight: number;
  readonly top?: number;
  readonly bottom?: number;
};

export function clampTooltipLeft(left: number, width: number): number {
  const max = window.innerWidth - TOOLTIP_VIEW_MARGIN_PX - width;
  return Math.min(Math.max(left, TOOLTIP_VIEW_MARGIN_PX), Math.max(TOOLTIP_VIEW_MARGIN_PX, max));
}

export function fixedTooltipStyle(pos: AnchoredTooltipPos): {
  readonly left: number;
  readonly maxHeight: number;
  readonly top?: number;
  readonly bottom?: number;
} {
  if (pos.top !== undefined) {
    return { left: pos.left, maxHeight: pos.maxHeight, top: pos.top };
  }
  return { left: pos.left, maxHeight: pos.maxHeight, bottom: pos.bottom ?? 0 };
}

export type AnchoredTooltipPairPos = {
  readonly primaryLeft: number;
  readonly secondaryLeft: number;
  readonly maxHeight: number;
  readonly top?: number;
  readonly bottom?: number;
};

export function fixedTooltipPairStyle(
  pos: AnchoredTooltipPairPos,
  which: "primary" | "secondary",
): {
  readonly left: number;
  readonly maxHeight: number;
  readonly top?: number;
  readonly bottom?: number;
} {
  const left = which === "primary" ? pos.primaryLeft : pos.secondaryLeft;
  if (pos.top !== undefined) {
    return { left, maxHeight: pos.maxHeight, top: pos.top };
  }
  return { left, maxHeight: pos.maxHeight, bottom: pos.bottom ?? 0 };
}

/** Places a single tooltip above or below `anchor`, flipped/clamped to the viewport. */
export function placeTooltip(
  anchor: DOMRect,
  tooltipWidth: number,
  gap: number,
  placement: "above" | "below",
  align: "start" | "center",
): AnchoredTooltipPos {
  const preferredLeft =
    align === "center" ? anchor.left + anchor.width / 2 - tooltipWidth / 2 : anchor.left;
  const left = clampTooltipLeft(preferredLeft, tooltipWidth);
  const spaceAbove = tooltipSpaceAbove(anchor, gap);
  const spaceBelow = Math.max(0, window.innerHeight - anchor.bottom - TOOLTIP_VIEW_MARGIN_PX - gap);
  const side = chooseTooltipSide(placement, spaceAbove, spaceBelow);

  if (side === "above") {
    return {
      left,
      bottom: window.innerHeight - anchor.top + gap,
      maxHeight: Math.max(spaceAbove, 1),
    };
  }
  return {
    left,
    top: anchor.bottom + gap,
    maxHeight: Math.max(spaceBelow, 1),
  };
}

export function useAnchoredTooltip(
  hovered: boolean,
  rootRef: RefObject<HTMLElement | null>,
  tooltipWidth: number,
  gap: number,
  placement: "above" | "below",
  align: "start" | "center",
): AnchoredTooltipPos | null {
  const [pos, setPos] = useState<AnchoredTooltipPos | null>(null);

  useLayoutEffect(() => {
    if (!hovered) {
      setPos(null);
      return;
    }
    const update = () => {
      const node = rootRef.current;
      if (node === null) return;
      setPos(placeTooltip(node.getBoundingClientRect(), tooltipWidth, gap, placement, align));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [hovered, rootRef, tooltipWidth, gap, placement, align]);

  return pos;
}

/** Places a primary + aside tooltip pair, flipped/clamped so neither spills the viewport. */
export function placeTooltipPair(
  anchor: DOMRect,
  tooltipWidth: number,
  gap: number,
  placement: "above" | "below" = "above",
): AnchoredTooltipPairPos {
  const primaryPreferred = anchor.left;
  const secondaryPreferred = primaryPreferred + tooltipWidth + gap;
  const fitsRight =
    secondaryPreferred + tooltipWidth <= window.innerWidth - TOOLTIP_VIEW_MARGIN_PX;

  const primaryLeft = clampTooltipLeft(
    fitsRight ? primaryPreferred : anchor.right - tooltipWidth,
    tooltipWidth,
  );
  const secondaryLeft = clampTooltipLeft(
    fitsRight ? secondaryPreferred : primaryLeft - gap - tooltipWidth,
    tooltipWidth,
  );

  const spaceAbove = tooltipSpaceAbove(anchor, gap);
  const spaceBelow = Math.max(0, window.innerHeight - anchor.bottom - TOOLTIP_VIEW_MARGIN_PX - gap);
  const side = chooseTooltipSide(placement, spaceAbove, spaceBelow);

  if (side === "above") {
    return {
      primaryLeft,
      secondaryLeft,
      bottom: window.innerHeight - anchor.top + gap,
      maxHeight: Math.max(spaceAbove, 1),
    };
  }
  return {
    primaryLeft,
    secondaryLeft,
    top: anchor.bottom + gap,
    maxHeight: Math.max(spaceBelow, 1),
  };
}

export function useAnchoredTooltipPair(
  hovered: boolean,
  rootRef: RefObject<HTMLElement | null>,
  tooltipWidth: number,
  gap: number,
  placement: "above" | "below" = "above",
) {
  const [pos, setPos] = useState<AnchoredTooltipPairPos | null>(null);

  useLayoutEffect(() => {
    if (!hovered) {
      setPos(null);
      return;
    }
    const update = () => {
      const node = rootRef.current;
      if (node === null) return;
      setPos(placeTooltipPair(node.getBoundingClientRect(), tooltipWidth, gap, placement));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [hovered, rootRef, tooltipWidth, gap, placement]);

  return pos;
}
