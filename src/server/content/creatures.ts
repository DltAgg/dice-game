import type { CreatureDefinition } from "../model/creatures.js";
import { asCreatureDefinitionId, type CreatureDefinitionId } from "../model/ids.js";
import creatureOrder from "./creatures/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";

/** Figma Slow-game-test six + Tempo/Combo/Burn/Control bodies + legendaries (JSON). */
export const MINOTAUR = asCreatureDefinitionId("creature-minotaur");
export const VARCOLAC = asCreatureDefinitionId("creature-varcolac");
export const GARUDA = asCreatureDefinitionId("creature-garuda");
export const WARLORD_IRONHOOF = asCreatureDefinitionId("creature-warlord-ironhoof");
export const THORNMANE_PACKLORD = asCreatureDefinitionId("creature-thornmane-packlord");
export const ARCHMAGE = asCreatureDefinitionId("creature-archmage");
export const CORRUPTING_ELDER = asCreatureDefinitionId("creature-corrupting-elder");
export const VOID_SUMMONER = asCreatureDefinitionId("creature-void-summoner");
export const SOVEREIGN_NIGHTVAULT = asCreatureDefinitionId("creature-sovereign-nightvault");
export const UMBRA_GRAVEWARDEN = asCreatureDefinitionId("creature-umbra-gravewarden");
export const PRISM_HERALD = asCreatureDefinitionId("creature-prism-herald");
export const LENS_CHOIR = asCreatureDefinitionId("creature-lens-choir");
export const AEGIS_LINK = asCreatureDefinitionId("creature-aegis-link");
export const PRISMARCH_REGENT = asCreatureDefinitionId("creature-prismarch-regent");
export const COGWORK_DRIVER = asCreatureDefinitionId("creature-cogwork-driver");
export const SERVO_ASSEMBLY = asCreatureDefinitionId("creature-servo-assembly");
export const CLOCKWORK_DYNAMO = asCreatureDefinitionId("creature-clockwork-dynamo");
export const FORGEHEART_COLOSSUS = asCreatureDefinitionId("creature-forgeheart-colossus");
export const AETHERCORE_SOVEREIGN = asCreatureDefinitionId("creature-aethercore-sovereign");
export const NIGHTBOUND_ADEPT = asCreatureDefinitionId("creature-nightbound-adept");
export const MARROW_FIEND = asCreatureDefinitionId("creature-marrow-fiend");
export const CINDER_WIGHT = asCreatureDefinitionId("creature-cinder-wight");
export const ICHOR_HYDRA = asCreatureDefinitionId("creature-ichor-hydra");
export const BLIGHTCROWN_HYDRA = asCreatureDefinitionId("creature-blightcrown-hydra");
export const ASHEN_PLAGUEKING = asCreatureDefinitionId("creature-ashen-plagueking");

const creatureModules = import.meta.glob("./creatures/creature-*.json", {
  eager: true,
  import: "default",
});
const loadedCreatures = catalogueFromModules<CreatureDefinition>(creatureModules, creatureOrder);

export const CREATURES: Readonly<Record<string, CreatureDefinition>> = loadedCreatures.byId;
export const getCreatureDefinition = (id: CreatureDefinitionId): CreatureDefinition | undefined =>
  CREATURES[id];
export const ALL_CREATURES: readonly CreatureDefinition[] = loadedCreatures.list;

export {
  AGGRO_SQUAD,
  BURN_SQUAD,
  COMBO_MECHANICAL_SQUAD,
  CONTROL_SQUAD,
  PROTOTYPE_SQUAD,
  TEMPO_SQUAD,
} from "./loadouts/index.js";
