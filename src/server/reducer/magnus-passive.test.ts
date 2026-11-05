import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../content/creatures.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import {
  asCardId,
  asCreatureDefinitionId,
  asFaceCardId,
  type CreatureDefinitionId,
  type CreatureId,
  type FaceCardId,
  type PlayerId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { dieForCreature } from "../rules/fighters.js";
import { createMatch } from "../setup/createMatch.js";
import { expectOk, handCardIdAt, P1, P2, resolveOpenChain, withHand } from "../testing/scenario.js";
import { advance } from "./reduce.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");
const GRAB = asFaceCardId("face-natural-magnus-power-grab");
const JAB = asFaceCardId("face-natural-jab");
const LARIAT = asFaceCardId("face-natural-lariat");
const PROJECTILE = asFaceCardId("face-natural-projectile");
const FOCUS = asFaceCardId("face-natural-focus");
const RUSH = asFaceCardId("face-natural-ryu-forward-rush");
const KICK = asFaceCardId("face-natural-vega-flash-kick");
const SHIN = asFaceCardId("face-natural-shin");
const HAYMAKER = asFaceCardId("face-natural-haymaker");
const PARRY = asCardId("card-parry");

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
    matchId: "match-magnus-passive",
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

function fighterOf(state: GameState, definitionId: CreatureDefinitionId, playerId: PlayerId): CreatureId {
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

function installFace(state: GameState, creatureId: CreatureId, faceId: FaceCardId): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) => (index === 0 ? { ...slot, faceCardId: faceId } : slot));
  return {
    ...state,
    dice: { ...state.dice, [die.id]: { ...die, slots, rolledSlotIndex: 0 } },
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

function useFace(state: GameState, playerId: PlayerId, creatureId: CreatureId): GameState {
  return resolveOpenChain(expectOk(advance(state, { type: "USE_FACE", playerId, creatureId })));
}

function passToNextActions(state: GameState): GameState {
  const actor = state.activePlayerId;
  const ended = expectOk(advance(state, { type: "END_SEQUENCE", playerId: actor }));
  const next = ended.activePlayerId;
  const rolled = expectOk(advance(ended, { type: "ROLL_DICE", playerId: next }));
  return expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: next }));
}

