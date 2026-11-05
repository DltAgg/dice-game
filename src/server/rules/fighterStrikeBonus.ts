import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { EffectDefinition } from "../model/effects.js";
import type { HitStrength, HitType } from "../model/hitClass.js";
import { asFaceCardId, type CreatureId, type PlayerId } from "../model/ids.js";
import type { SequenceRole } from "../model/offensive.js";
import type { ChainLink, GameState } from "../model/state.js";
import { opponentOf } from "./creatures.js";

const FACE_PREFIX = "face:";
const TECHNIQUE_PREFIX = "technique:";

/**
 * Extra damage for a combat action whose source Fighter prints a grab or
 * Technique bonus and, when it is due, a light-starter punish. The punish
 * is included once. A grab Technique does not add the grab bonus a second time.
 */
export function combatStrikeBonus(state: GameState, link: ChainLink): number {
  return grabOrTechniqueBonus(state, link) + punishBonus(state, link);
}

export function withStrikeBonus(
  effects: readonly EffectDefinition[],
  bonus: number,
): readonly EffectDefinition[] {
  if (bonus === 0) return effects;
  return effects.map((effect) => {
    if (effect.type !== "damage" && effect.type !== "assist-hit") return effect;
    return { ...effect, amount: effect.amount + bonus };
  });
}

/** Living Fighters on the other team who store a light-starter punish. */
export function lightStarterPunishTargets(
  state: GameState,
  attackerId: PlayerId,
  role: SequenceRole,
  hitStrength: HitStrength | undefined,
  hitType: HitType | undefined,
): readonly CreatureId[] {
  if (role !== "starter" || hitStrength !== "light") return [];
  if (hitType !== "punch" && hitType !== "kick") return [];
  const foe = opponentOf(state, attackerId);
  const player = state.players[foe];
  if (player === undefined) return [];
  const armed: CreatureId[] = [];
  for (const creatureId of player.creatureIds) {
    const creature = state.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    const amount = getCreatureDefinition(creature.definitionId)?.lightStarterPunish;
    if (amount === undefined || amount <= 0) continue;
    armed.push(creatureId);
  }
  return armed;
}

export function punishAmount(state: GameState, creatureId: CreatureId): number {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return 0;
  return getCreatureDefinition(creature.definitionId)?.lightStarterPunish ?? 0;
}

/** True when this creature's delayed bonus is spendable on `turn`. */
export function punishIsDue(
  state: GameState,
  creatureId: CreatureId | null,
  turn: number,
): boolean {
  if (creatureId === null) return false;
  const creature = state.creatures[creatureId];
  if (creature === undefined || creature.defeated) return false;
  const delayed = creature.delayedAttackBonus;
  return delayed !== null && delayed.availableOnTurn === turn;
}

function grabOrTechniqueBonus(state: GameState, link: ChainLink): number {
  const sourceId = link.sourceCreatureId;
  if (sourceId === null || link.sequenceRole === undefined) return 0;
  const creature = state.creatures[sourceId];
  if (creature === undefined) return 0;
  const amount = getCreatureDefinition(creature.definitionId)?.executedGrabOrTechniqueBonus ?? 0;
  if (amount <= 0) return 0;
  const actionId = link.sequenceActionId ?? "";
  if (actionId.startsWith(TECHNIQUE_PREFIX)) return amount;
  if (!actionId.startsWith(FACE_PREFIX)) return 0;
  const face = getFaceCard(asFaceCardId(actionId.slice(FACE_PREFIX.length)));
  return face?.faceType === "grab" ? amount : 0;
}

function punishBonus(state: GameState, link: ChainLink): number {
  if (link.sequenceRole === undefined || link.sourceCreatureId === null) return 0;
  if (!punishIsDue(state, link.sourceCreatureId, state.turn)) return 0;
  const delayed = state.creatures[link.sourceCreatureId]?.delayedAttackBonus;
  return delayed === null || delayed === undefined ? 0 : delayed.amount;
}
