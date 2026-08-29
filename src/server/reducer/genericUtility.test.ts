import { describe, expect, it } from "vitest";
import {
  ADRENALINE,
  COMBO_MECHANICAL_DECK,
  BURN_DECK,
  CONTROL_DECK,
  ECLIPSE,
  MUTANT_SPORES,
  PROTOTYPE_DECK,
  RAISE_GUARD,
  RETHROW,
  SECOND_WIND,
  SIDESTEP,
  SIFT,
  TEMPO_DECK,
  TOXIC_HEART,
  WARDING_CHARM,
} from "../content/cards.js";
import { faceIdForSymbol } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asAttackId, asSymbolInstanceId, type DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf, handOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withEnergy,
  withHand,
  withPhase,
  withTokens,
  advanceResolvingChain as play,
} from "../testing/scenario.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function withUniformSlots(state: GameState, dieId: DieId): GameState {
  const die = state.dice[dieId];
  if (die === undefined || die.rolledSlotIndex === null) throw new Error("test: die not rolled");
  const showing = die.slots[die.rolledSlotIndex];
  if (showing === undefined) throw new Error("test: missing slot");
  return {
    ...state,
    dice: { ...state.dice, [dieId]: { ...die, slots: die.slots.map(() => ({ ...showing })) } },
  };
}

function seedDeck(state: GameState, fromHandIndexes: readonly number[]): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("test: no player");
  const deckIds = fromHandIndexes.map((index) => handCardIdAt(state, P1, index));
  const cards = { ...state.cards };
  for (const id of deckIds) {
    const card = cards[id];
    if (card === undefined) throw new Error("test: missing card");
    cards[id] = { ...card, zone: "deck" };
  }
  const keep = player.hand.filter((id) => !deckIds.includes(id));
  return {
    ...state,
    cards,
    players: { ...state.players, [P1]: { ...player, hand: keep, deck: deckIds } },
  };
}

describe("generic utility toolkit", () => {
  it("keeps Martial Raise Guard and Arcane dig off Aggro / Tempo / Combo", () => {
    const ids = new Set([
      ...PROTOTYPE_DECK,
      ...TEMPO_DECK,
      ...COMBO_MECHANICAL_DECK,
    ]);
    for (const id of [RAISE_GUARD, RETHROW, SIFT, SECOND_WIND, WARDING_CHARM]) {
      expect(ids.has(id), `${id} should not be in Aggro/Tempo/Combo`).toBe(false);
    }
  });

  it("homes Warding Charm on Control and Sidestep on Tempo / Combo for legendary defense", () => {
    expect(new Set(CONTROL_DECK).has(WARDING_CHARM)).toBe(true);
    expect(new Set(CONTROL_DECK).has(SIDESTEP)).toBe(false);
    expect(new Set(CONTROL_DECK).has(RAISE_GUARD)).toBe(false);
    expect(new Set(TEMPO_DECK).has(SIDESTEP)).toBe(true);
    expect(new Set(COMBO_MECHANICAL_DECK).has(SIDESTEP)).toBe(true);
  });

  it("uses Toxic Heart / Mutant Spores on Burn for survive (not Martial Raise Guard)", () => {
    const ids = new Set(BURN_DECK);
    expect(ids.has(RAISE_GUARD)).toBe(false);
    expect(ids.has(SIDESTEP)).toBe(false);
    expect(ids.has(WARDING_CHARM)).toBe(false);
    expect(ids.has(TOXIC_HEART)).toBe(true);
    expect(ids.has(MUTANT_SPORES)).toBe(true);
  });
});

