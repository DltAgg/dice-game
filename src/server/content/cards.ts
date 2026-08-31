import type { CardDefinition } from "../model/cards.js";
import { asCardId, type CardId } from "../model/ids.js";
import cardOrder from "./cards/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";

/**
 * Header play/forge costs use the attribute pile (`playCost`). See docs/RULEBOOK.md §6.
 *
 * Current catalogue holds two archetype sets (spec `002`): the Mechanical +
 * Luminar Tempo package and the Arcane + Darkness Control package.
 */

/* ------------------------------------------------------- Mechanical --- */

export const COG_DRAFT: CardId = asCardId("card-cog-draft");
export const TOOLING_ORDER: CardId = asCardId("card-tooling-order");
export const SHIM_KIT: CardId = asCardId("card-shim-kit");
export const QUICKSET_JIG: CardId = asCardId("card-quickset-jig");
export const DIE_PUNCH: CardId = asCardId("card-die-punch");
export const RECAST: CardId = asCardId("card-recast");
export const TWIN_CAM: CardId = asCardId("card-twin-cam");
export const IDLER_GEAR: CardId = asCardId("card-idler-gear");
export const PAWL_SPRING: CardId = asCardId("card-pawl-spring");
export const DRIVESHAFT_RIG: CardId = asCardId("card-driveshaft-rig");
export const MACHINE_SHOP: CardId = asCardId("card-machine-shop");
export const TEMPERING_LINE: CardId = asCardId("card-tempering-line");

/* ---------------------------------------------------------- Luminar --- */

export const GLINT_VEIL: CardId = asCardId("card-glint-veil");
export const MIRRORWARD: CardId = asCardId("card-mirrorward");
export const LANTERN_OATH: CardId = asCardId("card-lantern-oath");
export const MENDING_LIGHT: CardId = asCardId("card-mending-light");
export const BRIGHT_CADENCE: CardId = asCardId("card-bright-cadence");
export const PRISM_MANTLE: CardId = asCardId("card-prism-mantle");
export const BEACON_ARRAY: CardId = asCardId("card-beacon-array");
export const CHOIRLIGHT: CardId = asCardId("card-choirlight");
export const RADIANT_ACCORD: CardId = asCardId("card-radiant-accord");
export const DAYBREAK_RITE: CardId = asCardId("card-daybreak-rite");

/* ----------------------------------------------------------- Arcane --- */

export const THREAD_THE_WEAVE: CardId = asCardId("card-thread-the-weave");
export const ORACLES_MARGIN: CardId = asCardId("card-oracles-margin");
export const GLYPH_OF_REFUSAL: CardId = asCardId("card-glyph-of-refusal");
export const SEALBIND_RUNE: CardId = asCardId("card-sealbind-rune");
export const UNWRITE: CardId = asCardId("card-unwrite");
export const RIFTMARK: CardId = asCardId("card-riftmark");
export const SCHOLARS_LIEN: CardId = asCardId("card-scholars-lien");
export const RUNEWATCH_LENS: CardId = asCardId("card-runewatch-lens");
export const ARCHIVISTS_SUMMONS: CardId = asCardId("card-archivists-summons");
export const FORESIGHT_TITHE: CardId = asCardId("card-foresight-tithe");
export const WARDED_ANNALS: CardId = asCardId("card-warded-annals");

/* --------------------------------------------------------- Darkness --- */

export const HOLLOW_TIDE: CardId = asCardId("card-hollow-tide");
export const GLOOMDRAFT: CardId = asCardId("card-gloomdraft");
export const PALL_OF_ASH: CardId = asCardId("card-pall-of-ash");
export const SABLE_TITHE: CardId = asCardId("card-sable-tithe");
export const SWALLOWED_WHOLE: CardId = asCardId("card-swallowed-whole");
export const CINERARY_LOCKET: CardId = asCardId("card-cinerary-locket");
export const NIGHTGLASS_RUNE: CardId = asCardId("card-nightglass-rune");
export const GRAVEN_SUMMONS: CardId = asCardId("card-graven-summons");
export const ECHO_OF_THE_BURIED: CardId = asCardId("card-echo-of-the-buried");
export const NIGHTMARROW_PACT: CardId = asCardId("card-nightmarrow-pact");
export const LIGHTLESS_VERDICT: CardId = asCardId("card-lightless-verdict");

/* ---------------------------------------------------------- generic --- */

/**
 * No header `playCost`, no attribute-exclusive verb, no Spend/Generate
 * conversion: any constructed list can play these. Their `attribute` is
 * forge paint only — the dice-native splash, not a ninth colourless
 * attribute.
 */

export const RETHROW: CardId = asCardId("card-rethrow");
export const WARD_CHIT: CardId = asCardId("card-ward-chit");

const cardModules = import.meta.glob("./cards/card-*.json", { eager: true, import: "default" });
const loadedCards = catalogueFromModules<CardDefinition>(cardModules, cardOrder);

export const CARDS: Readonly<Record<string, CardDefinition>> = loadedCards.byId;
export const getCard = (id: CardId): CardDefinition | undefined => CARDS[id];
export const ALL_CARDS: readonly CardDefinition[] = loadedCards.list;
