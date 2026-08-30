import type { CardDefinition } from "../model/cards.js";
import { asCardId, type CardId } from "../model/ids.js";
import cardOrder from "./cards/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";

/**
 * Header play/forge costs use the attribute pile (`playCost`). See docs/RULEBOOK.md §6.
 *
 * Current catalogue is the Mechanical + Luminar Tempo set (spec `002`).
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

const cardModules = import.meta.glob("./cards/card-*.json", { eager: true, import: "default" });
const loadedCards = catalogueFromModules<CardDefinition>(cardModules, cardOrder);

export const CARDS: Readonly<Record<string, CardDefinition>> = loadedCards.byId;
export const getCard = (id: CardId): CardDefinition | undefined => CARDS[id];
export const ALL_CARDS: readonly CardDefinition[] = loadedCards.list;
