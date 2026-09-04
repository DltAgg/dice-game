import { describe, expect, it } from "vitest";
import {
  COG_DRAFT,
  GLINT_VEIL,
  LANTERN_OATH,
  MIRRORWARD,
} from "../content/cards.js";
import { asEffectInstanceId } from "../model/ids.js";
import type { AttributeTokens } from "../model/symbols.js";
import { currentLife } from "../rules/creatures.js";
import { createDraft } from "./draft.js";
import { advance } from "./reduce.js";
import { drainResolution, pushEffect } from "./resolution.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
  withShields,
  withTokens,
} from "../testing/scenario.js";
import { CRANK, CRANK_FUEL, DRIVE_SHAFT, DRIVE_SHAFT_FUEL, KINDLE, KINDLE_FUEL } from "../testing/tempoCatalogue.js";

const HEAVY_AXE = DRIVE_SHAFT;
const CHARGE = KINDLE;

function combatWithAttacker(tokens: AttributeTokens) {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 0);
  const target = creatureIdAt(base, P2, 0);
  return {
    attacker,
    target,
    state: withTokens(base, attacker, tokens),
  };
}

function combatWithDriveShaft() {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 2);
  const target = creatureIdAt(base, P2, 0);
  return {
    attacker,
    target,
    state: withTokens(base, attacker, DRIVE_SHAFT_FUEL),
  };
}

/** Dawn Warden Kindle deals 2 and has no ignore-shield, so 009 shield tests stay vanilla. */
function combatWithCharge() {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 1);
  const target = creatureIdAt(base, P2, 0);
  return {
    attacker,
    target,
    state: withTokens(base, attacker, KINDLE_FUEL),
  };
}

describe("true prevent (009)", () => {
  it("cancels the whole attack before shields", () => {
    // Charge deals 2 (no pierce). Attack-prevent 1 + shield 1 → 0 HP, Shield unused.
    const { attacker, target, state: combat } = combatWithCharge();
    const armed = {
      ...combat,
      creatures: {
        ...combat.creatures,
        [target]: {
          ...combat.creatures[target]!,
          attackPreventCount: 1,
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

    expect(after.creatures[target]?.attackPreventCount).toBe(0);
    expect(after.creatures[target]?.shields).toBe(1);
    expect(after.creatures[target]?.damage).toBe(0);
    const prevented = after.log.map((entry) => entry.event);
    expect(
      prevented.some((event) => event.type === "damage-prevented" && event.source === "attack-prevent"),
    ).toBe(true);
    expect(
      prevented.some((event) => event.type === "damage-prevented" && event.source === "shield"),
    ).toBe(false);
  });

  it("Lantern Oath prevents the waiting attack on the attack target", () => {
    const { attacker, target, state: combat } = combatWithAttacker(CRANK_FUEL);
    const withBarrier = withHand(withPile(combat, P2, 10), P2, [LANTERN_OATH]);

    const opened = expectOk(
      advance(withBarrier, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: CRANK,
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

    expect(resolved.creatures[target]?.damage).toBe(0);
    expect(
      eventTypes(resolved).filter((type) => type === "damage-prevented").length,
    ).toBeGreaterThan(0);
  });

  it("rejects Glint Veil when the top link is not an attack", () => {
    const ready = withHand(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10),
      P2,
      [GLINT_VEIL],
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

  it("Mirrorward prevents the attack and reflects to the attacker", () => {
    const { attacker, target, state: combat } = combatWithDriveShaft();
    const lifeBefore = currentLife(combat.creatures[attacker]!);
    const withJudgement = withHand(withPile(combat, P2, 10), P2, [MIRRORWARD]);

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

  it("Lantern Oath draws when prevent resolves", () => {
    const { attacker, target, state: combat } = combatWithAttacker(CRANK_FUEL);
    const seeded = withHand(withPile(combat, P2, 10), P2, [LANTERN_OATH, COG_DRAFT, COG_DRAFT]);
    const player = seeded.players[P2];
    if (player === undefined) throw new Error("test: no p2");
    const deckA = handCardIdAt(seeded, P2, 1);
    const deckB = handCardIdAt(seeded, P2, 2);
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
          hand: [handCardIdAt(seeded, P2, 0)],
          deck: [deckA, deckB],
        },
      },
    };

    const opened = expectOk(
      advance(withDeck, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: CRANK,
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
    const resolved = resolveOpenChain(afterBarrier);
    expect(eventTypes(resolved)).toContain("card-drawn");
    expect(resolved.players[P2]?.hand.length).toBe(1);
  });

  it("leftover attack-prevent persists; a later attack without prevent hits", () => {
    const { attacker, target, state: combat } = combatWithDriveShaft();
    const buffered = {
      ...combat,
      creatures: {
        ...combat.creatures,
        [target]: { ...combat.creatures[target]!, attackPreventCount: 1 },
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
    expect(first.creatures[target]?.attackPreventCount).toBe(0);
    expect(first.creatures[target]?.damage).toBe(0);

    const refreshed = withTokens(
      {
        ...first,
        creatures: {
          ...first.creatures,
          [attacker]: {
            ...first.creatures[attacker]!,
            attacksUsedThisCombat: 0,
          },
        },
      },
      attacker,
      DRIVE_SHAFT_FUEL,
    );
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
    expect(second.creatures[target]?.attackPreventCount).toBe(0);
    expect(second.creatures[target]?.damage).toBe(3);
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

  it("grant-attack-prevent whiffs when no attack is on the chain", () => {
    const base = withPhase(newMatch(), "actions");
    const allyId = creatureIdAt(base, P1, 0);
    const draft = createDraft(base);
    pushEffect(
      draft,
      P1,
      { type: "grant-attack-prevent", amount: 1, target: { kind: "source-creature" } },
      allyId,
      null,
    );
    drainResolution(draft);
    expect(draft.creatures[allyId]?.attackPreventCount ?? 0).toBe(0);
  });

  it("grant-attack-prevent only arms the living attack's target", () => {
    const base = withPhase(newMatch(), "actions");
    const underAttack = creatureIdAt(base, P1, 0);
    const otherAlly = creatureIdAt(base, P1, 1);
    const draft = createDraft(base);
    draft.chainStack.push({
      id: asEffectInstanceId("test-attack-link"),
      kind: "attack",
      controllerId: P2,
      negated: false,
      cardInstanceId: null,
      effects: [],
      sourceCreatureId: null,
      declaredTargetCreatureId: underAttack,
      equipTargetCreatureId: null,
      overloadFaceCardId: null,
      attackerId: creatureIdAt(base, P2, 0),
      attackId: HEAVY_AXE,
      attackTargetId: underAttack,
      attackEffect: null,
      attackFollowUpEffects: [],
      ritualDuration: null,
    });
    // Selector would prefer another ally; engine still only arms the attack target.
    pushEffect(
      draft,
      P1,
      { type: "grant-attack-prevent", amount: 1, target: { kind: "source-creature" } },
      otherAlly,
      null,
    );
    drainResolution(draft);
    expect(draft.creatures[underAttack]?.attackPreventCount).toBe(1);
    expect(draft.creatures[otherAlly]?.attackPreventCount ?? 0).toBe(0);
  });
});
