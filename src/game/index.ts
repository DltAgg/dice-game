/**
 * Public surface of the game engine. Everything outside `src/game` — the
 * store, the UI, the host adapter, the deck tools — imports from here and
 * never reaches into the internals.
 */
export * from "./model/index.js";
export * from "./rng/rng.js";
export * from "./reducer/actions.js";
export { advance, reduce } from "./reducer/reduce.js";
export { createMatch, validateStartingLayout } from "./setup/createMatch.js";
export type { MatchSetup, PlayerSetup } from "./setup/createMatch.js";

export * from "./rules/cards.js";
export * from "./rules/creatures.js";
export * from "./rules/dice.js";
export * from "./rules/energy.js";
export * from "./rules/faces.js";
export * from "./rules/loadout.js";
export * from "./rules/symbols.js";
export * from "./rules/targeting.js";
export * from "./rules/tokens.js";

export { ALL_CARDS, CARDS, PROTOTYPE_DECK, getCard } from "./content/cards.js";
export {
  attributeLabel,
  formatEffectRegion,
  formatEnergyCost,
  formatForgeLine,
  formatRequirementLine,
  formatTypeLine,
} from "./content/cardText.js";
export {
  ALL_CREATURES,
  CREATURES,
  ENGINE_DEMO_SQUAD,
  PROTOTYPE_SQUAD,
  getCreatureDefinition,
} from "./content/creatures.js";
export {
  basicAttackOf,
  formatAttackCost,
  formatAttackLine,
  primaryAttribute,
  specialAttackOf,
} from "./content/creatureText.js";
export {
  ALL_FACE_CARDS,
  ARCANE_ECHO_FACE,
  BASIC_FACE_CARDS,
  BLADE_RAIN,
  CRUSH,
  FACE_CARDS,
  FORBIDDEN_HERITAGE,
  GREAT_SPARK,
  PESTILENT_PLAGUE,
  PROTOTYPE_FACE_DECK,
  ENGINE_TEST_FACE_DECK,
  REKINDLE,
  RENDING_CLAW,
  SPECIAL_FACE_CARDS,
  SHIELD_FACE_ID,
  STARTING_DIE_SYMBOLS,
  faceIdFor,
  faceIdForSymbol,
  getFaceCard,
  naturalFaceId,
  syntheticFaceId,
} from "./content/faces.js";
