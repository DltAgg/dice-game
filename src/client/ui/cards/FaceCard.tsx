import type { FaceCardDefinition } from "@server";
import { faceRulesLines } from "./faceRulesLines";
import faceLayout from "./assets/faces/face-layout.jpg";
import shieldIcon from "./assets/faces/icons/shield.png";
import arcaneEchoIcon from "./assets/faces/icons/arcane-echo.png";
import rendingClawIcon from "./assets/faces/icons/rending-claw.png";
import crushIcon from "./assets/faces/icons/crush.png";
import bladeRainIcon from "./assets/faces/icons/blade-rain.png";
import forbiddenHeritageIcon from "./assets/faces/icons/forbidden-heritage.png";
import pestilentPlagueIcon from "./assets/faces/icons/pestilent-plague.png";

/**
 * The Figma Face card layout template, rendered in English.
 *
 * Text treatment follows the printed Face cards: bold type line, body with
 * bracketed keywords bolded inline, overload in the black bottom bracket.
 */

const SPECIAL_ART: Readonly<Record<string, string>> = {
  "face-synthetic-arcane-echo": arcaneEchoIcon,
  "face-synthetic-rending-claw": rendingClawIcon,
  "face-synthetic-crush": crushIcon,
  "face-synthetic-blade-rain": bladeRainIcon,
  "face-synthetic-forbidden-heritage": forbiddenHeritageIcon,
  "face-synthetic-pestilent-plague": pestilentPlagueIcon,
};

const BODY_CLASS =
  "font-[family-name:var(--font-card)] text-[length:clamp(0.55rem,3.1cqw,0.78rem)] leading-[1.35]";

function medallionFor(face: FaceCardDefinition): string {
  const special = SPECIAL_ART[face.id];
  if (special !== undefined) return special;
  return shieldIcon;
}

function typeLine(face: FaceCardDefinition): string {
  return `[Face] ${face.name}`;
}

/** Split on `[…]` tokens so keywords print bold, matching the Figma treatment. */
function richParts(text: string): readonly { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  const pattern = /(\[[^\]]+\])/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index), bold: false });
    parts.push({ text: match[1]!, bold: true });
    last = index + match[1]!.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts.length > 0 ? parts : [{ text, bold: false }];
}

export interface FaceCardProps {
  readonly face: FaceCardDefinition;
  /** CSS width of the card. Height follows the Figma aspect ratio. */
  readonly width?: number;
}

export function FaceCard({ face, width = 280 }: FaceCardProps) {
  const art = medallionFor(face);
  const lines = faceRulesLines(face.rulesText);
  const overloadLabel = `+${String(face.maxOverloads)} Overload`;

  return (
    <article
      className="relative select-none text-black"
      style={{ width, aspectRatio: "717 / 1024", containerType: "inline-size" }}
      aria-label={face.name}
    >
      <img
        src={faceLayout}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      <header className="absolute inset-x-[8%] top-[4.2%] flex h-[7.2%] items-center justify-center px-[2%]">
        <h2 className="max-w-full truncate text-center font-[family-name:var(--font-card)] text-[length:clamp(0.75rem,6cqw,1.3rem)] font-semibold leading-none tracking-tight">
          {face.name}
        </h2>
      </header>

      <div className="absolute inset-x-[9%] top-[14.5%] flex h-[42%] items-center justify-center">
        <div className="aspect-square w-[78%] overflow-hidden rounded-full">
          <img src={art} alt="" draggable={false} className="size-full object-cover" />
        </div>
      </div>

      <div className="absolute inset-x-[10%] bottom-[8%] flex h-[29%] flex-col justify-start gap-[0.2em] overflow-hidden px-[2.5%] pt-[4%]">
        <p className={`${BODY_CLASS} font-bold`}>{typeLine(face)}</p>
        {lines.map((line, index) => (
          <RulesLine key={`${line}:${String(index)}`} text={line} />
        ))}
      </div>

      <div className="absolute bottom-[1.1%] left-1/2 flex h-[4.6%] w-[42%] -translate-x-1/2 items-center justify-center">
        <span className="font-[family-name:var(--font-card)] text-[length:clamp(0.55rem,3.2cqw,0.8rem)] font-semibold leading-none tracking-wide text-white">
          {overloadLabel}
        </span>
      </div>
    </article>
  );
}

function RulesLine({ text }: { text: string }) {
  return (
    <p className={`${BODY_CLASS} font-normal`}>
      {richParts(text).map((part, index) =>
        part.bold ? (
          <span key={`${part.text}-${String(index)}`} className="font-bold">
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}-${String(index)}`}>{part.text}</span>
        ),
      )}
    </p>
  );
}