describe("Raise Guard", () => {
  it("grants 2 Shield to a chosen ally", () => {
    const ready = actionsReady([RAISE_GUARD]);
    const allyId = creatureIdAt(ready, P1, 0);
    const played = expectOk(
      play(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-creature");
    const after = expectOk(
      play(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );
    expect(after.creatures[allyId]?.shields).toBe(2);
  });
});

describe("Sidestep", () => {
  it("prevents the next attack on the chain target", () => {
    const combat = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(combat, P1, 0);
    const target = creatureIdAt(combat, P2, 0);
    const armed = withHand(withEnergy(withTokens(combat, attacker, { martial: 1 }), P2, 10), P2, [
      SIDESTEP,
    ]);
    const opened = expectOk(
      advance(armed, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: HEAVY_AXE,
        targetId: target,
      }),
    );
    const stepped = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(stepped);
    expect(resolved.creatures[target]?.damage).toBe(0);
    expect(resolved.creatures[target]?.attackPreventCount).toBe(0);
  });
});

describe("Rethrow", () => {
  it("opens a rolled-die choice then an optional reroll with no same-face damage", () => {
    const rolled = expectOk(advance(newMatch(), { type: "ROLL_DICE", playerId: P1 }));
    const ready = withEnergy(withHand(rolled, P1, [RETHROW]), P1, 10);
    const dieId = dieIdOf(ready);
    const played = expectOk(
      play(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-die");
    const chosen = expectOk(
      play(played, { type: "RESOLVE_CHOOSE_DIE", playerId: P1, dieId }),
    );
    expect(chosen.pendingDecision?.type).toBe("optional-reroll");

    const uniform = withUniformSlots(chosen, dieId);
    const allyA = creatureIdAt(uniform, P1, 0);
    const allyB = creatureIdAt(uniform, P1, 1);
    const after = expectOk(
      play(uniform, { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: true }),
    );
    expect(after.creatures[allyA]?.damage).toBe(0);
    expect(after.creatures[allyB]?.damage).toBe(0);
    expect(after.pendingDecision).toBeNull();
  });

  it("lets the controller decline the reroll", () => {
    const rolled = expectOk(advance(newMatch(), { type: "ROLL_DICE", playerId: P1 }));
    const ready = withEnergy(withHand(rolled, P1, [RETHROW]), P1, 10);
    const dieId = dieIdOf(ready);
    const slotBefore = ready.dice[dieId]?.rolledSlotIndex;
    const played = expectOk(
      play(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const chosen = expectOk(
      play(played, { type: "RESOLVE_CHOOSE_DIE", playerId: P1, dieId }),
    );
    const after = expectOk(
      play(chosen, { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: false }),
    );
    expect(after.dice[dieId]?.rolledSlotIndex).toBe(slotBefore);
  });
});

describe("Adrenaline reroll punishment", () => {
  it("still deals 1 to two allies when the reroll shows the same face", () => {
    const ready = actionsReady([ADRENALINE]);
    const attached = expectOk(
      play(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: faceIdForSymbol("wild"),
      }),
    );
    let toRoll = withPhase(attached, "roll");
    toRoll = withDie(toRoll, dieIdOf(toRoll, P1, 0), { retained: true, rolledSlotIndex: 1 });
    toRoll = withDie(toRoll, dieIdOf(toRoll, P1, 1), { retained: true, rolledSlotIndex: 0 });
    const afterRoll = expectOk(advance(toRoll, { type: "ROLL_DICE", playerId: P1 }));
    expect(afterRoll.pendingDecision?.type).toBe("optional-reroll");

    const dieId = dieIdOf(afterRoll);
    const uniform = withUniformSlots(afterRoll, dieId);
    const after = expectOk(
      advance(uniform, { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: true }),
    );
    const damages = [creatureIdAt(after, P1, 0), creatureIdAt(after, P1, 1)].map(
      (id) => after.creatures[id]?.damage ?? 0,
    );
    expect(damages.reduce((sum, n) => sum + n, 0)).toBe(2);
  });
});

describe("Sift", () => {
  it("puts one of the top two into hand and the rest on the bottom", () => {
    const ready = seedDeck(actionsReady([SIFT, ECLIPSE, ECLIPSE]), [1, 2]);
    const top = ready.players[P1]?.deck[0];
    const second = ready.players[P1]?.deck[1];
    if (top === undefined || second === undefined) throw new Error("test: expected two deck cards");
    const played = expectOk(
      play(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision).toMatchObject({
      type: "look-top-deck",
      cardInstanceIds: [top, second],
    });
    const after = expectOk(
      play(played, { type: "RESOLVE_LOOK_TOP_DECK", playerId: P1, keepId: second }),
    );
    expect(handOf(after, P1).map((card) => card.id)).toContain(second);
    expect(after.players[P1]?.deck.at(-1)).toBe(top);
    expect(graveyardOf(after, P1).some((card) => card.cardId === SIFT)).toBe(true);
  });
});

describe("Second Wind", () => {
  it("offers a peek when the deck has a card", () => {
    const ready = seedDeck(actionsReady([SECOND_WIND, ECLIPSE]), [1]);
    const played = expectOk(
      play(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.players[P1]?.attributePool.arcane).toBe(8);
    expect(played.pendingDecision?.type).toBe("peek-deck");
    const after = expectOk(
      play(played, { type: "RESOLVE_PEEK_DECK", playerId: P1, putOnBottom: true }),
    );
    expect(after.pendingDecision).toBeNull();
    expect(after.players[P1]?.deck.at(-1)).toBeDefined();
  });
});

describe("Warding Charm", () => {
  it("grants 1 Shield on the first absorb each turn", () => {
    const ready = actionsReady([WARDING_CHARM]);
    const hostId = creatureIdAt(ready, P1, 0);
    const equipped = expectOk(
      play(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredTargetCreatureId: hostId,
      }),
    );
    const firstId = asSymbolInstanceId("sym-warding-1");
    const secondId = asSymbolInstanceId("sym-warding-2");
    const withPool: GameState = {
      ...equipped,
      phase: "actions",
      symbols: {
        ...equipped.symbols,
        [firstId]: {
          id: firstId,
          ownerId: P1,
          symbol: "martial",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
        [secondId]: {
          id: secondId,
          ownerId: P1,
          symbol: "wild",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const afterFirst = expectOk(
      play(withPool, { type: "ABSORB_SYMBOL", playerId: P1, creatureId: hostId, symbolId: firstId }),
    );
    expect(afterFirst.creatures[hostId]?.shields).toBe(1);
    const afterSecond = expectOk(
      play(afterFirst, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: hostId,
        symbolId: secondId,
      }),
    );
    expect(afterSecond.creatures[hostId]?.shields).toBe(1);
  });
});
