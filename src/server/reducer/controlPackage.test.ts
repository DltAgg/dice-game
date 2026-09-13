import { describe, expect, it } from "vitest";
import type { CardInstance } from "../model/cards.js";
import { asCardInstanceId, type CardId, type PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf, replayableGraveyardTactics, ritualsOf } from "../rules/cards.js";
import { livingFrontlinerInLane } from "../rules/lanes.js";
import { advance } from "./reduce.js";
import {
  TEST_PLAYABLE,
  testAttack,
  testCard,
  testCreature,
} from "../testing/fixtures/index.js";
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
  withPile,
  withHand,
  withPhase,
  withShowingFaces,
} from "../testing/scenario.js";

const DESTROY_EQUIPMENT = testCard({
  id: "card-test-control-destroy-equipment",
  playCost: { arcane: 4 },
  attribute: "arcane",
  effect: {
    effects: [{ type: "destroy-equipment", target: { kind: "choose-opponent-equipment" } }],
  },
});

const ATTR_GATED_EQUIP = testCard({
  id: "card-test-control-attr-equip",
  playCost: { darkness: 3 },
  attribute: "darkness",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    creatureAttributes: ["arcane", "darkness"],
    abilities: [],
  },
});

const SHIELD_RITUAL = testCard({
  id: "card-test-control-shield-ritual",
  playCost: { arcane: 3 },
  attribute: "arcane",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { arcane: 1, any: 1 },
    effects: [{ type: "grant-shield", amount: 2, target: { kind: "choose-ally" } }],
  },
});

const DESTROY_RITUAL = testCard({
  id: "card-test-control-destroy-ritual",
  playCost: { arcane: 3 },
  attribute: "arcane",
  effect: {
    effects: [{ type: "destroy-ritual", target: { kind: "choose-opponent-ritual" } }],
  },
});

const PLACE_RITUAL = testCard({
  id: "card-test-control-place-ritual",
  playCost: { arcane: 2 },
  attribute: "arcane",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    effects: [{ type: "peek-deck-optional-bottom" }],
  },
});

const NEGATE_RITUAL = testCard({
  id: "card-test-control-negate-ritual",
  playCost: { arcane: 2 },
  attribute: "arcane",
  type: "reaction",
  effect: { effects: [{ type: "negate-ritual" }] },
});

const DRAIN_RITUAL = testCard({
  id: "card-test-control-drain-ritual",
  playCost: { darkness: 2 },
  attribute: "darkness",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { darkness: 1 },
    effects: [
      {
        type: "drain-life",
        amount: 2,
        target: { kind: "choose-enemy" },
        with: { kind: "choose-ally" },
      },
    ],
  },
});

const DAMAGE_ALL = testCard({
  id: "card-test-control-damage-all",
  playCost: { darkness: 3, any: 3 },
  attribute: "darkness",
  effect: {
    effects: [{ type: "damage", amount: 3, target: { kind: "enemy-all" } }],
  },
});

const DAMAGE_CHOOSE = testCard({
  id: "card-test-control-damage-choose",
  playCost: { darkness: 3 },
  attribute: "darkness",
  effect: {
    requires: { darkness: 1 },
    effects: [{ type: "damage", amount: 3, target: { kind: "choose-enemy" } }],
  },
});

const REPLAY = testCard({
  id: "card-test-control-replay",
  playCost: { darkness: 3 },
  attribute: "darkness",
  effect: { effects: [{ type: "replay-graveyard-tactic" }] },
});

const GRAVE_REACH = testAttack({
  id: "attack-test-control-grave-reach",
  unlock: { mechanical: 1 },
});
const LEY_SURGE = testAttack({
  id: "attack-test-control-ley-surge",
  kind: "special",
  unlock: { mechanical: 1, luminar: 1 },
  followUpEffects: [{ type: "draw-cards", amount: 1 }],
});

const SHADE = testCreature({
  id: "creature-test-control-shade",
  attributes: ["darkness"],
  attacks: [GRAVE_REACH],
});
const ADEPT = testCreature({
  id: "creature-test-control-adept",
  attributes: ["arcane"],
  attacks: [LEY_SURGE],
});
const ORACLE = testCreature({
  id: "creature-test-control-oracle",
  life: 20,
  attributes: ["arcane", "darkness"],
  legendary: true,
});

const CONTROL_SQUAD = [ADEPT.id, SHADE.id, ORACLE.id] as const;

