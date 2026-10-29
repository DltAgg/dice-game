import { formatHitClass, type FaceCardDefinition } from "@server";
import { faceRulesLines } from "@client/ui/cards/faceRulesLines";

export interface FaceTooltipFact {
  readonly label: string;
  readonly value: string;
}

export interface FaceTooltipAbility {
  readonly label: "Primary" | "Secondary";
  readonly text: string;
}

export interface ShowingFaceTooltipModel {
  readonly facts: readonly FaceTooltipFact[];
  /** Type, strength, role, and action on one line. */
  readonly line: string;
  readonly abilities: readonly FaceTooltipAbility[];
  readonly notes: readonly string[];
}

function titled(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** A sentence whose only clauses are the structured hit class and/or role. */
function repeatsStructuredFace(sentence: string, skip: ReadonlySet<string>): boolean {
  const parts = sentence
    .replace(/\.$/, "")
    .trim()
    .toLowerCase()
    .split(/\s*·\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 && parts.every((part) => skip.has(part));
}

/** Printed sentences that only repeat the structured type, strength, or role. */
function extraNotes(face: FaceCardDefinition): readonly string[] {
  const skip = new Set<string>();
  if (face.sequenceRole !== undefined) skip.add(titled(face.sequenceRole).toLowerCase());
  if (face.hitStrength !== undefined && face.hitType !== undefined) {
    skip.add(formatHitClass({ hitStrength: face.hitStrength, hitType: face.hitType }).toLowerCase());
  }
  const notes: string[] = [];
  for (const line of faceRulesLines(face.rulesText)) {
    if (/^(?:Primary|Secondary):/.test(line)) continue;
    const kept = line
      .split(/(?<=\.)\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0)
      .filter((sentence) => !repeatsStructuredFace(sentence, skip));
    if (kept.length > 0) notes.push(kept.join(" "));
  }
  return notes;
}

/** Type, strength, role, and the printed primary and secondary abilities. */
export function showingFaceTooltip(face: FaceCardDefinition): ShowingFaceTooltipModel {
  const facts: FaceTooltipFact[] = [];
  if (face.hitType !== undefined) facts.push({ label: "Type", value: titled(face.hitType) });
  if (face.hitStrength !== undefined) facts.push({ label: "Strength", value: titled(face.hitStrength) });
  if (face.sequenceRole !== undefined) facts.push({ label: "Role", value: titled(face.sequenceRole) });
  if (face.faceType !== undefined) facts.push({ label: "Action", value: titled(face.faceType) });

  const abilities: FaceTooltipAbility[] = [];
  for (const line of faceRulesLines(face.rulesText)) {
    const primary = /^Primary:\s*(.*)$/.exec(line);
    if (primary?.[1] !== undefined) {
      abilities.push({ label: "Primary", text: primary[1] });
      continue;
    }
    const secondary = /^Secondary:\s*(.*)$/.exec(line);
    if (secondary?.[1] !== undefined) abilities.push({ label: "Secondary", text: secondary[1] });
  }

  return {
    facts,
    line: facts.map((fact) => fact.value).join(" / "),
    abilities,
    notes: extraNotes(face),
  };
}
