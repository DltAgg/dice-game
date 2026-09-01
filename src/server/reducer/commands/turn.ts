import type { GameError } from "../../model/errors.js";
import type { PlayerId, SymbolInstanceId } from "../../model/ids.js";
import { TURN_PHASE_ORDER, type TurnPhase } from "../../model/state.js";
import { opponentOf } from "../../rules/creatures.js";
import { emit, type Draft } from "../draft.js";
import { clearRollBankQueue } from "../rollBank.js";
import {
  checkVictory,
  clearResourceLocks,
  clearToxinReceiveCapsForOwner,
  drainResolution,
  tickForgeLocksForOwner,
  tickToxins,
} from "../resolution.js";
import { clearTurnTriggerState, fireOnTurnStart } from "../triggers.js";
import { drawCards } from "../zones.js";
import { resetExhaustedRituals } from "./ritual.js";

/* ------------------------------------------------------------- phase --- */

export function advancePhase(draft: Draft): GameError | null {
  const index = TURN_PHASE_ORDER.indexOf(draft.phase);
  const next = TURN_PHASE_ORDER[index + 1];
  // The final phase is left by ending the turn, not by advancing past it.
  if (next === undefined) return "INVALID_PHASE";
  return enterPhase(draft, next);
}

export function enterPhase(draft: Draft, phase: TurnPhase): GameError | null {
  draft.phase = phase;
  emit(draft, { type: "phase-entered", phase });
  return null;
}

/* ---------------------------------------------------------- end turn --- */

export function endTurn(draft: Draft, playerId: PlayerId): GameError | null {
  const nextPlayerId = opponentOf(draft, playerId);
  return finishTurn(draft, playerId, nextPlayerId);
}

function finishTurn(draft: Draft, playerId: PlayerId, nextPlayerId: PlayerId): GameError | null {
  detachDice(draft);
  expireTurnSymbols(draft);
  resetCombatCounters(draft);
  draft.attackBonusThisTurn = {};
  draft.attackToxinThisTurn = {};
  draft.preventDrawArmed = {};
  draft.ignoreShieldThisTurn = {};
  draft.forgeDiscountThisTurn = {};
  draft.playCostDiscountThisTurn = {};
  draft.requirementWildcardsThisTurn = {};
  draft.bladeRainArmed = {};
  draft.facesAppearedThisRoll = [];
  draft.resolveNextFaceEffectTwice = {};
  clearRollBankQueue(draft);
  clearResourceLocks(draft);
  tickForgeLocksForOwner(draft, playerId);
  // Toxin detonates at end of the creature owner's turn (before the switch).
  tickToxins(draft, playerId);
  clearTurnTriggerState(draft);

  emit(draft, { type: "turn-ended", playerId });

  draft.turn += 1;
  draft.activePlayerId = nextPlayerId;
  emit(draft, { type: "turn-started", turn: draft.turn, playerId: nextPlayerId });

  clearToxinReceiveCapsForOwner(draft, nextPlayerId);
  // Standing burn pulses at turn start (auto-target only — no choose pending).
  fireOnTurnStart(draft, nextPlayerId);
  drainResolution(draft);
  // Exhausted once-per-turn rituals come off diagonal; Active-when is a
  // one-time unlock so they return to ready.
  resetExhaustedRituals(draft, nextPlayerId);

  // Drawn on entering your own turn, so the opening hand is not topped up
  // before the first player has had a turn to use it.
  drawCards(draft, nextPlayerId, draft.config.cardsDrawnPerTurn);

  checkVictory(draft);
  return enterPhase(draft, "roll");
}

function detachDice(draft: Draft): void {
  for (const die of Object.values(draft.dice)) {
    if (die.attachedToCreatureId !== null) {
      draft.dice[die.id] = { ...die, attachedToCreatureId: null };
    }
  }
}

/**
 * Symbols are temporary (bible §15) and, with storing dropped, nothing exempts
 * them. What a player wanted to keep as attributes is already in their pile;
 * Shield sits on a creature. Unbanked turn-pool symbols expire here.
 */
function expireTurnSymbols(draft: Draft): void {
  const expired: SymbolInstanceId[] = [];
  for (const symbol of Object.values(draft.symbols)) {
    expired.push(symbol.id);
    delete draft.symbols[symbol.id];
  }
  if (expired.length > 0) emit(draft, { type: "symbols-expired", symbolIds: expired });
}

function resetCombatCounters(draft: Draft): void {
  for (const creature of Object.values(draft.creatures)) {
    if (creature.attacksUsedThisCombat !== 0 || creature.extraAttacksThisTurn !== 0) {
      draft.creatures[creature.id] = {
        ...creature,
        attacksUsedThisCombat: 0,
        extraAttacksThisTurn: 0,
      };
    }
  }
}
