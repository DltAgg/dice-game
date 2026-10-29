import { describe, expect, it } from "vitest";
import { BRACE, COUNTER, PARRY } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { CardInstance } from "../model/cards.js";
import type { DieFaceLayout } from "../model/dice.js";
import {
  asCardInstanceId,
  asCreatureDefinitionId,
  asFaceCardId,
  type CardId,
  type CreatureDefinitionId,
  type CreatureId,
  type FaceCardId,
  type PlayerId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { RNG } from "../rng/rng.js";
import { dieForCreature } from "../rules/fighters.js";
import { TURN_REROLL_KEY } from "../rules/offensive.js";
import { createMatch } from "../setup/createMatch.js";
import { testCard, testCreature, testFace } from "../testing/fixtures/builders.js";
import {
  expectOk,
  handCardIdAt,
  P1,
  P2,
  resolveOpenChain,
  withHand,
} from "../testing/scenario.js";
import { advance, reduce } from "./reduce.js";

const VEGA = asCreatureDefinitionId("creature-vega");
const MAGNUS = asCreatureDefinitionId("creature-magnus");
const RYU = asCreatureDefinitionId("creature-ryu");
const GRAB = asFaceCardId("face-natural-magnus-grab");
const FOCUS = asFaceCardId("face-natural-ryu-focus");
const HEAVY = asFaceCardId("face-natural-magnus-heavy");
const KICK = asFaceCardId("face-natural-vega-kick");
const JAB = asFaceCardId("face-natural-jab");
const CHARGE = asFaceCardId("face-natural-ryu-charge");
const POWER_BOMB = "technique-magnus-power-bomb";
const CHASE_KICK = "technique-vega-chase-kick";
const BAN_FIGHTER = asCreatureDefinitionId("creature-test-ex-ban");

const THROW = testCard({
  id: "card-test-crushing-throw",
  name: "Crushing Throw",
  type: "modify",
  subtypes: ["ex"],
  fighterRestriction: MAGNUS,
  meterCost: 8,
  exGate: { sequenceRole: "finisher", hitType: "punch", hitStrength: "heavy" },
  exStrike: 6,
  exReroll: { scope: "restricted-fighter", times: 2, strikePerFaceId: GRAB, strikePer: 2 },
  exAttackBan: true,
  rulesText: "Heavy Punch Finisher.",
});

const LAUNCH = testCard({
  id: "card-test-air-launcher",
  name: "Air Launcher",
  type: "modify",
  subtypes: ["ex"],
  fighterRestriction: VEGA,
  meterCost: 8,
  exGate: { sequenceRole: "finisher", hitType: "kick" },
  exStrike: 3,
  exReroll: { scope: "controller", times: 1 },
  exExtraActionPhase: true,
  rulesText: "Kick Finisher.",
});

const REDIRECT = testCard({
  id: "card-test-ex-redirect",
  name: "Redirect",
  type: "modify",
  subtypes: [],
  modifySubject: "target",
  rulesText: "Redirect.",
});

const STRIKE_MOD = testCard({
  id: "card-test-ex-strike-mod",
  name: "Strike Mod",
  type: "modify",
  subtypes: [],
  rulesText: "Strike.",
  effect: {
    effects: [{ type: "damage", amount: 3, target: { kind: "declared-target" } }],
  },
});

const LIGHT_KICK = testFace({
  id: "face-test-ex-light-kick",
  name: "Light Kick Finisher",
  faceType: "attack",
  sequenceRole: "finisher",
  hitStrength: "light",
  hitType: "kick",
  primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
});

testCreature({
  id: BAN_FIGHTER,
  name: "Ban Fighter",
  life: 20,
  baseDie: [JAB, JAB, JAB, JAB, JAB, HEAVY],
  assistEffects: [
    {
      type: "assist-hit",
      amount: 2,
      hitStrength: "light",
      hitType: "punch",
      sequenceRole: "starter",
      target: { kind: "declared-target" },
    },
  ],
  attacks: [],
});

const BAN_EX = testCard({
  id: "card-test-ex-ban-assist",
  name: "Ban Assist EX",
  type: "modify",
  subtypes: ["ex"],
  fighterRestriction: BAN_FIGHTER,
  meterCost: 8,
  exGate: { sequenceRole: "finisher", hitType: "punch", hitStrength: "heavy" },
  exStrike: 6,
  exAttackBan: true,
  rulesText: "Heavy Punch Finisher.",
});

function fighterBaseDie(id: CreatureDefinitionId): DieFaceLayout {
  const die = getCreatureDefinition(id)?.baseDie;
  if (die === undefined || die.length !== 6) throw new Error(String(id));
  return [die[0]!, die[1]!, die[2]!, die[3]!, die[4]!, die[5]!];
}

function actions(): GameState {
  const squad = [VEGA, MAGNUS, RYU] as const;
  const startingDice = squad.map((id) => fighterBaseDie(id));
  const faceDeck = [...new Set(startingDice.flat())];
  const seat = { squad, deck: [] as const, faceDeck, startingDice };
  const match = createMatch({
    matchId: "match-ex",
    seed: 5,
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

function fighter(state: GameState, playerId: PlayerId, definitionId: CreatureDefinitionId): CreatureId {
  const id = state.players[playerId]?.creatureIds.find(
    (creatureId) => state.creatures[creatureId]?.definitionId === definitionId,
  );
  if (id === undefined) throw new Error(String(definitionId));
  return id;
}

function show(state: GameState, creatureId: CreatureId, faceId: FaceCardId): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  const slot = die.slots.findIndex((entry) => entry.faceCardId === faceId);
  if (slot < 0) throw new Error(faceId);
  return { ...state, dice: { ...state.dice, [die.id]: { ...die, rolledSlotIndex: slot } } };
}

function withActive(state: GameState, playerId: PlayerId, creatureId: CreatureId): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...player, activeCreatureId: creatureId } },
  };
}

