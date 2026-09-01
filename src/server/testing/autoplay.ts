import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import {
  resolveFaceForForge,
  preferredSlotsForForgeFaces,
  legalSlotsForReplaceSyntheticFace,
  eligiblePoolFacesForReplace,
} from "../rules/faces.js";
import type { CreatureState } from "../model/creatures.js";
import { type DieId, type FaceCardId, type PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { isAttributeSymbol, SHIELD, type SymbolInstance } from "../model/symbols.js";
import {
  handOf,
  playCostTotal,
  replayableGraveyardTactics,
  equipmentOf,
  overloadsOf,
  ritualsOf,
  searchableInDeck,
  searchableInGraveyard,
} from "../rules/cards.js";
import { livingCreaturesOf, opponentOf } from "../rules/creatures.js";
import { diceOf } from "../rules/dice.js";
import { collectLegalSilenceHosts } from "../rules/silence.js";
import { collectLegalBounceCards } from "../rules/bounce.js";
import { isUnabsorbedPoolSymbol } from "../rules/symbols.js";
import { legalTargetsFor } from "../rules/targeting.js";
import { legalCreaturesForFilter, legalDiceForFilter, legalDieSlotsForFilter } from "../rules/targets.js";
import {
  addToken,
  attackIsFuelled,
  discardTokensInAttributeOrder,
  isNonEmptyRequirement,
  pileRequirementShortfall,
} from "../rules/tokens.js";
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
   * Spec `016`: rolled attributes auto-bank, so this mainly covers Shield and
   * leftover effect-generated pips.
   */
  readonly absorbForAttacks: boolean;
  /** Absorb Shield faces onto the most damaged creature rather than wasting them. */
  readonly absorbShields: boolean;
  /** Declare attacks when a creature's pile requirements are met. */
  readonly attack: boolean;
  /** Play affordable cards for their effect during the actions phase. */
  readonly playCards: boolean;
  /** Forge affordable cards over Shield faces during the forge phase. */
  readonly forgeCards: boolean;
}

const DEFAULT_POLICY: AutoplayPolicy = {
  absorbForAttacks: true,
  absorbShields: true,
  attack: true,
  playCards: true,
  forgeCards: true,
};

/** Never absorb leftover pool symbols / Shields (roll still auto-banks attributes). */
export const NEVER_ABSORB: AutoplayPolicy = {
  ...DEFAULT_POLICY,
  absorbForAttacks: false,
  absorbShields: false,
};

/** Never attack — pile-up still auto-banks, but combat never fires. */
export const NEVER_ATTACK: AutoplayPolicy = {
  ...DEFAULT_POLICY,
  attack: false,
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

  for (const symbol of poolSymbols(current, playerId)) {
    if (isAttributeSymbol(symbol.symbol)) {
      if (!policy.absorbForAttacks) continue;
      if (creatureNeeding(current, playerId, symbol) === undefined) continue;
      const result = advance(current, {
        type: "ABSORB_SYMBOL",
        playerId,
        symbolId: symbol.id,
      });
      if (result.ok) current = resolvePending(result.state);
      continue;
    }

    if (!policy.absorbShields) continue;
    const creature = mostDamaged(current, playerId);
    if (creature === undefined) continue;
    const result = advance(current, {
      type: "ABSORB_SYMBOL",
      playerId,
      creatureId: creature.id,
      symbolId: symbol.id,
    });
    if (result.ok) current = resolvePending(result.state);
  }

  return current;
}

const poolSymbols = (state: GameState, playerId: PlayerId): readonly SymbolInstance[] =>
  Object.values(state.symbols)
    .filter((symbol) => symbol.ownerId === playerId && isUnabsorbedPoolSymbol(symbol))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** True when banking this attribute would newly fuel at least one living creature's attack. */
function creatureNeeding(
  state: GameState,
  playerId: PlayerId,
  symbol: SymbolInstance,
): CreatureState | undefined {
  if (!isAttributeSymbol(symbol.symbol)) return undefined;
  const attribute = symbol.symbol;
  const held = state.players[playerId]?.attributePool ?? {};
  const afterBank = addToken(held, attribute);

  return livingCreaturesOf(state, playerId).find((creature) => {
    const definition = getCreatureDefinition(creature.definitionId);
    if (definition === undefined) return false;
    return definition.attacks.some((attack) => {
      if (!isNonEmptyRequirement(attack.requires) && !isNonEmptyRequirement(attack.discards)) {
        return false;
      }
      // Both requires (gate) and discards (Spend) must be met — not XOR.
      return !attackIsFuelled(held, attack) && attackIsFuelled(afterBank, attack);
    });
  });
}

