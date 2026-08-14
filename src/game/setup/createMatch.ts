import { getCreatureDefinition } from "../content/creatures.js";
import { faceIdForSymbol, PROTOTYPE_FACE_DECK, STARTING_DIE_SYMBOLS } from "../content/faces.js";
import type { CardInstance } from "../model/cards.js";
import { DEFAULT_RULES_CONFIG, type GameRulesConfig } from "../model/config.js";
import type { CreatureState } from "../model/creatures.js";
import { FACE_SLOTS_PER_DIE, type DieSlot, type DieState } from "../model/dice.js";
import {
  asCardInstanceId,
  asCreatureId,
  asDieId,
  asMatchId,
  type CardId,
  type CardInstanceId,
  type CreatureDefinitionId,
  type FaceCardId,
  type PlayerId,
} from "../model/ids.js";
import type { GameState, PlayerState } from "../model/state.js";
import type { SymbolType } from "../model/symbols.js";
import { createRng, initialRngState, type RNG } from "../rng/rng.js";
import { validateLoadout } from "../rules/loadout.js";

export interface PlayerSetup {
  readonly id: PlayerId;
  /** Three creature definitions in deployment order (bible §4 and §8). */
  readonly squad: readonly CreatureDefinitionId[];
  /**
   * The tactics deck, in submission order. Shuffled here off the match seed.
   */
  readonly deck?: readonly CardId[];
  /**
   * The face deck (bible §12). Defaults to `PROTOTYPE_FACE_DECK`. Starting
   * natural faces on the dice are separate from this list.
   */
  readonly faceDeck?: readonly FaceCardId[];
}

export interface MatchSetup {
  readonly matchId: string;
  readonly seed: number;
  readonly players: readonly [PlayerSetup, PlayerSetup];
  readonly config?: GameRulesConfig;
}

/**
 * Instance ids are derived from the player id rather than generated, because
 * both peers must build byte-identical opening state from the same setup
 * message. Id generation belongs to the persistence and networking layers.
 */
const creatureInstanceId = (playerId: PlayerId, index: number) =>
  asCreatureId(`${playerId}-creature-${String(index)}`);

const dieInstanceId = (playerId: PlayerId, index: number) =>
  asDieId(`${playerId}-die-${String(index)}`);

/**
 * Validates the opening die layout. Both dice of both players start identical
 * (`STARTING_DIE_SYMBOLS`), so this is a guard on content rather than a choice
 * made per match — but it is the one place a bad edit to that constant would
 * otherwise slip through into a live game.
 */
export function validateStartingLayout(
  symbols: readonly SymbolType[],
  config: GameRulesConfig,
): readonly SymbolType[] {
  if (symbols.length !== FACE_SLOTS_PER_DIE) {
    throw new Error(
      `createMatch: starting layout has ${String(symbols.length)} faces, ` +
        `expected ${String(FACE_SLOTS_PER_DIE)} (bible §9)`,
    );
  }

  const counts = new Map<SymbolType, number>();
  for (const symbol of symbols) {
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  }
  for (const [symbol, count] of counts) {
    if (count > config.maxFacesOfSameAttributePerDie) {
      throw new Error(
        `createMatch: starting layout would place ${String(count)} ${symbol} faces on one die, ` +
          `over the limit of ${String(config.maxFacesOfSameAttributePerDie)} (bible §9.1)`,
      );
    }
  }

  return symbols;
}

function buildDie(playerId: PlayerId, index: number, symbols: readonly SymbolType[]): DieState {
  const slots: DieSlot[] = symbols.map((symbol, slotIndex) => ({
    index: slotIndex,
    faceCardId: faceIdForSymbol(symbol),
    faceCardOwnerId: playerId,
  }));

  return {
    id: dieInstanceId(playerId, index),
    ownerId: playerId,
    slots,
    stunMarkers: 0,
    retained: false,
    rolledSlotIndex: null,
    attachedToCreatureId: null,
  };
}

/**
 * Fisher–Yates from the seeded RNG. Shuffling at setup rather than lazily means
 * the whole deck order is fixed before the first action, so replaying an action
 * log never has to reproduce a shuffle mid-match.
 */
function shuffle<T>(items: readonly T[], rng: RNG): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = rng.integer(0, i);
    const a = result[i];
    const b = result[j];
    if (a === undefined || b === undefined) continue;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

/**
 * Builds the card instances for one player and splits them into the opening
 * hand and the rest of the deck. Instance ids are positional so that both peers
 * derive the same ones from the same setup message.
 */
function buildCards(
  playerId: PlayerId,
  deck: readonly CardId[],
  config: GameRulesConfig,
  rng: RNG,
): { readonly instances: readonly CardInstance[]; readonly hand: readonly CardInstanceId[] } {
  const shuffled = shuffle(deck, rng);
  const handSize = Math.min(config.openingHandSize, shuffled.length);

  const instances = shuffled.map((cardId, index): CardInstance => ({
    id: asCardInstanceId(`${playerId}-card-${String(index)}`),
    cardId,
    ownerId: playerId,
    zone: index < handSize ? "hand" : "deck",
    attachedToCreatureId: null,
    attachedToFaceCardId: null,
    ritualOrientation: null,
    ritualProgress: null,
    ritualProgressCreditedThisTurn: null,
  }));

  return {
    instances,
    hand: instances.slice(0, handSize).map((instance) => instance.id),
  };
}

