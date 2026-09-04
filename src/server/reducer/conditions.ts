import { getFaceCard } from "../content/faces.js";
import { isSyntheticOnlyAttribute } from "../model/attributes.js";
import type { FaceKind } from "../model/dice.js";
import type { EffectCondition } from "../model/effects.js";
import type { ConditionExpr } from "../ast/nodes.js";
import type { DieId, PlayerId } from "../model/ids.js";
import { livingCreaturesOf, opponentOf } from "../rules/creatures.js";
import { diceOf } from "../rules/dice.js";
import type { PendingEffect } from "../model/state.js";
import type { Draft } from "./draft.js";

export type ConditionContext = Pick<
  PendingEffect,
  "controllerId" | "sourceCreatureId" | "sourceDieId"
>;

function poolSymbols(draft: Draft, playerId: PlayerId) {
  return Object.values(draft.symbols).filter(
    (symbol) =>
      symbol.ownerId === playerId && (symbol.status === "rolled" || symbol.status === "available"),
  );
}

export function faceKindOfSymbol(draft: Draft, sourceDieId: DieId | null): FaceKind | null {
  if (sourceDieId === null) return null;
  const die = draft.dice[sourceDieId];
  const slot = die?.rolledSlotIndex;
  if (die === undefined || slot === null || slot === undefined) return null;
  const faceCardId = die.slots[slot]?.faceCardId;
  if (faceCardId === undefined) return null;
  return getFaceCard(faceCardId)?.kind ?? null;
}

function showingFaceOf(draft: Draft, dieId: DieId) {
  const die = draft.dice[dieId];
  const slotIndex = die?.rolledSlotIndex;
  if (die === undefined || slotIndex === null || slotIndex === undefined) return undefined;
  const faceCardId = die.slots[slotIndex]?.faceCardId;
  if (faceCardId === undefined) return undefined;
  return getFaceCard(faceCardId);
}

function thisShowingFace(draft: Draft, ctx: ConditionContext) {
  if (ctx.sourceDieId === null) return undefined;
  return showingFaceOf(draft, ctx.sourceDieId);
}

function otherDieOf(draft: Draft, controllerId: PlayerId, sourceDieId: DieId) {
  return diceOf(draft, controllerId).find((die) => die.id !== sourceDieId);
}

function evaluateGeometry(draft: Draft, ctx: ConditionContext, when: EffectCondition): boolean {
  switch (when.type) {
    case "other-die-same-attribute": {
      if (ctx.sourceDieId === null) return false;
      const thisFace = thisShowingFace(draft, ctx);
      if (thisFace === undefined) return false;
      const other = otherDieOf(draft, ctx.controllerId, ctx.sourceDieId);
      if (other === undefined) return false;
      const otherFace = showingFaceOf(draft, other.id);
      if (otherFace === undefined) return false;
      return otherFace.symbol === thisFace.symbol;
    }
    case "this-die-attribute-count": {
      if (ctx.sourceDieId === null) return false;
      const thisFace = thisShowingFace(draft, ctx);
      const die = draft.dice[ctx.sourceDieId];
      if (thisFace === undefined || die === undefined) return false;
      let count = 0;
      for (const slot of die.slots) {
        const face = getFaceCard(slot.faceCardId);
        if (face?.symbol === thisFace.symbol) count += 1;
      }
      return count >= when.atLeast;
    }
    case "both-showing-synthetic": {
      const dice = diceOf(draft, ctx.controllerId);
      if (dice.length < 2) return false;
      return dice.every((die) => showingFaceOf(draft, die.id)?.kind === "synthetic");
    }
    default:
      return false;
  }
}

