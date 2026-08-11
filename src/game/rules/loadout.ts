import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import type { GameRulesConfig } from "../model/config.js";
import type { CardId, CreatureDefinitionId, FaceCardId } from "../model/ids.js";
import { validateFaceDeck } from "./faces.js";

export type LoadoutValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export interface LoadoutInput {
  readonly squad: readonly CreatureDefinitionId[];
  readonly deck: readonly CardId[];
  readonly faceDeck: readonly FaceCardId[];
}

/**
 * Tactics deck legality (M4): size in [deckMinCards, deckMaxCards], known card
 * ids, and at most deckMaxCopiesPerCard of any single id.
 */
export function validateTacticsDeck(
  deck: readonly CardId[],
  config: GameRulesConfig,
): LoadoutValidation {
  if (deck.length < config.deckMinCards) {
    return {
      ok: false,
      reason: `tactics deck has ${String(deck.length)} cards, min ${String(config.deckMinCards)}`,
    };
  }
  if (deck.length > config.deckMaxCards) {
    return {
      ok: false,
      reason: `tactics deck has ${String(deck.length)} cards, max ${String(config.deckMaxCards)}`,
    };
  }

  const copies = new Map<CardId, number>();
  for (const cardId of deck) {
    if (getCard(cardId) === undefined) {
      return { ok: false, reason: `unknown card "${cardId}"` };
    }
    const next = (copies.get(cardId) ?? 0) + 1;
    copies.set(cardId, next);
    if (next > config.deckMaxCopiesPerCard) {
      return {
        ok: false,
        reason: `tactics deck has ${String(next)} copies of "${cardId}", max ${String(config.deckMaxCopiesPerCard)}`,
      };
    }
  }

  return { ok: true };
}

function validateSquad(
  squad: readonly CreatureDefinitionId[],
  config: GameRulesConfig,
): LoadoutValidation {
  if (squad.length !== config.creaturesPerPlayer) {
    return {
      ok: false,
      reason: `squad has ${String(squad.length)} creatures, need ${String(config.creaturesPerPlayer)}`,
    };
  }
  for (const definitionId of squad) {
    if (getCreatureDefinition(definitionId) === undefined) {
      return { ok: false, reason: `unknown creature "${definitionId}"` };
    }
  }
  return { ok: true };
}

/**
 * Full pre-match loadout: squad, tactics deck, and face deck.
 */
export function validateLoadout(
  loadout: LoadoutInput,
  config: GameRulesConfig,
): LoadoutValidation {
  const squad = validateSquad(loadout.squad, config);
  if (!squad.ok) return squad;

  const tactics = validateTacticsDeck(loadout.deck, config);
  if (!tactics.ok) return tactics;

  const faces = validateFaceDeck(loadout.faceDeck, config);
  if (!faces.ok) return faces;

  return { ok: true };
}
