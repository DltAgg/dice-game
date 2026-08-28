import type { CreatureDefinition } from "../model/creatures.js";
import { asCreatureDefinitionId, type CreatureDefinitionId } from "../model/ids.js";
import creatureOrder from "./creatures/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";

/**
 * Creatures from the Figma *Creature card* page (English printing) — the six
 * Slow-game-test cards. HP is a uniform +4 band over the original Figma Slow
 * print (playtest: skirmishes ended before control could interact). Passives
 * and multi-clause riders print in full; attack `effect` is the damage line.
 * Control attack resource riders are wired via `on-attack` + `attackKinds`
 * (no attack `effects[]` yet). Do not approximate missing riders.
 *
 * Plus authored Mechanical / Luminar creatures for Tempo and Combo Mechanical
 * constructed (not on builtin Aggro/Control squads), Nightbound Adept for
 * two-color Control (Arcane / Darkness), and Toxin / Corruption bodies for
 * the builtin Burn squad.
 */

export const MINOTAUR: CreatureDefinitionId = asCreatureDefinitionId("creature-minotaur");
export const VARCOLAC: CreatureDefinitionId = asCreatureDefinitionId("creature-varcolac");
export const GARUDA: CreatureDefinitionId = asCreatureDefinitionId("creature-garuda");
export const ARCHMAGE: CreatureDefinitionId = asCreatureDefinitionId("creature-archmage");
export const CORRUPTING_ELDER: CreatureDefinitionId = asCreatureDefinitionId(
  "creature-corrupting-elder",
);
export const VOID_SUMMONER: CreatureDefinitionId = asCreatureDefinitionId(
  "creature-void-summoner",
);

/** Luminar — Tempo glue: absorb → attack bonus, heal / ally buff. */
export const PRISM_HERALD: CreatureDefinitionId =
  asCreatureDefinitionId("creature-prism-herald");
/** Luminar — Combo glue: absorb / attack → generate Luminar. */
export const LENS_CHOIR: CreatureDefinitionId = asCreatureDefinitionId("creature-lens-choir");
/** Luminar — Tempo/support: Luminar discount + ally-attack heal. */
export const AEGIS_LINK: CreatureDefinitionId = asCreatureDefinitionId("creature-aegis-link");
/** Mechanical — Tempo: absorb → attack bonus; Overclock regenerates Mechanical. */
export const COGWORK_DRIVER: CreatureDefinitionId =
  asCreatureDefinitionId("creature-cogwork-driver");
/** Mechanical — Combo: absorb → generate Mechanical; Stamp Pulse re-fires dice. */
export const SERVO_ASSEMBLY: CreatureDefinitionId =
  asCreatureDefinitionId("creature-servo-assembly");
/** Mechanical — Combo: roll Mechanical → attack bonus; forge-discount special. */
export const CLOCKWORK_DYNAMO: CreatureDefinitionId =
  asCreatureDefinitionId("creature-clockwork-dynamo");
/** Darkness — Control closer/disruption: absorb hate + Darkness fuel. */
export const NIGHTBOUND_ADEPT: CreatureDefinitionId = asCreatureDefinitionId(
  "creature-nightbound-adept",
);

/** Toxin — Burn tank: enemy toxin ticks spread extra markers. */
export const MARROW_FIEND: CreatureDefinitionId =
  asCreatureDefinitionId("creature-marrow-fiend");
/** Corruption — Burn pinger: opponent turn-start damage. */
export const CINDER_WIGHT: CreatureDefinitionId =
  asCreatureDefinitionId("creature-cinder-wight");
/** Toxin — Burn converter: Toxin discount + absorb → apply Toxin. */
export const ICHOR_HYDRA: CreatureDefinitionId =
  asCreatureDefinitionId("creature-ichor-hydra");

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
