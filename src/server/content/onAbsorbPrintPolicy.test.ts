import { describe, expect, it } from "vitest";
import type { CardDefinition } from "../model/cards.js";
import type { CreatureDefinition } from "../model/creatures.js";
import type { FaceCardDefinition } from "../model/dice.js";
import { ALL_CARDS } from "./cards.js";
import { ALL_CREATURES } from "./creatures.js";
import { ALL_FACE_CARDS } from "./faces.js";

function onAbsorbPrintLines(text: string): string[] {
  return text.split("\n").filter((line) => /On absorb/i.test(line));
}

function assertOnAbsorbPrint(entity: { readonly name: string }, text: string): void {
  for (const line of onAbsorbPrintLines(text)) {
    expect(line, `${entity.name}: "${line}"`).toMatch(/once per turn/i);
  }
}

function cardHasOnAbsorbHook(card: CardDefinition): boolean {
  const equipment = card.equipment?.abilities.some((a) => a.type === "on-absorb") ?? false;
  const ritual =
    card.ritual?.standingAbilities?.some((a) => a.type === "on-absorb") ?? false;
  const overload = (card.overload?.onAbsorb?.length ?? 0) > 0;
  return equipment || ritual || overload;
}

function creatureHasOnAbsorbHook(creature: CreatureDefinition): boolean {
  return creature.standingAbilities?.some((a) => a.type === "on-absorb") ?? false;
}

function faceHasOnAbsorbHook(face: FaceCardDefinition): boolean {
  return face.onAbsorb.length > 0;
}

describe("on-absorb print policy", () => {
  it("prints once per turn on every On absorb line for cards with on-absorb hooks", () => {
    for (const card of ALL_CARDS) {
      if (!cardHasOnAbsorbHook(card)) continue;
      assertOnAbsorbPrint(card, card.rulesText);
    }
  });

  it("prints once per turn on creature passives with on-absorb hooks", () => {
    for (const creature of ALL_CREATURES) {
      if (!creatureHasOnAbsorbHook(creature)) continue;
      assertOnAbsorbPrint(creature, creature.passiveRulesText);
    }
  });

  it("prints once per turn on faces with onAbsorb effects", () => {
    for (const face of ALL_FACE_CARDS) {
      if (!faceHasOnAbsorbHook(face)) continue;
      assertOnAbsorbPrint(face, face.rulesText);
    }
  });

  it("marks standing on-absorb abilities oncePerTurn in data", () => {
    for (const creature of ALL_CREATURES) {
      for (const ability of creature.standingAbilities ?? []) {
        if (ability.type !== "on-absorb") continue;
        expect(ability.oncePerTurn, `${creature.name} on-absorb`).toBe(true);
      }
    }
    for (const card of ALL_CARDS) {
      for (const ability of card.equipment?.abilities ?? []) {
        if (ability.type !== "on-absorb") continue;
        expect(ability.oncePerTurn, `${card.name} on-absorb`).toBe(true);
      }
      for (const ability of card.ritual?.standingAbilities ?? []) {
        if (ability.type !== "on-absorb") continue;
        expect(ability.oncePerTurn, `${card.name} ritual on-absorb`).toBe(true);
      }
    }
  });
});
