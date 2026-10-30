import { describe, expect, it } from "vitest";
import { CALL_OUT, SHIFT } from "../content/cards.js";
import { MAGNUS, RYU, VEGA } from "../content/creatures.js";
import { TAG_SKIRMISH_LOADOUT } from "../content/loadouts/index.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieState } from "../model/dice.js";
import {
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

const GRAB = asFaceCardId("face-natural-grab");

function inActions(): GameState {
  const match = createMatch({
    matchId: "match-call-out-target",
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
  const opened = expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: P1 }));
  if (opened.phase !== "actions" || opened.pendingDecision !== null) {
    throw new Error(`expected actions, phase ${opened.phase}`);
  }
  return opened;
}

function fighter(state: GameState, playerId: PlayerId, definitionId: CreatureDefinitionId): CreatureId {
  const id = state.players[playerId]?.creatureIds.find(
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

/** Vega's Grab would KO the Active Ryu. Grab is strike 3, halved to 1 while Ryu is Active. */
function lethalGrab(): { state: GameState; ryu: CreatureId; magnus: CreatureId; vega: CreatureId } {
  let state = inActions();
  const vega = fighter(state, P1, VEGA);
  const ryu = fighter(state, P2, RYU);
  const magnus = fighter(state, P2, MAGNUS);
  state = show(state, vega, GRAB);
  state = {
    ...state,
    creatures: {
      ...state.creatures,
      [ryu]: { ...state.creatures[ryu]!, damage: 11 },
    },
    players: {
      ...state.players,
      [P1]: { ...state.players[P1]!, activeCreatureId: vega },
      [P2]: { ...state.players[P2]!, activeCreatureId: ryu, meter: 2 },
    },
  };
  return { state, ryu, magnus, vega };
}

describe("Call Out and a waiting hit", () => {
  it("KOs Ryu when the hit resolves against him as the Active Fighter", () => {
    const { state, ryu, vega } = lethalGrab();
    const resolved = resolveOpenChain(
      expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: vega })),
    );
    expect(resolved.creatures[ryu]?.defeated).toBe(true);
  });

  it("lands the hit on the Fighter Call Out tagged in", () => {
    const { state, ryu, magnus, vega } = lethalGrab();
    const declared = expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: vega }));
    const yielded = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const handed = withHand(yielded, P2, [CALL_OUT]);
    const tagged = expectOk(
      advance(handed, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(handed, P2, 0),
        mode: "exceptional",
        declaredTargetCreatureId: magnus,
      }),
    );
    const resolved = resolveOpenChain(tagged);
    expect(resolved.players[P2]?.activeCreatureId).toBe(magnus);
    expect(resolved.creatures[ryu]?.defeated).toBe(false);
    expect(resolved.creatures[ryu]?.damage).toBe(11);
    expect(resolved.creatures[magnus]?.defeated).toBe(false);
    expect(resolved.creatures[magnus]?.damage).toBe(3);
  });

  it("keeps a Redirected hit on the chosen Fighter after Call Out", () => {
    const { state, ryu, magnus, vega } = lethalGrab();
    const declared = expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: vega }));
    const yielded = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const handed = withHand(yielded, P2, [SHIFT, CALL_OUT]);
    const pinned = expectOk(
      advance(handed, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(handed, P2, 0),
        declaredTargetCreatureId: ryu,
      }),
    );
    const tagged = expectOk(
      advance(pinned, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(pinned, P2, 0),
        mode: "exceptional",
        declaredTargetCreatureId: magnus,
      }),
    );
    const resolved = resolveOpenChain(tagged);
    expect(resolved.players[P2]?.activeCreatureId).toBe(magnus);
    expect(resolved.creatures[ryu]?.defeated).toBe(true);
    expect(resolved.creatures[magnus]?.damage).toBe(0);
  });
});
