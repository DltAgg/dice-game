import {
  formatEffectRegion,
  formatEnergyCost,
  formatForgeLine,
  formatTypeLine,
  type CardDefinition,
} from "@/game";
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
  const costLabel = formatEnergyCost(card);
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

      <div className="absolute inset-x-[6.4%] bottom-[7.4%] flex h-[21.7%] flex-col justify-start overflow-hidden px-[2.5%] pt-[2%]">
        <KeywordLine text={formatTypeLine(card)} bold />
        <ForgeLine text={forge} />

        <p className="my-[0.35em] font-[family-name:var(--font-card)] text-[length:clamp(0.55rem,3.1cqw,0.78rem)] font-normal leading-snug">
          or
        </p>

        {effectLines.map((line) => (
          <KeywordLine key={line} text={line} bold={line.startsWith("[")} />
        ))}
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
      {text}
    </p>
  );
}

/** Bold only the `[Forge]` keyword, matching the layouts' treatment of `[Forje]`. */
function ForgeLine({ text }: { text: string }) {
  const match = /^(\[Forge\])(.*)$/.exec(text);
  if (match === null) return <KeywordLine text={text} />;
  return (
    <p className="mt-[0.15em] font-[family-name:var(--font-card)] text-[length:clamp(0.55rem,3.1cqw,0.78rem)] leading-snug">
      <span className="font-bold">{match[1]}</span>
      <span className="font-normal">{match[2]}</span>
    </p>
  );
}
