import { describe, expect, it } from "vitest";
import { RYU, VEGA } from "../content/creatures.js";
import { TAG_SKIRMISH_LOADOUT } from "../content/loadouts/index.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieState } from "../model/dice.js";
import {
  asFaceCardId,
  type CreatureDefinitionId,
  type CreatureId,
  type FaceCardId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { legalFaceActions, matchingTechniques } from "../rules/faceActions.js";
import { dieForCreature } from "../rules/fighters.js";
import { createMatch } from "../setup/createMatch.js";
import { expectOk, P1, P2, resolveOpenChain } from "../testing/scenario.js";
import { advance } from "./reduce.js";

const JAB = asFaceCardId("face-natural-vega-jab");
const PROJECTILE = asFaceCardId("face-natural-ryu-projectile");

function inActions(): GameState {
  const match = createMatch({
    matchId: "match-playtest-combo",
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
    throw new Error(`expected an open actions window, phase ${rolled.phase}`);
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

function withActive(state: GameState, creatureId: CreatureId): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("p1");
  return {
    ...state,
    players: { ...state.players, [P1]: { ...player, activeCreatureId: creatureId } },
  };
}

describe("playtest hits and techniques", () => {
  it("enters Combo from a lone starter face, then leaves it when the sequence ends", () => {
    let open = inActions();
    const vega = fighter(open, VEGA);
    open = show(open, vega, JAB);
    expect(open.offensiveState).toBe("open");
    expect(legalFaceActions(open, P1)).toEqual([vega]);

    const combo = resolveOpenChain(
      expectOk(advance(open, { type: "USE_FACE", playerId: P1, creatureId: vega })),
    );
    expect(combo.offensiveState).toBe("combo");
    expect(legalFaceActions(combo, P1)).toEqual([]);

    const stopped = expectOk(advance(combo, { type: "END_SEQUENCE", playerId: P1 }));
    expect(stopped.offensiveState).toBe("open");
    expect(legalFaceActions(stopped, P1)).toEqual([vega]);
  });

  it("enters Combo from a starter Technique, then accepts an extender Technique", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    state = show(show(state, vega, JAB), ryu, PROJECTILE);
    const step = matchingTechniques(state, P1, vega).find(
      (match) => match.techniqueId === "technique-vega-step-jab",
    );
    expect(step).toBeDefined();

    const combo = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "USE_TECHNIQUE",
          playerId: P1,
          creatureId: vega,
          techniqueId: step!.techniqueId,
          secondaryDieId: step!.secondaryDieId,
        }),
      ),
    );
    expect(combo.offensiveState).toBe("combo");
    expect(legalFaceActions(combo, P1)).toEqual([]);

    const continued = show(withActive(combo, ryu), ryu, PROJECTILE);
    const shot = matchingTechniques(continued, P1, ryu).find(
      (match) => match.techniqueId === "technique-ryu-focused-shot",
    );
    expect(shot).toBeDefined();
    const extended = resolveOpenChain(
      expectOk(
        advance(continued, {
          type: "USE_TECHNIQUE",
          playerId: P1,
          creatureId: ryu,
          techniqueId: shot!.techniqueId,
          secondaryDieId: shot!.secondaryDieId,
        }),
      ),
    );
    expect(extended.offensiveState).toBe("combo");
  });
});
