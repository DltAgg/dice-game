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
import { requirementTotal } from "../model/symbols.js";
import {
  canAffordUnderCaps,
  discountedRequirementNeed,
  matchingPlayCostDiscounts,
} from "./discounts.js";
import { cardPlayIsFuelled, isNonEmptyRequirement } from "./tokens.js";

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
 * - `continuous` or `reaction` → stay on the field, exhausted until the owner's next turn
 * - leftover `instant` (retired) → leave for the graveyard
 */
export function ritualDurationOf(card: CardDefinition): CardDuration | null {
  if (card.type !== "ritual") return null;
  if (card.subtypes.includes("continuous") || card.subtypes.includes("reaction")) {
    return "continuous";
  }
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

/** Total pile tokens in the header play/forge cost, if any. */
export const playCostTotal = (definition: CardDefinition): number =>
  definition.playCost === undefined ? 0 : requirementTotal(definition.playCost);

/**
 * Whether the player can meet the `[Requires]` gate and pay discounted header
 * `[Spend]` to play this card (same pile, not additive — like `attackIsFuelled`).
 * `[Discount]` cuts header Spend only, never the gate. Forge ignores the gate
 * (`canAffordForge`). Does not mutate state.
 */
export function canAffordPlay(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
): boolean {
  const pile = state.players[playerId]?.attributePool ?? {};
  const wildcards = state.requirementWildcardsThisTurn[playerId]?.length ?? 0;
  const base = definition.playCost;
  const hasSpend = isNonEmptyRequirement(base);
  const matches = hasSpend ? matchingPlayCostDiscounts(state, playerId, definition) : [];
  const armed = hasSpend ? (state.playCostDiscountThisTurn[playerId] ?? 0) : 0;
  const discount = matches.reduce((sum, match) => sum + match.amount, 0) + armed;
  const spendNeed = hasSpend ? discountedRequirementNeed(base, discount) : 0;
  const requires = definition.effect?.requires;
  return cardPlayIsFuelled(
    pile,
    {
      ...(isNonEmptyRequirement(requires) ? { requires } : {}),
      ...(hasSpend ? { spend: base, spendNeed } : {}),
    },
    wildcards,
  );
}

/**
 * Whether the player can pay the header pile cost to forge this card (mirrors
 * `payForgeCost`: natural is free; synthetic uses forgeDiscountThisTurn only —
 * not play-cost discounts). Free / empty cost → true. Does not mutate state.
 */
export function canAffordForge(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
): boolean {
  if (definition.forge.kind === "natural") return true;
  const base = definition.playCost;
  if (base === undefined || !isNonEmptyRequirement(base)) return true;
  const discount = state.forgeDiscountThisTurn[playerId] ?? 0;
  const need = discountedRequirementNeed(base, discount);
  if (need <= 0) return true;
  const pile = state.players[playerId]?.attributePool ?? {};
  const wildcards = state.requirementWildcardsThisTurn[playerId]?.length ?? 0;
  return canAffordUnderCaps(pile, base, need, wildcards);
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

/**
 * Graveyard card instance ids in current order. When `maxPlayCost` is set,
 * only cards whose header pile cost is that total or less (Recalibrate / Assembly).
 */
export function searchableInGraveyard(
  state: GameState,
  playerId: PlayerId,
  maxPlayCost?: number,
): readonly CardInstanceId[] {
  const graveyard = state.players[playerId]?.graveyard ?? [];
  if (maxPlayCost === undefined) return graveyard;
  return graveyard.filter((id) => {
    const card = state.cards[id];
    if (card === undefined) return false;
    const definition = getCard(card.cardId);
    return definition !== undefined && playCostTotal(definition) <= maxPlayCost;
  });
}

/**
 * GY tactics Paradox / Echo may replay: Instant or Ritual cards that have
 * modelled effect arrays. Preserves graveyard order. Pass `excludeInstanceId`
 * (the replaying source) so a hand Instant that already moved to GY cannot
 * choose itself.
 */
export function replayableGraveyardTactics(
  state: Pick<GameState, "players" | "cards">,
  playerId: PlayerId,
  excludeInstanceId?: CardInstanceId | null,
): readonly CardInstanceId[] {
  return (state.players[playerId]?.graveyard ?? []).filter((id) => {
    if (id === excludeInstanceId) return false;
    const card = state.cards[id];
    if (card === undefined) return false;
    const definition = getCard(card.cardId);
    if (definition === undefined) return false;
    if (definition.type === "instant") {
      return (definition.effect?.effects.length ?? 0) > 0;
    }
    if (definition.type === "ritual") {
      return (definition.ritual?.effects.length ?? 0) > 0;
    }
    return false;
  });
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