function controlMatch(): GameState {
  return newMatch({
    players: [
      { id: P1, squad: CONTROL_SQUAD, deck: [] },
      { id: P2, squad: CONTROL_SQUAD, deck: [] },
    ],
  });
}

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
  it("opens a choice of opposing equipment", () => {
    const opponentEquip = withActivePlayer(
      withPile(withHand(withPhase(controlMatch(), "actions"), P2, [ATTR_GATED_EQUIP.id]), P2, 10),
      P2,
    );
    const bearer = creatureIdAt(opponentEquip, P2, 0);
    const equipped = resolveOpenChain(
      expectOk(
        advance(opponentEquip, {
          type: "PLAY_CARD",
          playerId: P2,
          cardInstanceId: handCardIdAt(opponentEquip, P2, 0),
          declaredTargetCreatureId: bearer,
        }),
      ),
    );
    const ready = withActivePlayer(
      withPile(withHand(equipped, P1, [DESTROY_EQUIPMENT.id]), P1, 10),
      P1,
    );
    const state = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(state.pendingDecision?.type).toBe("choose-equipment");
  });

  it("a ritual marks Shield on an ally when it activates", () => {
    const placed = placedRitualReady(readyToPlay([SHIELD_RITUAL.id]), P1);
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    const activated = resolveOpenChain(
      expectOk(
        advance(placed, {
          type: "ACTIVATE_RITUAL",
          playerId: P1,
          cardInstanceId: ritualId,
        }),
      ),
    );
    expect(activated.pendingDecision?.type).toBe("choose-creature");
  });

  it("destroys a ritual the opponent controls", () => {
    const opponentRitual = withActivePlayer(
      withPile(withHand(withPhase(controlMatch(), "actions"), P2, [PLACE_RITUAL.id]), P2, 10),
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

    const ready = withActivePlayer(withPile(withHand(placed, P1, [DESTROY_RITUAL.id]), P1, 10), P1);
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

  it("negates a ritual on the chain", () => {
    const ready = withPile(
      withHand(
        withPile(withHand(withPhase(controlMatch(), "actions"), P1, [DRAIN_RITUAL.id]), P1, 10),
        P2,
        [NEGATE_RITUAL.id],
      ),
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
  it("strikes every living enemy for 3", () => {
    const ready = readyToPlay([DAMAGE_ALL.id]);
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

  it("strikes a chosen enemy for 3", () => {
    const ready = readyToPlay([DAMAGE_CHOOSE.id]);
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

  it("Drain ritual opens choose-creature on activate", () => {
    const placed = placedRitualReady(readyToPlay([DRAIN_RITUAL.id]), P1);
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    const activated = resolveOpenChain(
      expectOk(
        advance(placed, {
          type: "ACTIVATE_RITUAL",
          playerId: P1,
          cardInstanceId: ritualId,
        }),
      ),
    );
    expect(activated.pendingDecision?.type).toBe("choose-creature");
  });

  it("replay opens a graveyard Instant chooser", () => {
    const spent = withPile(
      withHand(withPhase(controlMatch(), "actions"), P1, [TEST_PLAYABLE]),
      P1,
      10,
    );
    const afterFirst = expectOk(
      advanceResolvingChain(spent, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(spent, P1, 0),
      }),
    );
    const ready = withPile(withHand(afterFirst, P1, [REPLAY.id]), P1, 10);
    const played = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("replay-graveyard-tactic");
    const echo = graveyardOf(played, P1).find((card) => card.cardId === REPLAY.id);
    const source =
      played.pendingDecision?.type === "replay-graveyard-tactic"
        ? played.pendingDecision.sourceCardInstanceId
        : null;
    expect(echo?.id).toBe(source);
    expect(replayableGraveyardTactics(played, P1, source)).not.toContain(echo?.id);
  });

  it("attribute-gated equipment only equips Arcane or Darkness creatures", () => {
    const tempoHost = newMatch();
    const ready = withPile(
      withHand(withPhase(tempoHost, "actions"), P1, [ATTR_GATED_EQUIP.id]),
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

    const controlReady = readyToPlay([ATTR_GATED_EQUIP.id]);
    const accepted = advance(controlReady, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(controlReady, P1, 0),
      declaredTargetCreatureId: creatureIdAt(controlReady, P1, 0),
    });
    expect(accepted.ok).toBe(true);
  });

  it("the Control squad's legendary sits in the back", () => {
    const state = controlMatch();
    const legendary = Object.values(state.creatures).find(
      (creature) => creature.definitionId === ORACLE.id,
    );
    expect(legendary).toBeDefined();
    expect(legendary?.position).toBe("back");
  });

  it("attack Unlock does not burn the pile; follow-ups still resolve", () => {
    let state = withAttributePool(withPhase(controlMatch(), "actions"), P1, {
      arcane: 2,
      darkness: 2,
      martial: 1,
    });
    state = withShowingFaces(state, P1, ["mechanical", "luminar"]);
    state = withDeck(state, P2, [TEST_PLAYABLE, TEST_PLAYABLE, TEST_PLAYABLE]);
    state = withDeck(state, P1, [TEST_PLAYABLE, TEST_PLAYABLE, TEST_PLAYABLE]);

    const shade = Object.values(state.creatures).find(
      (creature) => creature.definitionId === SHADE.id && creature.ownerId === P1,
    );
    const adept = Object.values(state.creatures).find(
      (creature) => creature.definitionId === ADEPT.id && creature.ownerId === P1,
    );
    if (shade === undefined || adept === undefined) {
      throw new Error("expected Control frontline attackers");
    }
    const shadeLane = shade.lane;
    const adeptLane = adept.lane;
    if (shadeLane === null || adeptLane === null) {
      throw new Error("expected numbered lanes on Control frontliners");
    }
    const shadeTarget = livingFrontlinerInLane(state, P2, shadeLane);
    const adeptTarget = livingFrontlinerInLane(state, P2, adeptLane);
    if (shadeTarget === null || adeptTarget === null) {
      throw new Error("expected Control frontline attackers and a facing target");
    }

    state = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: shade.id,
        attackId: GRAVE_REACH.id,
        targetId: shadeTarget.id,
      }),
    );
    expect(state.players[P1]?.attributePool.darkness ?? 0).toBe(2);
    expect(state.players[P1]?.attributePool.arcane ?? 0).toBe(2);
    expect(state.players[P2]?.deck).toHaveLength(3);

    state = expectOk(
      advanceResolvingChain(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: adept.id,
        attackId: LEY_SURGE.id,
        targetId: adeptTarget.id,
      }),
    );
    expect(state.players[P1]?.attributePool.arcane ?? 0).toBe(2);
    expect(state.players[P1]?.attributePool.darkness ?? 0).toBe(2);
    expect(state.players[P1]?.hand.length).toBeGreaterThan(0);
  });
});
