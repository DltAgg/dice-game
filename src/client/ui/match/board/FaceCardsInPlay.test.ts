import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DieId, DieSlot, FaceCardId, GameState, PlayerId } from "@server";
import { FaceCardsInPlay } from "./FaceCardsInPlay.js";

function boardState(faceCardId: FaceCardId): GameState {
  const playerId = "p1" as PlayerId;
  const dieId = "die-1" as DieId;
  const showingSlot: DieSlot = {
    index: 0,
    faceCardId,
    faceCardOwnerId: playerId,
  };
  return {
    status: "in-progress",
    pendingDecision: null,
    phase: "actions",
    players: {
      p1: {
        dieIds: [dieId],
        attributePool: {},
        overload: [],
        overchargeByFace: {},
      },
    },
    dice: {
      [dieId]: { id: dieId, ownerId: playerId, rolledSlotIndex: 0, slots: [showingSlot] },
    },
    cards: {},
  } as unknown as GameState;
}

function renderFaces(faceCardId: FaceCardId): string {
  return renderToStaticMarkup(
    createElement(FaceCardsInPlay, {
      state: boardState(faceCardId),
      playerId: "p1" as PlayerId,
      label: "P1 faces",
      facing: "up",
      actingPlayerId: "p1" as PlayerId,
      canAct: false,
      onActivateFace: () => undefined,
    }),
  );
}

describe("FaceCardsInPlay while-showing / convert cues", () => {
  it("surfaces Halo Lamp pierce totals from whileShowingTotals", () => {
    const html = renderFaces("face-synthetic-halo-lamp" as FaceCardId);
    expect(html).toContain("While showing");
    expect(html).toContain("Pierce 1");
    expect(html).toContain("Halo Lamp");
    expect(html).not.toContain("On absorb");
  });

  it("surfaces Lucent Choir empower and Augur Glass play discount", () => {
    expect(renderFaces("face-synthetic-lucent-choir" as FaceCardId)).toContain("Empower 1");
    expect(renderFaces("face-synthetic-augur-glass" as FaceCardId)).toContain("Discount 1");
    expect(renderFaces("face-synthetic-cogtooth" as FaceCardId)).toContain("Discount 1 forge");
  });

  it("shows a convert cue on Sigil Flare / Mainspring / Pyre of Names", () => {
    for (const id of [
      "face-synthetic-sigil-flare",
      "face-synthetic-mainspring",
      "face-synthetic-pyre-of-names",
    ] as const) {
      const html = renderFaces(id as FaceCardId);
      expect(html).toContain("Convert roll · pips not banked");
      expect(html).not.toContain("On absorb");
    }
  });
});