function withMeter(state: GameState, playerId: PlayerId, meter: number): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  return { ...state, players: { ...state.players, [playerId]: { ...player, meter } } };
}

function withDeckTop(state: GameState, playerId: PlayerId, cardId: CardId): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  const id = asCardInstanceId(`given-${playerId}-deck-${cardId}`);
  const instance: CardInstance = {
    id,
    cardId,
    ownerId: playerId,
    zone: "deck",
    attachedToCreatureId: null,
    attachedToFaceCardId: null,
    ritualOrientation: null,
  };
  return {
    ...state,
    cards: { ...state.cards, [id]: instance },
    players: { ...state.players, [playerId]: { ...player, deck: [id, ...player.deck] } },
  };
}

function defenderId(state: GameState): CreatureId {
  const id = state.players[P2]?.activeCreatureId;
  if (id === undefined) throw new Error("defender");
  return id;
}

function damage(state: GameState, creatureId: CreatureId): number {
  return state.creatures[creatureId]?.damage ?? 0;
}

function meterOf(state: GameState, playerId: PlayerId): number {
  return state.players[playerId]?.meter ?? -1;
}

function meterDeltas(state: GameState, playerId: PlayerId): number[] {
  const deltas: number[] = [];
  for (const entry of state.log) {
    const event = entry.event;
    if (event.type === "meter-changed" && event.playerId === playerId) deltas.push(event.delta);
  }
  return deltas;
}

function slotMap(state: GameState): Record<string, number | null> {
  const slots: Record<string, number | null> = {};
  for (const id of Object.keys(state.dice).sort()) {
    slots[id] = state.dice[id]?.rolledSlotIndex ?? null;
  }
  return slots;
}

function scriptedRng(slots: readonly number[]): RNG {
  const queue = [...slots];
  return {
    next() {
      throw new Error("next");
    },
    integer() {
      const next = queue.shift();
      if (next === undefined) throw new Error("rng underrun");
      return next;
    },
    pick() {
      throw new Error("pick");
    },
    snapshot: () => ({ seed: 1, cursor: queue.length }),
  };
}

function play(
  state: GameState,
  playerId: PlayerId,
  index = 0,
  target: CreatureId | null = null,
) {
  return advance(state, {
    type: "PLAY_CARD",
    playerId,
    cardInstanceId: handCardIdAt(state, playerId, index),
    ...(target !== null ? { declaredTargetCreatureId: target } : {}),
  });
}

