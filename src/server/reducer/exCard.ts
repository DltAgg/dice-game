import { getCard } from "../content/cards.js";
import type { CardDefinition, ExGate } from "../model/cards.js";
import type { CreatureState } from "../model/creatures.js";
import type { GameError } from "../model/errors.js";
import type { CreatureDefinitionId, DieId, PlayerId } from "../model/ids.js";
import type { ChainLink } from "../model/state.js";
import type { RNG } from "../rng/rng.js";
import { dieForCreature } from "../rules/fighters.js";
import { patchCreature, type Draft } from "./draft.js";
import { drainResolution, pushEffect } from "./resolution.js";
import { rollOneDie } from "./commands/rollDice.js";

/** An EX card is a Modify whose subtypes include `ex`. Spec `035`. */
export function isExCard(definition: CardDefinition): boolean {
  return definition.type === "modify" && definition.subtypes.includes("ex");
}

export function attackBanError(
  creature: Pick<CreatureState, "attackBannedOnTurn">,
  turn: number,
): GameError | null {
  if (creature.attackBannedOnTurn === turn) return "ATTACK_BANNED";
  return null;
}

/**
 * Legal EX play, before Meter is spent. Fighter restriction is already
 * enforced by `cardRestrictionError`. Meter affordability stays in `spendMeter`.
 */
export function exPlayError(
  draft: Draft,
  playerId: PlayerId,
  definition: CardDefinition,
): GameError | null {
  if (!isExCard(definition) || definition.exGate === undefined) return "CARD_NOT_AVAILABLE";
  const pending = draft.pendingDecision;
  if (
    pending === null ||
    pending.type !== "reaction-priority" ||
    pending.priorityPlayerId !== playerId ||
    pending.consecutivePasses !== 0
  ) {
    return "CARD_NOT_AVAILABLE";
  }
  const top = draft.chainStack[draft.chainStack.length - 1];
  if (
    top === undefined ||
    top.kind !== "combat-action" ||
    top.negated ||
    top.controllerId !== playerId ||
    !gateMatches(top, definition.exGate)
  ) {
    return "CARD_NOT_AVAILABLE";
  }
  return null;
}

/** Mark the attack under an EX card. Called only after Meter spend succeeds. */
export function markReplacedAttack(draft: Draft): void {
  const top = draft.chainStack[draft.chainStack.length - 1];
  if (top === undefined || top.kind !== "combat-action") return;
  top.exReplaced = true;
}

export function linkIsExCard(draft: Draft, link: ChainLink): boolean {
  if (link.cardInstanceId === null) return false;
  const card = draft.cards[link.cardInstanceId];
  if (card === undefined) return false;
  const definition = getCard(card.cardId);
  return definition !== undefined && isExCard(definition);
}

/**
 * EX body. The replaced combat-action is still on the chain. A missing or
 * negated attack does nothing: Meter already spent stays spent.
 */
export function conductEx(draft: Draft, link: ChainLink, rng: RNG): void {
  if (link.cardInstanceId === null) return;
  const card = draft.cards[link.cardInstanceId];
  if (card === undefined) return;
  const definition = getCard(card.cardId);
  if (definition === undefined || !isExCard(definition)) return;

  const attack = draft.chainStack[draft.chainStack.length - 1];
  if (
    attack === undefined ||
    attack.kind !== "combat-action" ||
    attack.negated ||
    attack.exReplaced !== true
  ) {
    return;
  }

  const strike = definition.exStrike ?? 0;
  if (strike > 0) dealChainStrike(draft, attack, link.controllerId, strike);
  if (draft.pendingDecision !== null) return;

  const bonusHits = rollExDice(draft, link.controllerId, definition, rng);
  const per = definition.exReroll?.strikePer ?? 0;
  if (per > 0) {
    for (let hit = 0; hit < bonusHits; hit += 1) {
      dealChainStrike(draft, attack, link.controllerId, per);
      if (draft.pendingDecision !== null) return;
    }
  }

  if (definition.exAttackBan === true) {
    const banned = squadCreature(draft, link.controllerId, definition.fighterRestriction, false);
    if (banned !== undefined) {
      patchCreature(draft, banned.id, { attackBannedOnTurn: draft.turn + 2 });
    }
  }
  if (definition.exExtraActionPhase === true) {
    draft.extraActionPhases += 1;
  }
}

function gateMatches(link: ChainLink, gate: ExGate): boolean {
  if (link.sequenceRole !== gate.sequenceRole || link.hitType !== gate.hitType) return false;
  if (gate.hitStrength !== undefined && link.hitStrength !== gate.hitStrength) return false;
  return true;
}

function dealChainStrike(
  draft: Draft,
  attack: ChainLink,
  controllerId: PlayerId,
  amount: number,
): void {
  const targetId = attack.declaredTargetCreatureId;
  if (targetId === null || amount <= 0) return;
  pushEffect(
    draft,
    controllerId,
    { type: "damage", amount, target: { kind: "declared-target" } },
    attack.sourceCreatureId,
    targetId,
    null,
    null,
    null,
    0,
    null,
    false,
    true,
  );
  drainResolution(draft);
}

/**
 * Returns how many reroll results matched `strikePerFaceId`. A stunned die
 * contributes nothing and keeps its showing face. `times` is sequential.
 */
function rollExDice(
  draft: Draft,
  playerId: PlayerId,
  definition: CardDefinition,
  rng: RNG,
): number {
  const reroll = definition.exReroll;
  if (reroll === undefined || reroll.times <= 0) return 0;
  const ids = diceToReroll(draft, playerId, definition);
  let hits = 0;
  for (let time = 0; time < reroll.times; time += 1) {
    for (const dieId of ids) {
      const die = draft.dice[dieId];
      if (die === undefined) continue;
      const entry = rollOneDie(draft, die, rng, true);
      if (
        reroll.strikePerFaceId !== undefined &&
        entry !== undefined &&
        entry.faceCardId === reroll.strikePerFaceId
      ) {
        hits += 1;
      }
    }
  }
  return hits;
}

function diceToReroll(draft: Draft, playerId: PlayerId, definition: CardDefinition): readonly DieId[] {
  const reroll = definition.exReroll;
  if (reroll === undefined) return [];
  if (reroll.scope === "controller") return draft.players[playerId]?.dieIds ?? [];
  const living = squadCreature(draft, playerId, definition.fighterRestriction, true);
  if (living === undefined) return [];
  const die = dieForCreature(draft, living.id);
  return die === undefined ? [] : [die.id];
}

function squadCreature(
  draft: Draft,
  playerId: PlayerId,
  definitionId: CreatureDefinitionId | undefined,
  livingOnly: boolean,
): CreatureState | undefined {
  if (definitionId === undefined) return undefined;
  const player = draft.players[playerId];
  if (player === undefined) return undefined;
  let fallen: CreatureState | undefined;
  for (const id of player.creatureIds) {
    const creature = draft.creatures[id];
    if (creature === undefined || creature.definitionId !== definitionId) continue;
    if (!creature.defeated) return creature;
    fallen ??= creature;
  }
  return livingOnly ? undefined : fallen;
}
