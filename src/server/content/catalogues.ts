/**
 * Catalogue public API. Per-entity JSON lives under `cards/`, `creatures/`,
 * and `faces/`; id constants and glob loaders stay in the sibling modules.
 */
export {
  ALL_CARDS,
  CARDS,
  getCard,
} from "./cards.js";
export {
  ALL_CREATURES,
  CREATURES,
  getCreatureDefinition,
} from "./creatures.js";
export {
  ALL_FACE_CARDS,
  BASIC_FACE_CARDS,
  FACE_CARDS,
  SPECIAL_FACE_CARDS,
  getFaceCard,
} from "./faces.js";
