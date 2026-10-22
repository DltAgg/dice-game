import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId, DieId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { isActiveFighter, isLivingReserve } from "./fighters.js";

export interface CardPlayIntent {
  readonly mode: "normal" | "exceptional";
  readonly dieId: DieId | null;
  readonly slotIndex: number | null;
  readonly faceCardId: FaceCardId | null;
  readonly techniqueId: string | null;
  readonly targetCreatureId: CreatureId | null;
}

function outsideChainMeter(definition: CardDefinition): boolean {
  return definition.exceptionalMeterCost !== undefined && definition.exceptionalMeterCost > 0;
}

function priorityWindow(state: GameState, playerId: PlayerId): boolean {
  const pending = state.pendingDecision;
  return pending?.type === "reaction-priority" && pending.priorityPlayerId === playerId;
}

function onYourAct(state: GameState, playerId: PlayerId): boolean {
  return (
    state.phase === "actions" &&
    state.pendingDecision === null &&
    state.activePlayerId === playerId
  );
}

/**
 * Legality for a Response, or a Modify that names a subject. Other Modifies
 * keep the actions-phase play path. A Response needs the reaction window.
 * A Modify that prints an outside-chain Meter cost needs that window or
 * exceptional mode. A Modify that prints no such cost is legal on your turn
 * in the actions phase when its subject can be chosen.
 */
export function behaviorPlayError(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
  intent: CardPlayIntent,
): GameError | null {
  const combatBehavior =
    definition.type === "response" || definition.modifySubject !== undefined;
  if (!combatBehavior) return null;

  const inWindow = priorityWindow(state, playerId);

  if (intent.mode === "exceptional") {
    if (!outsideChainMeter(definition)) return "INVALID_TARGET";
  } else if (!inWindow) {
    const freeOnYourTurn =
      definition.type === "modify" &&
      definition.modifySubject !== undefined &&
      definition.modifySubject !== "tag" &&
      !outsideChainMeter(definition) &&
      onYourAct(state, playerId);
    if (!freeOnYourTurn) return "INVALID_PHASE";
  }

  if (definition.type === "response") {
    const opponentObject = state.chainStack.some(
      (link) => link.controllerId !== playerId && !link.negated,
    );
    if (!opponentObject) return "INVALID_CHAIN_TARGET";
    return null;
  }

  return modifyContextError(state, playerId, definition, intent);
}

function dieMatchesFighter(
  state: GameState,
  definition: CardDefinition,
  dieId: DieId,
): boolean {
  if (definition.fighterRestriction === undefined) return true;
  const die = state.dice[dieId];
  if (die === undefined) return false;
  const bound = die.boundCreatureId === null ? undefined : state.creatures[die.boundCreatureId];
  if (bound !== undefined) return bound.definitionId === definition.fighterRestriction;
  const owner = state.players[die.ownerId];
  if (owner === undefined) return false;
  const index = owner.dieIds.indexOf(dieId);
  const creatureId = index < 0 ? undefined : owner.creatureIds[index];
  const creature = creatureId === undefined ? undefined : state.creatures[creatureId];
  return creature?.definitionId === definition.fighterRestriction;
}

function modifyContextError(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
  intent: CardPlayIntent,
): GameError | null {
  const subject = definition.modifySubject;
  if (subject === undefined) return "CARD_HAS_NO_EFFECT";

  if (subject === "tag") {
    if (intent.mode !== "exceptional") return "INVALID_PHASE";
    const player = state.players[playerId];
    if (player === undefined) return "UNKNOWN_ENTITY";
    if (intent.targetCreatureId === null) return "INVALID_TARGET";
    if (!isLivingReserve(state, player, intent.targetCreatureId)) return "INVALID_TARGET";
    return null;
  }

  if (subject === "roll" || subject === "die") {
    if (intent.dieId === null || intent.slotIndex === null) return "INVALID_TARGET";
    const die = state.dice[intent.dieId];
    if (die === undefined) return "UNKNOWN_ENTITY";
    if (intent.slotIndex < 0 || intent.slotIndex >= die.slots.length) return "INVALID_TARGET";
    if (subject === "roll" && die.rolledSlotIndex === null) return "INVALID_TARGET";
    if (die.ownerId !== playerId) return "INVALID_TARGET";
    if (subject === "die") {
      if (intent.faceCardId === null || getFaceCard(intent.faceCardId) === undefined) {
        return "UNKNOWN_ENTITY";
      }
    }
    if (!dieMatchesFighter(state, definition, intent.dieId)) return "INVALID_TARGET";
    return null;
  }

  if (subject === "moveset") {
    if (intent.targetCreatureId === null || intent.techniqueId === null) return "INVALID_TARGET";
    const owner = state.players[playerId];
    if (owner === undefined || !isActiveFighter(owner, intent.targetCreatureId)) {
      return "INVALID_TARGET";
    }
    const creature = state.creatures[intent.targetCreatureId];
    if (creature === undefined || creature.defeated) return "INVALID_TARGET";
    if (
      definition.fighterRestriction !== undefined &&
      creature.definitionId !== definition.fighterRestriction
    ) {
      return "INVALID_TARGET";
    }
    const techniques = getCreatureDefinition(creature.definitionId)?.techniques ?? [];
    if (!techniques.some((technique) => technique.id === intent.techniqueId)) {
      return "INVALID_TARGET";
    }
    return null;
  }

  const redirectable = state.chainStack.some(
    (link) =>
      (link.kind === "combat-action" || link.kind === "attack") &&
      (link.declaredTargetCreatureId !== null || link.attackTargetId !== null),
  );
  if (!redirectable) return "INVALID_TARGET";
  if (intent.targetCreatureId === null) return "INVALID_TARGET";
  const next = state.creatures[intent.targetCreatureId];
  if (next === undefined || next.defeated) return "INVALID_TARGET";
  return null;
}

