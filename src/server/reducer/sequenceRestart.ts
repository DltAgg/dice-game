import { getCreatureDefinition } from "../content/creatures.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  findTechnique,
  legalFaceActions,
  matchingTechniques,
  showingFaceCard,
} from "../rules/faceActions.js";
import {
  assistDeclarationError,
  assistHitEffect,
  assistKey,
  dieForCreature,
} from "../rules/fighters.js";
import { sequenceActionUsed } from "../rules/offensive.js";
import { opponentOf } from "../rules/creatures.js";
import { emit, type Draft } from "./draft.js";
import { setComboCount } from "./meter.js";

/**
 * Spec `038`. Called from the chain drain when a non-combat effect would
 * hand the sequence off. Vega's finisher and `END_SEQUENCE` do not come here.
 * Returns true when a new sequence replaced that handoff.
 */
export function restartSequenceAfterOpponentEnd(
  draft: Draft,
  endedBy: PlayerId | null,
  stoppedSequenceActionId: string | undefined,
): boolean {
  if (endedBy === null || endedBy !== opponentOf(draft, draft.aggressorPlayerId)) return false;
  if (draft.status === "finished" || draft.phase !== "actions") return false;
  const player = draft.players[draft.aggressorPlayerId];
  const activeId = player?.activeCreatureId;
  if (player === undefined || activeId === undefined) return false;
  const active = draft.creatures[activeId];
  if (active === undefined || active.defeated) return false;
  const definition = getCreatureDefinition(active.definitionId);
  if (definition?.restartSequenceAfterOpponentEnd !== true) return false;

  const spent = [...draft.usedSequenceActionIds];
  if (stoppedSequenceActionId !== undefined && !spent.includes(stoppedSequenceActionId)) {
    spent.push(stoppedSequenceActionId);
  }
  const probe: GameState = { ...draft, offensiveState: "open", usedSequenceActionIds: spent };
  if (!hasLegalStarter(probe, draft.aggressorPlayerId)) return false;

  draft.offensiveState = "open";
  draft.usedSequenceActionIds = spent;
  setComboCount(draft, draft.aggressorPlayerId, 0);
  emit(draft, {
    type: "offensive-state-changed",
    offensiveState: "open",
    aggressorPlayerId: draft.aggressorPlayerId,
  });
  return true;
}

/** A face hit, Technique, or hit Assist that can open the sequence. */
function hasLegalStarter(state: GameState, playerId: PlayerId): boolean {
  if (unusedFaceStarter(state, playerId)) return true;
  if (unusedTechniqueStarter(state, playerId)) return true;
  return unusedHitAssistStarter(state, playerId);
}

function unusedFaceStarter(state: GameState, playerId: PlayerId): boolean {
  for (const creatureId of legalFaceActions(state, playerId)) {
    const die = dieForCreature(state, creatureId);
    if (die === undefined) continue;
    const face = showingFaceCard(state, die.id);
    if (face?.sequenceRole !== "starter") continue;
    if (sequenceActionUsed(state, `face:${face.id}`)) continue;
    return true;
  }
  return false;
}

function unusedTechniqueStarter(state: GameState, playerId: PlayerId): boolean {
  const activeId = state.players[playerId]?.activeCreatureId;
  if (activeId === undefined) return false;
  for (const match of matchingTechniques(state, playerId, activeId)) {
    if (!techniqueIsStarter(state, activeId, match.techniqueId)) continue;
    if (sequenceActionUsed(state, `technique:${match.techniqueId}`)) continue;
    return true;
  }
  return false;
}

function techniqueIsStarter(state: GameState, creatureId: CreatureId, techniqueId: string): boolean {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return false;
  const definition = getCreatureDefinition(creature.definitionId);
  const technique = findTechnique(
    [...(definition?.techniques ?? []), ...(creature.addedTechniques ?? [])],
    techniqueId,
  );
  return technique?.sequenceRole === "starter";
}

function unusedHitAssistStarter(state: GameState, playerId: PlayerId): boolean {
  const player = state.players[playerId];
  if (player === undefined) return false;
  for (const creatureId of player.creatureIds) {
    if (creatureId === player.activeCreatureId) continue;
    const creature = state.creatures[creatureId];
    if (creature === undefined) continue;
    const effects = getCreatureDefinition(creature.definitionId)?.assistEffects ?? [];
    const hit = assistHitEffect(effects);
    if (hit === null || hit === "many" || hit.sequenceRole !== "starter") continue;
    if (sequenceActionUsed(state, assistKey(creatureId))) continue;
    if (assistDeclarationError(state, playerId, creatureId) !== null) continue;
    return true;
  }
  return false;
}
