import { describe, expect, it } from "vitest";
import {
  CINERARY_LOCKET,
  ECHO_OF_THE_BURIED,
  FORESIGHT_TITHE,
  GLOOMDRAFT,
  HOLLOW_TIDE,
  NIGHTMARROW_PACT,
  PALL_OF_ASH,
  RIFTMARK,
  SEALBIND_RUNE,
  THREAD_THE_WEAVE,
  UNWRITE,
} from "../content/cards.js";
import {
  DUSKTHRONE_ORACLE,
  GRAVEMARROW_SHADE,
  RIFTSCRIBE_ADEPT,
  TEMPO_SQUAD,
} from "../content/creatures.js";
import { ENGINE_TEST_FACE_DECK } from "../content/faces.js";
import type { CardInstance } from "../model/cards.js";
import { asAttackId, asCardInstanceId, type CardId, type PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf, replayableGraveyardTactics, ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  advanceResolvingChain,
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withActivePlayer,
  withAttributePool,
  withDamage,
  withPile,
  withHand,
  withPhase,
} from "../testing/scenario.js";

const CONTROL_SQUAD_DEFS = [RIFTSCRIBE_ADEPT, GRAVEMARROW_SHADE, DUSKTHRONE_ORACLE] as const;

/** Both seats run the Control squad so Arcane / Darkness hosts and targets exist. */
function controlMatch(): GameState {
  return newMatch({
    players: [
      { id: P1, squad: CONTROL_SQUAD_DEFS, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      { id: P2, squad: CONTROL_SQUAD_DEFS, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
    ],
  });
}

/** Stocks a library without shuffling, so mill and Insight counts are exact. */
function withDeck(state: GameState, playerId: PlayerId, cardIds: readonly CardId[]): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error(`unknown player ${playerId}`);
  const instances: Record<string, CardInstance> = {};
  const deck = cardIds.map((cardId, index) => {
    const id = asCardInstanceId(
      `given-${playerId}-deck-${String(Object.keys(state.cards).length + index)}-${cardId}`,
    );
    instances[id] = {
      id,
      cardId,
      ownerId: playerId,
      zone: "deck",
      attachedToCreatureId: null,
      attachedToFaceCardId: null,
      ritualOrientation: null,
    };
    return id;
  });
  return {
    ...state,
    cards: { ...state.cards, ...instances },
    players: { ...state.players, [playerId]: { ...player, deck } },
  };
}

const readyToPlay = (cards: readonly CardId[]): GameState =>
  withPile(withHand(withPhase(controlMatch(), "actions"), P1, cards), P1, 10);

/** Places a ritual from hand and forces it ready, skipping the pile ramp. */
function placedRitualReady(state: GameState, playerId: PlayerId): GameState {
  const placed = resolveOpenChain(
    expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId,
        cardInstanceId: handCardIdAt(state, playerId, 0),
      }),
    ),
  );
  const ritual = ritualsOf(placed, playerId)[0];
  if (ritual === undefined) throw new Error("ritual was not placed");
  return {
    ...placed,
    cards: {
      ...placed.cards,
      [ritual.id]: { ...ritual, ritualOrientation: "ready" as const },
    },
  };
}

