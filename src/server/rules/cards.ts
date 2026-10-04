import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import type {
  CardDefinition,
  CardDuration,
  CardInstance,
  CardLifecycle,
  CardType,
} from "../model/cards.js";
import type { CardInstanceId, CreatureId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { requirementTotal } from "../model/symbols.js";
import { isCreatureSilenced } from "./silence.js";
import { whileShowingTotals } from "./whileShowing.js";

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
/**
 * Spec `030`. An equipment or overload region, or a continuous ritual
 * region, stays in play. Any other card is one-shot unless it sets `lifecycle`.
 */
export function lifecycleOf(card: CardDefinition): CardLifecycle {
  if (card.lifecycle !== undefined) return card.lifecycle;
  if (card.equipment !== undefined || card.overload !== undefined) return "persistent";
  if (card.ritual !== undefined && ritualDurationOf(card) === "continuous") return "persistent";
  return "one-shot";
}

export function ritualDurationOf(card: CardDefinition): CardDuration | null {
  if (card.ritual === undefined) return null;
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
 * A card is playable from hand when it has a resolvable effect region or a
 * board attachment region (equipment, overload, ritual). Cards that only forge
 * stay forge-only.
 */
export const hasPlayableEffect = (definition: CardDefinition): boolean =>
  definition.effect !== undefined ||
  definition.equipment !== undefined ||
  definition.overload !== undefined ||
  definition.ritual !== undefined;

/** True when the card does not place a ritual region. */
export const isNonRitualCard = (definition: CardDefinition): boolean =>
  definition.ritual === undefined;

/**
 * Hand Responses, and ritual regions whose subtype is `reaction`.
 * Used for reaction-window legality.
 */
export const isReactionCard = (definition: CardDefinition): boolean =>
  definition.type === "response" || definition.subtypes.includes("reaction");

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
  _state: GameState,
  _playerId: PlayerId,
  _definition: CardDefinition,
): boolean {
  return true;
}

/** True until this player successfully synthetic-`FORGE_CARD`s this turn. */
export function isFirstSyntheticForgeThisTurn(
  state: GameState,
  playerId: PlayerId,
): boolean {
  return state.syntheticForgedThisTurn[playerId] !== true;
}

/**
 * Whether the player can pay the header pile cost to forge this card (mirrors
 * `payForgeCost`: natural is free; the first synthetic `FORGE_CARD` each turn
 * is free; later synthetics use forgeDiscountThisTurn plus While showing
 * `[Discount N] forge` — not play-cost discounts). Free / empty cost → true.
 * Does not mutate state.
 */
export function canAffordForge(
  _state: GameState,
  _playerId: PlayerId,
  _definition: CardDefinition,
): boolean {
  return true;
}

/**
 * Deck cards matching a search filter, in current deck order.
 * A card matches when its main `CardType` is listed in `filter`.
 */
/** Deck cards that place a ritual region, in current deck order. */
export function ritualIdsInDeck(
  state: GameState,
  playerId: PlayerId,
): readonly CardInstanceId[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  return player.deck.filter((id) => {
    const card = state.cards[id];
    if (card === undefined) return false;
    return getCard(card.cardId)?.ritual !== undefined;
  });
}

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
    if (definition.ritual !== undefined) {
      return definition.ritual.effects.length > 0;
    }
    if (
      definition.type === "modify" &&
      definition.equipment === undefined &&
      definition.overload === undefined
    ) {
      return (definition.effect?.effects.length ?? 0) > 0;
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

  let bonus = whileShowingTotals(state, creature.ownerId).empower;
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
    if (isCreatureSilenced(state, ally.id)) continue;
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
