import type { EffectDefinition } from "../model/effects.js";
import type { GameError } from "../model/errors.js";
import type { HitStrength, HitType } from "../model/hitClass.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { SequenceRole } from "../model/offensive.js";
import type { ChainLink } from "../model/state.js";
import { canSpendMeter } from "../rules/meter.js";
import { sequenceActionUsed, sequenceRoleFits } from "../rules/offensive.js";
import { grapplerStarterWhiffs, starterWhiffMark } from "../rules/starterGuard.js";
import { opponentOf } from "../rules/creatures.js";
import { buildEffectLink, openReactionWindow, pushChainLink } from "./chain.js";
import { endTurn } from "./commands/turn.js";
import { emit, type Draft } from "./draft.js";
import { grantSequenceHitMeter, setComboCount, spendMeter } from "./meter.js";
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
  draft.endSequenceAfterChain = false;
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
    readonly hitStrength?: HitStrength;
    readonly hitType?: HitType;
    readonly assistReserveId?: CreatureId;
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
    ...(args.hitStrength !== undefined ? { hitStrength: args.hitStrength } : {}),
    ...(args.hitType !== undefined ? { hitType: args.hitType } : {}),
    ...(args.assistReserveId !== undefined ? { assistReserveId: args.assistReserveId } : {}),
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
  const replaced = link.exReplaced === true;
  const whiff =
    !negated &&
    !targetGone &&
    !replaced &&
    grapplerStarterWhiffs(draft, link.sourceCreatureId, targetId, role);
  if (!negated && !targetGone && !replaced && !whiff) {
    const spent = spendMeter(draft, link.controllerId, link.meterCost ?? 0);
    blocked = spent !== null;
    if (!blocked) {
      grantSequenceHitMeter(draft, link);
      for (const effect of [...link.effects].reverse()) {
        const chainAttack = effect.type === "damage" || effect.type === "assist-hit";
        pushEffect(
          draft,
          link.controllerId,
          effect,
          link.sourceCreatureId,
          link.declaredTargetCreatureId,
          null,
          null,
          null,
          0,
          null,
          false,
          chainAttack,
          link.sequenceRole ?? null,
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
  settleOffense(draft, link.controllerId, role, blocked, link, whiff);
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
  settleOffense(draft, pending.actorId, pending.role, pending.negated, sequence, false);
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
    readonly declaredTargetCreatureId?: CreatureId | null;
  },
  whiff: boolean,
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
  if (whiff) {
    const ids = [...draft.usedSequenceActionIds];
    if (link.sequenceActionId !== undefined) ids.push(link.sequenceActionId);
    const targetId = link.declaredTargetCreatureId;
    if (targetId != null) ids.push(starterWhiffMark(targetId));
    draft.usedSequenceActionIds = ids;
    return;
  }
  const actor = draft.players[actorId];
  if (actor !== undefined) setComboCount(draft, actorId, actor.comboCount + 1);
  // A finisher finishes the sequence by the same turn pass as `endTurn`.
  // Do not also `returnToOpen`: KO already used that, and a second pass
  // would hand the turn back. A finished match stays on the KO result.
  if (role === "finisher") {
    passTurnAfterSequence(draft, actorId);
    return;
  }
  if (link.endsSequence === true) {
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

/**
 * Return the sequence to Open. Pass initiative only when `nextAggressor` is
 * set. KO and a non-finisher `endsSequence` use this. A finisher and
 * `END_SEQUENCE` pass the turn instead, so this must not call `endTurn`.
 */
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

/**
 * Aggressor stops the sequence. Not a Priority Pass. Ends the turn the same
 * way as `endTurn`: the opposing player becomes the active player.
 */
export function endOffensiveSequence(draft: Draft, playerId: PlayerId): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  if (draft.pendingDecision !== null) return "PENDING_DECISION";
  if (draft.aggressorPlayerId !== playerId) return "NOT_ACTIVE_PLAYER";
  passTurnAfterSequence(draft, playerId);
  return null;
}

function passTurnAfterSequence(draft: Draft, actorId: PlayerId): void {
  handoffSequenceTurn(draft, actorId);
}

/**
 * Spec `035`. A queued extra actions phase replaces this sequence handoff
 * once. `END_TURN` does not call this. A finisher that already spent the
 * count leaves `endSequenceAfterChain` clear, so the chain drain does not
 * grant a second phase.
 */
export function handoffSequenceTurn(draft: Draft, actorId: PlayerId): void {
  if (draft.status === "finished") return;
  draft.usedSequenceActionIds = [];
  draft.pendingOffenseSettle = null;
  if (draft.extraActionPhases > 0) {
    draft.extraActionPhases -= 1;
    beginOffensiveWindow(draft, actorId);
    draft.rerollAvailable = false;
    return;
  }
  endTurn(draft, actorId);
}
