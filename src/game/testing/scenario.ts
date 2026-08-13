import { getCard, PROTOTYPE_DECK } from "../content/cards.js";
import { ENGINE_DEMO_SQUAD, PROTOTYPE_SQUAD } from "../content/creatures.js";
import { ENGINE_TEST_FACE_DECK, PROTOTYPE_FACE_DECK } from "../content/faces.js";
import type { CardInstance } from "../model/cards.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { CreatureState } from "../model/creatures.js";
import {
  asCardInstanceId,
  asPlayerId,
  asSymbolInstanceId,
  type CardId,
  type CardInstanceId,
  type CreatureId,
  type DieId,
  type PlayerId,
} from "../model/ids.js";
import type { ReduceResult } from "../model/result.js";
import type { GameState, TurnPhase } from "../model/state.js";
import type {
  AttributeTokens,
  SymbolInstance,
  SymbolStatus,
  SymbolType,
} from "../model/symbols.js";
import type { GameAction } from "../reducer/actions.js";
import { advance } from "../reducer/reduce.js";
import { resolveFaceForForge } from "../rules/faces.js";
import { createMatch, type MatchSetup } from "../setup/createMatch.js";

/**
 * Arrangement helpers for scenario tests (SPDD §37). These write state
 * directly on purpose: a test that had to roll the right symbols before it
 * could check absorption would be testing luck, not the rule.
 */

export const P1: PlayerId = asPlayerId("p1");
export const P2: PlayerId = asPlayerId("p2");

/**
 * Engine tests that predate decks keep an empty tactics list so the opening
 * shuffle does not consume RNG and shift die rolls. Production matches always
 * use a legal 50–60 deck.
 */
const TEST_SETUP_CONFIG = {
  ...DEFAULT_RULES_CONFIG,
  deckMinCards: 0,
};

