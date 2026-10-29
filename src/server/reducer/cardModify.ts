import { getCard } from "../content/cards.js";
import type { ChainLink } from "../model/state.js";
import { patchCreature, patchDie, type Draft } from "./draft.js";
import { performTagSwitch } from "./commands/tag.js";
import { attachEquipment, moveCard } from "./zones.js";

/** Apply a Modify when its Chain link conducts. Roll writes the showing slot. A moveset Replace and a die rewrite leave that slot where it is. */
export function applyCardModify(draft: Draft, link: ChainLink): void {
  const modify = link.modify;
  if (modify === undefined) return;

  if (modify.subject === "roll" || modify.subject === "die") {
    if (modify.dieId === null || modify.slotIndex === null) return;
    const die = draft.dice[modify.dieId];
    if (die === undefined) return;
    if (modify.slotIndex < 0 || modify.slotIndex >= die.slots.length) return;
    if (modify.subject === "roll") {
      patchDie(draft, modify.dieId, { rolledSlotIndex: modify.slotIndex });
      return;
    }
    if (modify.faceCardId === null) return;
    const faceCardId = modify.faceCardId;
    const slots = die.slots.map((slot, index) =>
      index === modify.slotIndex ? { ...slot, faceCardId } : slot,
    );
    patchDie(draft, modify.dieId, { slots });
    return;
  }

  if (modify.subject === "moveset") {
    const cardInstanceId = link.cardInstanceId;
    const creatureId = link.declaredTargetCreatureId;
    const instance = cardInstanceId === null ? undefined : draft.cards[cardInstanceId];
    const definition = instance === undefined ? undefined : getCard(instance.cardId);
    const added = definition?.addedTechnique;
    const creature = creatureId === null ? undefined : draft.creatures[creatureId];
    if (added === undefined || creature === undefined) {
      if (cardInstanceId !== null) moveCard(draft, cardInstanceId, "graveyard");
      return;
    }
    const existing = creature.addedTechniques ?? [];
    if (!existing.some((technique) => technique.id === added.id)) {
      patchCreature(draft, creature.id, { addedTechniques: [...existing, added] });
    }
    const replaceFaceId = definition?.replaceFaceId;
    if (
      replaceFaceId !== undefined &&
      modify.dieId !== null &&
      modify.slotIndex !== null &&
      modify.faceCardId === replaceFaceId
    ) {
      const die = draft.dice[modify.dieId];
      if (die !== undefined && modify.slotIndex >= 0 && modify.slotIndex < die.slots.length) {
        const slotIndex = modify.slotIndex;
        const slots = die.slots.map((slot, index) =>
          index === slotIndex ? { ...slot, faceCardId: replaceFaceId } : slot,
        );
        patchDie(draft, modify.dieId, { slots });
      }
    }
    if (cardInstanceId !== null) {
      moveCard(draft, cardInstanceId, "equipment");
      attachEquipment(draft, cardInstanceId, creature.id);
    }
    return;
  }

  if (modify.subject === "target") {
    const next = link.declaredTargetCreatureId;
    if (next === null) return;
    const destination = draft.creatures[next];
    if (destination === undefined || destination.defeated) return;
    const index = draft.chainStack.findIndex(
      (item) =>
        (item.kind === "combat-action" || item.kind === "attack") &&
        (item.declaredTargetCreatureId !== null || item.attackTargetId !== null),
    );
    const current = index < 0 ? undefined : draft.chainStack[index];
    if (current === undefined) return;
    draft.chainStack[index] = {
      ...current,
      declaredTargetCreatureId: current.declaredTargetCreatureId !== null ? next : null,
      attackTargetId: current.attackTargetId !== null ? next : current.attackTargetId,
    };
    return;
  }

  if (link.declaredTargetCreatureId === null) return;
  performTagSwitch(draft, link.controllerId, link.declaredTargetCreatureId);
}
