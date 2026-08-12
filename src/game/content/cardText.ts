import type {
  CardDefinition,
  CardDuration,
  CardSubtype,
  ForgeRegion,
} from "../model/cards.js";
import type { Attribute } from "../model/attributes.js";
import { requirementEntries, type SymbolRequirement } from "../model/symbols.js";

/**
 * English printing of the Figma tactic-card grammar. The layouts are Portuguese;
 * every string here is the translation that the UI and the catalogue use.
 */

const ATTRIBUTE_LABEL: Readonly<Record<Attribute, string>> = {
  martial: "Martial",
  wild: "Wild",
  toxin: "Toxin",
  arcane: "Arcane",
  luminar: "Luminar",
  mechanical: "Mechanical",
  corruption: "Corruption",
  darkness: "Darkness",
};

const SUBTYPE_LABEL: Readonly<Record<CardSubtype, string>> = {
  instant: "Instant",
  ritual: "Ritual",
  reaction: "Reaction",
  equipment: "Equipment",
  overload: "Overload",
};

const DURATION_LABEL: Readonly<Record<CardDuration, string>> = {
  instant: "Instant",
  continuous: "Continuous",
};

export const attributeLabel = (attribute: Attribute): string => ATTRIBUTE_LABEL[attribute];

/** Header cost glyph: fixed amount, or `?` for variable (pay 1+). */
export function formatEnergyCost(card: CardDefinition): string {
  return card.variableEnergy === true ? "?" : String(card.energyCost);
}

/** `[Tactic / Ritual / Reaction / Arcane]` */
export function formatTypeLine(card: CardDefinition): string {
  const parts = [
    "Tactic",
    ...card.subtypes.map((subtype) => SUBTYPE_LABEL[subtype]),
    ...(card.duration !== undefined ? [DURATION_LABEL[card.duration]] : []),
    ATTRIBUTE_LABEL[card.attribute],
  ];
  return `[${parts.join(" / ")}]`;
}

/** `[Forge] 1 Synthetic Arcane face on your die` */
export function formatForgeLine(forge: ForgeRegion): string {
  const kind = forge.kind === "natural" ? "Natural" : "Synthetic";
  const faces = forge.faces === 1 ? "1 face" : `${String(forge.faces)} faces`;
  const where = forge.target === "own-die" ? "on your die" : "on the opponent's die";
  return `[Forge] ${faces} [${kind}] [${ATTRIBUTE_LABEL[forge.attribute]}] ${where}`;
}

/**
 * The bracketed gate above the effect body. Rituals print Active when; other
 * subtypes that carry a requirement print Requires. Returns null when there is
 * no gate to show.
 */
export function formatRequirementLine(card: CardDefinition): string | null {
  const requires = card.ritual?.activeWhen ?? card.effect?.requires;
  if (requires === undefined) return null;

  const body = formatRequirementBody(requires);
  if (body.length === 0) return null;
  if (card.subtypes.includes("ritual")) return `[Active when: ${body}]`;
  return `[Requires: ${body}]`;
}

function formatRequirementBody(requirement: SymbolRequirement): string {
  const entries = requirementEntries(requirement);
  // Rituals favour "2× Arcane"; instants favour "Arcane + Corruption".
  if (entries.length === 1) {
    const [attribute, count] = entries[0]!;
    return count === 1
      ? ATTRIBUTE_LABEL[attribute]
      : `${String(count)}× ${ATTRIBUTE_LABEL[attribute]}`;
  }
  return entries
    .flatMap(([attribute, count]) =>
      Array.from({ length: count }, () => ATTRIBUTE_LABEL[attribute]),
    )
    .join(" + ");
}

/**
 * Everything below the "or" separator: optional gate derived from `effect`,
 * then the printed rules text line by line, or "None" when the card forges
 * only. Unimplemented cards may put the whole printed region — gate included —
 * into `rulesText` and leave `effect` absent.
 */
export function formatEffectRegion(card: CardDefinition): readonly string[] {
  if (card.rulesText.length === 0) return ["None"];

  const lines: string[] = [];
  const gate = formatRequirementLine(card);
  if (gate !== null) lines.push(gate);

  for (const line of card.rulesText.split("\n")) {
    if (line.length > 0) lines.push(line);
  }
  return lines;
}
