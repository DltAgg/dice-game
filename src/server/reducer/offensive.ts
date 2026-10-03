import type { EffectDefinition } from "../model/effects.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { SequenceRole } from "../model/offensive.js";
import type { ChainLink } from "../model/state.js";
import { canSpendMeter } from "../rules/meter.js";
import { sequenceActionUsed, sequenceRoleFits } from "../rules/offensive.js";
import { opponentOf } from "../rules/creatures.js";
import { buildEffectLink, openReactionWindow, pushChainLink } from "./chain.js";
import { emit, type Draft } from "./draft.js";
import { grantMeter, spendMeter } from "./meter.js";
import { drainResolution, pushEffect } from "./resolution.js";

export { sequenceActionUsed };

export function sequenceDeclarationError(
  draft: Draft,
  playerId: PlayerId,
  role: SequenceRole,
  meterCost: number,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  if (draft.aggressorPlayerId !== playerId) return "INVALID_TARGET";
  if (!sequenceRoleFits(draft.offensiveState, role)) return "INVALID_TARGET";
  if (!canSpendMeter(draft, playerId, meterCost)) return "INSUFFICIENT_METER";
  return null;
}

export function beginOffensiveWindow(draft: Draft, aggressorId: PlayerId): void {
  draft.aggressorPlayerId = aggressorId;
  draft.offensiveState = "open";
  draft.offenseSeizedBy = null;
  draft.pendingOffenseSettle = null;
}

/**
 * Commit a sequence action onto the existing reaction chain. Effects resolve
 * only after the window closes (spec `008` + `030`).
 */
export function openCombatAction(
  draft: Draft,
  args: {
    readonly playerId: PlayerId;
    readonly sourceCreatureId: CreatureId;
    readonly declaredTargetCreatureId: CreatureId | null;
    readonly effects: readonly EffectDefinition[];
    readonly sequenceRole: SequenceRole;
    readonly meterCost: number;
    readonly meterGain: number;
    readonly sequenceActionId: string;
    readonly endsSequence?: boolean;
    readonly passesInitiative?: boolean;
  },
): void {
  const base = buildEffectLink({
    kind: "tactic-effect",
    controllerId: args.playerId,
    cardInstanceId: null,
    effects: args.effects,
    sourceCreatureId: args.sourceCreatureId,
    declaredTargetCreatureId: args.declaredTargetCreatureId,
  });
  pushChainLink(draft, {
    ...base,
    kind: "combat-action",
    sequenceRole: args.sequenceRole,
    meterCost: args.meterCost,
    meterGain: args.meterGain,
    sequenceActionId: args.sequenceActionId,
    endsSequence: args.sequenceRole === "finisher" || args.endsSequence === true,
    passesInitiative: args.passesInitiative === true,
  });
  openReactionWindow(draft, args.playerId, "same");
}

/** A non-negated response seized while the combat-action link is still waiting. */
export function noteOffenseSeize(draft: Draft, link: ChainLink): void {
  if (link.seizesOffense !== true) return;
  if (!draft.chainStack.some((item) => item.kind === "combat-action")) return;
  draft.offenseSeizedBy = link.controllerId;
}

export function conductCombatAction(draft: Draft, link: ChainLink): void {
  const role = link.sequenceRole;
  if (role === undefined) return;
  const negated = link.negated;
  let blocked = negated;
  const targetId = link.declaredTargetCreatureId;
  const targetGone =
    targetId !== null &&
    (draft.creatures[targetId] === undefined || draft.creatures[targetId]?.defeated === true);
  if (!negated && !targetGone) {
    const spent = spendMeter(draft, link.controllerId, link.meterCost ?? 0);
    blocked = spent !== null;
    if (!blocked) {
      grantMeter(draft, link.controllerId, link.meterGain ?? 0);
      for (const effect of [...link.effects].reverse()) {
        pushEffect(
          draft,
          link.controllerId,
          effect,
          link.sourceCreatureId,
          link.declaredTargetCreatureId,
        );
      }
      drainResolution(draft);
    }
  }
  if (draft.pendingDecision !== null) {
    draft.pendingOffenseSettle = {
      actorId: link.controllerId,
      role,
      negated: blocked,
      endsSequence: link.endsSequence === true,
      passesInitiative: link.passesInitiative === true,
      sequenceActionId: link.sequenceActionId ?? null,
    };
    return;
  }
  settleOffense(draft, link.controllerId, role, blocked, link);
}

/** After a paused combat-action body finishes and the chain is idle. */
export function flushPendingOffenseSettle(draft: Draft): void {
  const pending = draft.pendingOffenseSettle;
  if (pending === null || draft.pendingDecision !== null) return;
  draft.pendingOffenseSettle = null;
  const sequence =
    pending.sequenceActionId === null
      ? { endsSequence: pending.endsSequence, passesInitiative: pending.passesInitiative }
      : {
          endsSequence: pending.endsSequence,
          passesInitiative: pending.passesInitiative,
          sequenceActionId: pending.sequenceActionId,
        };
  settleOffense(draft, pending.actorId, pending.role, pending.negated, sequence);
}

function settleOffense(
  draft: Draft,
  actorId: PlayerId,
  role: SequenceRole,
  negated: boolean,
  link: {
    readonly endsSequence?: boolean;
    readonly passesInitiative?: boolean;
    readonly sequenceActionId?: string;
  },
): void {
  const seizedBy = draft.offenseSeizedBy;
  draft.offenseSeizedBy = null;
  if (seizedBy !== null && seizedBy !== actorId) {
    draft.aggressorPlayerId = seizedBy;
    draft.offensiveState = "open";
    draft.usedSequenceActionIds = [];
    emit(draft, { type: "offense-seized", playerId: seizedBy });
    emit(draft, {
      type: "offensive-state-changed",
      offensiveState: "open",
      aggressorPlayerId: seizedBy,
    });
    return;
  }
  if (negated) return;
  const ends = role === "finisher" || link.endsSequence === true;
  if (ends) {
    returnToOpen(draft, link.passesInitiative === true ? opponentOf(draft, actorId) : null);
    return;
  }
  draft.offensiveState = "combo";
  if (link.sequenceActionId !== undefined) {
    draft.usedSequenceActionIds = [...draft.usedSequenceActionIds, link.sequenceActionId];
  }
  emit(draft, {
    type: "offensive-state-changed",
    offensiveState: "combo",
    aggressorPlayerId: draft.aggressorPlayerId,
  });
}

/** Return the sequence to Open. Pass initiative only when `nextAggressor` is set. */
export function returnToOpen(draft: Draft, nextAggressor: PlayerId | null): void {
  draft.offensiveState = "open";
  draft.usedSequenceActionIds = [];
  if (nextAggressor !== null) draft.aggressorPlayerId = nextAggressor;
  emit(draft, {
    type: "offensive-state-changed",
    offensiveState: "open",
    aggressorPlayerId: draft.aggressorPlayerId,
  });
}

/** Aggressor stops the sequence. Not a Priority Pass. Does not move initiative. */
export function endOffensiveSequence(draft: Draft, playerId: PlayerId): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  if (draft.pendingDecision !== null) return "PENDING_DECISION";
  if (draft.aggressorPlayerId !== playerId) return "NOT_ACTIVE_PLAYER";
  returnToOpen(draft, null);
  return null;
}
