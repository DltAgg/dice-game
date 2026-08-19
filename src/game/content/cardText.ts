import type {
  CardDefinition,
  CardSubtype,
  ForgeRegion,
} from "../model/cards.js";
import type { Attribute } from "../model/attributes.js";
import type { FaceKind } from "../model/dice.js";
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

const TYPE_LABEL: Readonly<Record<CardDefinition["type"], string>> = {
  instant: "Instant",
  reaction: "Reaction",
  equipment: "Equipment",
  overload: "Overload",
  ritual: "Ritual",
};

const SUBTYPE_LABEL: Readonly<Record<CardSubtype, string>> = {
  instant: "Instant",
  continuous: "Continuous",
  reaction: "Reaction",
};

export const attributeLabel = (attribute: Attribute): string => ATTRIBUTE_LABEL[attribute];

export function formatFaceKind(kind: FaceKind): string {
  switch (kind) {
    case "natural":
      return "Natural";
    case "synthetic":
      return "Synthetic";
    case "untyped":
      return "Untyped";
  }
}

/** Header cost glyph: fixed amount, or `?` for variable (pay 1+). */
export function formatEnergyCost(card: CardDefinition): string {
  return card.variableEnergy === true ? "?" : String(card.energyCost);
}

/** `[Instant / Arcane]`, `[Equipment / Martial]`, or `[Ritual / Instant / Arcane]` */
export function formatTypeLine(card: CardDefinition): string {
  const parts = [
    TYPE_LABEL[card.type],
    ...card.subtypes.map((subtype) => SUBTYPE_LABEL[subtype]),
    ATTRIBUTE_LABEL[card.attribute],
  ];
  return `[${parts.join(" / ")}]`;
}

/** `[Forge] 1 face [Synthetic] [Arcane] on your die` */
export function formatForgeLine(forge: ForgeRegion): string {
  const kind = formatFaceKind(forge.kind);
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
  if (card.type === "ritual" || card.ritual !== undefined) return `[Active when: ${body}]`;
  return `[Requires: ${body}]`;
}

function formatRequirementBody(requirement: SymbolRequirement): string {
  const entries = requirementEntries(requirement);
  // Ritual Active-when and multi-attr gates print as `Attr + Attr` (cumulative /
  // additive). Never `2× Attr` — that same-turn notation was retired.
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
