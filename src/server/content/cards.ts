import type { CardDefinition } from "../model/cards.js";
import { asCardId, type CardId } from "../model/ids.js";
import cardOrder from "./cards/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";
import { lookupOverlayCard } from "./runtimeOverlay.js";

/**
 * Live catalogue is the first-playtest tag team (spec `030`): Vega, Magnus,
 * and Ryu, plus Response and Modify cards. Header `playCost` remains unused
 * pile data.
 */

export const BRACE: CardId = asCardId("card-brace");
export const COUNTER: CardId = asCardId("card-counter");
export const OPEN_PALM: CardId = asCardId("card-open-palm");
export const REFORGE_GRIP: CardId = asCardId("card-reforge-grip");
export const VEGA_DRILL: CardId = asCardId("card-vega-drill");
export const RYU_FORM: CardId = asCardId("card-ryu-form");
export const OPEN_MANUAL: CardId = asCardId("card-open-manual");
export const SHIFT: CardId = asCardId("card-shift");
export const CALL_OUT: CardId = asCardId("card-call-out");
export const ANCHOR: CardId = asCardId("card-anchor");

const cardModules = import.meta.glob("./cards/card-*.json", { eager: true, import: "default" });
const loadedCards = catalogueFromModules<CardDefinition>(cardModules, cardOrder);

export const CARDS: Readonly<Record<string, CardDefinition>> = loadedCards.byId;
export const getCard = (id: CardId): CardDefinition | undefined =>
  lookupOverlayCard(id) ?? CARDS[id];
export const ALL_CARDS: readonly CardDefinition[] = loadedCards.list;
