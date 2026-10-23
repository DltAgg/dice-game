import { describe, expect, it } from "vitest";
import type { CardDefinition, ModifyPlayChoice } from "@server";
import { asCreatureId, asFaceCardId } from "@server/model/ids.js";
import { immediateMovesetChoice } from "./modifyPlay";

function choice(partial: Partial<ModifyPlayChoice> = {}): ModifyPlayChoice {
  return {
    label: "Vega · Drill",
    mode: "normal",
    dieId: null,
    slotIndex: null,
    faceCardId: null,
    techniqueId: null,
    targetCreatureId: asCreatureId("vega"),
    ...partial,
  };
}

function moveset(partial: Partial<CardDefinition> = {}): CardDefinition {
  return { modifySubject: "moveset", ...partial } as CardDefinition;
}

describe("immediateMovesetChoice", () => {
  it("plays a single moveset onto its only Fighter without a prompt", () => {
    const only = choice();
    expect(immediateMovesetChoice(moveset(), [only])).toBe(only);
  });

  it("keeps a prompt when more than one Fighter can take the moveset", () => {
    expect(
      immediateMovesetChoice(moveset(), [
        choice(),
        choice({ targetCreatureId: asCreatureId("ryu"), label: "Ryu · Drill" }),
      ]),
    ).toBeNull();
  });

  it("keeps the slot prompt when the moveset also replaces a face", () => {
    expect(
      immediateMovesetChoice(moveset({ replaceFaceId: asFaceCardId("face-form") }), [choice()]),
    ).toBeNull();
  });
});