export interface ModifyPlayChoice {
  readonly label: string;
  readonly mode: "normal" | "exceptional";
  readonly dieId: DieId | null;
  readonly slotIndex: number | null;
  readonly faceCardId: FaceCardId | null;
  readonly techniqueId: string | null;
  readonly targetCreatureId: CreatureId | null;
}

function blankIntent(mode: "normal" | "exceptional"): CardPlayIntent {
  return {
    mode,
    dieId: null,
    slotIndex: null,
    faceCardId: null,
    techniqueId: null,
    targetCreatureId: null,
  };
}

function fighterName(state: GameState, playerId: PlayerId, creatureId: CreatureId): string {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return "Fighter";
  const name = getCreatureDefinition(creature.definitionId)?.name ?? "Fighter";
  return creature.ownerId === playerId ? name : `opponent ${name}`;
}

function playMode(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
): "normal" | "exceptional" | null {
  if (definition.modifySubject === "tag") return outsideChainMeter(definition) ? "exceptional" : null;
  if (priorityWindow(state, playerId)) return "normal";
  if (outsideChainMeter(definition)) return "exceptional";
  if (onYourAct(state, playerId)) return "normal";
  return null;
}

/**
 * Concrete plays the hand can offer for a Modify that names a subject.
 * Empty when the printed timing or the subject has nothing legal to choose.
 */
export function legalModifyPlays(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
): readonly ModifyPlayChoice[] {
  if (definition.type !== "modify" || definition.modifySubject === undefined) return [];
  const mode = playMode(state, playerId, definition);
  if (mode === null) return [];
  const player = state.players[playerId];
  if (player === undefined) return [];
  if (mode === "exceptional" && player.meter < (definition.exceptionalMeterCost ?? 0)) return [];

  const subject = definition.modifySubject;
  const choices: ModifyPlayChoice[] = [];
  const accept = (choice: ModifyPlayChoice): void => {
    const error = behaviorPlayError(state, playerId, definition, {
      mode: choice.mode,
      dieId: choice.dieId,
      slotIndex: choice.slotIndex,
      faceCardId: choice.faceCardId,
      techniqueId: choice.techniqueId,
      targetCreatureId: choice.targetCreatureId,
    });
    if (error === null) choices.push(choice);
  };

  if (subject === "tag") {
    for (const creatureId of player.creatureIds) {
      if (!isLivingReserve(state, player, creatureId)) continue;
      accept({
        ...blankIntent(mode),
        label: fighterName(state, playerId, creatureId),
        targetCreatureId: creatureId,
      });
    }
    return choices;
  }

  if (subject === "roll" || subject === "die") {
    for (const dieId of player.dieIds) {
      const die = state.dice[dieId];
      if (die === undefined) continue;
      const bound = die.boundCreatureId;
      const who = bound === null ? "Die" : fighterName(state, playerId, bound);
      if (subject === "roll") {
        if (die.rolledSlotIndex === null) continue;
        die.slots.forEach((slot, slotIndex) => {
          if (slotIndex === die.rolledSlotIndex) return;
          const face = getFaceCard(slot.faceCardId)?.name ?? "face";
          accept({
            ...blankIntent(mode),
            label: `${who} · ${face}`,
            dieId,
            slotIndex,
          });
        });
        continue;
      }
      const faces = new Set<FaceCardId>([
        ...die.slots.map((slot) => slot.faceCardId),
        ...player.facePool,
      ]);
      die.slots.forEach((slot, slotIndex) => {
        for (const faceCardId of faces) {
          if (faceCardId === slot.faceCardId) continue;
          const face = getFaceCard(faceCardId)?.name ?? "face";
          accept({
            ...blankIntent(mode),
            label: `${who} slot ${String(slotIndex + 1)} → ${face}`,
            dieId,
            slotIndex,
            faceCardId,
          });
        }
      });
    }
    return choices;
  }

  if (subject === "moveset") {
    const creatureId = player.activeCreatureId;
    const creature = state.creatures[creatureId];
    if (creature !== undefined && !creature.defeated) {
      const techniques = getCreatureDefinition(creature.definitionId)?.techniques ?? [];
      for (const technique of techniques) {
        accept({
          ...blankIntent(mode),
          label: `${fighterName(state, playerId, creatureId)} · ${technique.name}`,
          targetCreatureId: creatureId,
          techniqueId: technique.id,
        });
      }
    }
    return choices;
  }

  for (const creatureId of Object.keys(state.creatures) as CreatureId[]) {
    const creature = state.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    accept({
      ...blankIntent(mode),
      label: fighterName(state, playerId, creatureId),
      targetCreatureId: creatureId,
    });
  }
  return choices;
}
