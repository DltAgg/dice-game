import { describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../content/creatures.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import {
  asCreatureDefinitionId,
  asFaceCardId,
  type CreatureDefinitionId,
  type CreatureId,
  type DieId,
  type FaceCardId,
  type PlayerId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { dieForCreature } from "../rules/fighters.js";
import { starterWhiffMark } from "../rules/starterGuard.js";
import { createMatch } from "../setup/createMatch.js";
import { expectOk, P1, P2, resolveOpenChain } from "../testing/scenario.js";
import { advance } from "./reduce.js";

const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");
const PROJECTILE = asFaceCardId("face-natural-ryu-projectile");
const JAB = asFaceCardId("face-natural-jab");
const FOCUS = asFaceCardId("face-natural-ryu-focus");
const GRAB = asFaceCardId("face-natural-magnus-grab");
const LARIAT = asFaceCardId("face-natural-magnus-lariat");
const HEAVY = asFaceCardId("face-natural-magnus-heavy");
const KICK = asFaceCardId("face-natural-vega-kick");

function fighterBaseDie(id: CreatureDefinitionId): DieFaceLayout {
  const die = getCreatureDefinition(id)?.baseDie;
  if (die === undefined || die.length !== 6) throw new Error(String(id));
  return [die[0]!, die[1]!, die[2]!, die[3]!, die[4]!, die[5]!];
}

function skirmishActions(): GameState {
  const squad = [VEGA_ID, MAGNUS_ID, RYU_ID] as const;
  const startingDice = squad.map((id) => fighterBaseDie(id));
  const faceDeck = [...new Set(startingDice.flat())];
  const seat = { squad, deck: [] as const, faceDeck, startingDice };
  const match = createMatch({
    matchId: "match-ryu-passive",
    seed: 1,
    config: { ...TAG_FIGHTER_RULES, deckMinCards: 0, deckOutEnabled: false },
    players: [
      { id: P1, ...seat },
      { id: P2, ...seat },
    ],
  });
  const rolled = expectOk(advance(match, { type: "ROLL_DICE", playerId: P1 }));
  const opened = expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: P1 }));
  if (opened.phase !== "actions" || opened.pendingDecision !== null) {
    throw new Error(`expected actions, phase ${opened.phase}`);
  }
  return opened;
}

function fighterOf(
  state: GameState,
  definitionId: CreatureDefinitionId,
  playerId: PlayerId,
): CreatureId {
  const id = state.players[playerId]?.creatureIds.find(
    (creatureId) => state.creatures[creatureId]?.definitionId === definitionId,
  );
  if (id === undefined) throw new Error(String(definitionId));
  return id;
}

function showFace(state: GameState, creatureId: CreatureId, faceId: FaceCardId): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  const slot = die.slots.findIndex((entry) => entry.faceCardId === faceId);
  if (slot < 0) throw new Error(faceId);
  return {
    ...state,
    dice: { ...state.dice, [die.id]: { ...die, rolledSlotIndex: slot } },
  };
}

function withActive(state: GameState, playerId: PlayerId, creatureId: CreatureId): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...player, activeCreatureId: creatureId } },
  };
}

function damageOf(state: GameState, creatureId: CreatureId): number {
  return state.creatures[creatureId]?.damage ?? 0;
}

function useFace(state: GameState, creatureId: CreatureId): GameState {
  return resolveOpenChain(
    expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId })),
  );
}

function dieIdOf(state: GameState, creatureId: CreatureId): DieId {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  return die.id;
}

