import { describe, expect, it } from "vitest";
import type { ModifyPlayChoice } from "@server";
import { asDieId, asFaceCardId } from "@server/model/ids.js";
import {
  incomingReplacementFaces,
  isDieSlotReplacement,
  slotGroupsForFace,
} from "./replaceDieFacePrompt";

function choice(partial: Partial<ModifyPlayChoice>): ModifyPlayChoice {
  return {
    label: "Fighter slot 1 → Face",
    mode: "normal",
    dieId: null,
    slotIndex: null,
    faceCardId: null,
    techniqueId: null,
    targetCreatureId: null,
    ...partial,
  };
}

const dieA = asDieId("die-a");
const dieB = asDieId("die-b");
const form = asFaceCardId("face-form");
const jab = asFaceCardId("face-jab");

describe("replace die face prompt", () => {
  it("treats slot-and-face plays as a die replacement", () => {
    expect(
      isDieSlotReplacement([choice({ dieId: dieA, slotIndex: 0, faceCardId: form })]),
    ).toBe(true);
    expect(isDieSlotReplacement([choice({ dieId: dieA, slotIndex: 0 })])).toBe(false);
    expect(isDieSlotReplacement([])).toBe(false);
  });

  it("lists each incoming face once", () => {
    expect(
      incomingReplacementFaces([
        choice({ dieId: dieA, slotIndex: 0, faceCardId: form }),
        choice({ dieId: dieA, slotIndex: 1, faceCardId: form }),
        choice({ dieId: dieA, slotIndex: 0, faceCardId: jab }),
      ]),
    ).toEqual([form, jab]);
  });

  it("groups one incoming face by die, in slot order", () => {
    const groups = slotGroupsForFace(
      [
        choice({ dieId: dieB, slotIndex: 1, faceCardId: form }),
        choice({ dieId: dieA, slotIndex: 2, faceCardId: form }),
        choice({ dieId: dieA, slotIndex: 0, faceCardId: jab }),
        choice({ dieId: dieA, slotIndex: 0, faceCardId: form }),
      ],
      form,
    );
    expect(groups.map((group) => group.dieId)).toEqual([dieB, dieA]);
    expect(groups[1]?.choices.map((entry) => entry.slotIndex)).toEqual([0, 2]);
  });
});
