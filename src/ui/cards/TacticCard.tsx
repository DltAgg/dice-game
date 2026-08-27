import {
  formatEffectRegion,
  formatForgeLine,
  formatPlayCostHeader,
  formatTypeLine,
  type CardDefinition,
} from "@/game";
import { splitBracketParts } from "@/ui/keywords/reminders";
import tacticsLayout from "./assets/tactics-layout.png";

/**
 * The Figma `Tactics card layout` template, rendered in English.
 *
 * Proportions follow the 1050×1498 frame: header at the top, art in the middle,
 * rules text in the bottom box. The ornate border is the exported asset from
 * the Figma tactics layout — not redrawn by hand.
 */

export interface TacticCardProps {
  readonly card: CardDefinition;
  /** CSS width of the card. Height follows the Figma aspect ratio. */
  readonly width?: number;
}

export function TacticCard({ card, width = 280 }: TacticCardProps) {
  const effectLines = formatEffectRegion(card);
  const costLabel = formatPlayCostHeader(card);
  const forge = formatForgeLine(card.forge);

  return (
    <article
      className="relative select-none text-black"
      style={{ width, aspectRatio: "1050 / 1498", containerType: "inline-size" }}
      aria-label={`${card.name}, cost ${costLabel}`}
    >
      <img
        src={tacticsLayout}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      <header className="absolute inset-x-[6.4%] top-[4.5%] flex h-[8%] items-center justify-center">
        <h2 className="max-w-[72%] truncate text-center font-[family-name:var(--font-card)] text-[length:clamp(0.7rem,5.5cqw,1.35rem)] font-normal leading-none tracking-tight">
          {card.name}
        </h2>
        <div className="absolute right-0 top-[6%] flex h-[88%] w-[12%] items-center justify-center border-l-[3px] border-[#b4a79c]">
          <span className="font-[family-name:var(--font-card)] text-[length:clamp(1rem,7cqw,1.9rem)] font-normal leading-none">
            {costLabel}
          </span>
        </div>
      </header>

      {/*
        Full-article rules region so the forge/effect split can run edge-to-edge.
        Text keeps the old inner inset (6.4% frame + 2.5% column padding).
      */}
      <div className="absolute inset-x-0 bottom-[7.4%] flex h-[21.7%] flex-col justify-start overflow-hidden pt-[2%]">
        <div className="mx-[6.4%] px-[2.5%]">
          <KeywordLine text={formatTypeLine(card)} bold />
          <ForgeLine text={forge} />
        </div>

        <ForgeEffectSplit />

        <div className="mx-[6.4%] px-[2.5%]">
          {effectLines.map((line) => (
            <KeywordLine key={line} text={line} bold={line.startsWith("[")} />
          ))}
        </div>
      </div>
    </article>
  );
}

function KeywordLine({ text, bold }: { text: string; bold?: boolean }) {
  return (
    <p
      className={
        bold
          ? "font-[family-name:var(--font-card)] text-[length:clamp(0.55rem,3.1cqw,0.78rem)] font-bold leading-snug"
          : "font-[family-name:var(--font-card)] text-[length:clamp(0.55rem,3.1cqw,0.78rem)] font-normal leading-snug"
      }
    >
      {splitBracketParts(text).map((part, index) =>
        part.keyword && !bold ? (
          <span key={`${part.text}:${String(index)}`} className="font-bold">
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}:${String(index)}`}>{part.text}</span>
        ),
      )}
    </p>
  );
}

/**
 * Horizontal split between forge and effect. Spans the card body (just inside
 * the ornate inner frame), not the padded text column.
 */
function ForgeEffectSplit() {
  return (
    <div
      className="relative my-[0.45em] h-px w-full shrink-0"
      role="separator"
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-[3.8%] right-[3.8%]"
        style={{
          background:
            "linear-gradient(to right, transparent, #b4a79c 6%, #b4a79c 94%, transparent)",
        }}
      />
    </div>
  );
}

/** Bold `[Forge]` (and any other `[…]` token) on the forge line. */
function ForgeLine({ text }: { text: string }) {
  return (
    <p className="mt-[0.15em] font-[family-name:var(--font-card)] text-[length:clamp(0.55rem,3.1cqw,0.78rem)] font-normal leading-snug">
      {splitBracketParts(text).map((part, index) =>
        part.keyword ? (
          <span key={`${part.text}:${String(index)}`} className="font-bold">
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}:${String(index)}`}>{part.text}</span>
        ),
      )}
    </p>
  );
}
