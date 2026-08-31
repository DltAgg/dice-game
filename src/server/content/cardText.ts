import type {
  CardDefinition,
  CardSubtype,
  ForgeRegion,
} from "../model/cards.js";
import type { Attribute } from "../model/attributes.js";
import type { FaceKind } from "../model/dice.js";
import { genericCount, requirementEntries, requirementTotal, type SymbolRequirement } from "../model/symbols.js";

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

/** Compact header glyph: total pile tokens in playCost, or empty when free. */
export function formatPlayCostHeader(card: CardDefinition): string {
  if (card.playCost === undefined) return "";
  const total = requirementTotal(card.playCost);
  return total > 0 ? String(total) : "";
}

/** Header play/forge pile cost as `[Spend: …]`. */
export function formatPlayCostLine(card: CardDefinition): string | null {
  if (card.playCost === undefined) return null;
  const body = formatRequirementBody(card.playCost);
  if (body.length === 0) return null;
  return `[Spend: ${body}]`;
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
 * The bracketed pile line above the effect body. Rituals print Active when
 * (gate). Other cards that carry `effect.requires` print `[Requires: …]` —
 * that field is a hold-gate, not Spend. Returns null when there is no line.
 */
export function formatRequirementLine(card: CardDefinition): string | null {
  const requires = card.ritual?.activeWhen ?? card.effect?.requires;
  if (requires === undefined) return null;

  const body = formatRequirementBody(requires);
  if (body.length === 0) return null;
  if (card.type === "ritual" || card.ritual !== undefined) return `[Active when: ${body}]`;
  return `[Requires: ${body}]`;
}

/**
 * Optional pile burn on ritual activate (`RitualRegion.spend`). Printed below
 * Active when when present. Spec `016`.
 */
export function formatSpendLine(card: CardDefinition): string | null {
  const spend = card.ritual?.spend;
  if (spend === undefined) return null;
  const body = formatRequirementBody(spend);
  if (body.length === 0) return null;
  return `[Spend: ${body}]`;
}

/** Shared pile-cost wording for Spend, Requires, Active when, and playCost. */
export function formatRequirementBody(requirement: SymbolRequirement): string {
  const parts = requirementEntries(requirement).flatMap(([attribute, count]) => {
    const label = ATTRIBUTE_LABEL[attribute];
    if (count <= 1) return [label];
    return [`${String(count)} x ${label}`];
  });
  const generic = genericCount(requirement);
  if (generic === 1) parts.push("Any");
  else if (generic > 1) parts.push(`${String(generic)} x Any`);
  return parts.join(" + ");
}

/**
 * Everything below the "or" separator: header play cost, optional gate derived
 * from `effect`, then the printed rules text line by line, or "None" when the
 * card forges only.
 */
export function formatEffectRegion(card: CardDefinition): readonly string[] {
  if (card.rulesText.length === 0) return ["None"];

  const lines: string[] = [];
  const playCost = formatPlayCostLine(card);
  if (playCost !== null) lines.push(playCost);
  const gate = formatRequirementLine(card);
  if (gate !== null) lines.push(gate);
  const spend = formatSpendLine(card);
  if (spend !== null) lines.push(spend);

  for (const line of card.rulesText.split("\n")) {
    if (line.length > 0) lines.push(line);
  }
  return lines;
}

/**
 * Rules body for inspect surfaces that already show play cost, gate, and ritual
 * activate spend in dedicated rows. Omits header `[Spend]` / `[Active when]`
 * lines that {@link formatEffectRegion} prepends for card art layout.
 */
export function formatInspectEffectLines(card: CardDefinition): readonly string[] {
  if (card.rulesText.length === 0) return ["None"];
  return card.rulesText.split("\n").filter((line) => line.length > 0);
}
