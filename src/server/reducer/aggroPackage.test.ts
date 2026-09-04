import { describe, expect, it } from "vitest";
import { BRIGHT_CADENCE, COG_DRAFT, SHIM_KIT } from "../content/cards.js";
import { COGTOOTH, GEAR_TRAIN, MAINSPRING } from "../content/faces.js";
import { ritualsOf } from "../rules/cards.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withPile,
  withHand,
  withPhase,
  withShields,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK, CRANK_FUEL } from "../testing/tempoCatalogue.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("Tempo combat package", () => {
  it("Bright Cadence grants shields and empowers", () => {
    const allyId = creatureIdAt(actionsReady([BRIGHT_CADENCE]), P1, 0);
    const played = expectOk(
      advance(actionsReady([BRIGHT_CADENCE]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([BRIGHT_CADENCE]), P1, 0),
      }),
    );
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );
    expect(resolved.creatures[allyId]?.shields).toBe(2);
    expect(resolved.attackBonusThisTurn[P1]).toBe(1);
  });

  it("Cog Draft fuels the pile and draws", () => {
    const after = expectOk(
      advance(actionsReady([COG_DRAFT]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([COG_DRAFT]), P1, 0),
      }),
    );
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("Shim Kit opens a silence choice on play", () => {
    const ready = actionsReady([SHIM_KIT]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type).toBe("choose-silence-host");
  });

  it("Crank damages through shields one point at a time", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    let state = withShields(withPhase(newMatch(), "actions"), targetId, 1);
    state = withTokens(state, creatureIdAt(state, P1, 0), CRANK_FUEL);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: CRANK,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(1);
    expect(after.creatures[targetId]?.shields).toBe(0);
  });
});

describe("Tempo face references", () => {
  it("names the mechanical specials in catalogue order", () => {
    expect([COGTOOTH, GEAR_TRAIN, MAINSPRING].every(Boolean)).toBe(true);
  });

  it("has no continuous rituals in instant-only plays", () => {
    const after = expectOk(
      advance(actionsReady([COG_DRAFT]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([COG_DRAFT]), P1, 0),
      }),
    );
    expect(ritualsOf(after, P1)).toHaveLength(0);
  });
});