describe("Arcane Control package", () => {
  it("Thread the Weave opens an Insight look at the top of the deck", () => {
    const ready = withDeck(readyToPlay([THREAD_THE_WEAVE]), P1, [
      HOLLOW_TIDE,
      GLOOMDRAFT,
      PALL_OF_ASH,
    ]);
    const played = advanceResolvingChain(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    });
    const state = expectOk(played);
    expect(state.pendingDecision?.type).toBe("look-top-deck");
  });

  it("Riftmark drains an enemy into the most damaged ally", () => {
    const base = readyToPlay([RIFTMARK]);
    const ally = creatureIdAt(base, P1, 0);
    const enemy = creatureIdAt(base, P2, 0);
    const ready = withDamage(base, ally, 3);
    let state = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(state.pendingDecision?.type).toBe("choose-creature");
    state = resolveOpenChain(
      expectOk(
        advance(state, { type: "RESOLVE_CHOOSE_CREATURE", playerId: P1, creatureId: enemy }),
      ),
    );
    expect(state.creatures[enemy]?.damage).toBe(2);
    expect(state.creatures[ally]?.damage).toBe(1);
  });

  it("Unwrite destroys a ritual the opponent controls", () => {
    const opponentRitual = withActivePlayer(
      withPile(withHand(withPhase(controlMatch(), "actions"), P2, [FORESIGHT_TITHE]), P2, 10),
      P2,
    );
    const placed = resolveOpenChain(
      expectOk(
        advance(opponentRitual, {
          type: "PLAY_CARD",
          playerId: P2,
          cardInstanceId: handCardIdAt(opponentRitual, P2, 0),
        }),
      ),
    );
    const ritualId = ritualsOf(placed, P2)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual was not placed");

    const ready = withActivePlayer(withPile(withHand(placed, P1, [UNWRITE]), P1, 10), P1);
    let state = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(state.pendingDecision?.type).toBe("choose-ritual");
    state = resolveOpenChain(
      expectOk(
        advance(state, { type: "RESOLVE_CHOOSE_RITUAL", playerId: P1, cardInstanceId: ritualId }),
      ),
    );
    expect(ritualsOf(state, P2)).toHaveLength(0);
    expect(graveyardOf(state, P2).some((card) => card.id === ritualId)).toBe(true);
  });

  it("Sealbind Rune negates a ritual on the chain", () => {
    const ready = withPile(
      withHand(withPile(withHand(withPhase(controlMatch(), "actions"), P1, [NIGHTMARROW_PACT]), P1, 10), P2, [
        SEALBIND_RUNE,
      ]),
      P2,
      10,
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const answered = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(answered);
    expect(eventTypes(resolved)).toContain("chain-link-negated");
    expect(ritualsOf(resolved, P1)).toHaveLength(0);
  });
});

