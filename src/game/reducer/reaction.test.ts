import { describe, expect, it } from "vitest";
import { ARCANE_SILENCE, ECLIPSE, RUNIC_NULLIFICATION, WAR_AXE } from "../content/cards.js";
import { asAttackId } from "../model/ids.js";
import { equipmentOf, graveyardOf, ritualsOf } from "../rules/cards.js";
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
  withActivePlayer,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  withTokens,
} from "../testing/scenario.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");

const actionsReady = (cards: Parameters<typeof withHand>[2], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

describe("reaction chain (008)", () => {
  it("opens a window on instant play and resolves after both Pass", () => {
    const state = actionsReady([ECLIPSE]);
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );

    expect(opened.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });
    expect(opened.chainStack).toHaveLength(1);
    expect(graveyardOf(opened, P1)).toHaveLength(1);

    const resolved = resolveOpenChain(opened);
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.chainStack).toHaveLength(0);
    expect(eventTypes(resolved)).toContain("chain-link-resolved");
  });

  it("lets Arcane Silence negate the top tactic link", () => {
    const state = withHand(
      withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10),
      P2,
      [ARCANE_SILENCE],
    );

    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );

    const silenced = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    expect(silenced.chainStack).toHaveLength(2);
    // Non-holder Silence (5) adds 5 to holder: 10−3+5 = 12 capped at trackMax.
    expect(silenced.energy.holderId).toBe(P1);
    expect(silenced.energy.value).toBe(Math.min(7 + 5, silenced.config.energy.trackMax));

    const resolved = resolveOpenChain(silenced);
    expect(resolved.chainStack).toHaveLength(0);
    expect(eventTypes(resolved)).toContain("chain-link-negated");
    expect(resolved.pendingDecision).toBeNull();
  });

  it("non-holder reaction cost adds Energy to the holder (opposing +/-)", () => {
    // P2 places Nullification earlier; P1 holds 5, plays Eclipse (3) → 2;
    // P2 activates Nullification (+3) → holder gains 3 → 5.
    const p2Place = withEnergy(
      withHand(withPhase(withActivePlayer(newMatch(), P2), "actions"), P2, [
        RUNIC_NULLIFICATION,
      ]),
      P2,
      10,
    );
    const afterP2Place = resolveOpenChain(
      expectOk(
        advance(p2Place, {
          type: "PLAY_CARD",
          playerId: P2,
          cardInstanceId: handCardIdAt(p2Place, P2, 0),
        }),
      ),
    );
    const ritualId = ritualsOf(afterP2Place, P2)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    // Pass turn-ish: give P1 the marker with 5 and an Eclipse, ritual ready for P2.
    const p1Turn = withHand(
      withSymbols(
        withEnergy(withPhase(withActivePlayer(afterP2Place, P1), "actions"), P1, 5),
        P2,
        ["arcane", "arcane"],
      ),
      P1,
      [ECLIPSE],
    );
    const ready = {
      ...p1Turn,
      cards: {
        ...p1Turn.cards,
        [ritualId]: {
          ...p1Turn.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
    };

    const afterEclipse = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(afterEclipse.energy).toEqual({ holderId: P1, value: 2 });

    const afterNegate = expectOk(
      advance(afterEclipse, {
        type: "ACTIVATE_RITUAL",
        playerId: P2,
        cardInstanceId: ritualId,
      }),
    );
    expect(afterNegate.energy).toEqual({ holderId: P1, value: 5 });
    expect(afterNegate.deferredTurnEndPlayerId).toBeNull();
  });

  it("overshoot then reaction restore: turn ends only after chain, and may not end", () => {
    // A holds 2, plays Eclipse (3) → marker flips to B; B Nullifies (+3 holder spend
    // toward A) → marker returns to A; after Pass×2 A’s turn continues.
    const p2Place = withEnergy(
      withHand(withPhase(withActivePlayer(newMatch(), P2), "actions"), P2, [
        RUNIC_NULLIFICATION,
      ]),
      P2,
      10,
    );
    const afterP2Place = resolveOpenChain(
      expectOk(
        advance(p2Place, {
          type: "PLAY_CARD",
          playerId: P2,
          cardInstanceId: handCardIdAt(p2Place, P2, 0),
        }),
      ),
    );
    const ritualId = ritualsOf(afterP2Place, P2)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const p1Turn = withHand(
      withSymbols(
        withEnergy(withPhase(withActivePlayer(afterP2Place, P1), "actions"), P1, 2),
        P2,
        ["arcane", "arcane"],
      ),
      P1,
      [ECLIPSE],
    );
    const ready = {
      ...p1Turn,
      cards: {
        ...p1Turn.cards,
        [ritualId]: {
          ...p1Turn.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
    };

    const afterEclipse = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    // Cost paid immediately: 2−3 overshoots to B with 1 (bonus not yet applied);
    // turn must NOT end yet.
    expect(afterEclipse.energy).toEqual({ holderId: P2, value: 1 });
    expect(afterEclipse.activePlayerId).toBe(P1);
    expect(afterEclipse.pendingDecision?.type).toBe("reaction-priority");

    const afterNegate = expectOk(
      advance(afterEclipse, {
        type: "ACTIVATE_RITUAL",
        playerId: P2,
        cardInstanceId: ritualId,
      }),
    );
    // B holds and pays +3 toward A: 1−3 → A gets 2.
    expect(afterNegate.energy).toEqual({ holderId: P1, value: 2 });

    const resolved = resolveOpenChain(afterNegate);
    expect(resolved.activePlayerId).toBe(P1);
    expect(resolved.energy.holderId).toBe(P1);
    expect(eventTypes(resolved)).not.toContain("turn-ended");
    expect(eventTypes(resolved)).toContain("chain-link-negated");
  });

  it("rejects negate when the top link is an attack", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 0);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(
      withEnergy(withTokens(base, attacker, { martial: 2 }), P1, 10),
      P2,
      [ARCANE_SILENCE],
    );

    const opened = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: HEAVY_AXE,
        targetId: target,
      }),
    );
    expect(opened.chainStack[0]?.kind).toBe("attack");

    const denied = advance(opened, {
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: handCardIdAt(opened, P2, 0),
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.error).toBe("INVALID_CHAIN_TARGET");

    const resolved = resolveOpenChain(opened);
    expect(eventTypes(resolved)).toContain("damage-dealt");
  });

  it("rejects Runic Nullification when the top link is equipment (not Instant)", () => {
    const p2Place = withEnergy(
      withHand(withPhase(withActivePlayer(newMatch(), P2), "actions"), P2, [
        RUNIC_NULLIFICATION,
      ]),
      P2,
      10,
    );
    const afterP2Place = resolveOpenChain(
      expectOk(
        advance(p2Place, {
          type: "PLAY_CARD",
          playerId: P2,
          cardInstanceId: handCardIdAt(p2Place, P2, 0),
        }),
      ),
    );
    const ritualId = ritualsOf(afterP2Place, P2)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const p1Turn = withHand(
      withSymbols(
        withEnergy(withPhase(withActivePlayer(afterP2Place, P1), "actions"), P1, 10),
        P2,
        ["arcane", "arcane"],
      ),
      P1,
      [WAR_AXE],
    );
    const ready = {
      ...p1Turn,
      cards: {
        ...p1Turn.cards,
        [ritualId]: {
          ...p1Turn.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
    };

    const afterEquip = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredTargetCreatureId: creatureIdAt(ready, P1, 0),
      }),
    );
    expect(afterEquip.chainStack[0]?.kind).toBe("equip-attach");

    const denied = advance(afterEquip, {
      type: "ACTIVATE_RITUAL",
      playerId: P2,
      cardInstanceId: ritualId,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.error).toBe("INVALID_CHAIN_TARGET");
  });

  it("lets Arcane Silence negate a non-Instant equipment attach link", () => {
    const state = withHand(
      withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [WAR_AXE]), P1, 10),
      P2,
      [ARCANE_SILENCE],
    );

    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: creatureIdAt(state, P1, 0),
      }),
    );
    expect(opened.chainStack[0]?.kind).toBe("equip-attach");

    const silenced = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    expect(silenced.chainStack).toHaveLength(2);

    const resolved = resolveOpenChain(silenced);
    expect(eventTypes(resolved)).toContain("chain-link-negated");
    expect(equipmentOf(resolved, P1)).toHaveLength(0);
  });

  it("activates Runic Nullification to negate after place + ready", () => {
    const placeState = actionsReady([RUNIC_NULLIFICATION]);
    const afterPlace = resolveOpenChain(
      expectOk(
        advance(placeState, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(placeState, P1, 0),
        }),
      ),
    );
    const ritualId = ritualsOf(afterPlace, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const withEclipse = withHand(
      withSymbols(withEnergy(withPhase(afterPlace, "actions"), P1, 10), P1, [
        "arcane",
        "arcane",
      ]),
      P1,
      [ECLIPSE],
    );
    const readyRitual = {
      ...withEclipse,
      cards: {
        ...withEclipse.cards,
        [ritualId]: {
          ...withEclipse.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
    };

    const opened = expectOk(
      advance(readyRitual, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(readyRitual, P1, 0),
      }),
    );

    const afterP2Pass = expectOk(
      advance(opened, { type: "PASS_PRIORITY", playerId: P2 }),
    );

    const activated = expectOk(
      advance(afterP2Pass, {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );

    const resolved = resolveOpenChain(activated);
    expect(eventTypes(resolved)).toContain("chain-link-negated");
    expect(resolved.cards[ritualId]?.zone).toBe("graveyard");
  });

  it("blocks Pass while a discard is pending", () => {
    const state = actionsReady([ECLIPSE, ECLIPSE, ECLIPSE]);
    const player = state.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const deckA = handCardIdAt(state, P1, 1);
    const deckB = handCardIdAt(state, P1, 2);
    const seeded = {
      ...state,
      cards: {
        ...state.cards,
        [deckA]: { ...state.cards[deckA]!, zone: "deck" as const },
        [deckB]: { ...state.cards[deckB]!, zone: "deck" as const },
      },
      players: {
        ...state.players,
        [P1]: {
          ...player,
          hand: [handCardIdAt(state, P1, 0)],
          deck: [deckA, deckB],
        },
      },
    };

    const afterEclipse = resolveOpenChain(
      expectOk(
        advance(seeded, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(seeded, P1, 0),
        }),
      ),
    );
    expect(afterEclipse.pendingDecision?.type).toBe("discard-cards");

    const pass = advance(afterEclipse, { type: "PASS_PRIORITY", playerId: P1 });
    expect(pass.ok).toBe(false);
    if (pass.ok) return;
    expect(pass.error).toBe("PENDING_DECISION");
  });

  it("lets P2 pass and respond after a JSON round-trip of the window", () => {
    const state = withHand(
      withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10),
      P2,
      [ARCANE_SILENCE],
    );
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const cloned = JSON.parse(JSON.stringify(opened)) as typeof opened;
    expect(cloned.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });

    const afterP2Pass = expectOk(
      advance(cloned, { type: "PASS_PRIORITY", playerId: P2 }),
    );
    expect(afterP2Pass.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
      consecutivePasses: 1,
    });

    const reopened = JSON.parse(JSON.stringify(opened)) as typeof opened;
    const silenced = expectOk(
      advance(reopened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(reopened, P2, 0),
      }),
    );
    expect(silenced.chainStack).toHaveLength(2);
  });
});