function buildCreatures(setup: PlayerSetup, config: GameRulesConfig): readonly CreatureState[] {
  return setup.squad.map((definitionId, index) => {
    const definition = getCreatureDefinition(definitionId);
    if (definition === undefined) {
      throw new Error(`createMatch: unknown creature definition "${definitionId}"`);
    }
    return {
      id: creatureInstanceId(setup.id, index),
      definitionId,
      ownerId: setup.id,
      // Bible §6's battlefield shows two forward slots plus a back row; the
      // squad fills the frontline first. Tracked as an open question.
      position: index < config.frontlineSlots ? "frontline" : "back",
      damage: 0,
      defeated: false,
      attacksUsedThisCombat: 0,
      attributeTokens: {},
      shields: 0,
      damagePreventBuffer: 0,
      nextAttackBonus: 0,
      toxinMarkers: 0,
      equipmentIds: [],
      spentOncePerTurnTriggers: [],
      redirectDamageThisTurn: 0,
      nextIncomingDamageBonus: 0,
    };
  });
}

export function createMatch(setup: MatchSetup): GameState {
  const config = setup.config ?? DEFAULT_RULES_CONFIG;

  const players: Record<string, PlayerState> = {};
  const creatures: Record<string, CreatureState> = {};
  const dice: Record<string, DieState> = {};
  const cards: Record<string, CardInstance> = {};

  // One RNG walked across both players, so the two shuffles are independent
  // draws from one seeded stream rather than the same order twice.
  const setupRng = createRng(initialRngState(setup.seed));

  for (const playerSetup of setup.players) {
    const deck = playerSetup.deck ?? [];
    const faceDeck = playerSetup.faceDeck ?? PROTOTYPE_FACE_DECK;
    const loadoutCheck = validateLoadout(
      { squad: playerSetup.squad, deck, faceDeck },
      config,
    );
    if (!loadoutCheck.ok) {
      throw new Error(`createMatch: ${playerSetup.id} ${loadoutCheck.reason}`);
    }

    const squadCreatures = buildCreatures(playerSetup, config);
    for (const creature of squadCreatures) creatures[creature.id] = creature;

    // Every die opens identical, for both players: the squad no longer shapes
    // the starting faces. Divergence is meant to come from forging.
    const layout = validateStartingLayout(STARTING_DIE_SYMBOLS, config);
    const playerDice = Array.from({ length: config.dicePerPlayer }, (_unused, index) =>
      buildDie(playerSetup.id, index, layout),
    );
    for (const die of playerDice) dice[die.id] = die;

    const { instances, hand } = buildCards(playerSetup.id, deck, config, setupRng);
    for (const instance of instances) cards[instance.id] = instance;

    players[playerSetup.id] = {
      id: playerSetup.id,
      creatureIds: squadCreatures.map((creature) => creature.id),
      dieIds: playerDice.map((die) => die.id),
      // Face deck enters the match as the available face pool. Starting naturals
      // are already installed on the dice and sit outside this list (bible §12).
      facePool: [...faceDeck],
      deck: instances.filter((instance) => instance.zone === "deck").map((instance) => instance.id),
      hand,
      graveyard: [],
      equipment: [],
      overload: [],
      ritual: [],
      spentOncePerTurnKeys: [],
    };
  }

  const [first, second] = setup.players;

  return {
    matchId: asMatchId(setup.matchId),
    status: "in-progress",
    turn: 1,
    phase: "roll",
    activePlayerId: first.id,
    playerOrder: [first.id, second.id],
    players,
    creatures,
    dice,
    symbols: {},
    cards,
    energy: { holderId: first.id, value: config.energy.startingEnergy },
    resolutionStack: [],
    chainStack: [],
    pendingDecision: null,
    deferredTurnEndPlayerId: null,
    attackBonusThisTurn: {},
    attackToxinThisTurn: {},
    preventDrawArmed: {},
    ignoreShieldThisTurn: {},
    forgeDiscountThisTurn: {},
    requirementWildcardsThisTurn: {},
    bladeRainArmed: {},
    winner: null,
    log: [
      { seq: 0, turn: 1, event: { type: "match-started", firstPlayerId: first.id } },
      { seq: 1, turn: 1, event: { type: "turn-started", turn: 1, playerId: first.id } },
      { seq: 2, turn: 1, event: { type: "phase-entered", phase: "roll" } },
    ],
    // Carried forward past the shuffle, so the first roll does not replay the
    // values the shuffle already consumed.
    rng: setupRng.snapshot(),
    config,
    nextInstanceSeq: 0,
  };
}
