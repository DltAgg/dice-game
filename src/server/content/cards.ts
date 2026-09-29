import type { CardDefinition } from "../model/cards.js";
import { asCardId, type CardId } from "../model/ids.js";
import cardOrder from "./cards/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";
import { lookupOverlayCard } from "./runtimeOverlay.js";

/**
 * Live catalogue is the Tag Skirmish prototype (spec `028`): fighter,
 * archetype, team, and universal tactics. Header `playCost` remains unused
 * pile data.
 */

export const PRESSURE: CardId = asCardId("card-pressure");
export const COMMAND_THROW: CardId = asCardId("card-command-throw");
export const KEEP_AWAY: CardId = asCardId("card-keep-away");
export const CROSS_RUSH: CardId = asCardId("card-cross-rush");
export const DRAGON_STRIKE: CardId = asCardId("card-dragon-strike");
export const TECHNIQUE_DRILL: CardId = asCardId("card-technique-drill");
export const FOCUS: CardId = asCardId("card-focus");
export const GUARD_UP: CardId = asCardId("card-guard-up");

const cardModules = import.meta.glob("./cards/card-*.json", { eager: true, import: "default" });
const loadedCards = catalogueFromModules<CardDefinition>(cardModules, cardOrder);

export const CARDS: Readonly<Record<string, CardDefinition>> = loadedCards.byId;
export const getCard = (id: CardId): CardDefinition | undefined =>
  lookupOverlayCard(id) ?? CARDS[id];
export const ALL_CARDS: readonly CardDefinition[] = loadedCards.list;
