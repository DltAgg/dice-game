/**
 * Public surface of the game engine (`src/server`). The client — store, UI,
 * host adapter, deck tools — imports from `@server` and does not reach into
 * internals except in tests.
 */
export * from "./model/index.js";
export * from "./rng/rng.js";
export * from "./reducer/actions.js";
export { advance, reduce } from "./reducer/reduce.js";
export { AstCompiler, AstExecutor, AstValidator } from "./ast/index.js";
export { createMatch } from "./setup/createMatch.js";
export type { MatchSetup, PlayerSetup } from "./setup/createMatch.js";

export * from "./rules/absorb.js";
export * from "./rules/cards.js";
export * from "./rules/creatures.js";
export * from "./rules/dice.js";
export * from "./rules/faces.js";
export * from "./rules/loadout.js";
export * from "./rules/reactions.js";
export * from "./rules/symbols.js";
export * from "./rules/targeting.js";
export * from "./rules/targets.js";
export * from "./rules/tokens.js";

export {
  ALL_CARDS,
  AGGRO_DECK,
  BURN_DECK,
  BURN_DECK_COUNTS,
  CARDS,
  COMBO_MECHANICAL_DECK,
  CONTROL_DECK,
  PROTOTYPE_DECK,
  TEMPO_DECK,
  getCard,
} from "./content/cards.js";
export {
  attributeLabel,
  formatEffectRegion,
  formatFaceKind,
  formatForgeLine,
  formatPlayCostHeader,
  formatPlayCostLine,
  formatRequirementBody,
  formatRequirementLine,
  formatTypeLine,
} from "./content/cardText.js";
export {
  ALL_CREATURES,
  AGGRO_SQUAD,
  BURN_SQUAD,
  COMBO_MECHANICAL_SQUAD,
  CONTROL_SQUAD,
  CREATURES,
  PROTOTYPE_SQUAD,
  TEMPO_SQUAD,
  getCreatureDefinition,
} from "./content/creatures.js";
export {
  basicAttackOf,
  formatAttackCost,
  formatAttackFuel,
  attackCostOf,
  formatAttackLine,
  primaryAttribute,
  specialAttackOf,
} from "./content/creatureText.js";
export {
  ALL_FACE_CARDS,
  ARCANE_ECHO_FACE,
  BASIC_FACE_CARDS,
  BLADE_RAIN,
  BURN_FACE_DECK,
  BURN_STARTING_DICE,
  COMBO_MECHANICAL_FACE_DECK,
  COMBO_MECHANICAL_STARTING_DICE,
  CONTROL_FACE_DECK,
  CONTROL_STARTING_DICE,
  CRUSH,
  DEFAULT_BASIC_LAYOUT,
  FACE_CARDS,
  FORBIDDEN_HERITAGE,
  GREAT_SPARK,
  PESTILENT_PLAGUE,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_STARTING_DICE,
  AGGRO_STARTING_DICE,
  ENGINE_TEST_FACE_DECK,
  REKINDLE,
  RENDING_CLAW,
  SPECIAL_FACE_CARDS,
  SHIELD_FACE_ID,
  STARTING_DIE_SYMBOLS,
  TEMPO_FACE_DECK,
  TEMPO_STARTING_DICE,
  faceIdFor,
  faceIdForSymbol,
  getFaceCard,
  legacyStartingLayout,
  naturalFaceId,
} from "./content/faces.js";
export { ALL_BUILTIN_LOADOUTS } from "./content/loadouts/index.js";
