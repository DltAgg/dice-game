import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { diceOf } from "../rules/dice.js";
import {
  TEST_BODY_B,
  TEST_LEGEND,
  TEST_SQUAD,
  testCard,
  testCreature,
  testFace,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withHand,
  withPhase,
  withPile,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const SHIELD_SLOT = 5;
const MARTIAL_SLOT = 4;

const P2_ON_ROLL = testFace({
  id: "face-test-shared-roll-p2-onroll",
  kind: "synthetic",
  symbol: "martial",
  onRoll: [{ type: "next-attack-bonus", amount: 1 }],
});

const CONVERT_STRIKE = testFace({
  id: "face-test-shared-roll-convert",
  kind: "synthetic",
  symbol: "arcane",
  convertRoll: true,
  pips: { arcane: 2 },
  onRoll: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
});

const OPPONENT_ROLL_GEAR = testCard({
  id: "card-test-shared-roll-opponent-symbol",
  playCost: { martial: 2 },
  attribute: "martial",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [
      {
        type: "on-roll-symbol",
        symbol: "martial",
        rollingPlayer: "opponent",
        effects: [{ type: "arm-forge-discount", amount: 1 }],
      },
    ],
  },
});

const P2_ABSORB = testCreature({
  id: "creature-test-shared-roll-onabsorb",
  attributes: ["martial"],
  standingAbilities: [
    {
      type: "on-absorb",
      symbols: ["martial"],
      absorberRelation: "ally",
      effects: [{ type: "arm-forge-discount", amount: 1 }],
    },
  ],
});

