import type { CardDefinition } from "../model/cards.js";
import type { CreatureDefinition } from "../model/creatures.js";
import type { FaceCardDefinition } from "../model/dice.js";
import type { CardId, CreatureDefinitionId, FaceCardId } from "../model/ids.js";

const extraCards = new Map<string, CardDefinition>();
const extraCreatures = new Map<string, CreatureDefinition>();
const extraFaces = new Map<string, FaceCardDefinition>();

const rememberedCards: CardDefinition[] = [];
const rememberedCreatures: CreatureDefinition[] = [];
const rememberedFaces: FaceCardDefinition[] = [];

function remember<T extends { readonly id: string }>(list: T[], def: T): void {
  if (!list.some((entry) => entry.id === def.id)) list.push(def);
}

export function registerOverlayCard(def: CardDefinition): CardDefinition {
  extraCards.set(def.id, def);
  remember(rememberedCards, def);
  return def;
}

export function registerOverlayCreature(def: CreatureDefinition): CreatureDefinition {
  extraCreatures.set(def.id, def);
  remember(rememberedCreatures, def);
  return def;
}

export function registerOverlayFace(def: FaceCardDefinition): FaceCardDefinition {
  extraFaces.set(def.id, def);
  remember(rememberedFaces, def);
  return def;
}

export function lookupOverlayCard(id: CardId): CardDefinition | undefined {
  return extraCards.get(id);
}

export function lookupOverlayCreature(
  id: CreatureDefinitionId,
): CreatureDefinition | undefined {
  return extraCreatures.get(id);
}

export function lookupOverlayFace(id: FaceCardId): FaceCardDefinition | undefined {
  return extraFaces.get(id);
}

/** Clears lookup maps. Remembered fixtures stay so the next `reapply` can restore them. */
export function clearOverlayLookups(): void {
  extraCards.clear();
  extraCreatures.clear();
  extraFaces.clear();
}

export function reapplyRememberedOverlays(): void {
  for (const def of rememberedCards) extraCards.set(def.id, def);
  for (const def of rememberedCreatures) extraCreatures.set(def.id, def);
  for (const def of rememberedFaces) extraFaces.set(def.id, def);
}