describe("Ryu starter guard", () => {
  it("halves a non-grappler starter and enters combo", () => {
    const opened = skirmishActions();
    const attacker = fighterOf(opened, RYU_ID, P1);
    const defender = fighterOf(opened, RYU_ID, P2);
    const ready = showFace(withActive(withActive(opened, P1, attacker), P2, defender), attacker, PROJECTILE);
    const before = damageOf(ready, defender);
    const hit = useFace(ready, attacker);
    expect(damageOf(hit, defender)).toBe(before + 1);
    expect(hit.offensiveState).toBe("combo");
    expect(hit.players[P1]?.comboCount).toBe(1);
  });

  it("rounds a 1-damage starter down to 0 and still enters combo", () => {
    const opened = skirmishActions();
    const attacker = fighterOf(opened, RYU_ID, P1);
    const defender = fighterOf(opened, RYU_ID, P2);
    const ready = showFace(withActive(withActive(opened, P1, attacker), P2, defender), attacker, JAB);
    const hit = useFace(ready, attacker);
    expect(damageOf(hit, defender)).toBe(0);
    expect(hit.offensiveState).toBe("combo");
  });

  it("leaves extender and finisher damage against Ryu whole", () => {
    const opened = skirmishActions();
    const attacker = fighterOf(opened, RYU_ID, P1);
    const defender = fighterOf(opened, RYU_ID, P2);
    const started = useFace(
      showFace(withActive(withActive(opened, P1, attacker), P2, defender), attacker, PROJECTILE),
      attacker,
    );
    expect(started.offensiveState).toBe("combo");
    const extended = useFace(showFace(started, attacker, FOCUS), attacker);
    expect(damageOf(extended, defender)).toBe(2);
    expect(extended.offensiveState).toBe("combo");

    const fresh = skirmishActions();
    const magnus = fighterOf(fresh, MAGNUS_ID, P1);
    const ryu = fighterOf(fresh, RYU_ID, P2);
    const finished = useFace(
      showFace(withActive(withActive(fresh, P1, magnus), P2, ryu), magnus, HEAVY),
      magnus,
    );
    expect(damageOf(finished, ryu)).toBe(5);
  });

  it("deals full starter damage when the target is not Ryu", () => {
    const opened = skirmishActions();
    const attacker = fighterOf(opened, RYU_ID, P1);
    const defender = fighterOf(opened, VEGA_ID, P2);
    const ready = showFace(withActive(opened, P1, attacker), attacker, PROJECTILE);
    const hit = useFace(ready, attacker);
    expect(damageOf(hit, defender)).toBe(2);
    expect(hit.offensiveState).toBe("combo");
  });

  it("whiffs a grappler's first starter against Ryu and halves the second", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const vega = fighterOf(opened, VEGA_ID, P1);
    const ryu = fighterOf(opened, RYU_ID, P2);
    const ready = showFace(withActive(withActive(opened, P1, magnus), P2, ryu), magnus, GRAB);
    const meter = ready.players[P1]?.meter ?? 0;
    const whiff = useFace(ready, magnus);
    expect(damageOf(whiff, ryu)).toBe(0);
    expect(whiff.offensiveState).toBe("open");
    expect(whiff.players[P1]?.comboCount).toBe(0);
    expect(whiff.players[P1]?.meter).toBe(meter);
    expect(whiff.usedSequenceActionIds).toContain(`face:${GRAB}`);
    expect(whiff.usedSequenceActionIds).toContain(starterWhiffMark(ryu));

    const kicking = showFace(showFace(whiff, magnus, LARIAT), vega, KICK);
    const before = damageOf(kicking, ryu);
    const hit = resolveOpenChain(
      expectOk(
        advance(kicking, {
          type: "USE_TECHNIQUE",
          playerId: P1,
          creatureId: magnus,
          techniqueId: "technique-magnus-collar-tie",
          secondaryDieId: dieIdOf(kicking, vega),
        }),
      ),
    );
    expect(damageOf(hit, ryu)).toBe(before + 2);
    expect(hit.offensiveState).toBe("combo");
    expect(hit.players[P1]?.comboCount).toBe(1);
  });

  it("lets a grappler's starter hit another fighter for full damage", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const vega = fighterOf(opened, VEGA_ID, P2);
    const ready = showFace(withActive(opened, P1, magnus), magnus, GRAB);
    const hit = useFace(ready, magnus);
    expect(damageOf(hit, vega)).toBe(3);
    expect(hit.offensiveState).toBe("combo");
  });
});
