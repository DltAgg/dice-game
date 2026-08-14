import { describe, expect, it } from "vitest";
import {
  BARRIER_OF_LIGHT,
  ECLIPSE,
  GLIMMER,
  LUMINAR_JUDGEMENT,
} from "../content/cards.js";
import { asAttackId } from "../model/ids.js";
import { currentLife } from "../rules/creatures.js";
import { advance } from "./reduce.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withEnergy,
  withHand,
  withPhase,
  withShields,
  withTokens,
} from "../testing/scenario.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");
const CHARGE = asAttackId("attack-varcolac-charge");

function combatWithAttacker(tokens: { martial: number }) {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 0);
  const target = creatureIdAt(base, P2, 0);
  return {
    attacker,
    target,
    state: withTokens(base, attacker, tokens),
  };
}

/** Varcolac Charge deals 2 and has no ignore-shield, so 009 shield tests stay vanilla. */
function combatWithCharge() {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 1);
  const target = creatureIdAt(base, P2, 0);
  return {
    attacker,
    target,
    state: withTokens(base, attacker, { wild: 1 }),
  };
}

describe("true prevent (009)", () => {
  it("applies buffer before shields then HP", () => {
    // Charge deals 2 (no pierce). Buffer 1 + shield 1 → 0 HP damage.
    const { attacker, target, state: combat } = combatWithCharge();
    const armed = {
      ...combat,
      creatures: {
        ...combat.creatures,
        [target]: {
          ...combat.creatures[target]!,
          damagePreventBuffer: 1,
          shields: 1,
        },
      },
    };

    const after = resolveOpenChain(
      expectOk(
        advance(armed, {
          type: "ATTACK",
          playerId: P1,
          attackerId: attacker,
          attackId: CHARGE,
          targetId: target,
        }),
      ),
    );

    expect(after.creatures[target]?.damagePreventBuffer).toBe(0);
    expect(after.creatures[target]?.shields).toBe(0);
    expect(after.creatures[target]?.damage).toBe(0);
    const prevented = after.log.map((entry) => entry.event);
    expect(
      prevented.some((event) => event.type === "damage-prevented" && event.source === "buffer"),
    ).toBe(true);
    expect(
      prevented.some((event) => event.type === "damage-prevented" && event.source === "shield"),
    ).toBe(true);
  });

  it("Prismatic Barrier grants a prevent-2 buffer on the attack target", () => {
    // Strike 3 into Barrier 2 → 1 damage, buffer spent.
    const { attacker, target, state: combat } = combatWithAttacker({ martial: 2 });
    const withBarrier = withHand(withEnergy(combat, P2, 10), P2, [BARRIER_OF_LIGHT]);

    const opened = expectOk(
      advance(withBarrier, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: HEAVY_AXE,
        targetId: target,
      }),
    );

    const barred = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(barred);

    expect(resolved.creatures[target]?.damage).toBe(1);
    expect(resolved.creatures[target]?.damagePreventBuffer).toBe(0);
  });

  it("rejects Barrier when the top link is not an attack", () => {
    const ready = withHand(
      withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10),
      P2,
      [BARRIER_OF_LIGHT],
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
    if (denied.ok) return;
    expect(denied.error).toBe("INVALID_CHAIN_TARGET");
  });

  it("Luminar Judgement prevents the attack and reflects to the attacker", () => {
    const { attacker, target, state: combat } = combatWithAttacker({ martial: 2 });
    const lifeBefore = currentLife(combat.creatures[attacker]!);
    const withJudgement = withHand(withEnergy(combat, P2, 10), P2, [LUMINAR_JUDGEMENT]);

    const opened = expectOk(
      advance(withJudgement, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: HEAVY_AXE,
        targetId: target,
      }),
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
    expect(currentLife(resolved.creatures[attacker]!)).toBe(lifeBefore - 3);
    expect(eventTypes(resolved)).toContain("damage-prevented");
  });

  it("Glimmer draws when prevent resolves after Barrier", () => {
    const { attacker, target, state: combat } = combatWithAttacker({ martial: 2 });
    const seeded = withHand(withEnergy(combat, P2, 10), P2, [
      BARRIER_OF_LIGHT,
      GLIMMER,
      ECLIPSE,
      ECLIPSE,
    ]);
    const player = seeded.players[P2];
    if (player === undefined) throw new Error("test: no p2");
    const deckA = handCardIdAt(seeded, P2, 2);
    const deckB = handCardIdAt(seeded, P2, 3);
    const withDeck = {
      ...seeded,
      cards: {
        ...seeded.cards,
        [deckA]: { ...seeded.cards[deckA]!, zone: "deck" as const },
        [deckB]: { ...seeded.cards[deckB]!, zone: "deck" as const },
      },
      players: {
        ...seeded.players,
        [P2]: {
          ...player,
          hand: [handCardIdAt(seeded, P2, 0), handCardIdAt(seeded, P2, 1)],
          deck: [deckA, deckB],
        },
      },
    };

    const opened = expectOk(
      advance(withDeck, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: HEAVY_AXE,
        targetId: target,
      }),
    );
    const afterBarrier = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    // Priority passed to P1 after Barrier; Pass so P2 can add Glimmer.
    const afterP1Pass = expectOk(
      advance(afterBarrier, { type: "PASS_PRIORITY", playerId: P1 }),
    );
    const afterGlimmer = expectOk(
      advance(afterP1Pass, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(afterP1Pass, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(afterGlimmer);
    expect(eventTypes(resolved)).toContain("card-drawn");
    expect(resolved.players[P2]?.hand.length).toBe(2);
  });

  it("leftover buffer persists for a later hit", () => {
    // Buffer 5 vs Strike 3 → 2 left; second Strike consumes 2 and deals 1.
    const { attacker, target, state: combat } = combatWithAttacker({ martial: 2 });
    const buffered = {
      ...combat,
      creatures: {
        ...combat.creatures,
        [target]: { ...combat.creatures[target]!, damagePreventBuffer: 5 },
      },
    };
    const first = resolveOpenChain(
      expectOk(
        advance(buffered, {
          type: "ATTACK",
          playerId: P1,
          attackerId: attacker,
          attackId: HEAVY_AXE,
          targetId: target,
        }),
      ),
    );
    expect(first.creatures[target]?.damagePreventBuffer).toBe(2);
    expect(first.creatures[target]?.damage).toBe(0);

    const refreshed = {
      ...first,
      creatures: {
        ...first.creatures,
        [attacker]: {
          ...first.creatures[attacker]!,
          attacksUsedThisCombat: 0,
          attributeTokens: { martial: 2 },
        },
      },
    };
    const second = resolveOpenChain(
      expectOk(
        advance(refreshed, {
          type: "ATTACK",
          playerId: P1,
          attackerId: attacker,
          attackId: HEAVY_AXE,
          targetId: target,
        }),
      ),
    );
    expect(second.creatures[target]?.damagePreventBuffer).toBe(0);
    expect(second.creatures[target]?.damage).toBe(1);
  });

  it("shield-only path still prevents with source shield", () => {
    // 1 shield vs Charge 2 → 0 shields, 1 damage.
    const { attacker, target, state: combat } = combatWithCharge();
    const shielded = withShields(combat, target, 1);
    const after = resolveOpenChain(
      expectOk(
        advance(shielded, {
          type: "ATTACK",
          playerId: P1,
          attackerId: attacker,
          attackId: CHARGE,
          targetId: target,
        }),
      ),
    );
    expect(after.creatures[target]?.shields).toBe(0);
    expect(after.creatures[target]?.damage).toBe(1);
    const events = after.log.map((entry) => entry.event);
    expect(
      events.some((event) => event.type === "damage-prevented" && event.source === "shield"),
    ).toBe(true);
  });
});
