import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import { dieForCreature, isActiveFighter } from "../../rules/fighters.js";
import {
  canUseFace,
  defaultFaceActionTarget,
  dieIsFaceActionSpent,
  faceActionKey,
  showingFaceCard,
} from "../../rules/faceActions.js";
import { emit, type Draft } from "../draft.js";
import { openCombatAction, sequenceActionUsed, sequenceDeclarationError } from "../offensive.js";
import { drainResolution, pushEffect } from "../resolution.js";
import { markPlayerSpent } from "../triggerSpent.js";

export function useFace(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (!isActiveFighter(player, creatureId)) return "INVALID_TARGET";
  const creature = draft.creatures[creatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  if (creature.defeated) return "CREATURE_DEFEATED";

  const die = dieForCreature(draft, creatureId);
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.rolledSlotIndex === null) return "INVALID_TARGET";
  if (dieIsFaceActionSpent(draft, playerId, die.id)) return "ALREADY_USED";

  const face = showingFaceCard(draft, die.id);
  const effects = face?.primaryEffects ?? [];
  if (effects.length === 0) return "CARD_HAS_NO_EFFECT";

  // Re-check with full GameState shape (draft is a GameState mutation target).
  if (!canUseFace(draft, playerId, creatureId)) return "INVALID_TARGET";

  const role = face?.sequenceRole;
  if (role === undefined && playerId !== draft.activePlayerId) return "INVALID_TARGET";
  const sequenceActionId = face === undefined ? null : `face:${face.id}`;
  if (role !== undefined) {
    const sequenceError = sequenceDeclarationError(
      draft,
      playerId,
      role,
      face?.meterCost ?? 0,
    );
    if (sequenceError !== null) return sequenceError;
    if (sequenceActionId !== null && sequenceActionUsed(draft, sequenceActionId)) {
      return "ALREADY_USED";
    }
  }

  if (role === undefined && draft.config.consumeDiceOnFaceActions) {
    markPlayerSpent(draft, playerId, faceActionKey(die.id));
  }

  const targetId = defaultFaceActionTarget(draft, playerId);
  emit(draft, {
    type: "face-used",
    playerId,
    creatureId,
    dieId: die.id,
    faceCardId: face!.id,
  });

  if (role !== undefined && face !== undefined) {
    openCombatAction(draft, {
      playerId,
      sourceCreatureId: creatureId,
      declaredTargetCreatureId: targetId,
      effects,
      sequenceRole: role,
      meterCost: face.meterCost ?? 0,
      meterGain: face.meterGain ?? 0,
      sequenceActionId: `face:${face.id}`,
      endsSequence: face.endsSequence === true,
      passesInitiative: face.passesInitiative === true,
    });
    return null;
  }

  for (const effect of [...effects].reverse()) {
    pushEffect(draft, playerId, effect, creatureId, targetId);
  }
  drainResolution(draft);
  return null;
}
