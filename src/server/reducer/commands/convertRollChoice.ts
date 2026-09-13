import type { FaceCardDefinition } from "../../model/dice.js";
import type { DieId, PlayerId } from "../../model/ids.js";
import { isAttribute } from "../../model/attributes.js";
import { attributeLabel } from "../../content/cardText.js";
import type { Draft } from "../draft.js";
import { pushEffect } from "../resolution.js";

export const CONVERT_BANK_LABEL = "Bank this die's pips";

/** Short button label for the convert payoff (Tooling Order-style choose one). */
export function convertPayoffLabel(face: FaceCardDefinition): string {
  const first = face.onRoll[0];
  if (first === undefined) return "Do not bank this die's pips";
  if (first.type === "damage") return `Strike ${String(first.amount)}`;
  if (first.type === "drain-life") return `Drain ${String(first.amount)}`;
  if (first.type === "replace-synthetic-face") {
    const attr = isAttribute(first.attribute) ? attributeLabel(first.attribute) : first.attribute;
    return `Reforge ${String(first.faces)} ${attr}`;
  }
  return "Do not bank this die's pips";
}

/**
 * Pause after a convert face shows: Choose one — bank this die's pips, or
 * take the printed On-roll payoff and do not bank.
 */
export function offerConvertRollChoice(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  face: FaceCardDefinition,
): void {
  pushEffect(
    draft,
    playerId,
    {
      type: "choose-effect-mode",
      modes: [[], [...face.onRoll]],
      modeLabels: [CONVERT_BANK_LABEL, convertPayoffLabel(face)],
    },
    null,
    null,
    null,
    dieId,
    slotIndex,
  );
}
