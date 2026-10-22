import {
  dieForCreature,
  legalFaceActions,
  matchingTechniques,
  showingFaceCard,
  type CreatureId,
  type DieId,
  type GameState,
  type MatchingTechnique,
  type PlayerId,
} from "@server";

export interface ShowingFaceChip {
  readonly creatureId: CreatureId;
  readonly dieId: DieId;
  readonly name: string;
  readonly active: boolean;
}

export type StagedShowingDrop =
  | { readonly kind: "empty" }
  | { readonly kind: "hit"; readonly creatureId: CreatureId }
  | {
      readonly kind: "technique";
      readonly creatureId: CreatureId;
      readonly matches: readonly MatchingTechnique[];
    }
  | { readonly kind: "pending"; readonly message: string };

/** The three showing faces for this player, names taken from the rolled face. */
export function showingFaceChips(state: GameState, playerId: PlayerId): readonly ShowingFaceChip[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  const chips: ShowingFaceChip[] = [];
  for (const creatureId of player.creatureIds) {
    const die = dieForCreature(state, creatureId);
    const face = die === undefined ? undefined : showingFaceCard(state, die.id);
    if (die === undefined || face === undefined) continue;
    chips.push({
      creatureId,
      dieId: die.id,
      name: face.name,
      active: player.activeCreatureId === creatureId,
    });
  }
  return chips;
}

/**
 * One dropped face is a hit when that Fighter can legally hit with it.
 * Two dropped faces are a Technique when one is the Active Fighter and the
 * other matches one of that Fighter's Techniques.
 */
export function stagedShowingDrop(
  state: GameState,
  playerId: PlayerId,
  slots: readonly [CreatureId | null, CreatureId | null],
): StagedShowingDrop {
  const player = state.players[playerId];
  if (player === undefined) return { kind: "empty" };
  const filled = slots.filter((id): id is CreatureId => id !== null);
  if (filled.length === 0) return { kind: "empty" };
  const activeId = player.activeCreatureId;

  if (filled.length === 1) {
    const creatureId = filled[0]!;
    if (legalFaceActions(state, playerId).includes(creatureId)) {
      return { kind: "hit", creatureId };
    }
    if (creatureId === activeId) {
      return { kind: "pending", message: "Drop another face to use a Technique." };
    }
    return { kind: "pending", message: "That face can't hit." };
  }

  const [first, second] = slots;
  if (first === null || second === null || first === second) {
    return { kind: "pending", message: "Use the Active Fighter's face." };
  }
  const primary = first === activeId ? first : second === activeId ? second : null;
  const secondaryCreature = primary === first ? second : primary === second ? first : null;
  if (primary === null || secondaryCreature === null) {
    return { kind: "pending", message: "One face must be the Active Fighter's." };
  }
  const secondaryDie = dieForCreature(state, secondaryCreature);
  if (secondaryDie === undefined) {
    return { kind: "pending", message: "Those faces are not a Technique." };
  }
  const matches = matchingTechniques(state, playerId, primary).filter(
    (match) => match.secondaryDieId === secondaryDie.id,
  );
  if (matches.length === 0) {
    return { kind: "pending", message: "Those faces are not a Technique." };
  }
  return { kind: "technique", creatureId: primary, matches };
}
