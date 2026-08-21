import { describe, expect, it } from "vitest";
import { DEN_SHARE, DRESS_RANKS, SHARE_THE_KILL } from "../content/cards.js";
import { PACK_SHARE } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asSymbolInstanceId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { equipmentOf, graveyardOf } from "../rules/cards.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function showingFace(state: GameState, faceCardId: FaceCardId): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  const slots = die.slots.map((slot, index) =>
    index === 0 ? { ...slot, faceCardId, faceCardOwnerId: P1 } : slot,
  );
  let next: GameState = {
    ...state,
    dice: { ...state.dice, [dieId]: { ...die, slots } },
  };
  next = withDie(next, dieId, { retained: true, rolledSlotIndex: 0 });
  next = withDie(next, dieIdOf(next, P1, 1), { retained: true, rolledSlotIndex: 1 });
  return next;
}

describe("Share the Kill", () => {
  it("moves 1 token from one ally to another", () => {
    const ready = actionsReady([SHARE_THE_KILL]);
    const sourceId = creatureIdAt(ready, P1, 0);
    const destId = creatureIdAt(ready, P1, 1);
    const fueled = withTokens(withTokens(ready, sourceId, { martial: 2 }), destId, { wild: 1 });
    const played = expectOk(
      advance(fueled, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(fueled, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-creature");
    const afterFrom = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: sourceId,
      }),
    );
    expect(afterFrom.pendingDecision?.type).toBe("choose-creature");
    const after = expectOk(
      advance(afterFrom, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: destId,
      }),
    );
    expect(after.creatures[sourceId]?.attributeTokens).toEqual({ martial: 1 });
    expect(after.creatures[destId]?.attributeTokens).toEqual({ wild: 1, martial: 1 });
    expect(eventTypes(after)).toContain("attribute-tokens-moved");
    expect(graveyardOf(after, P1).some((card) => card.cardId === SHARE_THE_KILL)).toBe(true);
  });

  it("opens a token pick when the source holds a mixed leftover pile", () => {
    const ready = actionsReady([SHARE_THE_KILL]);
    const sourceId = creatureIdAt(ready, P1, 0);
    const destId = creatureIdAt(ready, P1, 1);
    const fueled = withTokens(ready, sourceId, { martial: 1, wild: 1 });
    const played = expectOk(
      advance(fueled, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(fueled, P1, 0),
      }),
    );
    const afterFrom = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: sourceId,
      }),
    );
    const afterDest = expectOk(
      advance(afterFrom, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: destId,
      }),
    );
    expect(afterDest.pendingDecision?.type).toBe("choose-attribute-tokens");
    if (afterDest.pendingDecision?.type !== "choose-attribute-tokens") return;
    expect(afterDest.pendingDecision.mode).toBe("transfer");
    const after = expectOk(
      advance(afterDest, {
        type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS",
        playerId: P1,
        discarded: { wild: 1 },
      }),
    );
    expect(after.creatures[sourceId]?.attributeTokens).toEqual({ martial: 1 });
    expect(after.creatures[destId]?.attributeTokens).toEqual({ wild: 1 });
  });

  it("whiffs when no ally holds tokens", () => {
    const ready = actionsReady([SHARE_THE_KILL]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision).toBeNull();
    expect(eventTypes(after)).not.toContain("attribute-tokens-moved");
  });

  it("does not allow an enemy destination", () => {
    const ready = actionsReady([SHARE_THE_KILL]);
    const sourceId = creatureIdAt(ready, P1, 0);
    const enemyId = creatureIdAt(ready, P2, 0);
    const fueled = withTokens(ready, sourceId, { martial: 1 });
    const played = expectOk(
      advance(fueled, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(fueled, P1, 0),
      }),
    );
    const afterFrom = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: sourceId,
      }),
    );
    const refused = advance(afterFrom, {
      type: "RESOLVE_CHOOSE_CREATURE",
      playerId: P1,
      creatureId: enemyId,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_CHOICE");
  });
});

describe("Den Share", () => {
  it("copies 1 token from the bearer onto another ally on absorb Wild once per turn", () => {
    const base = actionsReady([DEN_SHARE]);
    const bearerId = creatureIdAt(base, P1, 0);
    const destId = creatureIdAt(base, P1, 1);
    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    expect(equipmentOf(equipped, P1)).toHaveLength(1);
    const fueled = withTokens(equipped, bearerId, { wild: 1 });
    const symbolId = asSymbolInstanceId("sym-wild-den");
    const withSymbol: GameState = {
      ...fueled,
      symbols: {
        ...fueled.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "wild",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const absorbed = expectOk(
      advance(withPhase(withSymbol, "actions"), {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: bearerId,
        symbolId,
      }),
    );
    expect(absorbed.pendingDecision?.type).toBe("choose-creature");
    const after = expectOk(
      advance(absorbed, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: destId,
      }),
    );
    expect(after.creatures[bearerId]?.attributeTokens.wild).toBe(1);
    expect(after.creatures[destId]?.attributeTokens.wild).toBe(1);
    const moved = after.log.filter((entry) => entry.event.type === "attribute-tokens-moved");
    expect(moved.some((entry) => entry.event.type === "attribute-tokens-moved" && entry.event.copy)).toBe(
      true,
    );
  });
});

describe("Pack Share", () => {
  it("copies 1 token onto an adjacent ally on absorb", () => {
    let state = showingFace(actionsReady([]), PACK_SHARE);
    const absorberId = creatureIdAt(state, P1, 1);
    const neighborId = creatureIdAt(state, P1, 0);
    state = withTokens(state, absorberId, { martial: 1 });
    const symbolId = asSymbolInstanceId("sym-pack-share");
    state = {
      ...state,
      symbols: {
        ...state.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "wild",
          status: "rolled",
          sourceDieId: dieIdOf(state),
          absorbedByCreatureId: null,
        },
      },
    };
    const absorbed = expectOk(
      advance(withPhase(state, "actions"), {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: absorberId,
        symbolId,
      }),
    );
    expect(absorbed.pendingDecision?.type).toBe("choose-creature");
    const after = expectOk(
      advance(absorbed, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: neighborId,
      }),
    );
    expect(after.creatures[absorberId]?.attributeTokens).toEqual({ martial: 1 });
    expect(after.creatures[neighborId]?.attributeTokens).toEqual({ martial: 1 });
  });
});

describe("Dress Ranks", () => {
  it("repositions a chosen allied creature", () => {
    const ready = actionsReady([DRESS_RANKS]);
    const allyId = creatureIdAt(ready, P1, 0);
    expect(ready.creatures[allyId]?.position).toBe("frontline");
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-creature");
    const after = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );
    expect(after.creatures[allyId]?.position).toBe("back");
  });
});
