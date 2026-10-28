import { describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../content/creatures.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout, DieState } from "../model/dice.js";
import {
  asCreatureDefinitionId,
  asFaceCardId,
  type CreatureId,
  type CreatureDefinitionId,
  type DieId,
  type FaceCardId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { dieForCreature, showingTechnique } from "../rules/fighters.js";
import { hasLegalReactionOffer } from "../rules/reactions.js";
import { createMatch } from "../setup/createMatch.js";
import { advance } from "./reduce.js";
import {
  asTestAttackId,
  asTestCreatureId,
  asTestFaceId,
  TEST_FACE_DECK,
  testAttack,
  testCard,
  testCreature,
  testFace,
} from "../testing/fixtures/index.js";
import {
  advanceResolvingChain,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  withHand,
  P1,
  P2,
  resolveOpenChain,
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
  testFace({ id: STRIKE, name: "Strike", technique: "strike" });
  testFace({ id: TAG_FACE, name: "Tag", technique: "tag" });
  testFace({
    id: ASSIST_FACE,
    name: "Assist",
    technique: "assist",
  });
  testFace({ id: HEAVY, name: "Heavy", technique: "heavy" });
  testFace({ id: GUARD, name: "Guard", technique: "guard" });
  testFace({ id: SPECIAL, name: "Special", technique: "special" });
  testCreature({
    id: KORR,
    name: "Korr Stand-in",
    life: 8,
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
    archetype: "grappler",
    assistEffects: [{ type: "grant-shield", amount: 2, target: { kind: "declared-target" } }],
  });
  testCreature({
    id: NYX,
    name: "Nyx Stand-in",
    life: 6,
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
    config: { ...TAG_FIGHTER_RULES, deckMinCards: 0, deckOutEnabled: false },
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

function showFace(state: GameState, playerId: typeof P1 | typeof P2, faceId: FaceCardId): GameState {
  const dieId = state.players[playerId]?.dieIds[0];
  if (dieId === undefined) throw new Error("missing die");
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("missing die");
  return {
    ...state,
    phase: "actions",
    dice: {
      ...state.dice,
      [dieId]: {
        ...die,
        rolledSlotIndex: 0,
        slots: die.slots.map((slot, index) => (index === 0 ? { ...slot, faceCardId: faceId } : slot)),
      },
    },
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
      advanceResolvingChain(state, { type: "TAG", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(result.players[P1]?.activeCreatureId).toBe(reserve);
    expect(result.players[P1]?.comboCount).toBe(0);
    expect(result.players[P1]?.meter).toBe(0);
  });

  it("tags for free in the opening window without the Tag face", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const reserve = creature(state, P1, 1);
    const result = expectOk(
      advanceResolvingChain(state, { type: "TAG", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(result.players[P1]?.activeCreatureId).toBe(reserve);
    expect(result.players[P1]?.meter).toBe(0);
    expect(result.activePlayerId).toBe(P1);
    expect(result.phase).toBe("actions");
    expect(result.players[P1]?.spentOncePerTurnKeys).toContain("tag-this-turn");
  });

  it("keeps the opening window open across the one reroll", () => {
    let state = show(tagMatch(), P1, 0, 0);
    state = { ...state, phase: "roll", rerollAvailable: true };
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("missing die");
    const rerolled = expectOk(
      advance(state, { type: "REROLL_DICE", playerId: P1, dieIds: [dieId] }),
    );
    expect(rerolled.phase).toBe("roll");
    expect(rerolled.actEngaged).toBe(false);
    const continued = expectOk(advance(rerolled, { type: "ADVANCE_PHASE", playerId: P1 }));
    expect(continued.actEngaged).toBe(false);
    expect(continued.phase).toBe("actions");
    const reserve = creature(continued, P1, 1);
    const tagged = expectOk(
      advanceResolvingChain(continued, { type: "TAG", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(tagged.players[P1]?.activeCreatureId).toBe(reserve);
    expect(tagged.activePlayerId).toBe(P1);
  });

  it("refuses Tag on an open chain and does not spend Meter", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const p1 = state.players[P1]!;
    state = {
      ...state,
      pendingDecision: {
        type: "reaction-priority",
        priorityPlayerId: P1,
        consecutivePasses: 0,
      },
      players: { ...state.players, [P1]: { ...p1, meter: 2 } },
    };
    const reserve = creature(state, P1, 1);
    const declared = advance(state, { type: "TAG", playerId: P1, reserveCreatureId: reserve });
    expect(declared.ok).toBe(false);
    if (!declared.ok) expect(declared.error).toBe("INVALID_PHASE");
    expect(declared.state.players[P1]?.meter).toBe(2);
    expect(declared.state.players[P1]?.activeCreatureId).not.toBe(reserve);
  });

  it("assists for free when the reserve is not showing Assist and has no exceptional cost", () => {
    let state = tagMatch();
    state = show(state, P1, 1, 0);
    const reserve = creature(state, P1, 1);
    expect(showingTechnique(state, reserve)).not.toBe("assist");
    const result = expectOk(
      advance(state, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(result.players[P1]?.meter).toBe(0);
    expect(result.players[P1]?.activeCreatureId).toBe(creature(state, P1, 0));
  });

  it("runs ASSIST from a Reserve showing assist", () => {
    let state = tagMatch();
    state = show(state, P1, 1, 5);
    const reserve = creature(state, P1, 1);
    const active = creature(state, P1, 0);
    const result = expectOk(
      advanceResolvingChain(state, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(result.creatures[active]?.shields).toBe(0);
    expect(result.players[P1]?.activeCreatureId).toBe(active);
  });

  it("refuses a second ASSIST from the same reserve this turn", () => {
    let state = tagMatch();
    state = show(state, P1, 1, 5);
    const reserve = creature(state, P1, 1);
    state = expectOk(
      advanceResolvingChain(state, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve }),
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
    expect(result.players[P2]?.meter).toBeGreaterThan(0);
    expect(result.players[P2]?.activeCreatureId).toBe(active);
    expect(result.pendingDecision).toBeNull();
    expect(result.status).toBe("finished");
    expect(result.winner).toBe(P1);
  });

  it("prompts to replace a KOed Active, refuses Tag until then, and still allows a KOed Reserve to Assist", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const victim = creature(state, P2, 0);
    state = {
      ...state,
      creatures: {
        ...state.creatures,
        [victim]: { ...state.creatures[victim]!, damage: 7 },
      },
    };
    const ko = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creature(state, P1, 0),
        attackId: JAB,
        targetId: victim,
      }),
    );
    expect(ko.creatures[victim]?.defeated).toBe(true);
    expect(ko.players[P2]?.activeCreatureId).toBe(victim);
    expect(ko.pendingDecision).toMatchObject({
      type: "replace-ko-active",
      controllerId: P2,
      defeatedCreatureId: victim,
    });
    expect(ko.aggressorPlayerId).toBe(P1);
    expect(ko.offensiveState).toBe("open");
    expect(ko.activePlayerId).toBe(P1);
    const tagged = advance(ko, {
      type: "TAG",
      playerId: P2,
      reserveCreatureId: creature(ko, P2, 1),
    });
    expect(tagged.ok).toBe(false);
    if (!tagged.ok) {
      expect(tagged.error).toBe("PENDING_DECISION");
      expect(tagged.state).toBe(ko);
    }
    const incoming = creature(ko, P2, 1);
    const replaced = expectOk(
      advance(ko, {
        type: "RESOLVE_REPLACE_KO_ACTIVE",
        playerId: P2,
        creatureId: incoming,
      }),
    );
    expect(replaced.players[P2]?.activeCreatureId).toBe(incoming);
    expect(replaced.creatures[incoming]?.position).toBe("frontline");
    expect(replaced.pendingDecision).toBeNull();
    expect(replaced.players[P2]?.spentOncePerTurnKeys).not.toContain("tag-this-turn");

    const reserve = creature(replaced, P1, 1);
    const knockedReserve = {
      ...replaced,
      creatures: {
        ...replaced.creatures,
        [reserve]: { ...replaced.creatures[reserve]!, defeated: true, damage: 99 },
      },
    };
    const assist = expectOk(
      advanceResolvingChain(knockedReserve, {
        type: "ASSIST",
        playerId: P1,
        reserveCreatureId: reserve,
      }),
    );
    expect(assist.players[P1]?.activeCreatureId).toBe(creature(replaced, P1, 0));
    expect(assist.creatures[creature(replaced, P1, 0)]?.shields).toBe(0);
  });

  it("rejects replacing a KOed Active with that Fighter or an opponent's Fighter", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const victim = creature(state, P2, 0);
    state = {
      ...state,
      creatures: {
        ...state.creatures,
        [victim]: { ...state.creatures[victim]!, damage: 7 },
      },
    };
    const ko = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creature(state, P1, 0),
        attackId: JAB,
        targetId: victim,
      }),
    );
    const turn = ko.turn;
    const self = advance(ko, {
      type: "RESOLVE_REPLACE_KO_ACTIVE",
      playerId: P2,
      creatureId: victim,
    });
    expect(self.ok).toBe(false);
    if (!self.ok) {
      expect(self.error).toBe("CREATURE_DEFEATED");
      expect(self.state).toBe(ko);
    }
    const opponentFighter = creature(ko, P1, 1);
    const stolen = advance(ko, {
      type: "RESOLVE_REPLACE_KO_ACTIVE",
      playerId: P2,
      creatureId: opponentFighter,
    });
    expect(stolen.ok).toBe(false);
    if (!stolen.ok) {
      expect(stolen.error).toBe("INVALID_TARGET");
      expect(stolen.state).toBe(ko);
    }
    const notTheOwner = advance(ko, {
      type: "RESOLVE_REPLACE_KO_ACTIVE",
      playerId: P1,
      creatureId: creature(ko, P2, 1),
    });
    expect(notTheOwner.ok).toBe(false);
    if (!notTheOwner.ok) {
      expect(notTheOwner.error).toBe("PENDING_DECISION");
      expect(notTheOwner.state).toBe(ko);
    }

    const incoming = creature(ko, P2, 2);
    const replaced = expectOk(
      advance(ko, {
        type: "RESOLVE_REPLACE_KO_ACTIVE",
        playerId: P2,
        creatureId: incoming,
      }),
    );
    expect(replaced.players[P2]?.activeCreatureId).toBe(incoming);
    expect(replaced.creatures[incoming]?.position).toBe("frontline");
    expect(replaced.creatures[victim]?.defeated).toBe(true);
    expect(replaced.pendingDecision).toBeNull();
    expect(replaced.players[P2]?.meter).toBe(ko.players[P2]?.meter);
    expect(replaced.players[P2]?.spentOncePerTurnKeys).not.toContain("tag-this-turn");
    expect(replaced.activePlayerId).toBe(P1);
    expect(replaced.phase).toBe("actions");
    expect(replaced.turn).toBe(turn);
    expect(replaced.offensiveState).toBe("open");
    expect(replaced.aggressorPlayerId).toBe(P1);
    expect(eventTypes(replaced)).toContain("tag-switched");
  });

  it("still prompts when only one Reserve is alive", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const victim = creature(state, P2, 0);
    const benched = creature(state, P2, 2);
    state = {
      ...state,
      creatures: {
        ...state.creatures,
        [victim]: { ...state.creatures[victim]!, damage: 7 },
        [benched]: { ...state.creatures[benched]!, defeated: true, damage: 99 },
      },
    };
    const ko = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creature(state, P1, 0),
        attackId: JAB,
        targetId: victim,
      }),
    );
    const only = creature(ko, P2, 1);
    expect(ko.creatures[victim]?.defeated).toBe(true);
    expect(ko.players[P2]?.activeCreatureId).toBe(victim);
    expect(ko.pendingDecision).toMatchObject({
      type: "replace-ko-active",
      controllerId: P2,
      defeatedCreatureId: victim,
    });
    const replaced = expectOk(
      advance(ko, {
        type: "RESOLVE_REPLACE_KO_ACTIVE",
        playerId: P2,
        creatureId: only,
      }),
    );
    expect(replaced.players[P2]?.activeCreatureId).toBe(only);
    expect(replaced.pendingDecision).toBeNull();
  });

  it("does not prompt when a Reserve is KOed", () => {
    const benchHit = testCard({
      id: "card-test-ko-reserve",
      name: "Bench Hit",
      type: "modify",
      rulesText: "Damage a Fighter.",
      effect: { effects: [{ type: "damage", amount: 99, target: { kind: "declared-target" } }] },
    });
    let state = show(tagMatch(), P1, 0, 0);
    const reserve = creature(state, P2, 1);
    const active = creature(state, P2, 0);
    state = withHand(state, P1, [benchHit.id]);
    const ko = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(state, P1, 0),
          declaredTargetCreatureId: reserve,
        }),
      ),
    );
    expect(ko.creatures[reserve]?.defeated).toBe(true);
    expect(ko.players[P2]?.activeCreatureId).toBe(active);
    expect(ko.pendingDecision).toBeNull();
    expect(ko.offensiveState).toBe("open");
    expect(ko.aggressorPlayerId).toBe(P1);
    expect(ko.status).toBe("in-progress");
  });

  it("does not treat the rest of the actions phase as the closing window", () => {
    let state = tagMatch();
    state = show(state, P1, 0, 0);
    const acted = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creature(state, P1, 0),
        attackId: JAB,
        targetId: creature(state, P2, 0),
      }),
    );
    expect(acted.actEngaged).toBe(true);
    expect(acted.offensiveState).toBe("open");
    const tooSoon = advance(acted, {
      type: "TAG",
      playerId: P1,
      reserveCreatureId: creature(acted, P1, 1),
    });
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok) expect(tooSoon.error).toBe("INVALID_PHASE");
  });

  it("tags in the closing window after the chain conducts and then passes the turn", () => {
    const starter = asTestFaceId("tag-window-starter");
    testFace({
      id: starter,
      name: "Window Starter",
      sequenceRole: "starter",
      primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
    });
    const state = showFace(tagMatch(), P1, starter);
    const declaredFace = expectOk(
      advance(state, {
        type: "USE_FACE",
        playerId: P1,
        creatureId: creature(state, P1, 0),
      }),
    );
    const combo = resolveOpenChain(declaredFace);
    expect(combo.offensiveState).toBe("combo");
    expect(combo.actEngaged).toBe(true);
    const reserve = creature(combo, P1, 1);
    const declared = expectOk(
      advance(combo, { type: "TAG", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(declared.pendingDecision?.type).toBe("reaction-priority");
    expect(declared.activePlayerId).toBe(P1);
    expect(declared.players[P1]?.activeCreatureId).not.toBe(reserve);
    expect(declared.players[P1]?.spentOncePerTurnKeys).toContain("tag-this-turn");
    const again = advance(declared, {
      type: "TAG",
      playerId: P1,
      reserveCreatureId: creature(declared, P1, 2),
    });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("ALREADY_USED");
    const tagged = resolveOpenChain(declared);
    expect(tagged.players[P1]?.activeCreatureId).toBe(reserve);
    expect(tagged.activePlayerId).toBe(P2);
    expect(tagged.phase).toBe("roll");
    expect(tagged.players[P1]?.meter).toBe(combo.players[P1]?.meter);
  });

  it("refuses Tag after a finisher resolved this turn", () => {
    const starter = asTestFaceId("tag-window-starter-2");
    const finisher = asTestFaceId("tag-window-finisher");
    testFace({
      id: starter,
      name: "Window Starter",
      sequenceRole: "starter",
      primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
    });
    testFace({
      id: finisher,
      name: "Window Finisher",
      sequenceRole: "finisher",
      primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
    });
    let state = showFace(tagMatch(), P1, starter);
    state = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "USE_FACE",
          playerId: P1,
          creatureId: creature(state, P1, 0),
        }),
      ),
    );
    state = showFace(state, P1, finisher);
    const finished = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "USE_FACE",
          playerId: P1,
          creatureId: creature(state, P1, 0),
        }),
      ),
    );
    expect(finished.phase).toBe("roll");
    expect(finished.activePlayerId).toBe(P2);
    const tagged = advance(finished, {
      type: "TAG",
      playerId: P1,
      reserveCreatureId: creature(finished, P1, 1),
    });
    expect(tagged.ok).toBe(false);
    if (!tagged.ok) expect(tagged.error).toBe("NOT_ACTIVE_PLAYER");
    const p2Actions = expectOk(
      advance(
        expectOk(advance(finished, { type: "ROLL_DICE", playerId: P2 })),
        { type: "ADVANCE_PHASE", playerId: P2 },
      ),
    );
    expect(p2Actions.offensiveState).toBe("open");
    expect(p2Actions.aggressorPlayerId).toBe(P2);
  });

  it("keeps the shared Meter pool across a Tag and the next turn", () => {
    let state = show(tagMatch(), P1, 0, 0);
    const seat = state.players[P1]!;
    state = { ...state, players: { ...state.players, [P1]: { ...seat, meter: 3 } } };
    const tagged = expectOk(
      advanceResolvingChain(state, {
        type: "TAG",
        playerId: P1,
        reserveCreatureId: creature(state, P1, 1),
      }),
    );
    expect(tagged.players[P1]?.meter).toBe(3);
    const ended = expectOk(advance(tagged, { type: "END_TURN", playerId: P1 }));
    expect(ended.players[P1]?.meter).toBe(3);
    expect(ended.players[P2]?.meter).toBe(0);
  });
});

