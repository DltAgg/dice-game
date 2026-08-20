import { describe, expect, it } from "vitest";
import {
  ECLIPSE,
  LIVING_LIBRARY,
  RATCHET,
  RECALIBRATE,
  WAR_AXE,
  getCard,
} from "../content/cards.js";
import { SHADOW_ECHO } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { CardId, DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { replayableGraveyardTactics, ritualsOf, searchableInGraveyard } from "../rules/cards.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: readonly CardId[], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function moveHandCardsToGraveyard(
  state: GameState,
  ids: readonly ReturnType<typeof handCardIdAt>[],
): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("test: no player");
  const idSet = new Set(ids);
  return {
    ...state,
    cards: Object.fromEntries(
      Object.entries(state.cards).map(([id, card]) => [
        id,
        idSet.has(card.id) ? { ...card, zone: "graveyard" as const } : card,
      ]),
    ),
    players: {
      ...state.players,
      [P1]: {
        ...player,
        hand: player.hand.filter((id) => !idSet.has(id)),
        graveyard: [...player.graveyard, ...ids],
      },
    },
  };
}

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

function installFace(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  const slots = die.slots.map((s, index) =>
    index === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollShowingSlot(state: GameState, slot: number): GameState {
  let rolled: GameState = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: slot });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("pending source + GY search filter", () => {
  it("Recalibrate GY search lists only cost ≤ maxEnergyCost and attributes the Recalibrate instance", () => {
    let ready = actionsReady([RECALIBRATE, RATCHET, ECLIPSE]);
    const recalibrateId = handCardIdAt(ready, P1, 0);
    const cheapId = handCardIdAt(ready, P1, 1);
    const eclipseId = handCardIdAt(ready, P1, 2);
    ready = moveHandCardsToGraveyard(ready, [cheapId, eclipseId]);

    const after = expectOk(
      advance(ready, { type: "PLAY_CARD", playerId: P1, cardInstanceId: recalibrateId }),
    );

    expect(after.pendingDecision).toMatchObject({
      type: "search-graveyard",
      controllerId: P1,
      amount: 1,
      maxEnergyCost: 2,
      sourceCardInstanceId: recalibrateId,
      sourceFaceCardId: null,
    });

    expect(after.cards[recalibrateId]?.cardId).toBe(RECALIBRATE);

    const pending = after.pendingDecision;
    if (pending?.type !== "search-graveyard") throw new Error("expected GY search");
    const eligible = searchableInGraveyard(after, P1, pending.maxEnergyCost);
    expect(eligible).toEqual([cheapId]);
    expect(eligible).not.toContain(eclipseId);
    expect(eligible).not.toContain(recalibrateId);

    const rejected = advance(after, {
      type: "RESOLVE_SEARCH",
      playerId: P1,
      cardInstanceIds: [eclipseId],
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe("INVALID_SEARCH");

    const resolved = expectOk(
      advance(after, {
        type: "RESOLVE_SEARCH",
        playerId: P1,
        cardInstanceIds: [cheapId],
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.players[P1]?.hand).toContain(cheapId);
  });

  it("Living Library deck search attributes the ritual instance and keeps the Instant/Ritual filter", () => {
    const base = actionsReady([LIVING_LIBRARY, ECLIPSE, WAR_AXE, LIVING_LIBRARY]);
    const player = base.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const [ritualHand, ...deckIds] = player.hand;
    if (ritualHand === undefined) throw new Error("test: no ritual");
    const seeded = {
      ...base,
      cards: Object.fromEntries(
        Object.entries(base.cards).map(([id, card]) => [
          id,
          deckIds.includes(card.id) ? { ...card, zone: "deck" as const } : card,
        ]),
      ),
      players: {
        ...base.players,
        [P1]: { ...player, hand: [ritualHand], deck: deckIds },
      },
    };

    const placed = expectOk(
      advance(seeded, { type: "PLAY_CARD", playerId: P1, cardInstanceId: ritualHand }),
    );
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const oriented = {
      ...withSymbols(withPhase(placed, "actions"), P1, ["arcane", "arcane"]),
      cards: {
        ...placed.cards,
        [ritualId]: {
          ...placed.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
    };

    const activated = expectOk(
      advance(oriented, { type: "ACTIVATE_RITUAL", playerId: P1, cardInstanceId: ritualId }),
    );
    expect(activated.pendingDecision).toEqual({
      type: "search-deck",
      controllerId: P1,
      amount: 2,
      filter: ["instant", "ritual"],
      sourceCardInstanceId: ritualId,
      sourceFaceCardId: null,
    });
    expect(activated.cards[ritualId]?.cardId).toBe(LIVING_LIBRARY);
  });

  it("Shadow Echo on-absorb GY search attributes the face, not a card", () => {
    let state = actionsReady([RATCHET, ECLIPSE]);
    const cheapId = handCardIdAt(state, P1, 0);
    const eclipseId = handCardIdAt(state, P1, 1);
    state = moveHandCardsToGraveyard(state, [cheapId, eclipseId]);
    state = installFace(state, SHADOW_ECHO);
    state = rollShowingSlot(state, 0);

    const darkness = Object.values(state.symbols).find(
      (s) => s.symbol === "darkness" && s.status === "rolled" && s.sourceDieId === dieIdOf(state),
    );
    if (darkness === undefined) throw new Error("expected darkness pip");

    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(state, P1, 0),
        symbolId: darkness.id,
      }),
    );

    expect(after.pendingDecision).toMatchObject({
      type: "search-graveyard",
      controllerId: P1,
      amount: 1,
      maxEnergyCost: 2,
      sourceCardInstanceId: null,
      sourceFaceCardId: SHADOW_ECHO,
    });
    const pending = after.pendingDecision;
    if (pending?.type !== "search-graveyard") throw new Error("expected GY search");
    expect(searchableInGraveyard(after, P1, pending.maxEnergyCost)).toEqual([cheapId]);
  });

  it("replayableGraveyardTactics lists only instant/ritual cards with modelled effects", () => {
    const ready = actionsReady([ECLIPSE, WAR_AXE, LIVING_LIBRARY]);
    const eclipseId = handCardIdAt(ready, P1, 0);
    const axeId = handCardIdAt(ready, P1, 1);
    const libraryId = handCardIdAt(ready, P1, 2);
    const gy = moveHandCardsToGraveyard(ready, [eclipseId, axeId, libraryId]);

    expect(getCard(WAR_AXE)?.type).toBe("equipment");
    expect(replayableGraveyardTactics(gy, P1)).toEqual([eclipseId, libraryId]);
  });
});