export function newMatch(overrides: Partial<MatchSetup> = {}): GameState {
  return createMatch({
    matchId: "match-test",
    seed: 1,
    config: TEST_SETUP_CONFIG,
    players: [
      // Engine-demo squad + forge-coverage faces for Shield Strike / Eclipse tests.
      { id: P1, squad: ENGINE_DEMO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      { id: P2, squad: ENGINE_DEMO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
    ],
    ...overrides,
  });
}

/**
 * A match with real decks. Kept separate from `newMatch` because shuffling
 * consumes RNG values, which would shift every die roll in the tests that were
 * written before there were cards.
 */
export const newMatchWithDecks = (overrides: Partial<MatchSetup> = {}): GameState =>
  newMatch({
    config: DEFAULT_RULES_CONFIG,
    players: [
      { id: P1, squad: PROTOTYPE_SQUAD, deck: PROTOTYPE_DECK, faceDeck: PROTOTYPE_FACE_DECK },
      { id: P2, squad: PROTOTYPE_SQUAD, deck: PROTOTYPE_DECK, faceDeck: PROTOTYPE_FACE_DECK },
    ],
    ...overrides,
  });

/**
 * Puts named cards in hand, replacing whatever was there. Card tests need a
 * specific card in hand, and drawing until it turns up would be testing the
 * shuffle rather than the card.
 */
export function withHand(
  state: GameState,
  playerId: PlayerId,
  cardIds: readonly CardId[],
): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error(`scenario: unknown player ${playerId}`);

  const instances: Record<string, CardInstance> = {};
  const hand = cardIds.map((cardId, index) => {
    // Ids must not collide with cards already on the board (equipment, overloads,
    // rituals), or withHand would overwrite their instances in `state.cards`.
    const id = asCardInstanceId(
      `given-${playerId}-hand-${String(Object.keys(state.cards).length + index)}-${cardId}`,
    );
    instances[id] = {
      id,
      cardId,
      ownerId: playerId,
      zone: "hand",
      attachedToCreatureId: null,
      attachedToFaceCardId: null,
      ritualOrientation: null,
    };
    return id;
  });

  return {
    ...state,
    cards: { ...state.cards, ...instances },
    players: { ...state.players, [playerId]: { ...player, hand } },
  };
}

/** The instance id of the card at a hand position. */
export function handCardIdAt(
  state: GameState,
  playerId: PlayerId,
  index: number,
): CardInstanceId {
  const id = state.players[playerId]?.hand[index];
  if (id === undefined) {
    throw new Error(`scenario: ${playerId} has no card in hand at index ${String(index)}`);
  }
  return id;
}

/**
 * Builds a FORGE_CARD action that auto-picks an eligible face card. Tests use
 * this when the choice itself is not under assertion; the live UI always names
 * the face explicitly.
 */
export function forgeAction(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  dieId: DieId,
  slotIndexes: readonly number[],
): GameAction {
  const instance = state.cards[cardInstanceId];
  if (instance === undefined) throw new Error(`scenario: unknown card ${cardInstanceId}`);
  const definition = getCard(instance.cardId);
  if (definition === undefined) throw new Error(`scenario: unknown definition ${instance.cardId}`);
  const faceCardId = resolveFaceForForge(
    state,
    playerId,
    definition.forge.kind,
    definition.forge.attribute,
    definition,
  );
  if (faceCardId === null) {
    throw new Error(`scenario: no eligible face for ${definition.name}`);
  }
  return {
    type: "FORGE_CARD",
    playerId,
    cardInstanceId,
    dieId,
    slotIndexes,
    faceCardId,
  };
}

export const withEnergy = (state: GameState, playerId: PlayerId, value: number): GameState => ({
  ...state,
  energy: { holderId: playerId, value },
});

/** Creatures in deployment order: 0 and 1 are frontline, 2 is in the back. */
export function creatureAt(state: GameState, playerId: PlayerId, index: number): CreatureState {
  const player = state.players[playerId];
  const id = player?.creatureIds[index];
  const creature = id === undefined ? undefined : state.creatures[id];
  if (creature === undefined) {
    throw new Error(`scenario: ${playerId} has no creature at index ${String(index)}`);
  }
  return creature;
}

export const creatureIdAt = (state: GameState, playerId: PlayerId, index: number): CreatureId =>
  creatureAt(state, playerId, index).id;

export function withPhase(state: GameState, phase: TurnPhase): GameState {
  return { ...state, phase };
}

export function withActivePlayer(state: GameState, playerId: PlayerId): GameState {
  return { ...state, activePlayerId: playerId };
}

/** Places symbols straight into the pool so a rule can be tested in isolation. */
export function withSymbols(
  state: GameState,
  playerId: PlayerId,
  symbols: readonly SymbolType[],
  status: SymbolStatus = "available",
): GameState {
  const added: Record<string, SymbolInstance> = {};
  symbols.forEach((symbol, index) => {
    const id = asSymbolInstanceId(`given-${playerId}-${String(index)}-${symbol}`);
    added[id] = {
      id,
      ownerId: playerId,
      symbol,
      status,
      sourceDieId: null,
      absorbedByCreatureId: null,
    };
  });
  return { ...state, symbols: { ...state.symbols, ...added } };
}

/**
 * Fuels a creature directly. Attacks are paid from tokens, and tokens only
 * appear at end of turn, so without this every combat test would have to spend
 * two turns absorbing the right faces before it could assert anything.
 */
export function withTokens(
  state: GameState,
  creatureId: CreatureId,
  tokens: AttributeTokens,
): GameState {
  return patch(state, creatureId, (creature) => ({
    attributeTokens: { ...creature.attributeTokens, ...tokens },
  }));
}

export function withShields(state: GameState, creatureId: CreatureId, shields: number): GameState {
  return patch(state, creatureId, () => ({ shields }));
}

export function withDamage(state: GameState, creatureId: CreatureId, damage: number): GameState {
  return patch(state, creatureId, () => ({ damage }));
}

export function withDefeatedCreature(state: GameState, creatureId: CreatureId): GameState {
  return patch(state, creatureId, () => ({ defeated: true, damage: 999 }));
}

function patch(
  state: GameState,
  creatureId: CreatureId,
  change: (creature: CreatureState) => Partial<CreatureState>,
): GameState {
  const creature = state.creatures[creatureId];
  if (creature === undefined) throw new Error(`scenario: unknown creature ${creatureId}`);
  return {
    ...state,
    creatures: { ...state.creatures, [creatureId]: { ...creature, ...change(creature) } },
  };
}

export function expectOk(result: ReduceResult): GameState {
  if (!result.ok) {
    throw new Error(`scenario: expected a legal action but got ${result.error}`);
  }
  return result.state;
}

/** Applies a sequence of actions, failing loudly on the first illegal one. */
export function play(state: GameState, ...actions: readonly GameAction[]): GameState {
  return actions.reduce(
    (current, action) => expectOk(advanceResolvingChain(current, action)),
    state,
  );
}

/**
 * After an action that opens a reaction window, both seats Pass until the
 * chain drains (or another pending decision appears).
 */
export function resolveOpenChain(state: GameState): GameState {
  let current = state;
  while (current.pendingDecision?.type === "reaction-priority") {
    const priority = current.pendingDecision.priorityPlayerId;
    current = expectOk(advance(current, { type: "PASS_PRIORITY", playerId: priority }));
  }
  return current;
}

/** `advance` then auto-pass any reaction window that opened. */
export function advanceResolvingChain(state: GameState, action: GameAction): ReduceResult {
  const result = advance(state, action);
  if (!result.ok) return result;
  return { ok: true, state: resolveOpenChain(result.state) };
}

export const eventTypes = (state: GameState): readonly string[] =>
  state.log.map((entry) => entry.event.type);
