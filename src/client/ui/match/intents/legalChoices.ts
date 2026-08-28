import {
  diceOf,
  livingCreaturesOf,
  opponentOf,
  replayableGraveyardTactics,
  type CardInstance,
  type CreatureId,
  type FaceCardId,
  type GameState,
  type PlayerId,
} from "@server";

export function replayableGyCards(state: GameState, playerId: PlayerId): readonly CardInstance[] {
  return replayableGraveyardTactics(state, playerId).flatMap((id) => {
    const card = state.cards[id];
    return card === undefined ? [] : [card];
  });
}

export function opposingOverloadedFaces(
  state: GameState,
  controllerId: PlayerId,
): readonly {
  readonly faceCardId: FaceCardId;
  readonly overloads: readonly CardInstance[];
}[] {
  const opponentId = opponentOf(state, controllerId);
  const seen = new Set<FaceCardId>();
  const result: { faceCardId: FaceCardId; overloads: readonly CardInstance[] }[] = [];
  for (const die of diceOf(state, opponentId)) {
    for (const slot of die.slots) {
      if (seen.has(slot.faceCardId)) continue;
      const overloads = Object.values(state.cards).filter(
        (card) => card.zone === "overload" && card.attachedToFaceCardId === slot.faceCardId,
      );
      if (overloads.length <= 0) continue;
      seen.add(slot.faceCardId);
      result.push({ faceCardId: slot.faceCardId, overloads });
    }
  }
  return result;
}

export function legalSplitDamageTargets(
  state: GameState,
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "split-damage" }>,
): readonly CreatureId[] {
  return Object.values(state.creatures)
    .filter((creature) => {
      if (creature.defeated) return false;
      if (pending.attackerId === null) return true;
      if (creature.ownerId === pending.controllerId) return false;
      if (creature.position === "back" && !pending.range) {
        const front = livingCreaturesOf(state, creature.ownerId).filter(
          (candidate) => candidate.position === "frontline",
        );
        if (front.length > 0) return false;
      }
      return true;
    })
    .map((creature) => creature.id);
}
