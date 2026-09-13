import {
  diceOf,
  opponentOf,
  replayableGraveyardTactics,
  type CardInstance,
  type CardInstanceId,
  type FaceCardId,
  type GameState,
  type PlayerId,
} from "@server";

export function replayableGyCards(
  state: GameState,
  playerId: PlayerId,
  excludeInstanceId?: CardInstanceId | null,
): readonly CardInstance[] {
  return replayableGraveyardTactics(state, playerId, excludeInstanceId).flatMap((id) => {
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
