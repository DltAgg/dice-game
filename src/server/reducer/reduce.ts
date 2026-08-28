import type { GameError } from "../model/errors.js";
import { fail, ok, type ReduceResult } from "../model/result.js";
import type { GameState, PendingDecision } from "../model/state.js";
import { createRng, type RNG } from "../rng/rng.js";
import type { GameAction } from "./actions.js";
import { absorbSymbol } from "./commands/absorb.js";
import { attack } from "./commands/attack.js";
import { forgeCard, activateFace } from "./commands/forge.js";
import { playCard } from "./commands/playCard.js";
import { passPriority } from "./commands/priority.js";
import { retainDie, rollDice } from "./commands/rollDice.js";
import { activateRitual } from "./commands/ritual.js";
import { advancePhase, endTurn } from "./commands/turn.js";
import { createDraft, type Draft } from "./draft.js";
import {
  resolveChooseAttributeTokens,
  resolveChooseCreature,
  resolveChooseDie,
  resolveChooseDieSlot,
  resolveChooseEquipment,
  resolveChoosePoolSymbol,
  resolveChooseRitual,
  resolveConvertSymbols,
  resolveCopyPoolSymbol,
  resolveDarkPact,
  resolveDiscard,
  resolveForgeFaces,
  resolveLookTopDeck,
  resolveMindControl,
  resolveOptionalBonusAttack,
  resolveOptionalOvercharge,
  resolveOptionalReroll,
  resolvePeekDeck,
  resolveReplayGraveyard,
  resolveReplaceSyntheticFace,
  resolveSearch,
  resolveSplitDamage,
} from "./pending/resolvers.js";

/**
 * The single place a game can advance (SPDD §54).
 *
 * Pure: no clock, no randomness beyond the injected RNG, no I/O, no framework.
 * An illegal action returns the *original* state object untouched, so callers
 * can rely on reference identity to detect that nothing happened.
 */
export function reduce(state: GameState, action: GameAction, rng: RNG): ReduceResult {
  if (state.status === "finished") return fail(state, "GAME_FINISHED");

  const pending = state.pendingDecision;
  const reactionWindow = pending?.type === "reaction-priority" ? pending : null;

  // Gate order: reaction priority → pending chooser (even if not the turn
  // player) → otherwise only the active player. A non-reaction pending locks
  // every other seat, including the turn player, with PENDING_DECISION.
  if (reactionWindow !== null) {
    if (action.playerId !== reactionWindow.priorityPlayerId) {
      return fail(state, "NOT_PRIORITY_PLAYER");
    }
    const allowed =
      action.type === "PASS_PRIORITY" ||
      action.type === "PLAY_CARD" ||
      action.type === "ACTIVATE_RITUAL";
    if (!allowed) return fail(state, "PENDING_DECISION");
  } else if (pending !== null && pending.type !== "reaction-priority") {
    if (!isMatchingPendingResolve(pending, action)) {
      return fail(state, "PENDING_DECISION");
    }
  } else if (state.activePlayerId !== action.playerId) {
    return fail(state, "NOT_ACTIVE_PLAYER");
  }

  const draft = createDraft(state);
  const error = applyAction(draft, action, rng);
  if (error !== null) return fail(state, error);

  draft.rng = rng.snapshot();
  return ok(draft);
}

/**
 * Convenience wrapper that derives the RNG from the state it is advancing.
 * This is what the store and the host use; keeping the seeded cursor inside
 * GameState is what makes a match replayable from its action log alone.
 */
export const advance = (state: GameState, action: GameAction): ReduceResult =>
  reduce(state, action, createRng(state.rng));

type ChoicePending = Exclude<PendingDecision, { type: "reaction-priority" }>;

/**
 * Only the pending controller may complete a non-reaction choice, and only with
 * the matching resolve (including that type's existing skip / decline payload).
 */
function isMatchingPendingResolve(pending: ChoicePending, action: GameAction): boolean {
  if (action.playerId !== pending.controllerId) return false;
  switch (pending.type) {
    case "search-deck":
    case "search-graveyard":
      return action.type === "RESOLVE_SEARCH";
    case "discard-cards":
      return action.type === "RESOLVE_DISCARD";
    case "choose-creature":
      return action.type === "RESOLVE_CHOOSE_CREATURE";
    case "choose-ritual":
      return action.type === "RESOLVE_CHOOSE_RITUAL";
    case "choose-equipment":
      return action.type === "RESOLVE_CHOOSE_EQUIPMENT";
    case "choose-attribute-tokens":
      return action.type === "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS";
    case "forge-faces":
      return action.type === "RESOLVE_FORGE_FACES";
    case "replace-synthetic-face":
      return action.type === "RESOLVE_REPLACE_SYNTHETIC_FACE";
    case "choose-die":
      return action.type === "RESOLVE_CHOOSE_DIE";
    case "convert-symbols":
      return action.type === "RESOLVE_CONVERT_SYMBOLS";
    case "copy-pool-symbol":
      return action.type === "RESOLVE_COPY_POOL_SYMBOL";
    case "replay-graveyard-tactic":
      return action.type === "RESOLVE_REPLAY_GRAVEYARD";
    case "look-top-deck":
      return action.type === "RESOLVE_LOOK_TOP_DECK";
    case "peek-deck":
      return action.type === "RESOLVE_PEEK_DECK";
    case "dark-pact":
      return action.type === "RESOLVE_DARK_PACT";
    case "mind-control":
      return action.type === "RESOLVE_MIND_CONTROL";
    case "split-damage":
      return action.type === "RESOLVE_SPLIT_DAMAGE";
    case "optional-reroll":
      return action.type === "RESOLVE_OPTIONAL_REROLL";
    case "choose-die-slot":
      return action.type === "RESOLVE_CHOOSE_DIE_SLOT";
    case "choose-pool-symbol":
      return action.type === "RESOLVE_CHOOSE_POOL_SYMBOL";
    case "optional-overcharge":
      return action.type === "RESOLVE_OPTIONAL_OVERCHARGE";
    case "optional-bonus-attack":
      return action.type === "RESOLVE_OPTIONAL_BONUS_ATTACK";
  }
}