describe("Darkness Control package", () => {
  it("Hollow Tide strikes every living enemy for 3", () => {
    const ready = readyToPlay([HOLLOW_TIDE]);
    const frontA = creatureIdAt(ready, P2, 0);
    const frontB = creatureIdAt(ready, P2, 1);
    const back = creatureIdAt(ready, P2, 2);
    const state = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(state.pendingDecision).toBeNull();
    expect(state.creatures[frontA]?.damage).toBe(3);
    expect(state.creatures[frontB]?.damage).toBe(3);
    expect(state.creatures[back]?.damage).toBe(3);
  });

  it("Pall of Ash strikes a chosen enemy for 3", () => {
    const ready = readyToPlay([PALL_OF_ASH]);
    const enemy = creatureIdAt(ready, P2, 1);
    let state = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    state = resolveOpenChain(
      expectOk(
        advance(state, { type: "RESOLVE_CHOOSE_CREATURE", playerId: P1, creatureId: enemy }),
      ),
    );
    expect(state.creatures[enemy]?.damage).toBe(3);
  });

  it("Nightmarrow Pact generates Darkness when its controller discards", () => {
    const pactReady = placedRitualReady(readyToPlay([NIGHTMARROW_PACT]), P1);
    const withDraws = withDeck(withHand(pactReady, P1, [GLOOMDRAFT]), P1, [
      HOLLOW_TIDE,
      PALL_OF_ASH,
    ]);
    const played = expectOk(
      advanceResolvingChain(withDraws, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(withDraws, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("discard-cards");
    const toDiscard = played.players[P1]?.hand[0];
    if (toDiscard === undefined) throw new Error("nothing to discard");
    const before = played.players[P1]?.attributePool.darkness ?? 0;
    const discarded = resolveOpenChain(
      expectOk(
        advance(played, {
          type: "RESOLVE_DISCARD",
          playerId: P1,
          cardInstanceIds: [toDiscard],
        }),
      ),
    );
    expect(discarded.players[P1]?.attributePool.darkness ?? 0).toBe(before + 1);
  });

  it("Echo of the Buried replays an Instant from the graveyard", () => {
    const spent = withPile(
      withHand(withPhase(controlMatch(), "actions"), P1, [HOLLOW_TIDE]),
      P1,
      10,
    );
    const afterMill = expectOk(
      advanceResolvingChain(withDeck(spent, P2, [GLOOMDRAFT, GLOOMDRAFT, PALL_OF_ASH]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(spent, P1, 0),
      }),
    );
    const ready = withPile(withHand(afterMill, P1, [ECHO_OF_THE_BURIED]), P1, 10);
    const played = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("replay-graveyard-tactic");
    const echo = graveyardOf(played, P1).find((card) => card.cardId === ECHO_OF_THE_BURIED);
    const source =
      played.pendingDecision?.type === "replay-graveyard-tactic"
        ? played.pendingDecision.sourceCardInstanceId
        : null;
    expect(echo?.id).toBe(source);
    expect(replayableGraveyardTactics(played, P1, source)).not.toContain(echo?.id);
  });

  it("Cinerary Locket only equips Arcane or Darkness creatures", () => {
    const tempoHost = newMatch({
      players: [
        { id: P1, squad: TEMPO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
        { id: P2, squad: TEMPO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      ],
    });
    const ready = withPile(
      withHand(withPhase(tempoHost, "actions"), P1, [CINERARY_LOCKET]),
      P1,
      10,
    );
    const refused = advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
      declaredTargetCreatureId: creatureIdAt(ready, P1, 0),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_TARGET");

    const controlReady = readyToPlay([CINERARY_LOCKET]);
    const accepted = advance(controlReady, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(controlReady, P1, 0),
      declaredTargetCreatureId: creatureIdAt(controlReady, P1, 0),
    });
    expect(accepted.ok).toBe(true);
  });

  it("Duskthrone Oracle is the Control squad's legendary win target", () => {
    const state = controlMatch();
    const legendary = Object.values(state.creatures).find(
      (creature) => creature.definitionId === DUSKTHRONE_ORACLE,
    );
    expect(legendary).toBeDefined();
    expect(legendary?.position).toBe("back");
  });

  it("Grave Reach and Ley Surge spend pile without refunding the spent attribute", () => {
    const GRAVE_REACH = asAttackId("attack-gravemarrow-shade-grave-reach");
    const LEY_SURGE = asAttackId("attack-riftscribe-adept-ley-surge");
    let state = withAttributePool(withPhase(controlMatch(), "actions"), P1, {
      arcane: 1,
      darkness: 2,
    });
    state = withDeck(state, P2, [GLOOMDRAFT, PALL_OF_ASH, HOLLOW_TIDE]);
    state = withDeck(state, P1, [THREAD_THE_WEAVE, HOLLOW_TIDE, PALL_OF_ASH]);

    const shade = Object.values(state.creatures).find(
      (creature) => creature.definitionId === GRAVEMARROW_SHADE && creature.ownerId === P1,
    );
    const adept = Object.values(state.creatures).find(
      (creature) => creature.definitionId === RIFTSCRIBE_ADEPT && creature.ownerId === P1,
    );
    const target = Object.values(state.creatures).find(
      (creature) => creature.ownerId === P2 && creature.position === "frontline",
    );
    if (shade === undefined || adept === undefined || target === undefined) {
      throw new Error("expected Control frontline attackers and a frontline target");
    }

    state = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: shade.id,
        attackId: GRAVE_REACH,
        targetId: target.id,
      }),
    );
    expect(state.players[P1]?.attributePool.darkness ?? 0).toBe(1);
    expect(state.players[P1]?.attributePool.arcane ?? 0).toBe(1);
    expect(state.players[P2]?.deck).toHaveLength(1);

    state = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: adept.id,
        attackId: LEY_SURGE,
        targetId: target.id,
      }),
    );
    expect(state.players[P1]?.attributePool.arcane ?? 0).toBe(0);
    expect(state.players[P1]?.attributePool.darkness ?? 0).toBe(1);
    expect(state.pendingDecision?.type).toBe("look-top-deck");
  });
});
