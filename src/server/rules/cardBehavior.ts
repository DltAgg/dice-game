import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId, DieId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { isLivingReserve } from "./fighters.js";

export interface CardPlayIntent {
  readonly mode: "normal" | "exceptional";
  readonly dieId: DieId | null;
  readonly slotIndex: number | null;
  readonly faceCardId: FaceCardId | null;
  readonly techniqueId: string | null;
  readonly targetCreatureId: CreatureId | null;
}

/**
 * Legality for a card that sets `behavior`. Cards that omit it keep the
 * spec `008` play path. Timing is the reaction window; exceptional mode is
 * the Meter bypass of that window.
 */
export function behaviorPlayError(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
  intent: CardPlayIntent,
): GameError | null {
  if (definition.behavior === undefined) return null;

  const pending = state.pendingDecision;
  const inWindow =
    pending?.type === "reaction-priority" && pending.priorityPlayerId === playerId;

  if (intent.mode === "exceptional") {
    if (definition.exceptionalMeterCost === undefined || definition.exceptionalMeterCost <= 0) {
      return "INVALID_TARGET";
    }
  } else if (!inWindow) {
    return "INVALID_PHASE";
  }

  if (definition.behavior === "response") {
    const opponentObject = state.chainStack.some(
      (link) => link.controllerId !== playerId && !link.negated,
    );
    if (!opponentObject) return "INVALID_CHAIN_TARGET";
    return null;
  }

  return modifyContextError(state, playerId, definition, intent);
}

function modifyContextError(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
  intent: CardPlayIntent,
): GameError | null {
  const subject = definition.modifySubject;
  if (subject === undefined) return "CARD_HAS_NO_EFFECT";

  if (subject === "tag") {
    if (intent.mode !== "exceptional") return "INVALID_PHASE";
    const player = state.players[playerId];
    if (player === undefined) return "UNKNOWN_ENTITY";
    if (intent.targetCreatureId === null) return "INVALID_TARGET";
    if (!isLivingReserve(state, player, intent.targetCreatureId)) return "INVALID_TARGET";
    return null;
  }

  if (subject === "roll" || subject === "die") {
    if (intent.dieId === null || intent.slotIndex === null) return "INVALID_TARGET";
    const die = state.dice[intent.dieId];
    if (die === undefined) return "UNKNOWN_ENTITY";
    if (intent.slotIndex < 0 || intent.slotIndex >= die.slots.length) return "INVALID_TARGET";
    if (subject === "roll" && die.rolledSlotIndex === null) return "INVALID_TARGET";
    if (subject === "die") {
      if (intent.faceCardId === null || getFaceCard(intent.faceCardId) === undefined) {
        return "UNKNOWN_ENTITY";
      }
    }
    return null;
  }

  if (subject === "moveset") {
    if (intent.targetCreatureId === null || intent.techniqueId === null) return "INVALID_TARGET";
    const creature = state.creatures[intent.targetCreatureId];
    if (creature === undefined || creature.defeated) return "INVALID_TARGET";
    const techniques = getCreatureDefinition(creature.definitionId)?.techniques ?? [];
    if (!techniques.some((technique) => technique.id === intent.techniqueId)) {
      return "INVALID_TARGET";
    }
    return null;
  }

  const redirectable = state.chainStack.some(
    (link) =>
      (link.kind === "combat-action" || link.kind === "attack") &&
      (link.declaredTargetCreatureId !== null || link.attackTargetId !== null),
  );
  if (!redirectable) return "INVALID_TARGET";
  if (intent.targetCreatureId === null) return "INVALID_TARGET";
  const next = state.creatures[intent.targetCreatureId];
  if (next === undefined || next.defeated) return "INVALID_TARGET";
  return null;
}
