import {
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  type CreatureId,
} from "@server";

export type AttackArrowPair = { readonly from: CreatureId; readonly to: CreatureId };
export type AttackArrowLine = { x1: number; y1: number; x2: number; y2: number };

export function rectCenter(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function rectExit(rect: DOMRect, towardX: number, towardY: number): { x: number; y: number } {
  const center = rectCenter(rect);
  const dx = towardX - center.x;
  const dy = towardY - center.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return center;
  const nx = dx / length;
  const ny = dy / length;
  const tx = nx === 0 ? Number.POSITIVE_INFINITY : rect.width / 2 / Math.abs(nx);
  const ty = ny === 0 ? Number.POSITIVE_INFINITY : rect.height / 2 / Math.abs(ny);
  const t = Math.min(tx, ty);
  return { x: center.x + nx * t, y: center.y + ny * t };
}

export function measureAttackArrows(pairs: readonly AttackArrowPair[]): AttackArrowLine[] {
  const lines: AttackArrowLine[] = [];
  for (const pair of pairs) {
    const fromEl = document.querySelector(`[data-creature-id="${CSS.escape(pair.from)}"]`);
    const toEl = document.querySelector(`[data-creature-id="${CSS.escape(pair.to)}"]`);
    if (!(fromEl instanceof HTMLElement) || !(toEl instanceof HTMLElement)) continue;
    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();
    const start = rectExit(from, rectCenter(to).x, rectCenter(to).y);
    const end = rectExit(to, rectCenter(from).x, rectCenter(from).y);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 12) continue;
    const pull = 6;
    lines.push({
      x1: Math.round(start.x),
      y1: Math.round(start.y),
      x2: Math.round(end.x - (dx / length) * pull),
      y2: Math.round(end.y - (dy / length) * pull),
    });
  }
  return lines;
}

export function attackArrowLinesEqual(
  left: readonly AttackArrowLine[],
  right: readonly AttackArrowLine[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((line, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      line.x1 === other.x1 &&
      line.y1 === other.y1 &&
      line.x2 === other.x2 &&
      line.y2 === other.y2
    );
  });
}

export function AttackArrowOverlay({ pairs }: { pairs: readonly AttackArrowPair[] }) {
  const markerId = useId().replaceAll(":", "");
  const [lines, setLines] = useState<readonly AttackArrowLine[]>([]);

  useLayoutEffect(() => {
    if (pairs.length === 0) {
      setLines([]);
      return;
    }
    let frame = 0;
    const tick = () => {
      const next = measureAttackArrows(pairs);
      setLines((prev) => (attackArrowLinesEqual(prev, next) ? prev : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pairs]);

  if (pairs.length === 0 || lines.length === 0) return null;

  return createPortal(
    <svg
      className="pointer-events-none fixed inset-0 z-[25] h-dvh w-dvw"
      aria-hidden="true"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0 0 L10 4 L0 8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {lines.map((line) => (
        <g key={`${String(line.x1)},${String(line.y1)}-${String(line.x2)},${String(line.y2)}`}>
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(15,13,11,0.7)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />
        </g>
      ))}
    </svg>,
    document.body,
  );
}