function mostDamaged(state: GameState, playerId: PlayerId): CreatureState | undefined {
  return [...livingCreaturesOf(state, playerId)].sort((a, b) => b.damage - a.damage)[0];
}

/** Attacks with every creature that is fuelled, hitting the first legal target. */
function fight(state: GameState, playerId: PlayerId, policy: AutoplayPolicy): GameState {
  if (!policy.attack) return state;
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
 * Plays cards it can pay for from the pile. Refuses plays that would leave
 * the driver without pile for later forge steps in scripted scenarios.
 */
function playCards(state: GameState, playerId: PlayerId, policy: AutoplayPolicy): GameState {
  if (!policy.playCards) return state;
  let current = state;

  for (const card of handOf(current, playerId)) {
    if (!stillActive(current, playerId)) break;
    if (current.pendingDecision !== null) break;

    const definition = getCard(card.cardId);
    if (definition?.effect === undefined) continue;
    if (playCostTotal(definition) > 0) {
      const pool = current.players[playerId]?.attributePool ?? {};
      const cost = definition.playCost ?? {};
      if (pileRequirementShortfall(pool, cost) > 0) continue;
    }

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
    // Natural forge is free; only synthetic forges burn header playCost.
    if (definition.forge.kind !== "natural" && playCostTotal(definition) > 0) {
      const pool = current.players[playerId]?.attributePool ?? {};
      const cost = definition.playCost ?? {};
      if (pileRequirementShortfall(pool, cost) > 0) continue;
    }

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
 * Every step in the actions window checks that the turn is still the one it started.
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
  if (state.status !== "in-progress") return state;
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
    const picks = searchableInGraveyard(state, pending.controllerId, pending.maxPlayCost).slice(
      0,
      pending.amount,
    );
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
    const legal = legalCreaturesForFilter(
      state,
      pending.controllerId,
      pending.filter,
      pending.deferred.sourceCreatureId,
    );
    const creatureId = legal[0];
    if (creatureId === undefined) {
      if (pending.optional === true) {
        const declined = advance(state, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: pending.controllerId,
          creatureId: null,
        });
        if (!declined.ok) {
          throw new Error(`autoplay: unexpected ${declined.error} on RESOLVE_CHOOSE_CREATURE`);
        }
        return resolvePending(declined.state);
      }
      throw new Error("autoplay: no creature for choose-creature");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_CREATURE",
      playerId: pending.controllerId,
      creatureId: pending.optional === true ? null : creatureId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_CREATURE`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-ritual") {
    const ownerId = opponentOf(state, pending.controllerId);
    const [cardInstanceId] = ritualsOf(state, ownerId).map((card) => card.id);
    if (cardInstanceId === undefined) {
      throw new Error("autoplay: no ritual for choose-ritual");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_RITUAL",
      playerId: pending.controllerId,
      cardInstanceId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_RITUAL`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-equipment") {
    const cardInstanceId =
      pending.filter === "opponent"
        ? equipmentOf(state, opponentOf(state, pending.controllerId))[0]?.id
        : pending.creatureId !== null
          ? state.creatures[pending.creatureId]?.equipmentIds[0]
          : undefined;
    if (cardInstanceId === undefined) {
      throw new Error("autoplay: no equipment for choose-equipment");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_EQUIPMENT",
      playerId: pending.controllerId,
      cardInstanceId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_EQUIPMENT`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-overload") {
    const ownerId = opponentOf(state, pending.controllerId);
    const [cardInstanceId] = overloadsOf(state, ownerId).map((card) => card.id);
    if (cardInstanceId === undefined) {
      throw new Error("autoplay: no overload for choose-overload");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_OVERLOAD",
      playerId: pending.controllerId,
      cardInstanceId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_OVERLOAD`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-attribute-tokens") {
    const ownerId = state.creatures[pending.creatureId]?.ownerId;
    const tokens = (ownerId === undefined ? {} : state.players[ownerId]?.attributePool) ?? {};
    const { discarded } = discardTokensInAttributeOrder(tokens, pending.amount);
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS",
      playerId: pending.controllerId,
      discarded,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_ATTRIBUTE_TOKENS`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "forge-faces") {
    const ownerId =
      pending.target === "own-die"
        ? pending.controllerId
        : opponentOf(state, pending.controllerId);
    const faceCardId = resolveFaceForForge(
      state,
      pending.controllerId,
      pending.kind,
      pending.attribute,
    );
    if (faceCardId === null) {
      throw new Error("autoplay: no face for forge-faces");
    }
    for (const die of diceOf(state, ownerId)) {
      const slotIndexes = preferredSlotsForForgeFaces(
        die,
        pending.attribute,
        pending.faces,
        state.config,
      );
      if (slotIndexes === null) continue;
      const result = advance(state, {
        type: "RESOLVE_FORGE_FACES",
        playerId: pending.controllerId,
        dieId: die.id,
        slotIndexes,
        faceCardId,
      });
      if (!result.ok) {
        throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_FORGE_FACES`);
      }
      return resolvePending(result.state);
    }
    throw new Error("autoplay: no die for forge-faces");
  }

  if (pending.type === "replace-synthetic-face") {
    const slots = legalSlotsForReplaceSyntheticFace(
      state,
      pending.controllerId,
      pending.kind,
      pending.attribute,
    );
    const choice = slots[0];
    if (choice === undefined) {
      throw new Error("autoplay: no slot for replace-synthetic-face");
    }
    const removedId = state.dice[choice.dieId]?.slots[choice.slotIndex]?.faceCardId;
    if (removedId === undefined) {
      throw new Error("autoplay: missing face on replace slot");
    }
    const [faceCardId] = eligiblePoolFacesForReplace(
      state,
      pending.controllerId,
      pending.kind,
      pending.attribute,
      removedId,
    );
    if (faceCardId === undefined) {
      throw new Error("autoplay: no pool face for replace-synthetic-face");
    }
    const result = advance(state, {
      type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
      playerId: pending.controllerId,
      dieId: choice.dieId,
      slotIndex: choice.slotIndex,
      faceCardId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_REPLACE_SYNTHETIC_FACE`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-die") {
    const [dieId] = legalDiceForFilter(state, pending.controllerId, pending.filter);
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_DIE",
      playerId: pending.controllerId,
      dieId: dieId ?? null,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_DIE`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "convert-symbols") {
    const result = advance(state, {
      type: "RESOLVE_CONVERT_SYMBOLS",
      playerId: pending.controllerId,
      replacements: [],
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CONVERT_SYMBOLS`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "copy-pool-symbol") {
    const symbol = Object.values(state.symbols).find(
      (candidate) =>
        candidate.ownerId === pending.controllerId &&
        (candidate.status === "rolled" || candidate.status === "available"),
    )?.symbol;
    if (symbol === undefined) {
      throw new Error("autoplay: no pool symbol to copy");
    }
    const result = advance(state, {
      type: "RESOLVE_COPY_POOL_SYMBOL",
      playerId: pending.controllerId,
      symbol,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_COPY_POOL_SYMBOL`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "replay-graveyard-tactic") {
    const [cardInstanceId] = replayableGraveyardTactics(
      state,
      pending.controllerId,
      pending.sourceCardInstanceId,
    );
    if (cardInstanceId === undefined) {
      throw new Error("autoplay: no GY tactic to replay");
    }
    const result = advance(state, {
      type: "RESOLVE_REPLAY_GRAVEYARD",
      playerId: pending.controllerId,
      cardInstanceId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_REPLAY_GRAVEYARD`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "look-top-deck") {
    const [keepId] = pending.cardInstanceIds;
    if (keepId === undefined) {
      throw new Error("autoplay: empty look-top-deck");
    }
    const result = advance(state, {
      type: "RESOLVE_LOOK_TOP_DECK",
      playerId: pending.controllerId,
      keepId,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_LOOK_TOP_DECK`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "peek-deck") {
    const result = advance(state, {
      type: "RESOLVE_PEEK_DECK",
      playerId: pending.controllerId,
      putOnBottom: false,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_PEEK_DECK`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "dark-pact") {
    const deck = state.players[pending.controllerId]?.deck ?? [];
    const tactics = deck.flatMap((id) => {
      const card = state.cards[id];
      const definition = card === undefined ? undefined : getCard(card.cardId);
      return definition?.type === "ritual" ? [{ id, attribute: definition.attribute }] : [];
    });
    const first = tactics[0];
    const second = tactics.find((candidate) => candidate.attribute !== first?.attribute);
    if (first === undefined || second === undefined) {
      throw new Error("autoplay: no dark-pact pair");
    }
    const result = advance(state, {
      type: "RESOLVE_DARK_PACT",
      playerId: pending.controllerId,
      cardInstanceIds: [first.id, second.id],
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_DARK_PACT`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "mind-control") {
    const opponentId = opponentOf(state, pending.controllerId);
    let faceCardId: FaceCardId | undefined;
    for (const die of diceOf(state, opponentId)) {
      for (const slot of die.slots) {
        const has = Object.values(state.cards).some(
          (card) => card.zone === "overload" && card.attachedToFaceCardId === slot.faceCardId,
        );
        if (has) {
          faceCardId = slot.faceCardId;
          break;
        }
      }
      if (faceCardId !== undefined) break;
    }
    if (faceCardId === undefined) {
      throw new Error("autoplay: no opposing overloaded face");
    }
    const result = advance(state, {
      type: "RESOLVE_MIND_CONTROL",
      playerId: pending.controllerId,
      mode: "strip-one-face",
      faceCardIds: [faceCardId],
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_MIND_CONTROL`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "split-damage") {
    const targetId =
      pending.attackerId === null
        ? livingCreaturesOf(state, opponentOf(state, pending.controllerId))[0]?.id
        : livingCreaturesOf(state, opponentOf(state, pending.controllerId)).find((creature) => {
            if (creature.position === "back" && !pending.range) {
              const front = livingCreaturesOf(state, creature.ownerId).filter(
                (candidate) => candidate.position === "frontline",
              );
              return front.length === 0;
            }
            return true;
          })?.id;
    if (targetId === undefined) {
      throw new Error("autoplay: no split-damage target");
    }
    const result = advance(state, {
      type: "RESOLVE_SPLIT_DAMAGE",
      playerId: pending.controllerId,
      assignments: [{ creatureId: targetId, amount: pending.amount }],
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_SPLIT_DAMAGE`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "optional-reroll") {
    const result = advance(state, {
      type: "RESOLVE_OPTIONAL_REROLL",
      playerId: pending.controllerId,
      accept: false,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_OPTIONAL_REROLL`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-silence-host") {
    const legal = collectLegalSilenceHosts(state, pending.controllerId, pending.hosts);
    const choice = legal[0];
    if (choice === undefined) {
      throw new Error("autoplay: no host for choose-silence-host");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_SILENCE_HOST",
      playerId: pending.controllerId,
      choice,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_SILENCE_HOST`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-bounce-card") {
    const legal = collectLegalBounceCards(state, pending.controllerId, pending.hosts);
    const choice = legal[0];
    if (choice === undefined) {
      throw new Error("autoplay: no host for choose-bounce-card");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_BOUNCE_CARD",
      playerId: pending.controllerId,
      choice,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_BOUNCE_CARD`);
    }
    return resolvePending(result.state);
  }

  if (pending.type === "choose-die-slot") {
    const legal = legalDieSlotsForFilter(state, pending.controllerId, pending.filter, {
      ...(pending.contextDieId !== undefined ? { contextDieId: pending.contextDieId } : {}),
      ...(pending.excludedSlotIndex !== undefined
        ? { excludedSlotIndex: pending.excludedSlotIndex }
        : {}),
    });
    const first = legal[0];
    if (first === undefined) {
      if (pending.optional === true) {
        const declined = advance(state, {
          type: "RESOLVE_CHOOSE_DIE_SLOT",
          playerId: pending.controllerId,
          dieId: null,
          slotIndex: null,
        });
        if (!declined.ok) {
          throw new Error(`autoplay: unexpected ${declined.error} on RESOLVE_CHOOSE_DIE_SLOT decline`);
        }
        return resolvePending(declined.state);
      }
      throw new Error("autoplay: no slot for choose-die-slot");
    }
    const result = advance(state, {
      type: "RESOLVE_CHOOSE_DIE_SLOT",
      playerId: pending.controllerId,
      dieId: first.dieId,
      slotIndex: first.slotIndex,
    });
    if (!result.ok) {
      throw new Error(`autoplay: unexpected ${result.error} on RESOLVE_CHOOSE_DIE_SLOT`);
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

  current = fight(current, playerId, policy);
  current = absorb(current, playerId, policy);
  if (!stillActive(current, playerId)) return current;
  current = playCards(current, playerId, policy);
  current = absorb(current, playerId, policy);
  if (!stillActive(current, playerId)) return current;
  current = forgeCards(current, playerId, policy);
  current = absorb(current, playerId, policy);

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