describe("Magnus passive", () => {
  it("adds 1 to a grab hit he executes and not to the same grab face from another Fighter", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const vega = fighterOf(opened, VEGA_ID, P1);
    const defender = fighterOf(opened, VEGA_ID, P2);
    const magnusHit = useFace(showFace(withActive(opened, P1, magnus), magnus, GRAB), P1, magnus);
    expect(damageOf(magnusHit, defender)).toBe(3);

    const other = useFace(
      installFace(withActive(opened, P1, vega), vega, GRAB),
      P1,
      vega,
    );
    expect(damageOf(other, defender)).toBe(2);
  });

  it("adds 1 once to a Technique, including when the primary face is a grab", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const vega = fighterOf(opened, VEGA_ID, P1);
    const ryu = fighterOf(opened, RYU_ID, P1);
    const defender = fighterOf(opened, VEGA_ID, P2);
    const combo = useFace(
      showFace(showFace(withActive(opened, P1, magnus), vega, JAB), magnus, GRAB),
      P1,
      vega,
    );
    expect(combo.offensiveState).toBe("combo");
    const before = damageOf(combo, defender);
    const bomb = resolveOpenChain(
      expectOk(
        advance(showFace(combo, ryu, RUSH), {
          type: "USE_TECHNIQUE",
          playerId: P1,
          creatureId: magnus,
          techniqueId: "technique-magnus-power-bomb",
          secondaryDieId: dieForCreature(combo, ryu)!.id,
        }),
      ),
    );
    expect(damageOf(bomb, defender)).toBe(before + 8);
  });

  it("does not add 1 to a non-grab face hit he executes", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const vega = fighterOf(opened, VEGA_ID, P1);
    const defender = fighterOf(opened, VEGA_ID, P2);
    const combo = useFace(showFace(withActive(opened, P1, magnus), vega, JAB), P1, vega);
    const before = damageOf(combo, defender);
    const hit = useFace(showFace(combo, magnus, LARIAT), P1, magnus);
    expect(damageOf(hit, defender)).toBe(before + 3);
  });

  it("deals 0 for a negated grab and a whiffed grab", () => {
    const opened = skirmishActions();
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const defender = fighterOf(opened, VEGA_ID, P2);
    const declared = expectOk(
      advance(showFace(withActive(opened, P1, magnus), magnus, GRAB), {
        type: "USE_FACE",
        playerId: P1,
        creatureId: magnus,
      }),
    );
    const passed = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const holding = withHand(passed, P2, [PARRY]);
    const parried = expectOk(
      advance(holding, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(holding, P2, 0),
      }),
    );
    const negated = resolveOpenChain(parried);
    expect(damageOf(negated, defender)).toBe(0);

    const ryu = fighterOf(opened, RYU_ID, P2);
    const whiff = useFace(
      showFace(withActive(withActive(opened, P1, magnus), P2, ryu), magnus, GRAB),
      P1,
      magnus,
    );
    expect(damageOf(whiff, ryu)).toBe(0);
    expect(whiff.offensiveState).toBe("open");
  });

  it("arms +2 for a light punch or light kick starter and spends it on the next turn only", () => {
    const opened = skirmishActions();
    const p2 = passToNextActions(opened);
    const turn = p2.turn;
    const vega = fighterOf(p2, VEGA_ID, P2);
    const magnusP1 = fighterOf(p2, MAGNUS_ID, P1);
    const magnusP2 = fighterOf(p2, MAGNUS_ID, P2);
    const defender = fighterOf(p2, VEGA_ID, P1);
    const armed = useFace(showFace(withActive(p2, P2, vega), vega, JAB), P2, vega);
    expect(armed.turn).toBe(turn);
    expect(armed.creatures[magnusP1]?.delayedAttackBonus).toEqual({
      amount: 2,
      availableOnTurn: turn + 1,
    });
    const before = damageOf(armed, defender);
    const sameTurn = useFace(showFace(armed, magnusP2, LARIAT), P2, magnusP2);
    expect(damageOf(sameTurn, defender)).toBe(before + 3);
    expect(sameTurn.creatures[magnusP1]?.delayedAttackBonus).toEqual({
      amount: 2,
      availableOnTurn: turn + 1,
    });

    const kicking = passToNextActions(opened);
    const kickTurn = kicking.turn;
    const kickVega = fighterOf(kicking, VEGA_ID, P2);
    const kickArmed = useFace(installFace(withActive(kicking, P2, kickVega), kickVega, SHIN), P2, kickVega);
    expect(kickArmed.creatures[fighterOf(kickArmed, MAGNUS_ID, P1)]?.delayedAttackBonus).toEqual({
      amount: 2,
      availableOnTurn: kickTurn + 1,
    });

    const next = passToNextActions(armed);
    expect(next.turn).toBe(turn + 1);
    const due = fighterOf(next, MAGNUS_ID, P1);
    const target = fighterOf(next, VEGA_ID, P2);
    expect(next.creatures[due]?.delayedAttackBonus?.amount).toBe(2);
    const spent = useFace(showFace(withActive(next, P1, due), due, GRAB), P1, due);
    expect(damageOf(spent, target)).toBe(5);
    expect(spent.creatures[due]?.delayedAttackBonus).toBeNull();
  });

  it("does not raise the punish above 2 and drops it when that turn ends unused", () => {
    const opened = skirmishActions();
    const p2 = passToNextActions(withActive(opened, P1, fighterOf(opened, RYU_ID, P1)));
    const magnus = fighterOf(p2, MAGNUS_ID, P2);
    const vega = fighterOf(p2, VEGA_ID, P2);
    const ryu = fighterOf(p2, RYU_ID, P1);
    const ready = showFace(withActive(withActive(p2, P2, magnus), P1, ryu), vega, JAB);
    const whiff = useFace(ready, P2, vega);
    expect(whiff.offensiveState).toBe("open");
    const again = resolveOpenChain(
      expectOk(
        advance(showFace(showFace(whiff, magnus, LARIAT), vega, KICK), {
          type: "USE_TECHNIQUE",
          playerId: P2,
          creatureId: magnus,
          techniqueId: "technique-magnus-collar-tie",
          secondaryDieId: dieForCreature(whiff, vega)!.id,
        }),
      ),
    );
    const armed = fighterOf(again, MAGNUS_ID, P1);
    expect(again.creatures[armed]?.delayedAttackBonus).toEqual({
      amount: 2,
      availableOnTurn: p2.turn + 1,
    });

    const idle = passToNextActions(
      useFace(
        showFace(withActive(passToNextActions(opened), P2, fighterOf(opened, VEGA_ID, P2)), fighterOf(opened, VEGA_ID, P2), JAB),
        P2,
        fighterOf(opened, VEGA_ID, P2),
      ),
    );
    const waiting = fighterOf(idle, MAGNUS_ID, P1);
    expect(idle.creatures[waiting]?.delayedAttackBonus?.availableOnTurn).toBe(idle.turn);
    const ended = expectOk(advance(idle, { type: "END_TURN", playerId: P1 }));
    expect(ended.creatures[waiting]?.delayedAttackBonus).toBeNull();
  });

  it("does not arm the punish for a medium starter, a heavy starter, or an extender", () => {
    const opened = passToNextActions(skirmishActions());
    const ryu = fighterOf(opened, RYU_ID, P2);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const medium = useFace(showFace(withActive(opened, P2, ryu), ryu, PROJECTILE), P2, ryu);
    expect(medium.creatures[magnus]?.delayedAttackBonus).toBeNull();

    const heavy = useFace(installFace(withActive(opened, P2, ryu), ryu, HAYMAKER), P2, ryu);
    expect(heavy.creatures[magnus]?.delayedAttackBonus).toBeNull();

    const started = useFace(showFace(withActive(opened, P2, ryu), ryu, PROJECTILE), P2, ryu);
    const extended = useFace(showFace(started, ryu, FOCUS), P2, ryu);
    expect(extended.creatures[magnus]?.delayedAttackBonus).toBeNull();
  });

  it("does not arm a defeated Magnus and ignores an illegal declaration", () => {
    const opened = passToNextActions(skirmishActions());
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const vega = fighterOf(opened, VEGA_ID, P2);
    const defeated = {
      ...opened,
      creatures: {
        ...opened.creatures,
        [magnus]: { ...opened.creatures[magnus]!, defeated: true, damage: 18 },
      },
    };
    const hit = useFace(showFace(withActive(defeated, P2, vega), vega, JAB), P2, vega);
    expect(hit.creatures[magnus]?.delayedAttackBonus).toBeNull();

    const illegal = advance(opened, { type: "USE_FACE", playerId: P1, creatureId: magnus });
    expect(illegal.ok).toBe(false);
    expect(illegal.state).toBe(opened);
    expect(opened.creatures[magnus]?.delayedAttackBonus).toBeNull();
  });

  it("prints both clauses and the rulebook describes the same timing", () => {
    const text = getCreatureDefinition(MAGNUS_ID)?.passiveRulesText ?? "";
    expect(text).toContain("Grab hits you execute");
    expect(text).toContain("Techniques you execute deal +1 damage");
    expect(text).toContain("light punch");
    expect(text).toContain("light kick");
    expect(text).toContain("+2 damage");
    const rulebook = readFileSync(join(ROOT, "docs/RULEBOOK.md"), "utf8");
    const source = readFileSync(join(ROOT, "docs/GAME_STATE.md"), "utf8");
    expect(rulebook).toContain("Grab hits Magnus executes");
    expect(rulebook).toContain("next turn");
    expect(source).toContain("executedGrabOrTechniqueBonus");
    expect(source).toContain("lightStarterPunish");
    expect(source).toContain("delayedAttackBonus");
    expect(source).toContain("availableOnTurn");
  });
});
