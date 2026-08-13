import { getCard } from "../content/cards.js";
import { getFaceCard } from "../content/faces.js";
import type { EffectDefinition } from "../model/effects.js";
import {
  asEffectInstanceId,
  type CreatureId,
  type DieId,
  type FaceCardId,
  type PlayerId,
} from "../model/ids.js";
import type { SymbolType } from "../model/symbols.js";
import { nextInstanceId, type Draft } from "./draft.js";

/**
 * Shared standing-trigger hooks (`010-trigger-hooks`). Catalogue data lists
 * effects; this module only decides *when* to queue them.
 *
 * Intentionally does not import `resolution.ts` (that module calls these hooks
 * while draining the stack).
 */

function pushEffect(
  draft: Draft,
  controllerId: PlayerId,
  effect: EffectDefinition,
  sourceCreatureId: CreatureId | null,
  declaredTargetCreatureId: CreatureId | null,
): void {
  draft.resolutionStack.push({
    id: asEffectInstanceId(nextInstanceId(draft, "effect")),
    controllerId,
    effect,
    sourceCreatureId,
    declaredTargetCreatureId,
  });
}

function pushAbilityEffects(
  draft: Draft,
  controllerId: PlayerId,
  sourceCreatureId: CreatureId,
  declaredTargetCreatureId: CreatureId | null,
  effects: readonly EffectDefinition[],
): void {
  for (const effect of [...effects].reverse()) {
    pushEffect(draft, controllerId, effect, sourceCreatureId, declaredTargetCreatureId);
  }
}

/** After the bearer deals HP damage to `damagedCreatureId`. */
export function fireOnDealDamage(
  draft: Draft,
  sourceCreatureId: CreatureId,
  damagedCreatureId: CreatureId,
): void {
  const creature = draft.creatures[sourceCreatureId];
  if (creature === undefined || creature.defeated) return;

  for (const cardInstanceId of creature.equipmentIds) {
    const instance = draft.cards[cardInstanceId];
    if (instance === undefined) continue;
    const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
    for (const ability of abilities) {
      if (ability.type !== "on-deal-damage") continue;
      pushAbilityEffects(
        draft,
        instance.ownerId,
        sourceCreatureId,
        damagedCreatureId,
        ability.effects,
      );
    }
  }
}

/**
 * After a toxin tick deals HP damage to `damagedCreatureId`. Fires gear on
 * creatures owned by that creature's controller.
 */
export function fireOnToxinDamage(draft: Draft, damagedCreatureId: CreatureId): void {
  const damaged = draft.creatures[damagedCreatureId];
  if (damaged === undefined) return;
  const owner = draft.players[damaged.ownerId];
  if (owner === undefined) return;

  for (const creatureId of owner.creatureIds) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    for (const cardInstanceId of creature.equipmentIds) {
      const instance = draft.cards[cardInstanceId];
      if (instance === undefined) continue;
      const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
      for (const ability of abilities) {
        if (ability.type !== "on-toxin-damage") continue;
        pushAbilityEffects(draft, instance.ownerId, creatureId, null, ability.effects);
      }
    }
  }
}

/** During roll: equipment keyed to the showing symbol on the rolling player's hosts. */
export function fireEquipmentOnRollSymbol(
  draft: Draft,
  rollingPlayerId: PlayerId,
  symbol: SymbolType,
): void {
  const player = draft.players[rollingPlayerId];
  if (player === undefined) return;

  for (const creatureId of player.creatureIds) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    for (const cardInstanceId of creature.equipmentIds) {
      const instance = draft.cards[cardInstanceId];
      if (instance === undefined) continue;
      const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
      for (const ability of abilities) {
        if (ability.type !== "on-roll-symbol") continue;
        if (ability.symbol !== symbol) continue;
        pushAbilityEffects(draft, instance.ownerId, creatureId, creatureId, ability.effects);
      }
    }
  }
}

/** Queue absorb triggers (caller must `drainResolution`). */
export function queueAbsorbTriggers(
  draft: Draft,
  absorbingPlayerId: PlayerId,
  creatureId: CreatureId,
  symbol: SymbolType,
  sourceDieId: DieId | null,
): void {
  fireEquipmentOnAbsorb(draft, creatureId, symbol);

  if (sourceDieId === null) return;
  const die = draft.dice[sourceDieId];
  const slotIndex = die?.rolledSlotIndex;
  if (die === undefined || slotIndex === null || slotIndex === undefined) return;
  const faceCardId = die.slots[slotIndex]?.faceCardId;
  if (faceCardId === undefined) return;
  // Absorbing creature is the face/overload source so `source-creature` targets
  // (e.g. Vital Spark prevent) resolve against the absorber.
  fireFaceOnAbsorb(draft, absorbingPlayerId, faceCardId, creatureId);
  fireOverloadsOnAbsorb(draft, absorbingPlayerId, faceCardId, creatureId);
}

function fireEquipmentOnAbsorb(draft: Draft, creatureId: CreatureId, symbol: SymbolType): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return;

  for (const cardInstanceId of creature.equipmentIds) {
    const instance = draft.cards[cardInstanceId];
    if (instance === undefined) continue;
    const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
    for (const ability of abilities) {
      if (ability.type !== "on-absorb") continue;
      if (ability.symbols !== undefined && !ability.symbols.includes(symbol)) continue;
      pushAbilityEffects(draft, instance.ownerId, creatureId, creatureId, ability.effects);
    }
  }
}

function fireFaceOnAbsorb(
  draft: Draft,
  controllerId: PlayerId,
  faceCardId: FaceCardId,
  absorbingCreatureId: CreatureId,
): void {
  const face = getFaceCard(faceCardId);
  if (face === undefined || face.onAbsorb.length === 0) return;
  for (const effect of [...face.onAbsorb].reverse()) {
    pushEffect(draft, controllerId, effect, absorbingCreatureId, null);
  }
}

function fireOverloadsOnAbsorb(
  draft: Draft,
  controllerId: PlayerId,
  faceCardId: FaceCardId,
  absorbingCreatureId: CreatureId,
): void {
  const player = draft.players[controllerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.overload) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId !== faceCardId) continue;
    const effects = getCard(card.cardId)?.overload?.onAbsorb ?? [];
    for (const effect of [...effects].reverse()) {
      pushEffect(draft, controllerId, effect, absorbingCreatureId, null);
    }
  }
}
