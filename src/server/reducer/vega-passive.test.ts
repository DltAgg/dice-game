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

const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");
const QUICK = asFaceCardId("face-quick-grab");
const JAB = asFaceCardId("face-jab");
const LARIAT = asFaceCardId("face-lariat");
const FLASH = asFaceCardId("face-flash-kick");
const BLITZ = asFaceCardId("face-blitz-rush");
const DASH = asFaceCardId("face-dash");
const HEAVY = asFaceCardId("face-heavy");
const CRESCENT = asFaceCardId("face-crescent");
const GRAB = asFaceCardId("face-power-grab");
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
    matchId: "match-vega-passive",
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

function parry(state: GameState): GameState {
  const passed = expectOk(advance(state, { type: "PASS_PRIORITY", playerId: P1 }));
  const holding = withHand(passed, P2, [PARRY]);
  const played = expectOk(
    advance(holding, {
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: handCardIdAt(holding, P2, 0),
    }),
  );
  return resolveOpenChain(played);
}

/** Vega has landed Quick Grab. Combo is open for an extender. */
function afterVegaStarter(state: GameState, vega: CreatureId): GameState {
  return useFace(showFace(withActive(state, P1, vega), vega, QUICK), P1, vega);
}

describe("Vega passive", () => {
  it("sets the restart flag only on Vega and prints the restart in holder voice", () => {
    const text = getCreatureDefinition(VEGA_ID)?.passiveRulesText ?? "";
    expect(getCreatureDefinition(VEGA_ID)?.restartSequenceAfterOpponentEnd).toBe(true);
    expect(getCreatureDefinition(MAGNUS_ID)?.restartSequenceAfterOpponentEnd).toBeUndefined();
    expect(getCreatureDefinition(RYU_ID)?.restartSequenceAfterOpponentEnd).toBeUndefined();
    expect(text).toContain("your sequence");
    expect(text).toContain("starter");
    expect(text).toContain("hit");
    expect(text).toContain("Technique");
  });

  it("keeps her turn open at combo 0 with the parried hit and the earlier starter spent", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID, P1);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const ryu = fighterOf(opened, RYU_ID, P1);
    const defender = fighterOf(opened, VEGA_ID, P2);
    const started = afterVegaStarter(opened, vega);
    expect(started.players[P1]?.comboCount).toBe(1);
    const meter = started.players[P1]?.meter;
    const damage = damageOf(started, defender);
    const declared = expectOk(
      advance(showFace(showFace(showFace(started, vega, JAB), magnus, LARIAT), ryu, CRESCENT), {
        type: "USE_FACE",
        playerId: P1,
        creatureId: magnus,
      }),
    );
    const restarted = parry(declared);
    expect(restarted.activePlayerId).toBe(P1);
    expect(restarted.phase).toBe("actions");
    expect(restarted.aggressorPlayerId).toBe(P1);
    expect(restarted.offensiveState).toBe("open");
    expect(restarted.players[P1]?.comboCount).toBe(0);
    expect(restarted.usedSequenceActionIds).toContain("face:face-quick-grab");
    expect(restarted.usedSequenceActionIds).toContain("face:face-lariat");
    expect(damageOf(restarted, defender)).toBe(damage);
    expect(restarted.players[P1]?.meter).toBe(meter);
  });

  it("declares a different unused starter for its printed damage", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID, P1);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const defender = fighterOf(opened, VEGA_ID, P2);
    const started = afterVegaStarter(opened, vega);
    const declared = expectOk(
      advance(showFace(showFace(started, vega, JAB), magnus, LARIAT), {
        type: "USE_FACE",
        playerId: P1,
        creatureId: magnus,
      }),
    );
    const restarted = parry(declared);
    const before = damageOf(restarted, defender);
    const hit = useFace(showFace(restarted, vega, JAB), P1, vega);
    expect(hit.offensiveState).toBe("combo");
    expect(damageOf(hit, defender)).toBe(before + 1);
  });

  it("refuses the spent starter, an extender, and a finisher while the new sequence is open", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID, P1);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const started = afterVegaStarter(opened, vega);
    const declared = expectOk(
      advance(showFace(showFace(started, vega, JAB), magnus, LARIAT), {
        type: "USE_FACE",
        playerId: P1,
        creatureId: magnus,
      }),
    );
    const restarted = parry(declared);
    expect(restarted.offensiveState).toBe("open");
    const spent = advance(showFace(restarted, vega, QUICK), {
      type: "USE_FACE",
      playerId: P1,
      creatureId: vega,
    });
    const extender = advance(showFace(restarted, vega, FLASH), {
      type: "USE_FACE",
      playerId: P1,
      creatureId: vega,
    });
    const finisher = advance(showFace(restarted, vega, BLITZ), {
      type: "USE_FACE",
      playerId: P1,
      creatureId: vega,
    });
    expect(spent.ok).toBe(false);
    expect(extender.ok).toBe(false);
    expect(finisher.ok).toBe(false);
    if (!spent.ok) expect(spent.error).toBe("ALREADY_USED");
    if (!extender.ok) expect(extender.error).toBe("INVALID_TARGET");
    if (!finisher.ok) expect(finisher.error).toBe("INVALID_TARGET");
  });

  it("hands the turn over when no unused starter remains", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID, P1);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const ryu = fighterOf(opened, RYU_ID, P1);
    const started = afterVegaStarter(opened, vega);
    const declared = expectOk(
      advance(showFace(showFace(showFace(started, vega, DASH), magnus, HEAVY), ryu, CRESCENT), {
        type: "USE_FACE",
        playerId: P1,
        creatureId: vega,
      }),
    );
    const handed = parry(declared);
    expect(handed.activePlayerId).toBe(P2);
    expect(handed.phase).toBe("roll");
  });

  it("hands the turn over on her own finisher", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID, P1);
    const started = afterVegaStarter(opened, vega);
    const finished = useFace(showFace(started, vega, BLITZ), P1, vega);
    expect(finished.activePlayerId).toBe(P2);
    expect(finished.phase).toBe("roll");
  });

  it("hands the turn over on END_SEQUENCE", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID, P1);
    const started = afterVegaStarter(opened, vega);
    const ended = expectOk(advance(started, { type: "END_SEQUENCE", playerId: P1 }));
    expect(ended.activePlayerId).toBe(P2);
    expect(ended.phase).toBe("roll");
  });

  it("hands the turn over when the Active Fighter is not Vega", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID, P1);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const started = useFace(showFace(withActive(opened, P1, magnus), magnus, GRAB), P1, magnus);
    const declared = expectOk(
      advance(showFace(showFace(started, vega, JAB), magnus, LARIAT), {
        type: "USE_FACE",
        playerId: P1,
        creatureId: magnus,
      }),
    );
    const handed = parry(declared);
    expect(handed.activePlayerId).toBe(P2);
    expect(handed.phase).toBe("roll");
  });
});