function pass(state: GameState, playerId: PlayerId): GameState {
  return expectOk(advance(state, { type: "PASS_PRIORITY", playerId }));
}

function useTechnique(
  state: GameState,
  creatureId: CreatureId,
  techniqueId: string,
  secondaryCreatureId: CreatureId,
): GameState {
  const secondary = dieForCreature(state, secondaryCreatureId);
  if (secondary === undefined) throw new Error("secondary");
  return expectOk(
    advance(state, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId,
      techniqueId,
      secondaryDieId: secondary.id,
    }),
  );
}

/** Active Magnus showing Grab, Ryu showing Focus, Crushing Throw in hand, Meter set. */
function powerBombWindow(meter = 8, cards: readonly CardId[] = [THROW.id]): GameState {
  const opened = actions();
  const magnus = fighter(opened, P1, MAGNUS);
  const ryu = fighter(opened, P1, RYU);
  const shown = show(show(withActive(opened, P1, magnus), magnus, GRAB), ryu, FOCUS);
  return withHand(withMeter(shown, P1, meter), P1, cards);
}

function declarePowerBomb(state: GameState): GameState {
  return useTechnique(state, fighter(state, P1, MAGNUS), POWER_BOMB, fighter(state, P1, RYU));
}

function chaseWindow(cards: readonly CardId[]): GameState {
  const opened = actions();
  const vega = fighter(opened, P1, VEGA);
  const magnus = fighter(opened, P1, MAGNUS);
  const shown = show(show(opened, vega, KICK), magnus, HEAVY);
  return withHand(withMeter(shown, P1, 8), P1, cards);
}

function declareChase(state: GameState): GameState {
  return useTechnique(state, fighter(state, P1, VEGA), CHASE_KICK, fighter(state, P1, MAGNUS));
}

function resolvePlayed(played: GameState, slots: readonly number[]): GameState {
  const passed = pass(played, P1);
  return expectOk(reduce(passed, { type: "PASS_PRIORITY", playerId: P2 }, scriptedRng(slots)));
}

function openActions(state: GameState, playerId: PlayerId): GameState {
  const rolled =
    state.phase === "roll" ? expectOk(advance(state, { type: "ROLL_DICE", playerId })) : state;
  return expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId }));
}

function endSequence(state: GameState, playerId: PlayerId): GameState {
  const ready = state.phase === "actions" ? state : openActions(state, playerId);
  return expectOk(advance(ready, { type: "END_SEQUENCE", playerId }));
}

