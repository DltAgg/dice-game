import { describe, expect, it } from "vitest";
import { HOMEWARD_SEAL, IDLER_GEAR, NIGHTMARROW_PACT, QUICKSET_JIG } from "../content/cards.js";
import { COGTOOTH } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asCardInstanceId, asEffectInstanceId, type CreatureId, type DieId } from "../model/ids.js";
import type { BounceHostChoice } from "../model/targeting.js";
import type { GameState } from "../model/state.js";
import { equipmentOf, graveyardOf, handOf, overloadsOf, ritualsOf } from "../rules/cards.js";
import { createDraft } from "./draft.js";
import { applyDeferredEffect, drainResolution } from "./resolution.js";
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
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (playerId: typeof P1 | typeof P2, cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), playerId, cards), playerId, 10);

function playHomewardSeal(state: GameState): GameState {
  const ready = withActivePlayer(
    withPile(withHand(withPhase(state, "actions"), P1, [HOMEWARD_SEAL]), P1, 10),
    P1,
  );
  return expectOk(
    advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    }),
  );
}

function chooseBounce(state: GameState, choice: BounceHostChoice): GameState {
  expect(state.pendingDecision?.type).toBe("choose-bounce-card");
  return expectOk(
    advance(state, { type: "RESOLVE_CHOOSE_BOUNCE_CARD", playerId: P1, choice }),
  );
}

function eventTypesOf(state: GameState): readonly string[] {
  return state.log.map((entry) => entry.event.type);
}

function dieIdOf(state: GameState, playerId = P2, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function installFace(state: GameState, playerId: typeof P1 | typeof P2, faceCardId: typeof COGTOOTH): GameState {
  const dieId = dieIdOf(state, playerId);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((entry: DieState["slots"][number], index) =>
    index === 0 ? { ...entry, faceCardId, faceCardOwnerId: playerId } : entry,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function placeP2Ritual(): GameState {
  const ready = withActivePlayer(actionsReady(P2, [NIGHTMARROW_PACT]), P2);
  return resolveOpenChain(
    expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(ready, P2, 0),
      }),
    ),
  );
}

function attachP2Equipment(): GameState {
  const ready = withActivePlayer(actionsReady(P2, [QUICKSET_JIG]), P2);
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
  const ready = withActivePlayer(actionsReady(P2, [IDLER_GEAR]), P2);
  const installed = installFace(ready, P2, COGTOOTH);
  return resolveOpenChain(
    expectOk(
      advance(installed, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(installed, P2, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    ),
  );
}

describe("[Bounce] instant", () => {
  it("returns an opposing ritual to its owner's hand, not the graveyard", () => {
    const placed = placeP2Ritual();
    const ritual = ritualsOf(placed, P2)[0];
    if (ritual === undefined) throw new Error("ritual");
    expect(ritual.ritualOrientation).not.toBeNull();

    const after = chooseBounce(playHomewardSeal(placed), {
      host: "ritual",
      cardInstanceId: ritual.id,
    });
    expect(ritualsOf(after, P2)).toHaveLength(0);
    expect(graveyardOf(after, P2).some((card) => card.id === ritual.id)).toBe(false);
    const inHand = handOf(after, P2).find((card) => card.id === ritual.id);
    expect(inHand).toBeDefined();
    expect(inHand?.zone).toBe("hand");
    expect(inHand?.ritualOrientation).toBeNull();
    expect(eventTypesOf(after)).toContain("card-bounced");
    expect(eventTypesOf(after)).not.toContain("ritual-destroyed");
  });

  it("detaches opposing equipment from the creature into the owner's hand", () => {
    const equipped = attachP2Equipment();
    const gear = equipmentOf(equipped, P2)[0];
    if (gear === undefined) throw new Error("equipment");
    const bearerId = gear.attachedToCreatureId as CreatureId;

    const after = chooseBounce(playHomewardSeal(equipped), {
      host: "equipment",
      cardInstanceId: gear.id,
    });
    expect(equipmentOf(after, P2)).toHaveLength(0);
    expect(after.creatures[bearerId]?.equipmentIds.includes(gear.id)).toBe(false);
    expect(handOf(after, P2).some((card) => card.id === gear.id)).toBe(true);
    expect(graveyardOf(after, P2).some((card) => card.id === gear.id)).toBe(false);
    expect(eventTypesOf(after)).not.toContain("equipment-destroyed");
  });

  it("detaches opposing overload from the face into the owner's hand; face stays installed", () => {
    const attached = attachP2Overload();
    const overload = overloadsOf(attached, P2)[0];
    if (overload === undefined) throw new Error("overload");
    const dieId = dieIdOf(attached, P2);
    expect(attached.dice[dieId]?.slots[0]?.faceCardId).toBe(COGTOOTH);

    const after = chooseBounce(playHomewardSeal(attached), {
      host: "overload",
      cardInstanceId: overload.id,
    });
    expect(overloadsOf(after, P2)).toHaveLength(0);
    expect(handOf(after, P2).some((card) => card.id === overload.id)).toBe(true);
    expect(after.dice[dieId]?.slots[0]?.faceCardId).toBe(COGTOOTH);
    expect(eventTypesOf(after)).not.toContain("overload-destroyed");
  });

  it("opens a mixed chooser when at least one legal host exists", () => {
    const state = playHomewardSeal(attachP2Equipment());
    expect(state.pendingDecision?.type).toBe("choose-bounce-card");
    expect(eventTypesOf(state)).toContain("choose-bounce-card-started");
  });

  it("whiffs when the legal set is empty", () => {
    const state = playHomewardSeal(newMatch());
    expect(state.pendingDecision).toBeNull();
    expect(eventTypesOf(state)).not.toContain("card-bounced");
  });

  it("applies the same opcode from an injected overload-sourced effect", () => {
    const equipped = attachP2Equipment();
    const gear = equipmentOf(equipped, P2)[0];
    if (gear === undefined) throw new Error("equipment");
    const draft = createDraft(withActivePlayer(equipped, P1));
    applyDeferredEffect(draft, {
      id: asEffectInstanceId("eff-bounce-overload"),
      controllerId: P1,
      effect: {
        type: "bounce",
        hosts: ["equipment"],
        target: { kind: "declared-equipment" },
      },
      sourceCreatureId: null,
      declaredTargetCreatureId: null,
      declaredTargetCardInstanceId: gear.id,
      sourceDieId: null,
      sourceSlotIndex: null,
      sourceCardInstanceId: asCardInstanceId("injected-overload"),
      ignoreShield: 0,
      fromAttack: false,
    });
    drainResolution(draft);
    expect(equipmentOf(draft, P2)).toHaveLength(0);
    expect(handOf(draft, P2).some((card) => card.id === gear.id)).toBe(true);
  });

  it("does not fire on-discard", () => {
    const placed = placeP2Ritual();
    const ritual = ritualsOf(placed, P2)[0];
    if (ritual === undefined) throw new Error("ritual");
    const after = chooseBounce(playHomewardSeal(placed), {
      host: "ritual",
      cardInstanceId: ritual.id,
    });
    expect(eventTypesOf(after)).not.toContain("card-discarded");
    expect(eventTypesOf(after)).not.toContain("discard-started");
  });
});
