import { describe, expect, it } from "vitest";
import { diceOf } from "@server";
import { newMatch, P1 } from "@server/testing/scenario.js";
import {
  diceCountForPlayer,
  diceFaceGroupsForPlayer,
} from "./diceFaceGroups.js";

describe("diceFaceGroupsForPlayer", () => {
  it("groups every slot on each die the player controls", () => {
    const state = newMatch();
    const dice = diceOf(state, P1);
    const groups = diceFaceGroupsForPlayer(state, P1);

    expect(diceCountForPlayer(state, P1)).toBe(dice.length);
    expect(groups).toHaveLength(dice.length);

    for (const group of groups) {
      const die = dice.find((d) => d.id === group.dieId);
      expect(die).toBeDefined();
      if (die!.boundCreatureId !== null) {
        const creature = state.creatures[die!.boundCreatureId];
        expect(creature).toBeDefined();
        expect(group.fighterName).toBeTruthy();
      }
      expect(group.slots).toHaveLength(die!.slots.length);
      for (const slot of group.slots) {
        const physical = die!.slots.find((s) => s.index === slot.slotIndex);
        expect(physical?.faceCardId).toBe(slot.faceCardId);
        expect(slot.showing).toBe(die!.rolledSlotIndex === slot.slotIndex);
      }
    }
  });

  it("marks the rolled slot as showing after a roll", () => {
    const state = newMatch();
    const die = diceOf(state, P1)[0];
    if (die === undefined) throw new Error("expected a die");
    const rolledIndex = 2;
    const patched = {
      ...state,
      dice: {
        ...state.dice,
        [die.id]: { ...die, rolledSlotIndex: rolledIndex },
      },
    };

    const group = diceFaceGroupsForPlayer(patched, P1).find((g) => g.dieId === die.id);
    expect(group).toBeDefined();
    const showing = group!.slots.filter((s) => s.showing);
    expect(showing).toHaveLength(1);
    expect(showing[0]?.slotIndex).toBe(rolledIndex);
  });
});
