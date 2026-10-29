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
import { advanceResolvingChain, expectOk, P1, P2, resolveOpenChain } from "../testing/scenario.js";
import { advance } from "./reduce.js";

const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");
const PROJECTILE = asFaceCardId("face-natural-projectile");
const JAB = asFaceCardId("face-natural-jab");
const FOCUS = asFaceCardId("face-natural-focus");
const GRAB = asFaceCardId("face-natural-grab");
const LARIAT = asFaceCardId("face-natural-lariat");
const HEAVY = asFaceCardId("face-natural-heavy");
const KICK = asFaceCardId("face-natural-kick");

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

function passToNextActions(state: GameState): GameState {
  const actor = state.activePlayerId;
  const ended = expectOk(advance(state, { type: "END_SEQUENCE", playerId: actor }));
  const next = ended.activePlayerId;
  const rolled = expectOk(advance(ended, { type: "ROLL_DICE", playerId: next }));
  return expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: next }));
}

function tagTo(state: GameState, playerId: PlayerId, creatureId: CreatureId): GameState {
  return expectOk(
    advanceResolvingChain(state, { type: "TAG", playerId, reserveCreatureId: creatureId }),
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
    const showingHeavy = showFace(withActive(withActive(fresh, P1, magnus), P2, ryu), magnus, HEAVY);
    const finished = useFace({ ...showingHeavy, offensiveState: "combo" }, magnus);
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
    expect(whiff.usedSequenceActionIds).toContain(starterWhiffMark(ryu, whiff.turn));

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

  it("does not whiff a grappler face while Ryu is the Active attacker", () => {
    const opened = skirmishActions();
    const ryu = fighterOf(opened, RYU_ID, P1);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const defender = fighterOf(opened, RYU_ID, P2);
    const ready = showFace(withActive(withActive(opened, P1, ryu), P2, defender), magnus, GRAB);
    const hit = useFace(ready, magnus);
    expect(damageOf(hit, defender)).toBe(1);
    expect(hit.offensiveState).toBe("combo");
    expect(hit.players[P1]?.comboCount).toBe(1);
  });

  it("whiffs when the Active attacker is a grappler even if the face belongs to Ryu", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const ryuFace = fighterOf(opened, RYU_ID, P1);
    const defender = fighterOf(opened, RYU_ID, P2);
    const ready = showFace(
      withActive(withActive(opened, P1, magnus), P2, defender),
      ryuFace,
      PROJECTILE,
    );
    const meter = ready.players[P1]?.meter ?? 0;
    const whiff = useFace(ready, ryuFace);
    expect(damageOf(whiff, defender)).toBe(0);
    expect(whiff.offensiveState).toBe("open");
    expect(whiff.players[P1]?.comboCount).toBe(0);
    expect(whiff.players[P1]?.meter).toBe(meter);
  });

  it("whiffs a grappler again on a later turn even if the old mark is still listed", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const ryu = fighterOf(opened, RYU_ID, P2);
    const ready = showFace(withActive(withActive(opened, P1, magnus), P2, ryu), magnus, GRAB);
    const whiff = useFace(ready, magnus);
    const stuck = showFace(
      {
        ...whiff,
        turn: whiff.turn + 1,
        offensiveState: "open",
        usedSequenceActionIds: whiff.usedSequenceActionIds.filter((id) =>
          id.startsWith("starter-whiff:"),
        ),
      },
      magnus,
      GRAB,
    );
    const again = useFace(stuck, magnus);
    expect(damageOf(again, ryu)).toBe(0);
    expect(again.offensiveState).toBe("open");
    expect(again.usedSequenceActionIds).toContain(starterWhiffMark(ryu, stuck.turn));
  });

  it("whiffs a grappler's first starter again after a full turn cycle", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const ryu = fighterOf(opened, RYU_ID, P2);
    const ready = showFace(withActive(withActive(opened, P1, magnus), P2, ryu), magnus, GRAB);
    const first = useFace(ready, magnus);
    expect(first.offensiveState).toBe("open");
    const later = passToNextActions(passToNextActions(first));
    expect(later.activePlayerId).toBe(P1);
    expect(later.phase).toBe("actions");
    expect(later.turn).toBeGreaterThan(first.turn);
    const again = useFace(showFace(later, magnus, GRAB), magnus);
    expect(damageOf(again, ryu)).toBe(0);
    expect(again.offensiveState).toBe("open");
    expect(again.usedSequenceActionIds).toContain(starterWhiffMark(ryu, again.turn));
  });

  it("applies the passive every time Ryu tags in as the Active Fighter", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const vega = fighterOf(opened, VEGA_ID, P2);
    const ryu = fighterOf(opened, RYU_ID, P2);
    const p2 = passToNextActions(withActive(opened, P1, magnus));
    const tagged = tagTo(p2, P2, ryu);
    expect(tagged.players[P2]?.activeCreatureId).toBe(ryu);
    const p1 = passToNextActions(tagged);
    const first = useFace(showFace(withActive(p1, P1, magnus), magnus, GRAB), magnus);
    expect(damageOf(first, ryu)).toBe(0);
    expect(first.offensiveState).toBe("open");

    const p2Out = passToNextActions(first);
    const taggedOut = tagTo(p2Out, P2, vega);
    expect(taggedOut.players[P2]?.activeCreatureId).toBe(vega);
    const p2Back = passToNextActions(passToNextActions(taggedOut));
    const taggedBack = tagTo(p2Back, P2, ryu);
    expect(taggedBack.players[P2]?.activeCreatureId).toBe(ryu);
    const p1Again = passToNextActions(taggedBack);
    const attacker = fighterOf(p1Again, RYU_ID, P1);
    const halved = useFace(
      showFace(withActive(withActive(p1Again, P1, attacker), P2, ryu), attacker, PROJECTILE),
      attacker,
    );
    expect(damageOf(halved, ryu)).toBe(1);
    expect(halved.offensiveState).toBe("combo");
    const afterOut = passToNextActions(passToNextActions(halved));
    const grappler = useFace(showFace(withActive(afterOut, P1, magnus), magnus, GRAB), magnus);
    expect(grappler.players[P2]?.activeCreatureId).toBe(ryu);
    expect(damageOf(grappler, ryu)).toBe(1);
    expect(grappler.offensiveState).toBe("open");
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
