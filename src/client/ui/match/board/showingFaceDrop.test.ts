import { describe, expect, it } from "vitest";
import { RYU, VEGA } from "@server/content/creatures.js";
import { TAG_SKIRMISH_LOADOUT } from "@server/content/loadouts/index.js";
import { TAG_FIGHTER_RULES } from "@server/model/config.js";
import type { DieState } from "@server/model/dice.js";
import { asFaceCardId, type CreatureDefinitionId, type CreatureId, type FaceCardId } from "@server/model/ids.js";
import type { GameState } from "@server/model/state.js";
import { dieForCreature } from "@server/rules/fighters.js";
import { createMatch } from "@server/setup/createMatch.js";
import { expectOk, P1, P2 } from "@server/testing/scenario.js";
import { advance } from "@server/reducer/reduce.js";
import { stagedShowingDrop } from "./showingFaceDrop";

const JAB = asFaceCardId("face-natural-vega-jab");
const PROJECTILE = asFaceCardId("face-natural-ryu-projectile");
const FOCUS = asFaceCardId("face-natural-ryu-focus");

function inActions(): GameState {
  const match = createMatch({
    matchId: "match-showing-drop",
    seed: 1,
    config: TAG_FIGHTER_RULES,
    players: [
      {
        id: P1,
        squad: TAG_SKIRMISH_LOADOUT.squad,
        deck: TAG_SKIRMISH_LOADOUT.deck,
        faceDeck: TAG_SKIRMISH_LOADOUT.faceDeck,
        startingDice: TAG_SKIRMISH_LOADOUT.startingDice,
      },
      {
        id: P2,
        squad: TAG_SKIRMISH_LOADOUT.squad,
        deck: TAG_SKIRMISH_LOADOUT.deck,
        faceDeck: TAG_SKIRMISH_LOADOUT.faceDeck,
        startingDice: TAG_SKIRMISH_LOADOUT.startingDice,
      },
    ],
  });
  const rolled = expectOk(advance(match, { type: "ROLL_DICE", playerId: P1 }));
  if (rolled.phase !== "actions" || rolled.pendingDecision !== null) {
    throw new Error(`expected actions, phase ${rolled.phase}`);
  }
  return rolled;
}

function fighter(state: GameState, definitionId: CreatureDefinitionId): CreatureId {
  const id = state.players[P1]?.creatureIds.find(
    (creatureId) => state.creatures[creatureId]?.definitionId === definitionId,
  );
  if (id === undefined) throw new Error(definitionId);
  return id;
}

function show(state: GameState, creatureId: CreatureId, faceId: FaceCardId): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  const slot = die.slots.findIndex((entry) => entry.faceCardId === faceId);
  if (slot < 0) throw new Error(faceId);
  const next: DieState = { ...die, rolledSlotIndex: slot };
  return { ...state, dice: { ...state.dice, [die.id]: next } };
}

describe("staged showing-face drops", () => {
  it("uses any Fighter's legal showing face as a hit", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    state = show(show(state, vega, JAB), ryu, PROJECTILE);
    expect(stagedShowingDrop(state, P1, [vega, null])).toEqual({ kind: "hit", creatureId: vega });
    expect(stagedShowingDrop(state, P1, [ryu, null])).toEqual({ kind: "hit", creatureId: ryu });
    state = show(state, ryu, FOCUS);
    expect(stagedShowingDrop(state, P1, [ryu, null])).toEqual({
      kind: "pending",
      message: "That face can't hit.",
    });
  });

  it("matches a Technique only when one face is the Active Fighter", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    state = show(show(state, vega, JAB), ryu, PROJECTILE);
    const technique = stagedShowingDrop(state, P1, [ryu, vega]);
    expect(technique.kind).toBe("technique");
    if (technique.kind === "technique") {
      expect(technique.creatureId).toBe(vega);
      expect(technique.matches.some((match) => match.techniqueId === "technique-vega-step-jab")).toBe(true);
    }
    const magnus = state.players[P1]!.creatureIds.find((id) => id !== vega && id !== ryu)!;
    expect(stagedShowingDrop(state, P1, [ryu, magnus]).kind).toBe("pending");
  });
});
