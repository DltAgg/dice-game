import type { ChainLink } from "../model/state.js";
import { patchCreature, patchDie, type Draft } from "./draft.js";
import { performTagSwitch } from "./commands/tag.js";

/** Apply a Modify when its Chain link conducts. Roll writes the result only. */
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
    if (link.declaredTargetCreatureId === null || modify.techniqueId === null) return;
    const creature = draft.creatures[link.declaredTargetCreatureId];
    if (creature === undefined) return;
    const ids = creature.enabledTechniqueIds ?? [];
    if (ids.includes(modify.techniqueId)) return;
    patchCreature(draft, creature.id, {
      enabledTechniqueIds: [...ids, modify.techniqueId],
    });
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
