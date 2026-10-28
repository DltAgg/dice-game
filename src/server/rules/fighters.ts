import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import type { AttackDefinition, CreatureState } from "../model/creatures.js";
import type { DieState } from "../model/dice.js";
import type { EffectDefinition } from "../model/effects.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameState, PlayerState } from "../model/state.js";
import type { Technique } from "../model/techniques.js";
import { opponentOf } from "./creatures.js";
import { sequenceRoleFits } from "./offensive.js";

export type AssistHitEffect = Extract<EffectDefinition, { readonly type: "assist-hit" }>;

/** The one sequence hit on an Assist, when that Assist is a hit. */
export function assistHitEffect(
  effects: readonly EffectDefinition[],
): AssistHitEffect | "many" | null {
  let found: AssistHitEffect | null = null;
  for (const effect of effects) {
    if (effect.type !== "assist-hit") continue;
    if (found !== null) return "many";
    found = effect;
  }
  return found;
}

export function dieForCreature(
  state: Pick<GameState, "players" | "dice" | "creatures">,
  creatureId: CreatureId,
): DieState | undefined {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return undefined;
  for (const die of Object.values(state.dice)) {
    if (die.boundCreatureId === creatureId && die.ownerId === creature.ownerId) return die;
  }
  const player = state.players[creature.ownerId];
  if (player === undefined) return undefined;
  const index = player.creatureIds.indexOf(creatureId);
  if (index < 0) return undefined;
  const dieId = player.dieIds[index];
  return dieId === undefined ? undefined : state.dice[dieId];
}

export function showingTechnique(
  state: Pick<GameState, "players" | "dice" | "creatures">,
  creatureId: CreatureId,
): Technique | null {
  const die = dieForCreature(state, creatureId);
  if (die === undefined || die.rolledSlotIndex === null) return null;
  const slot = die.slots[die.rolledSlotIndex];
  if (slot === undefined) return null;
  return getFaceCard(slot.faceCardId)?.technique ?? null;
}

export function isActiveFighter(
  player: PlayerState,
  creatureId: CreatureId,
): boolean {
  return player.activeCreatureId === creatureId;
}

export function isLivingReserve(
  state: Pick<GameState, "creatures">,
  player: PlayerState,
  creatureId: CreatureId,
): boolean {
  if (player.activeCreatureId === creatureId) return false;
  if (!player.creatureIds.includes(creatureId)) return false;
  const creature = state.creatures[creatureId];
  return creature !== undefined && !creature.defeated;
}

export function techniquesFuelAttack(
  state: Pick<GameState, "players" | "dice" | "creatures">,
  attackerId: CreatureId,
  attack: AttackDefinition,
): boolean {
  const required = attack.requiredTechniques;
  if (required === undefined || required.length === 0) return true;
  const showing = showingTechnique(state, attackerId);
  if (showing === null) return false;
  return required.every((technique) => technique === showing);
}

export function assistKey(creatureId: CreatureId): string {
  return `assist:${creatureId}`;
}

/**
 * Own turn in the actions phase, or priority against an opponent’s hit or
 * technique. A KOed Reserve may Assist. The Active Fighter may not. Meter is
 * required only when `exceptionalAssistMeter` is greater than 0. Spec `030`.
 *
 * An Assist whose effect is a hit uses that hit’s sequence role. An extender
 * is legal only in combo, while you are the Aggressor, with no Chain open.
 */
export function assistDeclarationError(
  state: Pick<
    GameState,
    | "status"
    | "phase"
    | "pendingDecision"
    | "activePlayerId"
    | "aggressorPlayerId"
    | "offensiveState"
    | "chainStack"
    | "players"
    | "creatures"
    | "playerOrder"
  >,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): GameError | null {
  if (state.status === "finished") return "GAME_FINISHED";

  const player = state.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (player.activeCreatureId === reserveCreatureId) return "INVALID_TARGET";
  if (!player.creatureIds.includes(reserveCreatureId)) return "INVALID_TARGET";

  const creature = state.creatures[reserveCreatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  const definition = getCreatureDefinition(creature.definitionId);
  const effects = definition?.assistEffects ?? [];
  if (definition === undefined || effects.length === 0) return "CARD_HAS_NO_EFFECT";
  const hit = assistHitEffect(effects);
  if (hit === "many") return "INVALID_TARGET";

  const pending = state.pendingDecision;
  if (hit !== null) {
    if (pending !== null) return "INVALID_PHASE";
    if (state.phase !== "actions") return "INVALID_PHASE";
    if (state.activePlayerId !== playerId) return "NOT_ACTIVE_PLAYER";
    if (state.aggressorPlayerId !== playerId) return "INVALID_TARGET";
    if (!sequenceRoleFits(state.offensiveState, hit.sequenceRole)) return "INVALID_TARGET";
    if (opponentActiveId(state, playerId) === null) return "INVALID_TARGET";
  } else if (pending?.type === "reaction-priority") {
    if (pending.priorityPlayerId !== playerId) return "NOT_PRIORITY_PLAYER";
    const opposed = state.chainStack.some(
      (link) =>
        link.kind === "combat-action" &&
        link.sequenceRole !== undefined &&
        link.controllerId !== playerId,
    );
    if (!opposed) return "INVALID_PHASE";
  } else if (pending !== null) {
    return "PENDING_DECISION";
  } else if (state.phase !== "actions") {
    return "INVALID_PHASE";
  } else if (state.activePlayerId !== playerId) {
    return "NOT_ACTIVE_PLAYER";
  }

  if (player.spentOncePerTurnKeys.includes(assistKey(reserveCreatureId))) {
    return "ALREADY_USED";
  }

  const cost = definition.exceptionalAssistMeter ?? 0;
  if (cost > 0 && player.meter < cost) return "INSUFFICIENT_METER";
  return null;
}

export function cardRestrictionError(
  state: Pick<GameState, "players" | "creatures">,
  playerId: PlayerId,
  definition: CardDefinition,
): "INVALID_TARGET" | null {
  const player = state.players[playerId];
  if (player === undefined) return "INVALID_TARGET";
  const living = player.creatureIds
    .map((id) => state.creatures[id])
    .filter((creature): creature is CreatureState => creature !== undefined && !creature.defeated);

  if (definition.fighterRestriction !== undefined) {
    if (!living.some((creature) => creature.definitionId === definition.fighterRestriction)) {
      return "INVALID_TARGET";
    }
  }
  if (definition.archetypeRestriction !== undefined) {
    const needed = definition.archetypeRestriction;
    const ok = living.some((creature) => {
      const def = getCreatureDefinition(creature.definitionId);
      return def?.archetype === needed;
    });
    if (!ok) return "INVALID_TARGET";
  }
  return null;
}

export function opponentActiveId(
  state: Pick<GameState, "players" | "playerOrder">,
  playerId: PlayerId,
): CreatureId | null {
  const opponentId = opponentOf(state, playerId);
  return state.players[opponentId]?.activeCreatureId ?? null;
}
