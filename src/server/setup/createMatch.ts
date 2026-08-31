import { getCreatureDefinition } from "../content/creatures.js";
import { PROTOTYPE_FACE_DECK } from "../content/loadouts/index.js";
import type { CardInstance } from "../model/cards.js";
import { DEFAULT_RULES_CONFIG, type GameRulesConfig } from "../model/config.js";
import type { CreatureState } from "../model/creatures.js";
import type { DieState, StartingDiceLayout } from "../model/dice.js";
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
import { createRng, initialRngState, type RNG } from "../rng/rng.js";
import { leftoverFacePool, validateLoadout } from "../rules/loadout.js";
import { openingSlotFromFace } from "../rules/faces.js";

export interface PlayerSetup {
  readonly id: PlayerId;
  /** Three creature definitions (exactly one legendary). Rows use the legendary flag. */
  readonly squad: readonly CreatureDefinitionId[];
  /**
   * The tactics deck, in submission order. Shuffled here off the match seed.
   */
  readonly deck?: readonly CardId[];
  /**
   * The face deck (bible §12). Defaults to `PROTOTYPE_FACE_DECK`. Opening
   * basics do not consume this list; named specials on `startingDice` do.
   */
  readonly faceDeck?: readonly FaceCardId[];
  /**
   * Two constructed d6 layouts. Required for live matches. Engine tests use
   * `legacyStartingLayout()` via `newMatch`.
   */
  readonly startingDice: StartingDiceLayout;
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

function buildDie(
  playerId: PlayerId,
  index: number,
  faces: readonly FaceCardId[],
): DieState {
  return {
    id: dieInstanceId(playerId, index),
    ownerId: playerId,
    slots: faces.map((faceCardId, slotIndex) =>
      openingSlotFromFace(slotIndex, faceCardId, playerId),
    ),
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
  }));

  return {
    instances,
    hand: instances.slice(0, handSize).map((instance) => instance.id),
  };
}

/**
 * Legendary always opens in the back row (definition flag, not squad index).
 * Non-legendaries fill frontline first (up to `frontlineSlots`), then back.
 */
function buildCreatures(setup: PlayerSetup, config: GameRulesConfig): readonly CreatureState[] {
  let frontlineAssigned = 0;
  return setup.squad.map((definitionId, index) => {
    const definition = getCreatureDefinition(definitionId);
    if (definition === undefined) {
      throw new Error(`createMatch: unknown creature definition "${definitionId}"`);
    }
    let position: CreatureState["position"];
    if (definition.legendary === true) {
      position = "back";
    } else if (frontlineAssigned < config.frontlineSlots) {
      position = "frontline";
      frontlineAssigned += 1;
    } else {
      position = "back";
    }
    return {
      id: creatureInstanceId(setup.id, index),
      definitionId,
      ownerId: setup.id,
      position,
      damage: 0,
      defeated: false,
      attacksUsedThisCombat: 0,
      extraAttacksThisTurn: 0,
      shields: 0,
      attackPreventCount: 0,
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
      {
        squad: playerSetup.squad,
        deck,
        faceDeck,
        startingDice: playerSetup.startingDice,
      },
      config,
    );
    if (!loadoutCheck.ok) {
      throw new Error(`createMatch: ${playerSetup.id} ${loadoutCheck.reason}`);
    }

    const squadCreatures = buildCreatures(playerSetup, config);
    for (const creature of squadCreatures) creatures[creature.id] = creature;

    const playerDice = playerSetup.startingDice.map((faces, index) =>
      buildDie(playerSetup.id, index, faces),
    );
    for (const die of playerDice) dice[die.id] = die;

    const { instances, hand } = buildCards(playerSetup.id, deck, config, setupRng);
    for (const instance of instances) cards[instance.id] = instance;

    players[playerSetup.id] = {
      id: playerSetup.id,
      creatureIds: squadCreatures.map((creature) => creature.id),
      dieIds: playerDice.map((die) => die.id),
      facePool: leftoverFacePool(faceDeck, playerSetup.startingDice),
      deck: instances.filter((instance) => instance.zone === "deck").map((instance) => instance.id),
      hand,
      graveyard: [],
      equipment: [],
      overload: [],
      ritual: [],
      attributePool: {},
      spentOncePerTurnKeys: [],
      overchargeByFace: {},
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
    resolutionStack: [],
    chainStack: [],
    pendingDecision: null,
    attackBonusThisTurn: {},
    attackToxinThisTurn: {},
    preventDrawArmed: {},
    ignoreShieldThisTurn: {},
    forgeDiscountThisTurn: {},
    requirementWildcardsThisTurn: {},
    bladeRainArmed: {},
    facesAppearedThisRoll: [],
    resolveNextFaceEffectTwice: {},
    rollBankQueue: [],
    winner: null,
    log: [
      { seq: 0, turn: 1, event: { type: "match-started", firstPlayerId: first.id } },
      { seq: 1, turn: 1, event: { type: "turn-started", turn: 1, playerId: first.id } },
      { seq: 2, turn: 1, event: { type: "phase-entered", phase: "roll" } },
    ],
    rng: setupRng.snapshot(),
    config,
    nextInstanceSeq: 0,
  };
}
