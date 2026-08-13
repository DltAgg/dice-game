import { describe, expect, it } from "vitest";
import {
  BLACK_PLAGUE,
  CALCULATED_SACRIFICE,
  VENOMOUS_FANGS,
  WAR_AXE,
} from "../content/cards.js";
import { FORBIDDEN_HERITAGE } from "../content/faces.js";
import { asAttackId } from "../model/ids.js";
import { equipmentOf, graveyardOf } from "../rules/cards.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withActivePlayer,
  withDamage,
  withEnergy,
  withHand,
  withPhase,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const SHIELD_STRIKE = asAttackId("attack-shield-strike");

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

const forgeReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("opponent-die forging", () => {
  it("installs a face on an opposing die when the card asks for it", () => {
    const state = forgeReady([BLACK_PLAGUE]);
    const dieId = state.players[P2]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected an opposing die");

    const result = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );

    expect(result.dice[dieId]?.slots[4]?.faceCardId).toBe(FORBIDDEN_HERITAGE);
    expect(result.dice[dieId]?.slots[4]?.faceCardOwnerId).toBe(P1);
  });

  it("refuses to forge an own-die card onto an opposing die", () => {
    const state = forgeReady([WAR_AXE]);
    const dieId = state.players[P2]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected an opposing die");

    const result = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });
});

describe("equipment", () => {
  it("attaches to a friendly creature and stays on the board", () => {
    const state = actionsReady([WAR_AXE]);
    const creatureId = creatureIdAt(state, P1, 0);

    const result = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: creatureId,
      }),
    );

    const [axe] = equipmentOf(result, P1);
    expect(axe?.zone).toBe("equipment");
    expect(axe?.attachedToCreatureId).toBe(creatureId);
    expect(result.creatures[creatureId]?.equipmentIds).toEqual([axe?.id]);
    expect(eventTypes(result)).toContain("equipment-attached");
  });

  it("lets Venomous Fangs attach even though its toxin trigger is deferred", () => {
    const state = actionsReady([VENOMOUS_FANGS]);
    const creatureId = creatureIdAt(state, P1, 0);

    const result = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: creatureId,
      }),
    );

    expect(equipmentOf(result, P1)[0]?.attachedToCreatureId).toBe(creatureId);
    expect(result.creatures[creatureId]?.equipmentIds).toHaveLength(1);
  });

  it("refuses to equip a friendly-only card onto an opponent", () => {
    const state = actionsReady([WAR_AXE]);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredTargetCreatureId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("lets Black Plague attach to an opposing creature", () => {
    const state = actionsReady([BLACK_PLAGUE]);
    const targetId = creatureIdAt(state, P2, 0);

    const result = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: targetId,
      }),
    );

    expect(result.creatures[targetId]?.equipmentIds).toHaveLength(1);
    expect(equipmentOf(result, P1)[0]?.attachedToCreatureId).toBe(targetId);
  });

  it("adds War Axe's bonus to the bearer's attack damage", () => {
    const base = actionsReady([WAR_AXE]);
    const attackerId = creatureIdAt(base, P1, 0);
    const targetId = creatureIdAt(base, P2, 0);

    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: attackerId,
      }),
    );

    const combat = withTokens(
      withEnergy(withPhase(equipped, "combat"), P1, 10),
      attackerId,
      { martial: 1 },
    );

    const after = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: SHIELD_STRIKE,
        targetId,
      }),
    );

    // Shield Strike is 3; War Axe adds 1.
    expect(after.creatures[targetId]?.damage).toBe(4);
  });

  it("returns equipment to the graveyard when Calculated Sacrifice destroys it", () => {
    const base = actionsReady([WAR_AXE]);
    const hostId = creatureIdAt(base, P1, 0);

    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: hostId,
      }),
    );

    const p2Turn = withEnergy(
      withHand(withPhase(withActivePlayer(equipped, P2), "actions"), P2, [CALCULATED_SACRIFICE]),
      P2,
      10,
    );

    const after = expectOk(
      advance(p2Turn, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(p2Turn, P2, 0),
        declaredTargetCreatureId: hostId,
      }),
    );

    expect(after.creatures[hostId]?.equipmentIds).toEqual([]);
    expect(equipmentOf(after, P1)).toEqual([]);
    expect(graveyardOf(after, P1).some((card) => card.cardId === WAR_AXE)).toBe(true);
    expect(eventTypes(after)).toContain("equipment-destroyed");
  });

  it("drops equipment when the host creature is defeated", () => {
    const base = actionsReady([WAR_AXE]);
    const hostId = creatureIdAt(base, P1, 0);

    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: hostId,
      }),
    );

    const combat = withTokens(
      withEnergy(
        withPhase(withActivePlayer(withDamage(equipped, hostId, 9), P2), "combat"),
        P2,
        10,
      ),
      creatureIdAt(equipped, P2, 0),
      { martial: 1 },
    );

    const after = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P2,
        attackerId: creatureIdAt(combat, P2, 0),
        attackId: SHIELD_STRIKE,
        targetId: hostId,
      }),
    );

    expect(after.creatures[hostId]?.defeated).toBe(true);
    expect(after.creatures[hostId]?.equipmentIds).toEqual([]);
    expect(graveyardOf(after, P1).some((card) => card.cardId === WAR_AXE)).toBe(true);
  });
});
