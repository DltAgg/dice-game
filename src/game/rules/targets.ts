import { getCreatureDefinition } from "../content/creatures.js";
import type { CreatureChoiceFilter, DieChoiceFilter, DieSlotChoiceFilter } from "../model/effects.js";
import type { CreatureId, DieId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { getFaceCard } from "../content/faces.js";
import { livingCreaturesOf, opponentOf } from "./creatures.js";
import { isDieStunned } from "./dice.js";
import { totalTokens } from "./tokens.js";

type QueryState = Pick<
  GameState,
  "creatures" | "players" | "dice" | "config" | "facesAppearedThisRoll"
>;

export function legalCreaturesForFilter(
  state: QueryState,
  controllerId: PlayerId,
  filter: CreatureChoiceFilter,
  sourceCreatureId: CreatureId | null,
): readonly CreatureId[] {
  const allyIds = livingCreaturesOf(state as GameState, controllerId).map((c) => c.id);
  const enemyIds = livingCreaturesOf(state as GameState, opponentOf(state as GameState, controllerId)).map(
    (c) => c.id,
  );

  const isFrontline = (id: CreatureId): boolean => state.creatures[id]?.position === "frontline";
  const hasToxin = (id: CreatureId): boolean => (state.creatures[id]?.toxinMarkers ?? 0) > 0;
  const damageOverHalf = (id: CreatureId): boolean => {
    const creature = state.creatures[id];
    if (creature === undefined) return false;
    const life = getCreatureDefinition(creature.definitionId)?.life ?? 0;
    return creature.damage > life / 2;
  };

  switch (filter) {
    case "ally":
      return allyIds;
    case "enemy":
      return enemyIds;
    case "self":
      return sourceCreatureId !== null && allyIds.includes(sourceCreatureId) ? [sourceCreatureId] : [];
    case "ally-other":
      return allyIds.filter((id) => id !== sourceCreatureId);
    case "allied-frontline":
      return allyIds.filter(isFrontline);
    case "allied-frontline-other":
      return allyIds.filter((id) => id !== sourceCreatureId && isFrontline(id));
    case "ally-with-toxin":
      return allyIds.filter(hasToxin);
    case "enemy-with-toxin":
      return enemyIds.filter(hasToxin);
    case "ally-damage-over-half":
      return allyIds.filter(damageOverHalf);
    case "ally-with-tokens":
      return allyIds.filter((id) => totalTokens(state.creatures[id]?.attributeTokens ?? {}) > 0);
    case "adjacent-ally":
      return adjacentAllyIds(state, sourceCreatureId);
  }
}

/** Living `creatureIds` neighbors (±1) of `sourceCreatureId` (spec `015`). */
export function adjacentAllyIds(
  state: QueryState,
  sourceCreatureId: CreatureId | null,
): readonly CreatureId[] {
  if (sourceCreatureId === null) return [];
  const ownerId = state.creatures[sourceCreatureId]?.ownerId;
  if (ownerId === undefined) return [];
  const ids = state.players[ownerId]?.creatureIds ?? [];
  const index = ids.indexOf(sourceCreatureId);
  if (index < 0) return [];
  const neighbors: CreatureId[] = [];
  for (const candidate of [ids[index - 1], ids[index + 1]]) {
    if (candidate === undefined) continue;
    const creature = state.creatures[candidate];
    if (creature !== undefined && !creature.defeated) neighbors.push(candidate);
  }
  return neighbors;
}

export function creatureMatchesFilter(
  state: QueryState,
  controllerId: PlayerId,
  filter: CreatureChoiceFilter,
  sourceCreatureId: CreatureId | null,
  creatureId: CreatureId,
): boolean {
  return legalCreaturesForFilter(state, controllerId, filter, sourceCreatureId).includes(creatureId);
}

export function legalDiceForFilter(
  state: QueryState,
  controllerId: PlayerId,
  filter: DieChoiceFilter,
): readonly DieId[] {
  const own = state.players[controllerId]?.dieIds ?? [];
  const opp = state.players[opponentOf(state as GameState, controllerId)]?.dieIds ?? [];

  const retainable = (dieId: DieId): boolean => {
    const die = state.dice[dieId];
    return die !== undefined && die.rolledSlotIndex !== null && !isDieStunned(die);
  };
  const rolled = (dieId: DieId): boolean => state.dice[dieId]?.rolledSlotIndex !== null;
  const hasSyntheticCorruption = (dieId: DieId): boolean => {
    const die = state.dice[dieId];
    if (die === undefined) return false;
    return die.slots.some((slot) => {
      const face = getFaceCard(slot.faceCardId);
      return face?.kind === "synthetic" && face.symbol === "corruption";
    });
  };

  switch (filter) {
    case "owned-retainable":
      return own.filter(retainable);
    case "owned-rolled":
      return own.filter(rolled);
    case "any-synthetic-corruption":
      return [...own, ...opp].filter(hasSyntheticCorruption);
  }
}

export type DieSlotRef = { readonly dieId: DieId; readonly slotIndex: number };

function faceAt(
  state: QueryState,
  dieId: DieId,
  slotIndex: number,
): ReturnType<typeof getFaceCard> {
  const faceCardId = state.dice[dieId]?.slots[slotIndex]?.faceCardId;
  if (faceCardId === undefined) return undefined;
  return getFaceCard(faceCardId);
}

export function legalDieSlotsForFilter(
  state: QueryState,
  controllerId: PlayerId,
  filter: DieSlotChoiceFilter,
  context?: { readonly contextDieId?: DieId; readonly excludedSlotIndex?: number },
): readonly DieSlotRef[] {
  const oppId = opponentOf(state as GameState, controllerId);
  const oppDice = state.players[oppId]?.dieIds ?? [];
  const results: DieSlotRef[] = [];

  const pushMatching = (
    dieIds: readonly DieId[],
    predicate: (dieId: DieId, slotIndex: number) => boolean,
  ): void => {
    for (const dieId of dieIds) {
      const die = state.dice[dieId];
      if (die === undefined) continue;
      for (const slot of die.slots) {
        if (predicate(dieId, slot.index)) {
          results.push({ dieId, slotIndex: slot.index });
        }
      }
    }
  };

  switch (filter) {
    case "opposing-synthetic":
      pushMatching(oppDice, (dieId, slotIndex) => faceAt(state, dieId, slotIndex)?.kind === "synthetic");
      break;
    case "opposing-natural":
      pushMatching(oppDice, (dieId, slotIndex) => faceAt(state, dieId, slotIndex)?.kind === "natural");
      break;
    case "opposing-corrupted":
      pushMatching(oppDice, (dieId, slotIndex) => {
        const markers = state.dice[dieId]?.slots[slotIndex]?.corruptionMarkers ?? 0;
        return markers >= 1;
      });
      break;
    case "opposing-corrupted-with-other-slot":
      pushMatching(oppDice, (dieId, slotIndex) => {
        const die = state.dice[dieId];
        if (die === undefined) return false;
        const markers = die.slots[slotIndex]?.corruptionMarkers ?? 0;
        return markers >= 1 && die.slots.length > 1;
      });
      break;
    case "same-die-other-slot": {
      const dieId = context?.contextDieId;
      const excluded = context?.excludedSlotIndex;
      if (dieId === undefined || excluded === undefined) break;
      const die = state.dice[dieId];
      if (die === undefined) break;
      for (const slot of die.slots) {
        if (slot.index !== excluded) {
          results.push({ dieId, slotIndex: slot.index });
        }
      }
      break;
    }
    case "appeared-synthetic-this-roll":
      for (const entry of state.facesAppearedThisRoll ?? []) {
        if (entry.kind === "synthetic") {
          results.push({ dieId: entry.dieId, slotIndex: entry.slotIndex });
        }
      }
      break;
  }

  return results;
}

/** @internal helper for tests / callers that need the face id at a slot. */
export function faceCardIdAt(
  state: QueryState,
  dieId: DieId,
  slotIndex: number,
): FaceCardId | undefined {
  return state.dice[dieId]?.slots[slotIndex]?.faceCardId;
}

export function choiceFilterForSelector(
  kind: string,
): CreatureChoiceFilter | "multi" | null {
  switch (kind) {
    case "choose-ally":
      return "ally";
    case "choose-enemy":
      return "enemy";
    case "choose-ally-other":
      return "ally-other";
    case "choose-allied-frontline":
      return "allied-frontline";
    case "choose-allied-frontline-other":
      return "allied-frontline-other";
    case "choose-ally-with-toxin":
      return "ally-with-toxin";
    case "choose-enemy-with-toxin":
      return "enemy-with-toxin";
    case "choose-ally-damage-over-half":
      return "ally-damage-over-half";
    case "choose-ally-with-tokens":
      return "ally-with-tokens";
    case "choose-adjacent-ally":
      return "adjacent-ally";
    case "allied-frontline":
    case "enemy-frontline":
      return "multi";
    default:
      return null;
  }
}
