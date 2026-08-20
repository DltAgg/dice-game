import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import { attributeAllowsNaturalFaces } from "../model/attributes.js";
import { FACE_SLOTS_PER_DIE, type StartingDiceLayout } from "../model/dice.js";
import type { GameRulesConfig } from "../model/config.js";
import type { CardId, CreatureDefinitionId, FaceCardId } from "../model/ids.js";
import { isAttributeSymbol, SHIELD } from "../model/symbols.js";
import { validateFaceDeck } from "./faces.js";

export type LoadoutValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export interface LoadoutInput {
  readonly squad: readonly CreatureDefinitionId[];
  readonly deck: readonly CardId[];
  readonly faceDeck: readonly FaceCardId[];
  readonly startingDice: StartingDiceLayout;
}

/** Structural JSON check for persistence / PeerJS — not rules legality. */
export function isStartingDiceLayout(value: unknown): value is StartingDiceLayout {
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.every(
    (die) =>
      Array.isArray(die) &&
      die.length === FACE_SLOTS_PER_DIE &&
      die.every((id) => typeof id === "string"),
  );
}

/**
 * Dual-kind naturals and untyped Shield. These opening slots do not consume
 * the face deck. Unknown ids are not basics.
 */
export function isOpeningBasicFace(id: FaceCardId): boolean {
  const definition = getFaceCard(id);
  if (definition === undefined) return false;
  if (definition.kind === "untyped") return definition.symbol === SHIELD;
  return definition.kind === "natural";
}

function flattenStartingDice(startingDice: StartingDiceLayout): readonly FaceCardId[] {
  return [...startingDice[0], ...startingDice[1]];
}

/**
 * Face-deck remainder after consuming non-basic opening installs (multiset).
 * Basics never consume, even if the same id is listed in `faceDeck`.
 */
export function leftoverFacePool(
  faceDeck: readonly FaceCardId[],
  startingDice: StartingDiceLayout,
): FaceCardId[] {
  const remaining = [...faceDeck];
  for (const id of flattenStartingDice(startingDice)) {
    if (isOpeningBasicFace(id)) continue;
    const index = remaining.indexOf(id);
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining;
}

function validateOneDie(
  die: readonly FaceCardId[],
  dieIndex: number,
  config: GameRulesConfig,
): LoadoutValidation {
  if (die.length !== FACE_SLOTS_PER_DIE) {
    return {
      ok: false,
      reason: `starting die ${String(dieIndex + 1)} has ${String(die.length)} faces, need ${String(FACE_SLOTS_PER_DIE)}`,
    };
  }

  let shields = 0;
  let synthetics = 0;
  let onRollFaces = 0;
  const byAttribute = new Map<string, number>();

  for (const id of die) {
    const definition = getFaceCard(id);
    if (definition === undefined) {
      return { ok: false, reason: `unknown opening face "${id}"` };
    }
    if (
      definition.kind === "natural" &&
      isAttributeSymbol(definition.symbol) &&
      !attributeAllowsNaturalFaces(definition.symbol)
    ) {
      return {
        ok: false,
        reason: `natural faces are not allowed for attribute "${definition.symbol}"`,
      };
    }
    if (definition.forgeRestriction === "echo-cards") {
      return {
        ok: false,
        reason: `opening dice cannot include Echo-restricted face "${id}"`,
      };
    }
    if (definition.stayPolicy !== undefined) {
      return {
        ok: false,
        reason: `opening dice cannot include stay/lock face "${id}"`,
      };
    }
    if (definition.symbol === SHIELD) shields += 1;
    if (definition.kind === "synthetic") synthetics += 1;
    if (definition.onRoll.length > 0) onRollFaces += 1;
    if (isAttributeSymbol(definition.symbol)) {
      byAttribute.set(definition.symbol, (byAttribute.get(definition.symbol) ?? 0) + 1);
    }
  }

  if (shields < config.startingMinShieldsPerDie) {
    return {
      ok: false,
      reason: `starting die ${String(dieIndex + 1)} has ${String(shields)} Shield faces, min ${String(config.startingMinShieldsPerDie)}`,
    };
  }
  if (synthetics > config.startingMaxSyntheticsPerDie) {
    return {
      ok: false,
      reason: `starting die ${String(dieIndex + 1)} has ${String(synthetics)} synthetics, max ${String(config.startingMaxSyntheticsPerDie)}`,
    };
  }
  if (onRollFaces > config.startingMaxOnRollFacesPerDie) {
    return {
      ok: false,
      reason: `starting die ${String(dieIndex + 1)} has ${String(onRollFaces)} on-roll faces, max ${String(config.startingMaxOnRollFacesPerDie)}`,
    };
  }
  for (const [attribute, count] of byAttribute) {
    if (count > config.maxFacesOfSameAttributePerDie) {
      return {
        ok: false,
        reason: `starting die ${String(dieIndex + 1)} has ${String(count)} ${attribute} faces, max ${String(config.maxFacesOfSameAttributePerDie)}`,
      };
    }
  }

  return { ok: true };
}

/**
 * Opening-layout legality. Reasons only — never throws for a bad layout.
 */
export function validateStartingDice(
  startingDice: StartingDiceLayout,
  faceDeck: readonly FaceCardId[],
  config: GameRulesConfig,
): LoadoutValidation {
  if (startingDice.length !== config.dicePerPlayer) {
    return {
      ok: false,
      reason: `startingDice has ${String(startingDice.length)} dice, need ${String(config.dicePerPlayer)}`,
    };
  }

  let synthetics = 0;
  const remaining = [...faceDeck];

  for (let dieIndex = 0; dieIndex < startingDice.length; dieIndex += 1) {
    const die = startingDice[dieIndex];
    if (die === undefined) {
      return { ok: false, reason: `starting die ${String(dieIndex + 1)} is missing` };
    }
    const one = validateOneDie(die, dieIndex, config);
    if (!one.ok) return one;

    for (const id of die) {
      const definition = getFaceCard(id);
      if (definition?.kind === "synthetic") synthetics += 1;
      if (isOpeningBasicFace(id)) continue;
      const index = remaining.indexOf(id);
      if (index < 0) {
        return {
          ok: false,
          reason: `opening special "${id}" is not in the face deck (or a second copy is required)`,
        };
      }
      remaining.splice(index, 1);
    }
  }

  if (synthetics > config.startingMaxSyntheticsPerPlayer) {
    return {
      ok: false,
      reason: `opening dice have ${String(synthetics)} synthetics, max ${String(config.startingMaxSyntheticsPerPlayer)}`,
    };
  }

  return { ok: true };
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
 * Full pre-match loadout: squad, tactics deck, face deck, and opening dice.
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

  return validateStartingDice(loadout.startingDice, loadout.faceDeck, config);
}
