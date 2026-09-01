import { describe, expect, it } from "vitest";
import { IDLER_GEAR, QUICKSET_JIG } from "../content/cards.js";
import { COGTOOTH } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { equipmentOf, graveyardOf, overloadsOf } from "../rules/cards.js";
import { createDraft } from "./draft.js";
import { drainResolution, pushEffect } from "./resolution.js";
import { advance } from "./reduce.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withActivePlayer,
  withHand,
  withPhase,
  withPile,
} from "../testing/scenario.js";

const actionsFor = (playerId: typeof P1 | typeof P2, cards: Parameters<typeof withHand>[2]) =>
  withActivePlayer(
    withPile(withHand(withPhase(newMatch(), "actions"), playerId, cards), playerId, 10),
    playerId,
  );

function dieIdOf(state: GameState, playerId: typeof P1 | typeof P2, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function installFace(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  faceId: typeof COGTOOTH,
): GameState {
  const dieId = dieIdOf(state, playerId);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot: DieState["slots"][number], index) =>
    index === 0 ? { ...slot, faceCardId: faceId, faceCardOwnerId: playerId } : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function attachP2Equipment(): GameState {
  const ready = actionsFor(P2, [QUICKSET_JIG]);
  const bearerId = creatureIdAt(ready, P2, 0);
  return resolveOpenChain(
    expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(ready, P2, 0),
        declaredTargetCreatureId: bearerId,
      }),
    ),
  );
}

function attachP2Overload(): GameState {
  const ready = installFace(actionsFor(P2, [IDLER_GEAR]), P2, COGTOOTH);
  return resolveOpenChain(
    expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(ready, P2, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    ),
  );
}

describe("choose-opponent-equipment / choose-opponent-overload", () => {
  it("opens choose-equipment for an opposing attached piece and destroys it", () => {
    const equipped = attachP2Equipment();
    const [gearId] = equipmentOf(equipped, P2).map((card) => card.id);
    if (gearId === undefined) throw new Error("equipment");

    const draft = createDraft(withActivePlayer(equipped, P1));
    pushEffect(draft, P1, {
      type: "destroy-equipment",
      target: { kind: "choose-opponent-equipment" },
    }, null, null);
    drainResolution(draft);

    expect(draft.pendingDecision?.type).toBe("choose-equipment");
    expect(draft.pendingDecision?.type === "choose-equipment" && draft.pendingDecision.filter).toBe(
      "opponent",
    );

    const after = expectOk(
      advance(draft, {
        type: "RESOLVE_CHOOSE_EQUIPMENT",
        playerId: P1,
        cardInstanceId: gearId,
      }),
    );
    expect(equipmentOf(after, P2)).toHaveLength(0);
    expect(graveyardOf(after, P2).some((card) => card.id === gearId)).toBe(true);
  });

  it("whiffs choose-opponent-equipment when the opponent has no gear", () => {
    const draft = createDraft(withPhase(newMatch(), "actions"));
    pushEffect(draft, P1, {
      type: "destroy-equipment",
      target: { kind: "choose-opponent-equipment" },
    }, null, null);
    drainResolution(draft);
    expect(draft.pendingDecision).toBeNull();
    expect(equipmentOf(draft, P2)).toHaveLength(0);
  });

  it("refuses own equipment as a choose-opponent-equipment pick", () => {
    const p2Gear = attachP2Equipment();
    const p1Ready = withPile(
      withHand(withActivePlayer(p2Gear, P1), P1, [QUICKSET_JIG]),
      P1,
      10,
    );
    const ownBearer = creatureIdAt(p1Ready, P1, 0);
    const both = resolveOpenChain(
      expectOk(
        advance(p1Ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(p1Ready, P1, 0),
          declaredTargetCreatureId: ownBearer,
        }),
      ),
    );
    const ownId = equipmentOf(both, P1)[0]?.id;
    if (ownId === undefined) throw new Error("own equipment");

    const draft = createDraft(both);
    pushEffect(draft, P1, {
      type: "destroy-equipment",
      target: { kind: "choose-opponent-equipment" },
    }, null, null);
    drainResolution(draft);

    const denied = advance(draft, {
      type: "RESOLVE_CHOOSE_EQUIPMENT",
      playerId: P1,
      cardInstanceId: ownId,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("INVALID_CHOICE");
  });

  it("opens choose-overload for an opposing attached piece and destroys it", () => {
    const attached = attachP2Overload();
    const [overloadId] = overloadsOf(attached, P2).map((card) => card.id);
    if (overloadId === undefined) throw new Error("overload");

    const draft = createDraft(withActivePlayer(attached, P1));
    pushEffect(draft, P1, {
      type: "destroy-overload",
      target: { kind: "choose-opponent-overload" },
    }, null, null);
    drainResolution(draft);

    expect(draft.pendingDecision?.type).toBe("choose-overload");

    const after = expectOk(
      advance(draft, {
        type: "RESOLVE_CHOOSE_OVERLOAD",
        playerId: P1,
        cardInstanceId: overloadId,
      }),
    );
    expect(overloadsOf(after, P2)).toHaveLength(0);
    expect(graveyardOf(after, P2).some((card) => card.id === overloadId)).toBe(true);
  });

  it("whiffs choose-opponent-overload when the opponent has no overload", () => {
    const draft = createDraft(withPhase(newMatch(), "actions"));
    pushEffect(draft, P1, {
      type: "destroy-overload",
      target: { kind: "choose-opponent-overload" },
    }, null, null);
    drainResolution(draft);
    expect(draft.pendingDecision).toBeNull();
    expect(overloadsOf(draft, P2)).toHaveLength(0);
  });
});