const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");

function fighterBaseDie(id: CreatureDefinitionId): DieFaceLayout {
  const die = getCreatureDefinition(id)?.baseDie;
  if (die === undefined || die.length !== 6) throw new Error(String(id));
  return [die[0]!, die[1]!, die[2]!, die[3]!, die[4]!, die[5]!];
}

function liveAssistMatch(): GameState {
  const squad = [VEGA_ID, MAGNUS_ID, RYU_ID] as const;
  const startingDice = squad.map((id) => fighterBaseDie(id));
  const faceDeck = [...new Set(startingDice.flat())];
  const seat = { squad, deck: [] as const, faceDeck, startingDice };
  return createMatch({
    matchId: "match-assist-windows",
    seed: 3,
    config: { ...TAG_FIGHTER_RULES, deckMinCards: 0, deckOutEnabled: false },
    players: [
      { id: P1, ...seat },
      { id: P2, ...seat },
    ],
  });
}

function p1Actions(): GameState {
  const rolled = expectOk(advance(liveAssistMatch(), { type: "ROLL_DICE", playerId: P1 }));
  const opened = expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: P1 }));
  if (opened.phase !== "actions" || opened.pendingDecision !== null) {
    throw new Error(`expected an open actions window, phase ${opened.phase}`);
  }
  return opened;
}

