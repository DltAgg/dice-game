import {
  diceOf,
  getCreatureDefinition,
  type DieId,
  type FaceCardId,
  type GameState,
  type PlayerId,
} from "@server";

export type DieFaceSlotView = {
  readonly slotIndex: number;
  readonly faceCardId: FaceCardId;
  readonly showing: boolean;
};

export type DieFaceGroup = {
  readonly dieId: DieId;
  /** Fighter print name when `boundCreatureId` resolves; otherwise null. */
  readonly fighterName: string | null;
  readonly slots: readonly DieFaceSlotView[];
};

/** Every die this player controls, with all face slots and the showing slot. */
export function diceFaceGroupsForPlayer(
  state: GameState,
  playerId: PlayerId,
): readonly DieFaceGroup[] {
  return diceOf(state, playerId).map((die) => {
    const creature =
      die.boundCreatureId !== null ? state.creatures[die.boundCreatureId] : undefined;
    const def =
      creature !== undefined ? getCreatureDefinition(creature.definitionId) : undefined;
    return {
      dieId: die.id,
      fighterName: def?.name ?? null,
      slots: die.slots.map((slot) => ({
        slotIndex: slot.index,
        faceCardId: slot.faceCardId,
        showing: die.rolledSlotIndex === slot.index,
      })),
    };
  });
}

export function diceCountForPlayer(state: GameState, playerId: PlayerId): number {
  return diceOf(state, playerId).length;
}
