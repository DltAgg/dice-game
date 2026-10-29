import {
  dieForCreature,
  legalFaceActions,
  matchingTechniques,
  sequenceMeterAffordable,
  sequenceRoleFits,
  showingFaceCard,
  type CreatureId,
  type DieId,
  type FaceCardDefinition,
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
    const refusal = sequenceFaceRefusal(state, playerId, creatureId);
    if (refusal !== null) return { kind: "pending", message: refusal };
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

/** Why a sequence face cannot be dropped as a hit. Null when that is not the reason. */
function sequenceFaceRefusal(
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
): string | null {
  const die = dieForCreature(state, creatureId);
  const face = die === undefined ? undefined : showingFaceCard(state, die.id);
  const role = face?.sequenceRole;
  if (face === undefined || role === undefined) return null;
  if (state.aggressorPlayerId !== playerId) {
    return `${face.name} can only hit while you are on offense.`;
  }
  if (!sequenceRoleFits(state.offensiveState, role)) {
    if (role === "extender" && starterHitWaiting(state, playerId)) {
      return `The current hit has to resolve before ${face.name} can extend.`;
    }
    if (role === "extender") return `${face.name} is an extender. Land a starter first.`;
    if (role === "finisher") return `${face.name} is a finisher. Land a starter first.`;
    if (role === "starter") return `${face.name} is a starter. It only opens the sequence.`;
    return `${face.name} can't hit right now.`;
  }
  if (!sequenceMeterAffordable(state, playerId, face.meterCost)) {
    return `${face.name} needs ${String(face.meterCost ?? 0)} Meter.`;
  }
  return null;
}

/**
 * A starter combat action is already on the chain, so combo has not started.
 * Legality stays with `legalFaceActions`; this only chooses the pending sentence.
 */
function starterHitWaiting(state: GameState, playerId: PlayerId): boolean {
  if (state.offensiveState !== "open") return false;
  return state.chainStack.some(
    (link) =>
      link.controllerId === playerId &&
      link.kind === "combat-action" &&
      link.sequenceRole === "starter" &&
      !link.negated,
  );
}

/** Tray label for a showing face that `legalFaceActions` already allows as a hit. */
export function hitButtonLabel(face: FaceCardDefinition | undefined, name: string): string {
  if (face?.sequenceRole === "finisher") return `Finisher · ${name}`;
  if (face?.sequenceRole === "starter") return `Starter · ${name}`;
  if (face?.sequenceRole === "extender") return `Extender · ${name}`;
  return `Hit · ${name}`;
}
