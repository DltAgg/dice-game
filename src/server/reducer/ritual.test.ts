import { describe, expect, it } from "vitest";
import { DAYBREAK_RITE } from "../content/cards.js";
import type { CardDuration } from "../model/cards.js";
import { asCardInstanceId, asEffectInstanceId, type CardInstanceId } from "../model/ids.js";
import type { ChainLink, GameState } from "../model/state.js";
import { graveyardOf, ritualsOf } from "../rules/cards.js";
import { newMatch, P1 } from "../testing/scenario.js";
import { finishRitualActivation } from "./commands/ritual.js";
import { createDraft } from "./draft.js";

function withReadyRitual(state: GameState): { state: GameState; instanceId: CardInstanceId } {
  const player = state.players[P1];
  if (player === undefined) throw new Error("player");
  const instanceId = asCardInstanceId("test-ritual-duration");
  return {
    instanceId,
    state: {
      ...state,
      cards: {
        ...state.cards,
        [instanceId]: {
          id: instanceId,
          cardId: DAYBREAK_RITE,
          ownerId: P1,
          zone: "ritual",
          attachedToCreatureId: null,
          attachedToFaceCardId: null,
          ritualOrientation: "ready",
        },
      },
      players: {
        ...state.players,
        [P1]: { ...player, ritual: [...player.ritual, instanceId] },
      },
    },
  };
}

function ritualActivateLink(cardInstanceId: CardInstanceId, ritualDuration: CardDuration | null): ChainLink {
  return {
    id: asEffectInstanceId("test-ritual-activate"),
    kind: "ritual-activate",
    controllerId: P1,
    cardInstanceId,
    effects: [],
    sourceCreatureId: null,
    declaredTargetCreatureId: null,
    equipTargetCreatureId: null,
    overloadFaceCardId: null,
    attackerId: null,
    attackId: null,
    attackTargetId: null,
    attackEffect: null,
    attackFollowUpEffects: [],
    ritualDuration,
    negated: false,
  };
}

describe("finishRitualActivation", () => {
  it("exhausts a continuous-duration ritual on the field", () => {
    const { state, instanceId } = withReadyRitual(newMatch());
    const draft = createDraft(state);
    finishRitualActivation(draft, ritualActivateLink(instanceId, "continuous"));

    expect(ritualsOf(draft, P1).some((card) => card.id === instanceId)).toBe(true);
    expect(draft.cards[instanceId]?.ritualOrientation).toBe("exhausted");
    expect(graveyardOf(draft, P1).some((card) => card.id === instanceId)).toBe(false);
  });

  it("sends a leftover instant-duration ritual to the graveyard", () => {
    const { state, instanceId } = withReadyRitual(newMatch());
    const draft = createDraft(state);
    finishRitualActivation(draft, ritualActivateLink(instanceId, "instant"));

    expect(ritualsOf(draft, P1).some((card) => card.id === instanceId)).toBe(false);
    expect(graveyardOf(draft, P1).some((card) => card.id === instanceId)).toBe(true);
  });
});
