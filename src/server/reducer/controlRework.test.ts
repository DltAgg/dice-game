import { describe, expect, it } from "vitest";
import { ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  TEST_FACE_DECK,
  TEST_PLAYABLE,
  TEST_REACTION_PREVENT,
  TEST_SYNTHETIC_LUMINAR_A,
  TEST_SYNTHETIC_LUMINAR_B,
  testCard,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withDamage,
  withPile,
  withHand,
  withPhase,
} from "../testing/scenario.js";
import { DRIVE_SHAFT, DRIVE_SHAFT_FUEL } from "../testing/tempoCatalogue.js";

const HEAL_RITUAL = testCard({
  id: "card-test-heal-ritual",
  playCost: { luminar: 3 },
  attribute: "luminar",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { luminar: 3 },
    effects: [
      { type: "heal", amount: 2, target: { kind: "choose-ally" } },
      { type: "heal", amount: 2, target: { kind: "choose-ally" } },
    ],
  },
});

const CONTINUOUS_RITUAL = testCard({
  id: "card-test-stay-ritual",
  playCost: { luminar: 1, any: 1 },
  attribute: "luminar",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { luminar: 2, any: 1 },
    effects: [
      {
        type: "silence",
        hosts: ["creature", "ritual"],
        target: { kind: "choose-opponent-silence-host", hosts: ["creature", "ritual"] },
      },
    ],
  },
});

const PREVENT_REFLECT = testCard({
  id: "card-test-rework-prevent-reflect",
  playCost: { luminar: 3 },
  attribute: "luminar",
  type: "reaction",
  effect: { effects: [{ type: "prevent-attack-reflect" }] },
});

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

describe("luminar control surface", () => {
  it("a heal ritual activates when the pile meets its gate", () => {
    const ready = actionsReady([HEAL_RITUAL.id]);
    const placed = resolveOpenChain(
      expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
        }),
      ),
    );
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    const allyId = creatureIdAt(placed, P1, 0);
    const armed = {
      ...placed,
      cards: {
        ...placed.cards,
        [ritualId]: { ...placed.cards[ritualId]!, ritualOrientation: "ready" as const },
      },
      players: {
        ...placed.players,
        [P1]: { ...placed.players[P1]!, attributePool: { luminar: 3 } },
      },
    };
    const wounded = withDamage(armed, allyId, 4);
    let activated = resolveOpenChain(
      expectOk(
        advance(wounded, {
          type: "ACTIVATE_RITUAL",
          playerId: P1,
          cardInstanceId: ritualId,
        }),
      ),
    );
    while (activated.pendingDecision?.type === "choose-creature") {
      activated = expectOk(
        advance(activated, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: allyId,
        }),
      );
    }
    activated = resolveOpenChain(activated);
    expect(ritualsOf(activated, P1).some((card) => card.id === ritualId)).toBe(true);
    expect(activated.cards[ritualId]?.ritualOrientation).toBe("exhausted");
    expect(activated.creatures[allyId]?.damage).toBe(0);
  });

  it("a continuous ritual stays on field", () => {
    const ready = actionsReady([CONTINUOUS_RITUAL.id]);
    const placed = resolveOpenChain(
      expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
        }),
      ),
    );
    expect(ritualsOf(placed, P1)).toHaveLength(1);
    expect(ritualsOf(placed, P1)[0]?.ritualOrientation).toBe("ready");
  });

  it("prevent-reflect stops and reflects on an attack chain", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 2);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(
      withPile(withPile(base, P1, 10), P2, 10),
      P2,
      [PREVENT_REFLECT.id],
    );
    const opened = expectOk(
      advance(
        { ...combat, players: { ...combat.players, [P1]: { ...combat.players[P1]!, attributePool: { ...DRIVE_SHAFT_FUEL } } } },
        {
          type: "ATTACK",
          playerId: P1,
          attackerId: attacker,
          attackId: DRIVE_SHAFT,
          targetId: target,
        },
      ),
    );
    const judged = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(judged);
    expect(resolved.creatures[target]?.damage).toBe(0);
  });

  it("a prevent reaction is legal on attacks only", () => {
    const ready = withHand(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10),
      P2,
      [TEST_REACTION_PREVENT],
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const denied = advance(opened, {
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: handCardIdAt(opened, P2, 0),
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("INVALID_CHAIN_TARGET");
  });

  it("the test face deck includes Luminar specials", () => {
    expect(TEST_FACE_DECK).toEqual(
      expect.arrayContaining([TEST_SYNTHETIC_LUMINAR_A, TEST_SYNTHETIC_LUMINAR_B]),
    );
  });
});
