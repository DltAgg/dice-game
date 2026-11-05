import {
  assignTechniqueInputs,
  dieForCreature,
  fighterAttackBanned,
  getCreatureDefinition,
  legalFaceActions,
  matchingTechniques,
  sequenceActionUsed,
  sequenceMeterAffordable,
  sequenceRoleFits,
  showingFaceCard,
  type CreatureId,
  type DieId,
  type FaceCardDefinition,
  type GameState,
  type MatchingTechnique,
  type PlayerId,
  type SequenceRole,
} from "@server";

export interface ShowingFaceChip {
  readonly creatureId: CreatureId;
  readonly dieId: DieId;
  readonly fighterName: string;
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
    const creature = state.creatures[creatureId];
    const die = dieForCreature(state, creatureId);
    const face = die === undefined ? undefined : showingFaceCard(state, die.id);
    if (creature === undefined || die === undefined || face === undefined) continue;
    chips.push({
      creatureId,
      dieId: die.id,
      fighterName: getCreatureDefinition(creature.definitionId)?.name ?? "Fighter",
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
  const banned = attackBanRefusal(state, primary);
  if (banned !== null) return { kind: "pending", message: banned };
  const secondaryDie = dieForCreature(state, secondaryCreature);
  if (secondaryDie === undefined) {
    return { kind: "pending", message: "Those faces are not a Technique." };
  }
  const matches = matchingTechniques(state, playerId, primary).filter(
    (match) => match.secondaryDieId === secondaryDie.id,
  );
  if (matches.length === 0) {
    const blocked = techniquePairRefusal(state, playerId, primary, secondaryDie.id);
    return { kind: "pending", message: blocked ?? "Those faces are not a Technique." };
  }
  return { kind: "technique", creatureId: primary, matches };
}

function attackBanRefusal(state: GameState, creatureId: CreatureId): string | null {
  if (!fighterAttackBanned(state.creatures[creatureId], state.turn)) return null;
  const definitionId = state.creatures[creatureId]?.definitionId;
  const name =
    definitionId === undefined
      ? "This Fighter"
      : (getCreatureDefinition(definitionId)?.name ?? "This Fighter");
  return `${name} cannot attack this turn.`;
}

/**
 * The two faces are a Technique that cannot be declared yet, or that Technique
 * belongs to a Fighter who is not Active.
 */
function techniquePairRefusal(
  state: GameState,
  playerId: PlayerId,
  activeId: CreatureId,
  secondaryDieId: DieId,
): string | null {
  const onActive = inputMatch(state, activeId, secondaryDieId);
  if (onActive !== null) {
    return blockedTechniqueReason(state, playerId, onActive.name, onActive.role, onActive.techniqueId);
  }
  const player = state.players[playerId];
  const activeDie = dieForCreature(state, activeId);
  if (player === undefined || activeDie === undefined) return null;
  for (const creatureId of player.creatureIds) {
    if (creatureId === activeId) continue;
    const onReserve = inputMatch(state, creatureId, activeDie.id);
    if (onReserve === null) continue;
    const definitionId = state.creatures[creatureId]?.definitionId;
    const fighter =
      definitionId === undefined
        ? "That Fighter"
        : (getCreatureDefinition(definitionId)?.name ?? "That Fighter");
    return `${onReserve.name} needs ${fighter} to be the Active Fighter.`;
  }
  return null;
}

function inputMatch(
  state: GameState,
  creatureId: CreatureId,
  otherDieId: DieId,
): {
  name: string;
  role: SequenceRole | undefined;
  techniqueId: string;
} | null {
  const die = dieForCreature(state, creatureId);
  const definitionId = state.creatures[creatureId]?.definitionId;
  const definition = definitionId === undefined ? undefined : getCreatureDefinition(definitionId);
  if (die === undefined || definition === undefined) return null;
  for (const technique of definition.techniques ?? []) {
    if (assignTechniqueInputs(state, technique, die.id, otherDieId) === null) continue;
    return {
      name: technique.name,
      role: technique.sequenceRole,
      techniqueId: technique.id,
    };
  }
  return null;
}

function blockedTechniqueReason(
  state: GameState,
  playerId: PlayerId,
  name: string,
  role: SequenceRole | undefined,
  techniqueId: string,
): string | null {
  if (sequenceActionUsed(state, `technique:${techniqueId}`)) {
    return `${name} was already used this sequence.`;
  }
  if (role !== undefined && state.aggressorPlayerId !== playerId) {
    return `${name} can only hit while you are on offense.`;
  }
  if (role !== undefined && !sequenceRoleFits(state.offensiveState, role)) {
    return roleBlock(name, role, state, playerId);
  }
  return null;
}

function roleBlock(name: string, role: SequenceRole, state: GameState, playerId: PlayerId): string {
  if (role === "extender" && starterHitWaiting(state, playerId)) {
    return `The current hit has to resolve before ${name} can extend.`;
  }
  if (role === "extender") return `${name} is an extender. Land a starter first.`;
  if (role === "finisher") return `${name} is a finisher. Land a starter first.`;
  if (role === "starter") return `${name} is a starter. It only opens the sequence.`;
  return `${name} can't hit right now.`;
}

/** Why a sequence face cannot be dropped as a hit. Null when that is not the reason. */
function sequenceFaceRefusal(
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
): string | null {
  const banned = attackBanRefusal(state, creatureId);
  if (banned !== null) return banned;
  const die = dieForCreature(state, creatureId);
  const face = die === undefined ? undefined : showingFaceCard(state, die.id);
  const role = face?.sequenceRole;
  if (face === undefined || role === undefined) return null;
  if (sequenceActionUsed(state, `face:${face.id}`)) {
    return `${face.name} was already used this sequence.`;
  }
  if (state.aggressorPlayerId !== playerId) {
    return `${face.name} can only hit while you are on offense.`;
  }
  if (!sequenceRoleFits(state.offensiveState, role)) {
    return roleBlock(face.name, role, state, playerId);
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
