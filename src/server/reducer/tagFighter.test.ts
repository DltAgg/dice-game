import { describe, expect, it } from "vitest";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import {
  asFaceCardId,
  type CreatureId,
  type CreatureDefinitionId,
  type DieId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { showingTechnique } from "../rules/fighters.js";
import { advance } from "./reduce.js";
import {
  asTestAttackId,
  asTestCreatureId,
  asTestFaceId,
  TEST_FACE_DECK,
  testAttack,
  testCreature,
  testFace,
} from "../testing/fixtures/index.js";
import {
  advanceResolvingChain,
  expectOk,
  newMatch,
  P1,
  P2,
} from "../testing/scenario.js";

const STRIKE = asTestFaceId("technique-strike");
const TAG_FACE = asTestFaceId("technique-tag");
const ASSIST_FACE = asTestFaceId("technique-assist");
const HEAVY = asTestFaceId("technique-heavy");
const GUARD = asTestFaceId("technique-guard");
const SPECIAL = asTestFaceId("technique-special");

const KORR = asTestCreatureId("tag-korr");
const MAGNUS = asTestCreatureId("tag-magnus");
const NYX = asTestCreatureId("tag-nyx");
const TAG_SQUAD: readonly CreatureDefinitionId[] = [KORR, MAGNUS, NYX];

const JAB = asTestAttackId("tag-jab");

function techniqueDie(
  a: string,
  b: string,
  c: string,
  d: string,
  e: string,
  f: string,
): DieFaceLayout {
  return [
    asFaceCardId(a),
    asFaceCardId(b),
    asFaceCardId(c),
    asFaceCardId(d),
    asFaceCardId(e),
    asFaceCardId(f),
  ];
}

function installTagCatalogue(): void {
  testFace({ id: STRIKE, name: "Strike", kind: "natural", symbol: "martial", technique: "strike" });
  testFace({ id: TAG_FACE, name: "Tag", kind: "natural", symbol: "wild", technique: "tag" });
  testFace({
    id: ASSIST_FACE,
    name: "Assist",
    kind: "natural",
    symbol: "toxin",
    technique: "assist",
  });
  testFace({ id: HEAVY, name: "Heavy", kind: "natural", symbol: "mechanical", technique: "heavy" });
  testFace({ id: GUARD, name: "Guard", kind: "natural", symbol: "luminar", technique: "guard" });
  testFace({ id: SPECIAL, name: "Special", kind: "natural", symbol: "arcane", technique: "special" });
  testCreature({
    id: KORR,
    name: "Korr Stand-in",
    life: 8,
    attributes: ["martial"],
    archetype: "rushdown",
    assistEffects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }],
    attacks: [
      testAttack({
        id: JAB,
        name: "Jab",
        requiredTechniques: ["strike"],
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      }),
    ],
  });
  testCreature({
    id: MAGNUS,
    name: "Magnus Stand-in",
    life: 10,
    attributes: ["mechanical"],
    archetype: "grappler",
    assistEffects: [{ type: "grant-shield", amount: 2, target: { kind: "declared-target" } }],
  });
  testCreature({
    id: NYX,
    name: "Nyx Stand-in",
    life: 6,
    attributes: ["arcane"],
    archetype: "zoner",
    assistEffects: [{ type: "damage", amount: 1, target: { kind: "most-damaged-enemy" } }],
  });
}

const TAG_DICE = [
  techniqueDie(STRIKE, STRIKE, HEAVY, GUARD, TAG_FACE, SPECIAL),
  techniqueDie(GUARD, GUARD, HEAVY, STRIKE, TAG_FACE, ASSIST_FACE),
  techniqueDie(SPECIAL, SPECIAL, STRIKE, GUARD, TAG_FACE, ASSIST_FACE),
] as const;

function tagMatch(): GameState {
  installTagCatalogue();
  return newMatch({
    config: { ...TAG_FIGHTER_RULES, deckMinCards: 0 },
    players: [
      {
        id: P1,
        squad: TAG_SQUAD,
        deck: [],
        faceDeck: TEST_FACE_DECK,
        startingDice: TAG_DICE,
      },
      {
        id: P2,
        squad: TAG_SQUAD,
        deck: [],
        faceDeck: TEST_FACE_DECK,
        startingDice: TAG_DICE,
      },
    ],
  });
}