function fighterOf(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  definitionId: CreatureDefinitionId,
): CreatureId {
  const id = state.players[playerId]?.creatureIds.find(
    (creatureId) => state.creatures[creatureId]?.definitionId === definitionId,
  );
  if (id === undefined) throw new Error(String(definitionId));
  return id;
}

function showCreatureFace(state: GameState, creatureId: CreatureId, faceId: FaceCardId): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  const slot = die.slots.findIndex((entry) => entry.faceCardId === faceId);
  if (slot < 0) throw new Error(faceId);
  const next: DieState = { ...die, rolledSlotIndex: slot };
  return { ...state, dice: { ...state.dice, [die.id]: next } };
}

function withActiveFighter(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  creatureId: CreatureId,
): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...player, activeCreatureId: creatureId } },
  };
}

function withSeatMeter(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  meter: number,
): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  return { ...state, players: { ...state.players, [playerId]: { ...player, meter } } };
}

describe("spec 030 assist windows", () => {
  it("queues Magnus Wall against an opponent hit at 0 Meter with no Assist face", () => {
    for (const id of [VEGA_ID, MAGNUS_ID, RYU_ID]) {
      expect(getCreatureDefinition(id)?.exceptionalAssistMeter).toBe(0);
    }

    let state = p1Actions();
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    state = expectOk(advance(state, { type: "ROLL_DICE", playerId: P2 }));
    state = expectOk(advance(state, { type: "ADVANCE_PHASE", playerId: P2 }));
    const vega = fighterOf(state, P2, VEGA_ID);
    state = showCreatureFace(state, vega, fighterBaseDie(VEGA_ID)[0]!);
    const hit = expectOk(advance(state, { type: "USE_FACE", playerId: P2, creatureId: vega }));
    expect(
      hit.chainStack.some(
        (link) =>
          link.kind === "combat-action" &&
          link.sequenceRole === "starter" &&
          link.controllerId === P2,
      ),
    ).toBe(true);
    state = expectOk(advance(hit, { type: "PASS_PRIORITY", playerId: P2 }));
    expect(state.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
    });
    state = withSeatMeter(state, P1, 0);
    expect(hasLegalReactionOffer(state, P1)).toBe(true);

    const magnus = fighterOf(state, P1, MAGNUS_ID);
    expect(showingTechnique(state, magnus)).not.toBe("assist");
    const active = state.players[P1]?.activeCreatureId;
    const combo = state.players[P1]?.comboCount;
    const offense = state.offensiveState;

    const assisted = expectOk(
      advance(state, { type: "ASSIST", playerId: P1, reserveCreatureId: magnus }),
    );
    expect(assisted.chainStack.find((link) => link.assistReserveId === magnus)?.effects).toEqual([
      {
        type: "arm-redirect-damage",
        amount: 4,
        target: { kind: "source-creature" },
      },
    ]);
    expect(assisted.players[P1]?.meter).toBe(0);
    expect(assisted.players[P1]?.activeCreatureId).toBe(active);
    expect(assisted.players[P1]?.comboCount).toBe(combo);
    expect(assisted.offensiveState).toBe(offense);
    expect(assisted.creatures[magnus]?.redirectDamageThisTurn).toBe(0);
    expect(assisted.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
    });
    expect(
      assisted.chainStack.some((link) => link.controllerId === P2 && link.sequenceRole === "starter"),
    ).toBe(true);
  });

  it("plays Vega Cross as an extender light punch only in combo", () => {
    let state = p1Actions();
    const vega = fighterOf(state, P1, VEGA_ID);
    const magnus = fighterOf(state, P1, MAGNUS_ID);
    const defender = state.players[P2]?.activeCreatureId;
    if (defender === null || defender === undefined) throw new Error("defender");
    state = showCreatureFace(state, vega, fighterBaseDie(VEGA_ID)[0]!);
    state = resolveOpenChain(
      expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: vega })),
    );
    expect(state.offensiveState).toBe("combo");
    expect(state.players[P1]?.comboCount).toBe(1);
    expect(state.creatures[defender]?.damage).toBe(1);
    expect(state.players[P1]?.meter).toBe(2);
    expect(state.players[P2]?.meter).toBe(1);

    const parked = withActiveFighter(state, P1, magnus);
    const declared = expectOk(
      advance(parked, { type: "ASSIST", playerId: P1, reserveCreatureId: vega }),
    );
    const link = declared.chainStack.find((entry) => entry.assistReserveId === vega);
    expect(link).toMatchObject({
      kind: "combat-action",
      sequenceRole: "extender",
      hitStrength: "light",
      hitType: "punch",
      declaredTargetCreatureId: defender,
      effects: [
        {
          type: "assist-hit",
          amount: 2,
          hitStrength: "light",
          hitType: "punch",
          sequenceRole: "extender",
          target: { kind: "declared-target" },
        },
      ],
    });
    expect(declared.players[P1]?.activeCreatureId).toBe(magnus);
    expect(declared.creatures[defender]?.damage).toBe(1);

    const resolved = resolveOpenChain(declared);
    expect(resolved.offensiveState).toBe("combo");
    expect(resolved.players[P1]?.comboCount).toBe(2);
    expect(resolved.creatures[defender]?.damage).toBe(3);
    expect(resolved.players[P1]?.meter).toBe(4);
    expect(resolved.players[P2]?.meter).toBe(2);
    expect(resolved.players[P1]?.activeCreatureId).toBe(magnus);
    expect(resolved.chainStack).toHaveLength(0);
  });

  it("refuses Vega's extender while the sequence is open and lets Ryu's finisher Assist end it", () => {
    let open = p1Actions();
    const magnus = fighterOf(open, P1, MAGNUS_ID);
    const vega = fighterOf(open, P1, VEGA_ID);
    const ryu = fighterOf(open, P1, RYU_ID);
    open = withSeatMeter(withActiveFighter(open, P1, magnus), P1, 0);
    expect(open.pendingDecision).toBeNull();
    expect(open.chainStack).toHaveLength(0);
    expect(showingTechnique(open, vega)).not.toBe("assist");
    expect(showingTechnique(open, ryu)).not.toBe("assist");

    const vegaAssist = advance(open, { type: "ASSIST", playerId: P1, reserveCreatureId: vega });
    expect(vegaAssist.ok).toBe(false);
    if (!vegaAssist.ok) expect(vegaAssist.error).toBe("INVALID_TARGET");
    expect(open.offensiveState).toBe("open");

    const blocked = advance(withActiveFighter(open, P1, vega), {
      type: "ASSIST",
      playerId: P1,
      reserveCreatureId: vega,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("INVALID_TARGET");

    const declared = expectOk(advance(open, { type: "ASSIST", playerId: P1, reserveCreatureId: ryu }));
    const finished = resolveOpenChain(declared);
    expect(finished.activePlayerId).toBe(P2);
    expect(finished.phase).toBe("roll");
    expect(finished.offensiveState).toBe("open");
  });

  it("lets a KOed Reserve Assist and refuses Assist against your own hit", () => {
    const open = p1Actions();
    const magnus = fighterOf(open, P1, MAGNUS_ID);
    const vega = fighterOf(open, P1, VEGA_ID);
    const knocked = {
      ...open,
      creatures: {
        ...open.creatures,
        [magnus]: { ...open.creatures[magnus]!, defeated: true, damage: 99 },
      },
    };
    const assisted = expectOk(
      advance(withSeatMeter(knocked, P1, 0), {
        type: "ASSIST",
        playerId: P1,
        reserveCreatureId: magnus,
      }),
    );
    expect(assisted.players[P1]?.activeCreatureId).toBe(vega);
    expect(assisted.chainStack.some((link) => link.assistReserveId === magnus)).toBe(true);

    const shown = showCreatureFace(open, vega, fighterBaseDie(VEGA_ID)[0]!);
    const ownHit = expectOk(advance(shown, { type: "USE_FACE", playerId: P1, creatureId: vega }));
    const againstOwn = advance(ownHit, {
      type: "ASSIST",
      playerId: P1,
      reserveCreatureId: magnus,
    });
    expect(againstOwn.ok).toBe(false);
    if (!againstOwn.ok) expect(againstOwn.error).toBe("INVALID_PHASE");
  });
});
