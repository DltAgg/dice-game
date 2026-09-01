import type { Draft } from "../../reducer/draft.js";
import type { PendingEffect } from "../../model/state.js";
import type { TargetSelector } from "../../model/effects.js";
import type { CreatureId } from "../../model/ids.js";
import { ValueEvaluator } from "../evaluate.js";
import type { ExecutionContext, IOpcodeHandler } from "../registry.js";
import { OpcodeRegistry } from "../registry.js";
import { BounceHandler } from "./bounce.js";
import { DesynthesizeHandler } from "./desynthesize.js";
import { SilenceHandler } from "./silence.js";

export interface ResolutionKernel {
  applyToTargets(
    draft: Draft,
    pending: PendingEffect,
    selector: TargetSelector,
    apply: (creatureId: CreatureId) => void,
  ): void;
  dealDamage(
    draft: Draft,
    targetId: CreatureId,
    amount: number,
    opts?: { readonly ignoreShield?: number; readonly fromAttack?: boolean },
  ): number;
  fireOnDealDamage(draft: Draft, sourceId: CreatureId, targetId: CreatureId): void;
  healCreature(draft: Draft, creatureId: CreatureId, amount: number): void;
  grantShield(draft: Draft, creatureId: CreatureId, amount: number): void;
  applyToxin(draft: Draft, creatureId: CreatureId, amount: number): void;
  patchAttackBonus(draft: Draft, playerId: string, amount: number): void;
  patchIgnoreShield(draft: Draft, playerId: string, amount: number): void;
  patchAttackToxin(draft: Draft, playerId: string, amount: number): void;
}

const values = new ValueEvaluator();

class DamageHandler implements IOpcodeHandler {
  readonly op = "damage";
  private readonly kernel: ResolutionKernel;
  constructor(kernel: ResolutionKernel) {
    this.kernel = kernel;
  }
  execute(ctx: ExecutionContext) {
    const amount = values.evaluate(ctx.node.amount);
    const target = ctx.node.target;
    if (target === undefined) return { paused: false };
    this.kernel.applyToTargets(ctx.draft, ctx.pending, target, (targetId) => {
      const dealt = this.kernel.dealDamage(ctx.draft, targetId, amount, {
        ignoreShield: ctx.pending.ignoreShield,
        fromAttack: ctx.pending.fromAttack,
      });
      if (dealt > 0 && ctx.pending.sourceCreatureId !== null) {
        this.kernel.fireOnDealDamage(ctx.draft, ctx.pending.sourceCreatureId, targetId);
      }
    });
    return { paused: false };
  }
}

class HealHandler implements IOpcodeHandler {
  readonly op = "heal";
  private readonly kernel: ResolutionKernel;
  constructor(kernel: ResolutionKernel) {
    this.kernel = kernel;
  }
  execute(ctx: ExecutionContext) {
    const amount = values.evaluate(ctx.node.amount);
    const target = ctx.node.target;
    if (target === undefined) return { paused: false };
    this.kernel.applyToTargets(ctx.draft, ctx.pending, target, (targetId) => {
      this.kernel.healCreature(ctx.draft, targetId, amount);
    });
    return { paused: false };
  }
}

class MarkHandler implements IOpcodeHandler {
  readonly op = "mark";
  private readonly kernel: ResolutionKernel;
  constructor(kernel: ResolutionKernel) {
    this.kernel = kernel;
  }
  execute(ctx: ExecutionContext) {
    const token = ctx.node.token;
    const target = ctx.node.target;
    if (token === "corruption" || token === "pestilence" || target === undefined) {
      return { paused: false, skip: true } as { paused: boolean; skip?: boolean };
    }
    const amount = values.evaluate(ctx.node.amount);
    this.kernel.applyToTargets(ctx.draft, ctx.pending, target, (targetId) => {
      if (token === "toxin") this.kernel.applyToxin(ctx.draft, targetId, amount);
      if (token === "shield") this.kernel.grantShield(ctx.draft, targetId, amount);
    });
    return { paused: false };
  }
}

class ModifyHandler implements IOpcodeHandler {
  readonly op = "modify";
  private readonly kernel: ResolutionKernel;
  constructor(kernel: ResolutionKernel) {
    this.kernel = kernel;
  }
  execute(ctx: ExecutionContext) {
    const amount = values.evaluate(ctx.node.amount);
    const playerId = ctx.pending.controllerId;
    switch (ctx.node.stat) {
      case "attack-damage":
        this.kernel.patchAttackBonus(ctx.draft, playerId, amount);
        return { paused: false };
      case "ignore-shield":
        this.kernel.patchIgnoreShield(ctx.draft, playerId, amount);
        return { paused: false };
      case "attack-toxin":
        this.kernel.patchAttackToxin(ctx.draft, playerId, amount);
        return { paused: false };
      default:
        return { paused: false, skip: true } as { paused: boolean; skip?: boolean };
    }
  }
}

const skipSentinel = (result: { paused: boolean; skip?: boolean }): boolean =>
  result.skip === true;

export function createGenericRegistry(kernel: ResolutionKernel): OpcodeRegistry {
  const registry = new OpcodeRegistry();
  const wrapping = (handler: IOpcodeHandler): IOpcodeHandler => ({
    op: handler.op,
    execute: (ctx) => {
      const result = handler.execute(ctx);
      if (skipSentinel(result)) {
        throw new SkipToLegacy();
      }
      return result;
    },
  });
  registry.register(wrapping(new DamageHandler(kernel)));
  registry.register(wrapping(new HealHandler(kernel)));
  registry.register(wrapping(new MarkHandler(kernel)));
  registry.register(wrapping(new ModifyHandler(kernel)));
  registry.register(new SilenceHandler());
  registry.register(new BounceHandler());
  registry.register(new DesynthesizeHandler());
  return registry;
}

export class SkipToLegacy extends Error {
  constructor() {
    super("skip-to-legacy");
    this.name = "SkipToLegacy";
  }
}
