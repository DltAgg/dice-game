import type { CreatureDefinition } from "../model/creatures.js";
import { asCreatureDefinitionId, type CreatureDefinitionId } from "../model/ids.js";
import creatureOrder from "./creatures/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";

/**
 * Creature catalogue (spec `003`). Two squads, each two bodies plus one
 * legendary win target: Mechanical + Luminar Tempo and Arcane + Darkness
 * Control.
 */
export const TORQUE_WRIGHT: CreatureDefinitionId =
  asCreatureDefinitionId("creature-torque-wright");
export const DAWN_WARDEN: CreatureDefinitionId =
  asCreatureDefinitionId("creature-dawn-warden");
export const LODESTAR_ARTIFICER: CreatureDefinitionId =
  asCreatureDefinitionId("creature-lodestar-artificer");

export const RIFTSCRIBE_ADEPT: CreatureDefinitionId =
  asCreatureDefinitionId("creature-riftscribe-adept");
export const GRAVEMARROW_SHADE: CreatureDefinitionId =
  asCreatureDefinitionId("creature-gravemarrow-shade");
export const DUSKTHRONE_ORACLE: CreatureDefinitionId =
  asCreatureDefinitionId("creature-duskthrone-oracle");

const creatureModules = import.meta.glob("./creatures/creature-*.json", {
  eager: true,
  import: "default",
});
const loadedCreatures = catalogueFromModules<CreatureDefinition>(creatureModules, creatureOrder);

export const CREATURES: Readonly<Record<string, CreatureDefinition>> = loadedCreatures.byId;
export const getCreatureDefinition = (id: CreatureDefinitionId): CreatureDefinition | undefined =>
  CREATURES[id];
export const ALL_CREATURES: readonly CreatureDefinition[] = loadedCreatures.list;

/** Re-export loadout squads so tests can import creatures + squad from one module. */
export {
  AGGRO_SQUAD,
  AGGRO_STARTING_DICE,
  CONTROL_SQUAD,
  PROTOTYPE_SQUAD,
  TEMPO_SQUAD,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_STARTING_DICE,
} from "./loadouts/index.js";