function evaluateAtom(draft: Draft, ctx: ConditionContext, when: EffectCondition): boolean {
  switch (when.type) {
    case "source-position": {
      const creature =
        ctx.sourceCreatureId === null ? undefined : draft.creatures[ctx.sourceCreatureId];
      return creature?.position === when.position;
    }
    case "source-is-frontline": {
      const creature =
        ctx.sourceCreatureId === null ? undefined : draft.creatures[ctx.sourceCreatureId];
      return creature?.position === "frontline";
    }
    case "any-enemy-has-toxin":
      return livingCreaturesOf(draft, opponentOf(draft, ctx.controllerId)).some(
        (creature) => creature.toxinMarkers > 0,
      );
    case "any-ally-attacked-this-turn":
      return livingCreaturesOf(draft, ctx.controllerId).some(
        (creature) => creature.attacksUsedThisCombat > 0,
      );
    case "has-other-symbol": {
      const pool = poolSymbols(draft, ctx.controllerId);
      return pool.some((symbol) => {
        if (ctx.sourceDieId !== null && symbol.sourceDieId === ctx.sourceDieId) {
          return false;
        }
        if (when.symbol !== undefined && symbol.symbol !== when.symbol) return false;
        if (when.faceKind !== undefined) {
          const kind = faceKindOfSymbol(draft, symbol.sourceDieId);
          if (kind === when.faceKind) return true;
          if (
            kind === null &&
            when.faceKind === "synthetic" &&
            isSyntheticOnlyAttribute(symbol.symbol)
          ) {
            return true;
          }
          return false;
        }
        return true;
      });
    }
    case "has-adjacent-ally": {
      const ids = draft.players[ctx.controllerId]?.creatureIds ?? [];
      for (let i = 0; i < ids.length; i += 1) {
        const a = ids[i];
        const b = ids[i + 1];
        if (a === undefined || b === undefined) continue;
        const ca = draft.creatures[a];
        const cb = draft.creatures[b];
        if (ca !== undefined && !ca.defeated && cb !== undefined && !cb.defeated) return true;
      }
      return false;
    }
    case "controller-has-frontline":
      return livingCreaturesOf(draft, ctx.controllerId).some(
        (creature) => creature.position === "frontline",
      );
    case "other-die-same-attribute":
    case "this-die-attribute-count":
    case "both-showing-synthetic":
      return evaluateGeometry(draft, ctx, when);
  }
}

function asEffectCondition(when: ConditionExpr): EffectCondition | null {
  switch (when.kind) {
    case "all":
    case "any":
    case "not":
      return null;
    case "source-position":
      return { type: "source-position", position: when.position };
    case "has-other-symbol":
      return {
        type: "has-other-symbol",
        ...(when.symbol !== undefined ? { symbol: when.symbol } : {}),
        ...(when.faceKind !== undefined ? { faceKind: when.faceKind } : {}),
      };
    case "this-die-attribute-count":
      return { type: "this-die-attribute-count", atLeast: when.atLeast };
    default:
      return { type: when.kind };
  }
}

export function evaluateConditionExpr(
  draft: Draft,
  ctx: ConditionContext,
  when: ConditionExpr,
): boolean {
  switch (when.kind) {
    case "all":
      return when.of.every((child) => evaluateConditionExpr(draft, ctx, child));
    case "any":
      return when.of.some((child) => evaluateConditionExpr(draft, ctx, child));
    case "not":
      return !evaluateConditionExpr(draft, ctx, when.of);
    default: {
      const atom = asEffectCondition(when);
      return atom !== null && evaluateAtom(draft, ctx, atom);
    }
  }
}

/**
 * Evaluate a catalogue `conditional.when` (legacy `type`) or AST `ConditionExpr`.
 * Geometry atoms use the controller’s dice and `sourceDieId` from the effect
 * context (`pushEffect(..., dieId, slotIndex)`).
 */
export function evaluateCondition(
  draft: Draft,
  pending: ConditionContext,
  when: EffectCondition | ConditionExpr,
): boolean {
  if ("kind" in when) return evaluateConditionExpr(draft, pending, when);
  return evaluateAtom(draft, pending, when);
}

export function showingFaceOfDie(draft: Draft, dieId: DieId) {
  return showingFaceOf(draft, dieId);
}
