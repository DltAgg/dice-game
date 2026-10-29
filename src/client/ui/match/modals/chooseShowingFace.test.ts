import { describe, expect, it } from "vitest";
import type { ModifyPlayChoice } from "@server";
import { asDieId } from "@server/model/ids.js";
import { facesForDie, isShowingFaceChoice, showingFaceDieIds } from "./chooseShowingFace";

function choice(partial: Partial<ModifyPlayChoice>): ModifyPlayChoice {
  return {
    label: "Fighter · face",
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

describe("choose showing face", () => {
  it("treats a die and a slot with no written face as a showing-face play", () => {
    expect(isShowingFaceChoice([choice({ dieId: dieA, slotIndex: 1 })])).toBe(true);
    expect(isShowingFaceChoice([choice({ dieId: dieA, slotIndex: 1, faceCardId: null })])).toBe(
      true,
    );
    expect(isShowingFaceChoice([])).toBe(false);
    expect(isShowingFaceChoice([choice({ dieId: dieA, slotIndex: null })])).toBe(false);
  });

  it("lists each die once, then that die's faces in slot order", () => {
    const second = choice({ dieId: dieA, slotIndex: 2, label: "second" });
    const first = choice({ dieId: dieA, slotIndex: 0, label: "first" });
    const other = choice({ dieId: dieB, slotIndex: 1, label: "other" });
    expect(showingFaceDieIds([second, first, other])).toEqual([dieA, dieB]);
    expect(facesForDie([second, first, other], dieA)).toEqual([first, second]);
  });
});