function show(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  dieIndex: number,
  slotIndex: number,
): GameState {
  const dieId = state.players[playerId]?.dieIds[dieIndex] as DieId;
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("missing die");
  return {
    ...state,
    phase: "actions",
    dice: { ...state.dice, [dieId]: { ...die, rolledSlotIndex: slotIndex } },
  };
}

function creature(state: GameState, playerId: typeof P1 | typeof P2, index: number): CreatureId {
  const id = state.players[playerId]?.creatureIds[index];
  if (id === undefined) throw new Error("missing fighter");
  return id;
}

describe("028 tag-fighter prototype", () => {
  it("opens with 3 bound dice, Active squad[0], meter 0, combo 0", () => {
    const state = tagMatch();
    const p1 = state.players[P1];
    expect(p1?.dieIds).toHaveLength(3);
    expect(p1?.activeCreatureId).toBe(p1?.creatureIds[0]);
    expect(p1?.meter).toBe(0);
    expect(p1?.comboCount).toBe(0);
    expect(state.config.dicePerPlayer).toBe(3);
  });

  it("lets TAG switch Active for free when the Active die shows tag", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 4);
    expect(showingTechnique(state, creature(state, P1, 0))).toBe("tag");
    const reserve = creature(state, P1, 1);
    const result = expectOk(
      advance(state, { type: "TAG", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(result.players[P1]?.activeCreatureId).toBe(reserve);
    expect(result.players[P1]?.comboCount).toBe(0);
    expect(result.players[P1]?.meter).toBe(0);
  });

  it("refuses TAG without showing tag or enough meter", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const reserve = creature(state, P1, 1);
    const result = advance(state, { type: "TAG", playerId: P1, reserveCreatureId: reserve });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_METER");
  });

  it("pays Tag-cancel meter when Tag is not showing", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const p1 = state.players[P1]!;
    state = {
      ...state,
      players: { ...state.players, [P1]: { ...p1, meter: 2 } },
    };
    const reserve = creature(state, P1, 1);
    const result = expectOk(
      advance(state, { type: "TAG", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(result.players[P1]?.meter).toBe(0);
    expect(result.players[P1]?.activeCreatureId).toBe(reserve);
  });

  it("runs ASSIST from a Reserve showing assist", () => {
    let state = tagMatch();
    state = show(state, P1, 1, 5);
    const reserve = creature(state, P1, 1);
    const active = creature(state, P1, 0);
    const result = expectOk(
      advance(state, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(result.creatures[active]?.shields).toBe(2);
  });

  it("refuses a second ASSIST from the same reserve this turn", () => {
    let state = tagMatch();
    state = show(state, P1, 1, 5);
    const reserve = creature(state, P1, 1);
    state = expectOk(
      advance(state, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve }),
    );
    const again = advance(state, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("ALREADY_USED");
  });

  it("gates native attacks on the showing technique and Active only", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const attacker = creature(state, P1, 0);
    const target = creature(state, P2, 0);
    const ok = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: JAB,
        targetId: target,
      }),
    );
    expect(ok.players[P1]?.comboCount).toBe(1);
    expect(ok.creatures[target]?.damage).toBeGreaterThan(0);

    let reserveAttack = tagMatch();
    reserveAttack = show(reserveAttack, P1, 1, 3);
    const fromReserve = advance(reserveAttack, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creature(reserveAttack, P1, 1),
      attackId: JAB,
      targetId: creature(reserveAttack, P2, 0),
    });
    expect(fromReserve.ok).toBe(false);
  });

  it("refuses an attack when the showing technique does not match", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 2);
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creature(state, P1, 0),
      attackId: JAB,
      targetId: creature(state, P2, 0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
  });

  it("grants meter on Strike HP and wins on wipe", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const p2 = state.players[P2]!;
    const wounded = Object.fromEntries(
      p2.creatureIds.map((id) => {
        const creatureState = state.creatures[id]!;
        return [
          id,
          {
            ...creatureState,
            damage: 99,
            defeated: id !== p2.activeCreatureId,
          },
        ];
      }),
    );
    state = { ...state, creatures: { ...state.creatures, ...wounded } };
    const active = creature(state, P2, 0);
    state = {
      ...state,
      creatures: {
        ...state.creatures,
        [active]: { ...state.creatures[active]!, damage: 7, defeated: false },
      },
    };
    const result = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creature(state, P1, 0),
        attackId: JAB,
        targetId: active,
      }),
    );
    expect(result.players[P1]?.meter).toBeGreaterThan(0);
    expect(result.status).toBe("finished");
    expect(result.winner).toBe(P1);
  });
});
