import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type {
  CardDefinition,
  CardDuration,
  CardInstance,
  CardType,
} from "../model/cards.js";
import type { GameRulesConfig } from "../model/config.js";
import type { DieState } from "../model/dice.js";
import type { CardInstanceId, CreatureId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { SymbolType } from "../model/symbols.js";

/**
 * Reading helpers for the card zones, and the one rule forging has to enforce
 * that installing a single face does not: a card may forge several faces at
 * once, so the §9.1 attribute cap has to be checked against the whole batch
 * rather than one slot at a time.
 */

export const handOf = (state: GameState, playerId: PlayerId): readonly CardInstance[] =>
  zoneOf(state, playerId, "hand");

export const deckOf = (state: GameState, playerId: PlayerId): readonly CardInstance[] =>
  zoneOf(state, playerId, "deck");

export const graveyardOf = (state: GameState, playerId: PlayerId): readonly CardInstance[] =>
  zoneOf(state, playerId, "graveyard");

export const equipmentOf = (state: GameState, playerId: PlayerId): readonly CardInstance[] =>
  zoneOf(state, playerId, "equipment");

export const overloadsOf = (state: GameState, playerId: PlayerId): readonly CardInstance[] =>
  zoneOf(state, playerId, "overload");

/** Overload cards currently sitting on a given face card for this owner. */
export const overloadsOnFace = (
  state: GameState,
  playerId: PlayerId,
  faceCardId: FaceCardId,
): readonly CardInstance[] =>
  overloadsOf(state, playerId).filter((card) => card.attachedToFaceCardId === faceCardId);

export const ritualsOf = (state: GameState, playerId: PlayerId): readonly CardInstance[] =>
  zoneOf(state, playerId, "ritual");

/**
 * Post-activation fate for a Ritual, read from subtypes.
 * - `continuous` → stay on the field, exhausted until the owner's next turn
 * - anything else (`instant`, `reaction`, …) → leave for the graveyard
 */
export function ritualDurationOf(card: CardDefinition): CardDuration | null {
  if (card.type !== "ritual") return null;
  if (card.subtypes.includes("continuous")) return "continuous";
  return "instant";
}

function zoneOf(
  state: GameState,
  playerId: PlayerId,
  zone: "deck" | "hand" | "graveyard" | "equipment" | "overload" | "ritual",
): readonly CardInstance[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  return player[zone].flatMap((id) => {
    const card = state.cards[id];
    return card === undefined ? [] : [card];
  });
}

export const findCardInstance = (
  state: GameState,
  id: CardInstanceId,
): CardInstance | undefined => state.cards[id];

/**
 * Bible §9.1 over a batch. Replacing three Shield faces with three Corruption
 * ones is legal on a die that already holds two Corruption faces only if the
 * total stays inside the cap, which needs the whole substitution modelled at
 * once.
 */
export function forgeExceedsAttributeLimit(
  die: DieState,
  slotIndexes: readonly number[],
  incoming: SymbolType,
  faces: number,
  config: GameRulesConfig,
): boolean {
  const counts: Partial<Record<SymbolType, number>> = {};
  for (const slot of die.slots) {
    if (slotIndexes.includes(slot.index)) continue;
    const face = getFaceCard(slot.faceCardId);
    if (face === undefined) continue;
    counts[face.symbol] = (counts[face.symbol] ?? 0) + 1;
  }
  return (counts[incoming] ?? 0) + faces > config.maxFacesOfSameAttributePerDie;
}

/**
 * A card is playable from hand when it has a resolvable effect region or a
 * board attachment region (equipment, overload, ritual). Cards that only forge
 * stay forge-only.
 */
export const hasPlayableEffect = (definition: CardDefinition): boolean =>
  definition.effect !== undefined ||
  definition.equipment !== undefined ||
  definition.overload !== undefined ||
  definition.ritual !== undefined;

/** True for Instant / Reaction / Equipment / Overload (anything that is not a Ritual). */
export const isNonRitualCard = (definition: CardDefinition): boolean =>
  definition.type !== "ritual";

/**
 * Hand reactions (`type: "reaction"`) and ritual reactions (`subtypes` include
 * `"reaction"`). Used for reaction-window legality.
 */
export const isReactionCard = (definition: CardDefinition): boolean =>
  definition.type === "reaction" || definition.subtypes.includes("reaction");

/**
 * Resolves how much Energy a play or forge spends. Fixed costs ignore
 * `energyPaid`. Variable (`?`) costs require an integer ≥ `energyCost`
 * (defaulting to the minimum when omitted).
 *
 * Returns `null` when the declared payment is illegal.
 */
export function resolveEnergyPayment(
  definition: CardDefinition,
  energyPaid: number | undefined,
  additionalEnergy = 0,
): number | null {
  if (definition.variableEnergy === true) {
    const base = energyPaid ?? definition.energyCost;
    if (!Number.isInteger(base) || base < definition.energyCost) return null;
    return base + additionalEnergy;
  }
  return definition.energyCost + additionalEnergy;
}

/**
 * Deck cards matching a search filter, in current deck order.
 * A card matches when its main `CardType` is listed in `filter`.
 */
export function searchableInDeck(
  state: GameState,
  playerId: PlayerId,
  filter: readonly CardType[],
): readonly CardInstanceId[] {
  const player = state.players[playerId];
  if (player === undefined) return [];

  return player.deck.filter((id) => {
    const card = state.cards[id];
    if (card === undefined) return false;
    const definition = getCard(card.cardId);
    if (definition === undefined) return false;
    return filter.includes(definition.type);
  });
}

/** Graveyard card instance ids in current order (Eternal Darkness). */
export function searchableInGraveyard(
  state: GameState,
  playerId: PlayerId,
): readonly CardInstanceId[] {
  return state.players[playerId]?.graveyard ?? [];
}

/** Sum of attack-damage-bonus abilities on gear attached to a creature. */
export function attackDamageBonus(
  state: GameState,
  creatureId: CreatureId,
  attackKind?: "basic" | "special",
): number {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return 0;

  let bonus = 0;
  const addFromAbilities = (
    abilities: readonly { type: string; amount?: number; attackKinds?: readonly ("basic" | "special")[]; bearerRelation?: "self" | "left-ally" }[],
    bearerId: CreatureId,
  ): void => {
    for (const ability of abilities) {
      if (ability.type !== "attack-damage-bonus") continue;
      if (
        ability.attackKinds !== undefined &&
        attackKind !== undefined &&
        !ability.attackKinds.includes(attackKind)
      ) {
        continue;
      }
      const relation = ability.bearerRelation ?? "self";
      if (relation === "self") {
        if (bearerId !== creatureId) continue;
      } else if (relation === "left-ally") {
        if (livingLeftAllyId(state, bearerId) !== creatureId) continue;
      }
      bonus += ability.amount ?? 0;
    }
  };

  for (const ally of Object.values(state.creatures)) {
    if (ally.defeated || ally.ownerId !== creature.ownerId) continue;
    const standing = getCreatureDefinition(ally.definitionId)?.standingAbilities ?? [];
    addFromAbilities(standing, ally.id);
    for (const cardInstanceId of ally.equipmentIds) {
      const instance = state.cards[cardInstanceId];
      if (instance === undefined) continue;
      const definition = getCard(instance.cardId);
      addFromAbilities(definition?.equipment?.abilities ?? [], ally.id);
    }
  }
  return bonus;
}

function livingLeftAllyId(state: GameState, bearerId: CreatureId): CreatureId | null {
  const bearer = state.creatures[bearerId];
  if (bearer === undefined) return null;
  const ids = state.players[bearer.ownerId]?.creatureIds ?? [];
  const index = ids.indexOf(bearerId);
  if (index <= 0) return null;
  for (let i = index - 1; i >= 0; i -= 1) {
    const id = ids[i];
    if (id === undefined) continue;
    const creature = state.creatures[id];
    if (creature !== undefined && !creature.defeated) return id;
  }
  return null;
}
