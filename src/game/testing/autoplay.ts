import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import { resolveFaceForForge } from "../rules/faces.js";
import type { CreatureState } from "../model/creatures.js";
import { type DieId, type PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { isAttributeSymbol, SHIELD, type SymbolInstance } from "../model/symbols.js";
import { handOf, searchableInDeck, searchableInGraveyard } from "../rules/cards.js";
import { livingCreaturesOf, opponentOf } from "../rules/creatures.js";
import { diceOf } from "../rules/dice.js";
import { legalTargetsFor } from "../rules/targeting.js";
import { holdsTokens } from "../rules/tokens.js";
import { advance } from "../reducer/reduce.js";

/**
 * A deterministic driver used only by tests, so that a whole match can be
 * played through `reduce()` without a UI.
 *
 * Everything here is *policy*, not rules — the reducer would allow different
 * choices at every step. The policy only needs to be coherent enough to reach
 * a victory state and to exercise each part of the engine on the way.
 */


export interface AutoplayPolicy {
  /**
   * Absorb symbols a creature still needs to arm one of its attacks. On by
   * default, because attacks are funded from absorbed tokens: a driver that
   * never absorbed could never attack, and no match would ever end.
   */
  readonly absorbForAttacks: boolean;
  /** Absorb Shield faces onto the most damaged creature rather than wasting them. */
  readonly absorbShields: boolean;
  /** Play affordable cards for their effect during the actions phase. */
  readonly playCards: boolean;
  /** Forge affordable cards over Shield faces during the forge phase. */
  readonly forgeCards: boolean;
}

const DEFAULT_POLICY: AutoplayPolicy = {
  absorbForAttacks: true,
  absorbShields: true,
  playCards: true,
  forgeCards: true,
};

/** Never absorb, so every symbol reaches the available pool. */
export const NEVER_ABSORB: AutoplayPolicy = {
  ...DEFAULT_POLICY,
  absorbForAttacks: false,
  absorbShields: false,
};

/** Leaves the hand alone, for testing the dice game on its own. */
export const NEVER_USE_CARDS: AutoplayPolicy = {
  ...DEFAULT_POLICY,
  playCards: false,
  forgeCards: false,
};

/**
 * Absorption (bible §7 and §33). Every symbol taken here leaves the available
 * pool, so the policy only absorbs what actually arms something: an attribute
 * a creature is still short of for one of its attacks, or a Shield.
 */
function absorb(state: GameState, playerId: PlayerId, policy: AutoplayPolicy): GameState {
  let current = state;

  for (const symbol of rolledSymbols(current, playerId)) {
    const creature = isAttributeSymbol(symbol.symbol)
      ? policy.absorbForAttacks
        ? creatureNeeding(current, playerId, symbol)
        : undefined
      : policy.absorbShields
        ? mostDamaged(current, playerId)
        : undefined;
    if (creature === undefined) continue;

    const result = advance(current, {
      type: "ABSORB_SYMBOL",
      playerId,
      creatureId: creature.id,
      symbolId: symbol.id,
    });
    if (result.ok) current = result.state;
  }

  return current;
}

const rolledSymbols = (state: GameState, playerId: PlayerId): readonly SymbolInstance[] =>
  Object.values(state.symbols)
    .filter((symbol) => symbol.ownerId === playerId && symbol.status === "rolled")
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** The first living creature that cannot yet pay for an attack needing this symbol. */
function creatureNeeding(
  state: GameState,
  playerId: PlayerId,
  symbol: SymbolInstance,
): CreatureState | undefined {
  return livingCreaturesOf(state, playerId).find((creature) => {
    const definition = getCreatureDefinition(creature.definitionId);
    return definition?.attacks.some(
      (attack) =>
        (attack.requires[symbol.symbol as keyof typeof attack.requires] ?? 0) > 0 &&
        !holdsTokens(creature, attack.requires),
    );
  });
}

function mostDamaged(state: GameState, playerId: PlayerId): CreatureState | undefined {
  return [...livingCreaturesOf(state, playerId)].sort((a, b) => b.damage - a.damage)[0];
}

/** Attacks with every creature that is fuelled, hitting the first legal target. */
function fight(state: GameState, playerId: PlayerId): GameState {
  let current = state;

  for (const creature of livingCreaturesOf(current, playerId)) {
    if (current.status !== "in-progress") break;

    const definition = getCreatureDefinition(creature.definitionId);
    if (definition === undefined) continue;

    // Prefer basics before multi-cost specials.
    const attacks = [...definition.attacks].sort((a, b) => {
      if (a.kind === b.kind) return 0;
      return a.kind === "basic" ? -1 : 1;
    });

    for (const attack of attacks) {
      if (attack.effect === undefined) continue;
      const [targetId] = legalTargetsFor(current, creature.id, attack);
      if (targetId === undefined) continue;

      const result = advance(current, {
        type: "ATTACK",
        playerId,
        attackerId: creature.id,
        attackId: attack.id,
        targetId,
      });
      if (result.ok) {
        current = resolvePending(result.state);
        break;
      }
    }
  }

  return current;
}

/* --------------------------------------------------------------- cards --- */

/**
 * Plays cards it can pay for outright. Deliberately refuses to spend past zero:
 * overshooting would end the turn before the driver reached the forge phase, so
 * that path is exercised by the scenario tests instead of at random here.
 */
function playCards(state: GameState, playerId: PlayerId, policy: AutoplayPolicy): GameState {
  if (!policy.playCards) return state;
  let current = state;

  for (const card of handOf(current, playerId)) {
    if (!stillActive(current, playerId)) break;
    if (current.pendingDecision !== null) break;

    const definition = getCard(card.cardId);
    if (definition?.effect === undefined) continue;
    if (definition.energyCost > current.energy.value) continue;

    const targetId = mostDamaged(current, playerId)?.id;
    const result = advance(current, {
      type: "PLAY_CARD",
      playerId,
      cardInstanceId: card.id,
      ...(targetId === undefined ? {} : { declaredTargetCreatureId: targetId }),
    });
    if (result.ok) current = resolvePending(result.state);
  }

  return current;
}

/**
 * Forges only over Shield faces. A Shield is the one face whose loss cannot cost
 * the driver an attack, so this converts defence into engine without ever
 * dismantling the fuel a creature is saving for.
 */
function forgeCards(state: GameState, playerId: PlayerId, policy: AutoplayPolicy): GameState {
  if (!policy.forgeCards) return state;
  let current = state;

  for (const card of handOf(current, playerId)) {
    if (!stillActive(current, playerId)) break;
    if (current.pendingDecision !== null) break;

    const definition = getCard(card.cardId);
    if (definition === undefined) continue;
    if (definition.energyCost > current.energy.value) continue;

    const plan = shieldSlotsFor(current, playerId, definition.forge.faces);
    if (plan === undefined) continue;

    const faceCardId = resolveFaceForForge(
      current,
      playerId,
      definition.forge.kind,
      definition.forge.attribute,
      definition,
    );
    if (faceCardId === null) continue;

    const result = advance(current, {
      type: "FORGE_CARD",
      playerId,
      cardInstanceId: card.id,
      dieId: plan.dieId,
      slotIndexes: plan.slotIndexes,
      faceCardId,
    });
    if (result.ok) current = resolvePending(result.state);
  }

  return current;
}

function shieldSlotsFor(
  state: GameState,
  playerId: PlayerId,
  faces: number,
): { readonly dieId: DieId; readonly slotIndexes: readonly number[] } | undefined {
  for (const die of diceOf(state, playerId)) {
    const shields = die.slots
      .filter((slot) => getFaceCard(slot.faceCardId)?.symbol === SHIELD)
      .map((slot) => slot.index);
    if (shields.length >= faces) {
      return { dieId: die.id, slotIndexes: shields.slice(0, faces) };
    }
  }
  return undefined;
}

/* ---------------------------------------------------------------- turn --- */

/**
 * A card can end the turn by pushing Energy past zero, so every step in the
 * actions window has to check that the turn is still the one it started.
 */
const stillActive = (state: GameState, playerId: PlayerId): boolean =>
  state.status === "in-progress" && state.activePlayerId === playerId;

function step(state: GameState, action: Parameters<typeof advance>[1]): GameState {
  if (state.status !== "in-progress") return state;
  const result = advance(state, action);
  if (!result.ok) throw new Error(`autoplay: unexpected ${result.error} on ${action.type}`);
  return resolvePending(result.state);
}

/** Completes a pending deck search or discard by taking the earliest eligible cards. */
function resolvePending(state: GameState): GameState {
  const pending = state.pendingDecision;
  if (pending === null) return state;

  if (pending.type === "reaction-priority") {
    const result = advance(state, {
      type: "PASS_PRIORITY",
      playerId: pending.priorityPlayerId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on PASS_PRIORITY`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "search-deck") {
    const picks = searchableInDeck(state, pending.controllerId, pending.filter).slice(
      0,
      pending.amount,
    );
    const result = advance(state, {
      type: "RESOLVE_SEARCH",
      playerId: pending.controllerId,
      cardInstanceIds: picks,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_SEARCH`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "search-graveyard") {
    const picks = searchableInGraveyard(state, pending.controllerId).slice(0, pending.amount);
    const result = advance(state, {
      type: "RESOLVE_SEARCH",
      playerId: pending.controllerId,
      cardInstanceIds: picks,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_SEARCH (graveyard)`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "discard-cards") {
    const hand = state.players[pending.controllerId]?.hand ?? [];
    const picks = hand.slice(0, pending.amount);
    const result = advance(state, {
      type: "RESOLVE_DISCARD",
      playerId: pending.controllerId,
      cardInstanceIds: picks,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_DISCARD`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-creature") {
    const ownerId =
      pending.filter === "ally" ? pending.controllerId : opponentOf(state, pending.controllerId);
    const [creatureId] = livingCreaturesOf(state, ownerId).map((creature) => creature.id);
    if (creatureId === undefined) {
      throw new Error("autoplay: no creature for choose-creature");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_CREATURE",
      playerId: pending.controllerId,
      creatureId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_CREATURE`);
    }
    return resolvePending(result.state);
  }

  return state;
}

/** Plays one complete turn for whoever is active. */
export function playTurn(state: GameState, policy: AutoplayPolicy = DEFAULT_POLICY): GameState {
  const playerId = state.activePlayerId;

  let current = step(state, { type: "ROLL_DICE", playerId });
  current = absorb(current, playerId, policy);

  current = step(current, { type: "ADVANCE_PHASE", playerId });
  current = fight(current, playerId);
  if (!stillActive(current, playerId)) return current;
  current = playCards(current, playerId, policy);
  if (!stillActive(current, playerId)) return current;
  current = forgeCards(current, playerId, policy);

  if (!stillActive(current, playerId)) return current;
  return step(current, { type: "END_TURN", playerId });
}

export interface AutoplayResult {
  readonly state: GameState;
  readonly turnsPlayed: number;
  readonly states: readonly GameState[];
}

export function autoplay(
  initial: GameState,
  options: { maxTurns?: number; policy?: AutoplayPolicy } = {},
): AutoplayResult {
  const { maxTurns = 400, policy = DEFAULT_POLICY } = options;

  const states: GameState[] = [initial];
  let current = initial;
  let turnsPlayed = 0;

  while (current.status === "in-progress" && turnsPlayed < maxTurns) {
    current = playTurn(current, policy);
    states.push(current);
    turnsPlayed += 1;
  }

  return { state: current, turnsPlayed, states };
}
