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
export * from "./rules/overcharge.js";
export * from "./rules/reforge.js";
export * from "./rules/reactions.js";
export * from "./rules/silence.js";
export * from "./rules/bounce.js";
export * from "./rules/desynthesize.js";
export * from "./rules/symbols.js";
export * from "./rules/targeting.js";
export * from "./rules/targets.js";
export * from "./rules/tokens.js";

export { ALL_CARDS, CARDS, getCard } from "./content/cards.js";
export {
  attributeLabel,
  formatEffectRegion,
  formatFaceKind,
  formatForgeLine,
  formatInspectEffectLines,
  formatPlayCostHeader,
  formatPlayCostLine,
  formatRequirementBody,
  formatRequirementLine,
  formatSpendLine,
  formatTypeLine,
} from "./content/cardText.js";
export {
  ALL_CREATURES,
  CREATURES,
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
  BASIC_FACE_CARDS,
  COGTOOTH,
  DAWNWRIGHT,
  DEFAULT_BASIC_LAYOUT,
  ENGINE_TEST_FACE_DECK,
  FACE_CARDS,
  GEAR_TRAIN,
  HALO_LAMP,
  LUCENT_CHOIR,
  MAINSPRING,
  SHIELD_FACE_ID,
  SPECIAL_FACE_CARDS,
  STARTING_DIE_SYMBOLS,
  SUNWARD_LENS,
  faceIdFor,
  faceIdForSymbol,
  getFaceCard,
  legacyStartingLayout,
  naturalFaceId,
} from "./content/faces.js";

/**
 * Builtin loadouts are owned by `content/loadouts` (deck-designer). The
 * catalogue loaders above no longer re-export deck lists.
 */
export {
  AGGRO_DECK,
  AGGRO_FACE_DECK,
  AGGRO_SQUAD,
  AGGRO_STARTING_DICE,
  ALL_BUILTIN_LOADOUTS,
  BURN_DECK,
  BURN_DECK_COUNTS,
  BURN_FACE_DECK,
  BURN_SQUAD,
  BURN_STARTING_DICE,
  COMBO_MECHANICAL_DECK,
  COMBO_MECHANICAL_FACE_DECK,
  COMBO_MECHANICAL_SQUAD,
  COMBO_MECHANICAL_STARTING_DICE,
  CONTROL_DECK,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  CONTROL_STARTING_DICE,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  PROTOTYPE_STARTING_DICE,
  TEMPO_DECK,
  TEMPO_DECK_COUNTS,
  TEMPO_FACE_DECK,
  TEMPO_LOADOUT,
  TEMPO_SQUAD,
  TEMPO_STARTING_DICE,
} from "./content/loadouts/index.js";