function applyAction(draft: Draft, action: GameAction, rng: RNG): GameError | null {
  switch (action.type) {
    case "ROLL_DICE":
      return rollDice(draft, action.playerId, rng);
    case "ABSORB_SYMBOL":
      return absorbSymbol(draft, action.playerId, action.symbolId, action.creatureId);
    case "ATTACK":
      return attack(draft, action.playerId, action.attackerId, action.attackId, action.targetId);
    case "FORGE_CARD":
      return forgeCard(
        draft,
        action.playerId,
        action.cardInstanceId,
        action.dieId,
        action.slotIndexes,
        action.faceCardId,
      );
    case "PLAY_CARD":
      return playCard(
        draft,
        action.playerId,
        action.cardInstanceId,
        action.declaredTargetCreatureId ?? null,
        action.declaredFaceCardId ?? null,
      );
    case "ACTIVATE_RITUAL":
      return activateRitual(
        draft,
        action.playerId,
        action.cardInstanceId,
        action.declaredTargetCreatureId ?? null,
      );
    case "RETAIN_DIE":
      return retainDie(draft, action.playerId, action.dieId, action.retain);
    case "RESOLVE_SEARCH":
      return resolveSearch(draft, action.playerId, action.cardInstanceIds, rng);
    case "RESOLVE_DISCARD":
      return resolveDiscard(draft, action.playerId, action.cardInstanceIds);
    case "RESOLVE_CHOOSE_CREATURE":
      return resolveChooseCreature(draft, action.playerId, action.creatureId);
    case "RESOLVE_CHOOSE_RITUAL":
      return resolveChooseRitual(draft, action.playerId, action.cardInstanceId);
    case "RESOLVE_CHOOSE_EQUIPMENT":
      return resolveChooseEquipment(draft, action.playerId, action.cardInstanceId);
    case "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS":
      return resolveChooseAttributeTokens(draft, action.playerId, action.discarded);
    case "RESOLVE_FORGE_FACES":
      return resolveForgeFaces(
        draft,
        action.playerId,
        action.dieId,
        action.slotIndexes,
        action.faceCardId,
      );
    case "RESOLVE_REPLACE_SYNTHETIC_FACE":
      return resolveReplaceSyntheticFace(
        draft,
        action.playerId,
        action.dieId,
        action.slotIndex,
        action.faceCardId,
      );
    case "RESOLVE_CHOOSE_DIE":
      return resolveChooseDie(draft, action.playerId, action.dieId);
    case "RESOLVE_CONVERT_SYMBOLS":
      return resolveConvertSymbols(draft, action.playerId, action.replacements);
    case "RESOLVE_COPY_POOL_SYMBOL":
      return resolveCopyPoolSymbol(draft, action.playerId, action.symbol);
    case "RESOLVE_REPLAY_GRAVEYARD":
      return resolveReplayGraveyard(draft, action.playerId, action.cardInstanceId);
    case "RESOLVE_LOOK_TOP_DECK":
      return resolveLookTopDeck(draft, action.playerId, action.keepId);
    case "RESOLVE_PEEK_DECK":
      return resolvePeekDeck(draft, action.playerId, action.putOnBottom);
    case "RESOLVE_DARK_PACT":
      return resolveDarkPact(draft, action.playerId, action.cardInstanceIds, rng);
    case "RESOLVE_MIND_CONTROL":
      return resolveMindControl(
        draft,
        action.playerId,
        action.mode,
        action.faceCardIds,
        action.overloadInstanceIds,
      );
    case "RESOLVE_SPLIT_DAMAGE":
      return resolveSplitDamage(draft, action.playerId, action.assignments);
    case "RESOLVE_OPTIONAL_REROLL":
      return resolveOptionalReroll(draft, action.playerId, action.accept, rng);
    case "RESOLVE_CHOOSE_DIE_SLOT":
      return resolveChooseDieSlot(draft, action.playerId, action.dieId, action.slotIndex);
    case "RESOLVE_CHOOSE_POOL_SYMBOL":
      return resolveChoosePoolSymbol(draft, action.playerId, action.symbolId);
    case "RESOLVE_OPTIONAL_OVERCHARGE":
      return resolveOptionalOvercharge(draft, action.playerId, action.accept);
    case "RESOLVE_OPTIONAL_BONUS_ATTACK":
      return resolveOptionalBonusAttack(
        draft,
        action.playerId,
        action.accept,
        action.attackId,
        action.targetId,
      );
    case "ACTIVATE_FACE":
      return activateFace(draft, action.playerId, action.dieId, action.slotIndex);
    case "PASS_PRIORITY":
      return passPriority(draft, action.playerId);
    case "ADVANCE_PHASE":
      return advancePhase(draft);
    case "END_TURN":
      return endTurn(draft, action.playerId);
  }
}
