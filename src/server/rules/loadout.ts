import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import { FACE_SLOTS_PER_DIE, type StartingDiceLayout } from "../model/dice.js";
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
  readonly startingDice: StartingDiceLayout;
}

/** Structural JSON check for persistence / PeerJS — not rules legality. */
export function isStartingDiceLayout(value: unknown): value is StartingDiceLayout {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 3)) return false;
  return value.every(
    (die) =>
      Array.isArray(die) &&
      die.length === FACE_SLOTS_PER_DIE &&
      die.every((id) => typeof id === "string"),
  );
}

/**
 * A blank face. Named faces print rules, a technique, or a face type and
 * consume the face deck. Blank faces do not.
 */
export function isOpeningBasicFace(id: FaceCardId): boolean {
  const face = getFaceCard(id);
  if (face === undefined) return false;
  if (face.rulesText.trim() !== "") return false;
  if (face.technique !== undefined || face.faceType !== undefined) return false;
  return face.onRoll.length === 0;
}

/** On roll, convert Choose one, or While showing — not extra pips alone (spec `025`). */
export function countsTowardOpeningOnRollCap(id: FaceCardId): boolean {
  const definition = getFaceCard(id);
  if (definition === undefined) return false;
  if (definition.onRoll.length > 0) return true;
  if (definition.convertRoll === true) return true;
  return (definition.whileShowing?.length ?? 0) > 0;
}

function flattenStartingDice(startingDice: StartingDiceLayout): readonly FaceCardId[] {
  return startingDice.flat();
}

/**
 * Face-deck remainder after opening installs. One face card backs every slot
 * showing that id, so every copy of an installed non-basic leaves the pool.
 * Blank faces never consume, even when the same id is listed in `faceDeck`.
 */
export function leftoverFacePool(
  faceDeck: readonly FaceCardId[],
  startingDice: StartingDiceLayout,
): FaceCardId[] {
  const installed = new Set(
    flattenStartingDice(startingDice).filter((id) => !isOpeningBasicFace(id)),
  );
  return faceDeck.filter((id) => !installed.has(id));
}

function validateOneDie(
  die: readonly FaceCardId[],
  dieIndex: number,
  config: GameRulesConfig,
): LoadoutValidation {
  if (die.length !== config.facesPerDie) {
    return {
      ok: false,
      reason: `starting die ${String(dieIndex + 1)} has ${String(die.length)} faces, need ${String(config.facesPerDie)}`,
    };
  }

  let onRollFaces = 0;

  for (const id of die) {
    const definition = getFaceCard(id);
    if (definition === undefined) {
      return { ok: false, reason: `unknown opening face "${id}"` };
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
    if (countsTowardOpeningOnRollCap(id)) onRollFaces += 1;
  }

  if (onRollFaces > config.startingMaxOnRollFacesPerDie) {
    return {
      ok: false,
      reason: `starting die ${String(dieIndex + 1)} has ${String(onRollFaces)} on-roll faces, max ${String(config.startingMaxOnRollFacesPerDie)}`,
    };
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

  const packed = new Set(faceDeck);

  for (let dieIndex = 0; dieIndex < startingDice.length; dieIndex += 1) {
    const die = startingDice[dieIndex];
    if (die === undefined) {
      return { ok: false, reason: `starting die ${String(dieIndex + 1)} is missing` };
    }
    const one = validateOneDie(die, dieIndex, config);
    if (!one.ok) return one;

    for (const id of die) {
      if (isOpeningBasicFace(id)) continue;
      if (!packed.has(id)) {
        return {
          ok: false,
          reason: `opening special "${id}" is not in the face deck`,
        };
      }
    }
  }

  return { ok: true };
}

/**
 * Tactics deck legality: size in [deckMinCards, deckMaxCards], known card
 * ids, and at most deckMaxCopiesPerCard of any single id.
 */
export function validateTacticsDeck(
  deck: readonly CardId[],
  config: GameRulesConfig,
): LoadoutValidation {
  if (config.deckSize !== null) {
    if (deck.length !== config.deckSize) {
      return {
        ok: false,
        reason: `tactics deck has ${String(deck.length)} cards, deck size ${String(config.deckSize)}`,
      };
    }
  } else if (deck.length < config.deckMinCards) {
    return {
      ok: false,
      reason: `tactics deck has ${String(deck.length)} cards, min ${String(config.deckMinCards)}`,
    };
  } else if (deck.length > config.deckMaxCards) {
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
    const definition = getCreatureDefinition(definitionId);
    if (definition === undefined) {
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
