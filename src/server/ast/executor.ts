import type { Draft } from "../reducer/draft.js";
import type { PendingEffect } from "../model/state.js";
import { AstCompiler } from "./compiler.js";
import { AstValidator } from "./validator.js";
import type { OpcodeRegistry } from "./registry.js";
import type { EffectNode } from "./nodes.js";
import { SkipToLegacy } from "./opcodes/generic.js";

export type LegacyApply = (draft: Draft, pending: PendingEffect) => boolean;

/**
 * Compiles and validates the pending effect. Opcode handlers run after the
 * shared preamble (overcharge / choose / emit) when a registry is provided;
 * otherwise the legacy apply body keeps the old switch.
 */
export class AstExecutor {
  private readonly compiler: AstCompiler;
  private readonly validator: AstValidator;
  private readonly registry: OpcodeRegistry | null;
  private readonly legacyApply: LegacyApply;

  constructor(
    compiler: AstCompiler,
    validator: AstValidator,
    registry: OpcodeRegistry | null,
    legacyApply: LegacyApply,
  ) {
    this.compiler = compiler;
    this.validator = validator;
    this.registry = registry;
    this.legacyApply = legacyApply;
  }

  compile(pending: PendingEffect): EffectNode {
    return this.compiler.compile(pending.effect);
  }

  apply(draft: Draft, pending: PendingEffect): boolean {
    const node = this.compile(pending);
    const issues = this.validator.validate(node);
    if (issues.length > 0) {
      throw new Error(`invalid effect AST at ${issues[0]!.path}: ${issues[0]!.message}`);
    }
    return this.legacyApply(draft, pending);
  }

  tryOpcode(draft: Draft, pending: PendingEffect): boolean | null {
    const node = this.compile(pending);
    const handler = this.registry?.get(node.op);
    if (handler === undefined) return null;
    try {
      return handler.execute({ draft, pending, node }).paused;
    } catch (error) {
      if (error instanceof SkipToLegacy) return null;
      throw error;
    }
  }
}
