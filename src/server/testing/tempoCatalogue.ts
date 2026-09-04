/**
 * Shared Tempo catalogue ids for engine tests after the Mechanical + Luminar reset.
 */
import {
  BEACON_ARRAY,
  BRIGHT_CADENCE,
  CHOIRLIGHT,
  COG_DRAFT,
  DAYBREAK_RITE,
  DRIVESHAFT_RIG,
  GLINT_VEIL,
  IDLER_GEAR,
  LANTERN_OATH,
  MACHINE_SHOP,
  MENDING_LIGHT,
  MIRRORWARD,
  QUICKSET_JIG,
  RADIANT_ACCORD,
  RECAST,
  SHIM_KIT,
  TOOLING_ORDER,
  TWIN_CAM,
} from "../content/cards.js";
import { DAWN_WARDEN, LODESTAR_ARTIFICER, TORQUE_WRIGHT } from "../content/creatures.js";
import {
  COGTOOTH,
  ENGINE_TEST_FACE_DECK,
  GEAR_TRAIN,
  HALO_LAMP,
  LUCENT_CHOIR,
  MAINSPRING,
  SUNWARD_LENS,
} from "../content/faces.js";
import {
  AGGRO_STARTING_DICE,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  CONTROL_STARTING_DICE,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_SQUAD,
  TEMPO_STARTING_DICE,
} from "../content/loadouts/index.js";
import { asAttackId } from "../model/ids.js";
import type { AttributeTokens } from "../model/symbols.js";

export {
  BEACON_ARRAY,
  BRIGHT_CADENCE,
  CHOIRLIGHT,
  COG_DRAFT,
  COGTOOTH,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  CONTROL_STARTING_DICE,
  DAWN_WARDEN,
  DAYBREAK_RITE,
  DRIVESHAFT_RIG,
  ENGINE_TEST_FACE_DECK,
  GEAR_TRAIN,
  GLINT_VEIL,
  HALO_LAMP,
  IDLER_GEAR,
  LANTERN_OATH,
  LODESTAR_ARTIFICER,
  LUCENT_CHOIR,
  MACHINE_SHOP,
  MAINSPRING,
  MENDING_LIGHT,
  MIRRORWARD,
  QUICKSET_JIG,
  RADIANT_ACCORD,
  RECAST,
  SHIM_KIT,
  SUNWARD_LENS,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_SQUAD,
  TEMPO_STARTING_DICE,
  TOOLING_ORDER,
  TORQUE_WRIGHT,
  TWIN_CAM,
  AGGRO_STARTING_DICE,
};

/** Strike 3 basic — replaces legacy Minotaur Heavy Axe in combat/prevent tests. */
export const DRIVE_SHAFT = asAttackId("attack-lodestar-artificer-drive-shaft");
/** Strike 2 basic — replaces legacy Varcolac Charge. */
export const KINDLE = asAttackId("attack-dawn-warden-kindle");
/** Strike 2 basic — Torque Wright body attack. */
export const CRANK = asAttackId("attack-torque-wright-crank");
/** Strike 2 special with reforge follow-up. */
export const RETOOL = asAttackId("attack-torque-wright-retool");
/** Strike 3 special with stamp follow-up. */
export const OVERDRIVE = asAttackId("attack-lodestar-artificer-overdrive");
/** Strike 2 special with shield follow-up. */
export const VIGIL = asAttackId("attack-dawn-warden-vigil");

/** Live Crank Spend: Mechanical + Any. */
export const CRANK_FUEL: AttributeTokens = { mechanical: 1, luminar: 1 };
/** Live Drive Shaft Spend: Mechanical + Luminar + Any. */
export const DRIVE_SHAFT_FUEL: AttributeTokens = { mechanical: 1, luminar: 1, martial: 1 };
/** Live Kindle Spend: 2 Luminar. */
export const KINDLE_FUEL: AttributeTokens = { luminar: 2 };
/** Live Retool: Requires Mechanical 2 + Any, Spend 2 Mechanical. */
export const RETOOL_FUEL: AttributeTokens = { mechanical: 2, luminar: 1 };
