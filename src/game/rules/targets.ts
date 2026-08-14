import { getCreatureDefinition } from "../content/creatures.js";
import type { CreatureChoiceFilter, DieChoiceFilter } from "../model/effects.js";
import type { CreatureId, DieId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { getFaceCard } from "../content/faces.js";
import { livingCreaturesOf, opponentOf } from "./creatures.js";
import { isDieStunned } from "./dice.js";

type QueryState = Pick<GameState, "creatures" | "players" | "dice" | "config">;

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
  }
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
    case "allied-frontline":
    case "enemy-frontline":
      return "multi";
    default:
      return null;
  }
}
