import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DieId, DieSlot, FaceCardId, GameState, PlayerId } from "@server";
import { testFace } from "@server/testing/fixtures/index.js";
import { FaceCardsInPlay } from "./FaceCardsInPlay.js";

const pierceFace = testFace({
  name: "Pierce Stance",
  whileShowing: [{ type: "pierce", amount: 1 }],
});
const empowerFace = testFace({
  name: "Empower Stance",
  whileShowing: [{ type: "empower", amount: 1 }],
});
const playDiscountFace = testFace({
  name: "Play Discount Stance",
  whileShowing: [{ type: "play-discount", amount: 1 }],
});
const forgeDiscountFace = testFace({
  name: "Forge Discount Stance",
  whileShowing: [{ type: "forge-discount", amount: 1 }],
});
const convertFace = testFace({
  name: "Convert Stance",
  convertRoll: true,
});

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
  it("surfaces pierce totals from whileShowingTotals", () => {
    const html = renderFaces(pierceFace.id);
    expect(html).toContain("While showing");
    expect(html).toContain("Pierce 1");
    expect(html).toContain("Pierce Stance");
    expect(html).not.toContain("On absorb");
  });

  it("surfaces empower and play / forge discounts", () => {
    expect(renderFaces(empowerFace.id)).toContain("Empower 1");
    expect(renderFaces(playDiscountFace.id)).toContain("Discount 1");
    expect(renderFaces(forgeDiscountFace.id)).toContain("Discount 1 forge");
  });

  it("shows a convert cue on a convertRoll face", () => {
    const html = renderFaces(convertFace.id);
    expect(html).toContain("Convert roll · pips not banked");
    expect(html).not.toContain("On absorb");
  });
});