function dieIdOf(state: GameState, playerId: PlayerId, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(
  state: GameState,
  playerId: PlayerId,
  faceCardId: FaceCardId,
  dieIndex = 0,
  slot = 0,
): GameState {
  const dieId = dieIdOf(state, playerId, dieIndex);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((candidate, index) =>
    index === slot ? { ...candidate, faceCardId, faceCardOwnerId: playerId } : candidate,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function retainShowing(
  state: GameState,
  playerId: PlayerId,
  dieIndex: 0 | 1,
  slotIndex: number,
): GameState {
  return withDie(state, dieIdOf(state, playerId, dieIndex), {
    retained: true,
    rolledSlotIndex: slotIndex,
  });
}

describe("shared ROLL_DICE", () => {
  it("sets P2 rolledSlotIndex and banks P2 attributes on P1's opening roll", () => {
    const state = expectOk(advance(newMatch(), { type: "ROLL_DICE", playerId: P1 }));

    for (const die of diceOf(state, P2)) {
      expect(die.rolledSlotIndex).not.toBeNull();
    }
    const p2Attributes = Object.values(state.symbols).filter(
      (symbol) => symbol.ownerId === P2 && symbol.symbol !== "shield",
    );
    const p2Banked = Object.values(state.players[P2]?.attributePool ?? {}).reduce(
      (sum, n) => sum + n,
      0,
    );
    expect(p2Banked).toBe(p2Attributes.length);
    expect(p2Attributes.every((symbol) => symbol.status === "absorbed")).toBe(true);
  });

  it("refuses ROLL_DICE from the player who is not active", () => {
    const result = advance(newMatch(), { type: "ROLL_DICE", playerId: P2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("NOT_ACTIVE_PLAYER");
  });

  it("keeps P1 retain through P2's shared roll and spends it on P1's next roll", () => {
    let state = expectOk(advance(newMatch(), { type: "ROLL_DICE", playerId: P1 }));
    const dieId = dieIdOf(state, P1, 0);
    const keptSlot = state.dice[dieId]?.rolledSlotIndex;
    expect(keptSlot).not.toBeNull();

    state = expectOk(
      advance(state, { type: "RETAIN_DIE", playerId: P1, dieId, retain: true }),
    );
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.activePlayerId).toBe(P2);

    state = expectOk(advance(state, { type: "ROLL_DICE", playerId: P2 }));
    expect(state.dice[dieId]?.rolledSlotIndex).toBe(keptSlot);
    expect(state.dice[dieId]?.retained).toBe(true);
    expect(eventTypes(state).filter((type) => type === "die-released")).toHaveLength(0);

    state = expectOk(advance(state, { type: "END_TURN", playerId: P2 }));
    state = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(state.dice[dieId]?.rolledSlotIndex).toBe(keptSlot);
    expect(state.dice[dieId]?.retained).toBe(false);
    expect(eventTypes(state)).toContain("die-released");
  });

  it("fires P2 On roll during P1's ROLL_DICE with P2 as controller", () => {
    let state = installFace(newMatch(), P2, P2_ON_ROLL.id, 0, 0);
    state = withPhase(state, "roll");
    state = retainShowing(state, P2, 0, 0);
    state = retainShowing(state, P2, 1, SHIELD_SLOT);
    state = retainShowing(state, P1, 0, SHIELD_SLOT);
    state = retainShowing(state, P1, 1, SHIELD_SLOT);

    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.attackBonusThisTurn[P2]).toBe(1);
    expect(after.attackBonusThisTurn[P1] ?? 0).toBe(0);
  });

  it("opens convert Choose one for P2 during P1's roll", () => {
    let state = installFace(newMatch(), P2, CONVERT_STRIKE.id, 0, 0);
    state = withPhase(state, "roll");
    state = retainShowing(state, P2, 0, 0);
    state = retainShowing(state, P2, 1, SHIELD_SLOT);
    state = retainShowing(state, P1, 0, SHIELD_SLOT);
    state = retainShowing(state, P1, 1, SHIELD_SLOT);

    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.pendingDecision?.type).toBe("choose-effect-mode");
    expect(after.pendingDecision).toMatchObject({ controllerId: P2 });
  });

  it("fires on-roll-symbol rollingPlayer opponent when P2's dice show that symbol", () => {
    let state = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [OPPONENT_ROLL_GEAR.id]),
      P1,
      10,
    );
    state = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: creatureIdAt(state, P1, 0),
      }),
    );
    state = withPhase(state, "roll");
    state = retainShowing(state, P2, 0, MARTIAL_SLOT);
    state = retainShowing(state, P2, 1, SHIELD_SLOT);
    state = retainShowing(state, P1, 0, SHIELD_SLOT);
    state = retainShowing(state, P1, 1, SHIELD_SLOT);

    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.forgeDiscountThisTurn[P1]).toBe(1);
  });

  it("flushes both owners' deferred On absorb after an on-roll choice", () => {
    let state = newMatch({
      players: [
        { id: P1, squad: TEST_SQUAD },
        { id: P2, squad: [P2_ABSORB.id, TEST_BODY_B, TEST_LEGEND] },
      ],
    });
    state = installFace(state, P1, CONVERT_STRIKE.id, 0, 0);
    state = withPhase(state, "roll");
    state = retainShowing(state, P1, 0, 0);
    state = retainShowing(state, P1, 1, SHIELD_SLOT);
    state = retainShowing(state, P2, 0, MARTIAL_SLOT);
    state = retainShowing(state, P2, 1, SHIELD_SLOT);

    const afterRoll = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(afterRoll.pendingDecision?.type).toBe("choose-effect-mode");
    expect(afterRoll.pendingDecision).toMatchObject({ controllerId: P1 });
    expect(afterRoll.players[P2]?.attributePool.martial ?? 0).toBe(1);
    expect(afterRoll.forgeDiscountThisTurn[P2] ?? 0).toBe(0);

    const afterChoice = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_EFFECT_MODE",
        playerId: P1,
        modeIndex: 0,
      }),
    );
    expect(afterChoice.players[P2]?.attributePool.martial ?? 0).toBe(1);
    expect(afterChoice.forgeDiscountThisTurn[P2]).toBe(1);
  });
});