describe("spec 035 EX cards", () => {
  it("replaces a heavy punch finisher and spends 8 before the chain resolves", () => {
    const ready = powerBombWindow();
    const declared = declarePowerBomb(ready);
    const defender = defenderId(declared);
    expect(declared.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
      consecutivePasses: 0,
    });

    const played = expectOk(play(declared, P1));
    expect(meterOf(played, P1)).toBe(0);
    expect(damage(played, defender)).toBe(0);
    expect(played.chainStack[0]).toMatchObject({
      kind: "combat-action",
      negated: false,
      exReplaced: true,
      sequenceRole: "finisher",
      hitStrength: "heavy",
      hitType: "punch",
      sourceCreatureId: fighter(played, P1, MAGNUS),
    });
    expect(played.chainStack.at(-1)?.kind).toBe("tactic-effect");
    expect(played.pendingDecision).toMatchObject({
      priorityPlayerId: P1,
      consecutivePasses: 0,
    });
    expect(meterDeltas(played, P1)).toEqual([-8]);

    const resolved = resolvePlayed(played, [0, 3]);
    expect(damage(resolved, defender)).toBe(6);
    expect(meterOf(resolved, P1)).toBe(0);
    expect(meterOf(resolved, P2)).toBe(0);
    expect(meterDeltas(resolved, P1)).toEqual([-8]);
    expect(resolved.chainStack[0]?.kind).toBeUndefined();
  });

  it("deals the original Power Bomb strike when no EX card replaces it", () => {
    const declared = declarePowerBomb(powerBombWindow(0, []));
    const defender = defenderId(declared);
    const resolved = resolveOpenChain(declared);
    expect(damage(resolved, defender)).toBe(7);
    expect(meterDeltas(resolved, P1)).toContain(4);
    expect(meterOf(resolved, P2)).toBe(1);
  });

  it("deals Strike 6 plus 0, 2, or 4 from the Magnus rerolls and leaves other dice", () => {
    const cases = [
      { slots: [0, 3], damage: 6, finalSlot: 3 },
      { slots: [0, 1], damage: 8, finalSlot: 1 },
      { slots: [1, 0], damage: 8, finalSlot: 0 },
      { slots: [1, 2], damage: 10, finalSlot: 2 },
    ] as const;
    for (const row of cases) {
      const declared = declarePowerBomb(powerBombWindow());
      const defender = defenderId(declared);
      const magnusDie = dieForCreature(declared, fighter(declared, P1, MAGNUS));
      if (magnusDie === undefined) throw new Error("magnus die");
      const before = slotMap(declared);
      const resolved = resolvePlayed(expectOk(play(declared, P1)), row.slots);
      expect(damage(resolved, defender)).toBe(row.damage);
      expect(resolved.dice[magnusDie.id]?.rolledSlotIndex).toBe(row.finalSlot);
      const after = slotMap(resolved);
      for (const [id, slot] of Object.entries(before)) {
        if (id === magnusDie.id) continue;
        expect(after[id]).toBe(slot);
      }
      expect(resolved.log.some((entry) => entry.event.type === "dice-rerolled")).toBe(false);
      expect(resolved.players[P1]?.spentOncePerTurnKeys.includes(TURN_REROLL_KEY)).toBe(false);
      expect(resolved.rerollAvailable).toBe(false);
    }
  });

  it("replaces a retained Magnus face and does not roll a stunned Magnus die", () => {
    const declared = declarePowerBomb(powerBombWindow());
    const magnusId = fighter(declared, P1, MAGNUS);
    const die = dieForCreature(declared, magnusId);
    if (die === undefined) throw new Error("die");
    const retained = {
      ...declared,
      dice: { ...declared.dice, [die.id]: { ...die, retained: true } },
    };
    const kept = resolvePlayed(expectOk(play(retained, P1)), [0, 3]);
    expect(kept.dice[die.id]?.rolledSlotIndex).toBe(3);
    expect(damage(kept, defenderId(declared))).toBe(6);

    const stunnedDeclared = declarePowerBomb(powerBombWindow());
    const stunnedDie = dieForCreature(stunnedDeclared, fighter(stunnedDeclared, P1, MAGNUS));
    if (stunnedDie === undefined) throw new Error("die");
    const stunned = {
      ...stunnedDeclared,
      dice: {
        ...stunnedDeclared.dice,
        [stunnedDie.id]: { ...stunnedDie, stunMarkers: 1 },
      },
    };
    const slot = stunnedDie.rolledSlotIndex;
    const skipped = resolvePlayed(expectOk(play(stunned, P1)), []);
    expect(skipped.dice[stunnedDie.id]?.rolledSlotIndex).toBe(slot);
    expect(damage(skipped, defenderId(stunnedDeclared))).toBe(6);
  });

  it("refuses EX after the attacker passes, above another link, with no attack, or on the wrong gate", () => {
    const declared = declarePowerBomb(powerBombWindow());
    const passed = pass(declared, P1);
    const afterPass = advance(passed, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(passed, P1, 0),
    });
    expect(afterPass.ok).toBe(false);
    if (!afterPass.ok) expect(afterPass.error).toBe("NOT_PRIORITY_PLAYER");
    expect(afterPass.state).toBe(passed);

    const returned = {
      ...declared,
      pendingDecision: {
        type: "reaction-priority" as const,
        priorityPlayerId: P1,
        consecutivePasses: 1,
      },
    };
    const late = play(returned, P1);
    expect(late.ok).toBe(false);
    expect(late.state).toBe(returned);
    expect(meterOf(returned, P1)).toBe(8);

    const covered = powerBombWindow(8, [REDIRECT.id, THROW.id]);
    const hit = declarePowerBomb(covered);
    const defender = defenderId(hit);
    const redirected = expectOk(play(hit, P1, 0, defender));
    const buried = play(redirected, P1);
    expect(buried.ok).toBe(false);
    expect(buried.state).toBe(redirected);
    expect(redirected.chainStack.some((link) => link.exReplaced === true)).toBe(false);
    expect(meterOf(redirected, P1)).toBe(8);

    const idle = withHand(withMeter(actions(), P1, 8), P1, [THROW.id]);
    const noAttack = play(idle, P1);
    expect(noAttack.ok).toBe(false);
    expect(noAttack.state).toBe(idle);
    expect(meterOf(idle, P1)).toBe(8);
    expect(idle.players[P1]?.hand).toHaveLength(1);

    const jabbed = actions();
    const magnus = fighter(jabbed, P1, MAGNUS);
    const jab = withHand(
      withMeter(show(withActive(jabbed, P1, magnus), magnus, JAB), P1, 8),
      P1,
      [THROW.id],
    );
    const light = expectOk(
      advance(jab, { type: "USE_FACE", playerId: P1, creatureId: magnus }),
    );
    const wrongJab = play(light, P1);
    expect(wrongJab.ok).toBe(false);
    expect(wrongJab.state).toBe(light);

    const kick = declareChase(chaseWindow([THROW.id]));
    const wrongKick = play(kick, P1);
    expect(wrongKick.ok).toBe(false);
    expect(wrongKick.state).toBe(kick);
  });

  it("spends nothing when Meter is short and will not spend the same 8 twice", () => {
    const short = powerBombWindow(7);
    const declared = declarePowerBomb(short);
    const missed = play(declared, P1);
    expect(missed.ok).toBe(false);
    if (!missed.ok) expect(missed.error).toBe("INSUFFICIENT_METER");
    expect(missed.state).toBe(declared);
    expect(meterOf(declared, P1)).toBe(7);
    expect(declared.players[P1]?.hand).toHaveLength(1);

    const ready = declarePowerBomb(powerBombWindow(8, [THROW.id, THROW.id]));
    const first = expectOk(play(ready, P1));
    expect(meterOf(first, P1)).toBe(0);
    expect(first.players[P1]?.hand).toHaveLength(1);
    const second = play(first, P1);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("CARD_NOT_AVAILABLE");
    expect(second.state).toBe(first);
    expect(meterOf(first, P1)).toBe(0);
  });

  it("lets Counter answer an ordinary card and refuses it on an EX card or a hit", () => {
    const opened = withHand(withMeter(actions(), P1, 0), P1, [STRIKE_MOD.id]);
    const defender = defenderId(opened);
    const played = expectOk(play(opened, P1, 0, defender));
    const countered = expectOk(play(withHand(played, P2, [COUNTER]), P2));
    const drained = resolveOpenChain(countered);
    expect(damage(drained, defender)).toBe(0);

    const hit = declarePowerBomb(powerBombWindow(0, []));
    const passed = pass(hit, P1);
    const armed = withHand(passed, P2, [COUNTER]);
    const onHit = play(armed, P2);
    expect(onHit.ok).toBe(false);
    expect(onHit.state).toBe(armed);

    const exHit = declarePowerBomb(powerBombWindow());
    const exPlayed = expectOk(play(exHit, P1));
    const exPassed = pass(exPlayed, P1);
    const exArmed = withHand(exPassed, P2, [COUNTER]);
    const onEx = play(exArmed, P2);
    expect(onEx.ok).toBe(false);
    expect(onEx.state).toBe(exArmed);
    expect(exArmed.chainStack.every((link) => link.negated === false)).toBe(true);
    expect(meterOf(exArmed, P2)).toBe(0);

    const parryHand = withHand(exPassed, P2, [PARRY]);
    const parried = expectOk(play(parryHand, P2));
    expect(parried.chainStack.some((link) => link.kind === "combat-action" && link.negated)).toBe(
      false,
    );
    expect(parried.chainStack.at(-1)?.cardInstanceId).toBe(handCardIdAt(parryHand, P2, 0));
  });

  it("lets Parry negate the replaced attack without the EX body or a Meter refund", () => {
    const declared = declarePowerBomb(powerBombWindow());
    const n = declared.turn;
    const defender = defenderId(declared);
    const played = expectOk(play(declared, P1));
    const passed = pass(played, P1);
    const slots = slotMap(passed);
    const parried = expectOk(play(withHand(passed, P2, [PARRY]), P2));
    const resolved = resolveOpenChain(parried);

    expect(damage(resolved, defender)).toBe(0);
    expect(slotMap(resolved)).toEqual(slots);
    expect(meterOf(resolved, P1)).toBe(0);
    expect(meterDeltas(resolved, P1)).toEqual([-8]);
    expect(resolved.extraActionPhases).toBe(0);
    expect(resolved.activePlayerId).toBe(P2);
    expect(resolved.phase).toBe("roll");
    expect(resolved.turn).toBe(n + 1);
    expect(resolved.players[P1]?.comboCount).toBe(0);
    for (const creature of Object.values(resolved.creatures)) {
      expect(creature.attackBannedOnTurn).toBeUndefined();
    }

    const bannedTurn = openActions(endSequence(resolved, P2), P1);
    expect(bannedTurn.turn).toBe(n + 2);
    const magnus = fighter(bannedTurn, P1, MAGNUS);
    const jab = show(withActive(bannedTurn, P1, magnus), magnus, JAB);
    const attack = advance(jab, { type: "USE_FACE", playerId: P1, creatureId: magnus });
    expect(attack.ok).toBe(true);
  });

  it("still applies Block to the EX strike", () => {
    const declared = declarePowerBomb(powerBombWindow());
    const defender = defenderId(declared);
    const played = expectOk(play(declared, P1));
    const braced = expectOk(play(withHand(pass(played, P1), P2, [BRACE]), P2));
    const toDefender = pass(braced, P2);
    const resolved = expectOk(
      reduce(toDefender, { type: "PASS_PRIORITY", playerId: P1 }, scriptedRng([0, 3])),
    );
    expect(damage(resolved, defender)).toBe(4);
  });

  it("bans the restricted Fighter on turn + 2 and leaves other attacks legal later", () => {
    const declared = declarePowerBomb(powerBombWindow());
    const n = declared.turn;
    const resolved = resolvePlayed(expectOk(play(declared, P1)), [0, 3]);
    const magnus = fighter(resolved, P1, MAGNUS);
    expect(resolved.creatures[magnus]?.attackBannedOnTurn).toBe(n + 2);
    expect(resolved.turn).toBe(n + 1);
    expect(resolved.activePlayerId).toBe(P2);

    const banned = openActions(endSequence(resolved, P2), P1);
    expect(banned.turn).toBe(n + 2);
    const active = withActive(banned, P1, magnus);
    const jab = show(active, magnus, JAB);
    const face = advance(jab, { type: "USE_FACE", playerId: P1, creatureId: magnus });
    expect(face.ok).toBe(false);
    if (!face.ok) expect(face.error).toBe("ATTACK_BANNED");
    expect(face.state).toBe(jab);

    const ryu = fighter(jab, P1, RYU);
    const techState = show(show(jab, magnus, GRAB), ryu, FOCUS);
    const technique = advance(techState, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: magnus,
      techniqueId: POWER_BOMB,
      secondaryDieId: dieForCreature(techState, ryu)!.id,
    });
    expect(technique.ok).toBe(false);
    if (!technique.ok) expect(technique.error).toBe("ATTACK_BANNED");
    expect(technique.state).toBe(techState);

    const vega = fighter(techState, P1, VEGA);
    const other = show(withActive(techState, P1, vega), vega, JAB);
    const otherHit = expectOk(
      advance(other, { type: "USE_FACE", playerId: P1, creatureId: vega }),
    );
    expect(otherHit.chainStack.some((link) => link.kind === "combat-action")).toBe(true);

    const later = openActions(endSequence(endSequence(banned, P1), P2), P1);
    expect(later.turn).toBe(n + 4);
    const free = show(withActive(later, P1, fighter(later, P1, MAGNUS)), fighter(later, P1, MAGNUS), JAB);
    const freed = expectOk(
      advance(free, {
        type: "USE_FACE",
        playerId: P1,
        creatureId: fighter(free, P1, MAGNUS),
      }),
    );
    const dealt = resolveOpenChain(freed);
    expect(damage(dealt, defenderId(dealt))).toBeGreaterThan(0);
  });

  it("bans a hit Assist on the stamped Fighter", () => {
    const squad = [BAN_FIGHTER, VEGA, RYU] as const;
    const startingDice = [fighterBaseDie(BAN_FIGHTER), fighterBaseDie(VEGA), fighterBaseDie(RYU)];
    const faceDeck = [...new Set(startingDice.flat())];
    const seat = { squad, deck: [] as const, faceDeck, startingDice };
    const match = createMatch({
      matchId: "match-ex-ban",
      seed: 9,
      config: { ...TAG_FIGHTER_RULES, deckMinCards: 0, deckOutEnabled: false },
      players: [
        { id: P1, ...seat },
        { id: P2, ...seat },
      ],
    });
    const opened = openActions(match, P1);
    const bannedFighter = fighter(opened, P1, BAN_FIGHTER);
    const ready = withHand(
      withMeter(show(opened, bannedFighter, HEAVY), P1, 8),
      P1,
      [BAN_EX.id],
    );
    const n = ready.turn;
    const declared = expectOk(
      advance(ready, { type: "USE_FACE", playerId: P1, creatureId: bannedFighter }),
    );
    const resolved = resolvePlayed(expectOk(play(declared, P1)), []);
    expect(resolved.creatures[fighter(resolved, P1, BAN_FIGHTER)]?.attackBannedOnTurn).toBe(n + 2);

    const onBan = openActions(endSequence(resolved, P2), P1);
    const vega = fighter(onBan, P1, VEGA);
    const reserve = withActive(onBan, P1, vega);
    const assist = advance(reserve, {
      type: "ASSIST",
      playerId: P1,
      reserveCreatureId: fighter(reserve, P1, BAN_FIGHTER),
    });
    expect(assist.ok).toBe(false);
    if (!assist.ok) expect(assist.error).toBe("ATTACK_BANNED");
    expect(assist.state).toBe(reserve);
  });

  it("replaces a kick finisher with Air Launcher and grants one extra actions phase", () => {
    const ready = chaseWindow([LAUNCH.id]);
    const declared = declareChase(ready);
    const n = declared.turn;
    const defender = defenderId(declared);
    const alone = resolveOpenChain(declareChase(chaseWindow([])));
    expect(damage(alone, defenderId(alone))).toBe(6);

    const played = expectOk(play(declared, P1));
    expect(meterOf(played, P1)).toBe(0);
    const passed = withDeckTop(pass(played, P1), P1, LAUNCH.id);
    const hand = passed.players[P1]?.hand.length;
    const deck = passed.players[P1]?.deck.length;
    const own = passed.players[P1]?.dieIds ?? [];
    const opponentSlots = slotMap(passed);
    const resolved = expectOk(
      reduce(passed, { type: "PASS_PRIORITY", playerId: P2 }, scriptedRng([0, 1, 4])),
    );

    expect(damage(resolved, defender)).toBe(3);
    expect(own.map((id) => resolved.dice[id]?.rolledSlotIndex)).toEqual([0, 1, 4]);
    for (const [id, slot] of Object.entries(opponentSlots)) {
      if (own.some((dieId) => dieId === id)) continue;
      expect(resolved.dice[id]?.rolledSlotIndex).toBe(slot);
    }
    expect(resolved.activePlayerId).toBe(P1);
    expect(resolved.turn).toBe(n);
    expect(resolved.phase).toBe("actions");
    expect(resolved.offensiveState).toBe("open");
    expect(resolved.aggressorPlayerId).toBe(P1);
    expect(resolved.rerollAvailable).toBe(false);
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.chainStack).toHaveLength(0);
    expect(resolved.extraActionPhases).toBe(0);
    expect(resolved.players[P1]?.hand.length).toBe(hand);
    expect(resolved.players[P1]?.deck.length).toBe(deck);
    expect(
      resolved.log.slice(passed.log.length).some((entry) => entry.event.type === "turn-started"),
    ).toBe(false);
    expect(resolved.log.some((entry) => entry.event.type === "dice-rerolled")).toBe(false);
    expect(resolved.players[P1]?.spentOncePerTurnKeys.includes(TURN_REROLL_KEY)).toBe(false);
    expect(resolved.creatures[fighter(resolved, P1, MAGNUS)]?.attackBannedOnTurn).toBeUndefined();

    const ended = endSequence(resolved, P1);
    expect(ended.activePlayerId).toBe(P2);
    expect(ended.turn).toBe(n + 1);
    expect(ended.phase).toBe("roll");
    expect(ended.extraActionPhases).toBe(0);
  });

  it("accepts a light kick finisher for Air Launcher and still passes the turn for Crushing Throw", () => {
    const opened = actions();
    const vega = fighter(opened, P1, VEGA);
    const die = dieForCreature(opened, vega);
    if (die === undefined) throw new Error("die");
    const slots = die.slots.map((slot, index) =>
      index === 0 ? { ...slot, faceCardId: LIGHT_KICK.id } : slot,
    );
    const shown = {
      ...opened,
      dice: { ...opened.dice, [die.id]: { ...die, slots, rolledSlotIndex: 0 } },
    };
    const ready = withHand(withMeter(shown, P1, 8), P1, [LAUNCH.id]);
    const declared = expectOk(advance(ready, { type: "USE_FACE", playerId: P1, creatureId: vega }));
    expect(declared.chainStack[0]).toMatchObject({
      hitType: "kick",
      hitStrength: "light",
      sequenceRole: "finisher",
    });
    const played = expectOk(play(declared, P1));
    expect(played.chainStack[0]?.exReplaced).toBe(true);

    const punch = declarePowerBomb(powerBombWindow(8, [LAUNCH.id]));
    const refused = play(punch, P1);
    expect(refused.ok).toBe(false);
    expect(refused.state).toBe(punch);

    const crushing = resolvePlayed(expectOk(play(declarePowerBomb(powerBombWindow()), P1)), [0, 3]);
    expect(crushing.activePlayerId).toBe(P2);
    expect(crushing.phase).toBe("roll");
    expect(crushing.turn).toBe(2);
    expect(crushing.extraActionPhases).toBe(0);
  });

  it("lets a heavy punch from another Fighter match Crushing Throw", () => {
    const opened = actions();
    const ryu = fighter(opened, P1, RYU);
    const ready = withHand(withMeter(show(withActive(opened, P1, ryu), ryu, CHARGE), P1, 8), P1, [
      THROW.id,
    ]);
    const declared = expectOk(advance(ready, { type: "USE_FACE", playerId: P1, creatureId: ryu }));
    const defender = defenderId(declared);
    const played = expectOk(play(declared, P1));
    expect(played.chainStack[0]?.exReplaced).toBe(true);
    const resolved = resolvePlayed(played, [0, 3]);
    expect(damage(resolved, defender)).toBe(6);
    expect(meterOf(resolved, P1)).toBe(0);
    expect(resolved.activePlayerId).toBe(P2);
  });

  it("does not spend a queued extra actions phase on END_TURN", () => {
    const opened = actions();
    const queued = { ...opened, extraActionPhases: 1 };
    const ended = expectOk(advance(queued, { type: "END_TURN", playerId: P1 }));
    expect(ended.extraActionPhases).toBe(1);
    expect(ended.turn).toBe(opened.turn + 1);
    expect(ended.activePlayerId).toBe(P2);
    expect(ended.phase).toBe("roll");
  });

  it("deals 6, not 5 or 11, when Crushing Throw replaces Magnus Heavy", () => {
    const opened = actions();
    const magnus = fighter(opened, P1, MAGNUS);
    const ready = withHand(
      withMeter(show(withActive(opened, P1, magnus), magnus, HEAVY), P1, 8),
      P1,
      [THROW.id],
    );
    const declared = expectOk(
      advance(ready, { type: "USE_FACE", playerId: P1, creatureId: magnus }),
    );
    const resolved = resolvePlayed(expectOk(play(declared, P1)), [0, 3]);
    expect(damage(resolved, defenderId(declared))).toBe(6);
  });
});
