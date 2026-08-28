import type { Draft } from "../reducer/draft.js";
import type { PendingEffect } from "../model/state.js";
import type { EffectNode } from "./nodes.js";

export type ExecuteResult = { readonly paused: boolean };

export interface ExecutionContext {
  readonly draft: Draft;
  readonly pending: PendingEffect;
  readonly node: EffectNode;
}

export interface IOpcodeHandler {
  readonly op: string;
  execute(ctx: ExecutionContext): ExecuteResult;
}

export class OpcodeRegistry {
  private readonly handlers = new Map<string, IOpcodeHandler>();

  register(handler: IOpcodeHandler): this {
    this.handlers.set(handler.op, handler);
    return this;
  }

  get(op: string): IOpcodeHandler | undefined {
    return this.handlers.get(op);
  }

  execute(ctx: ExecutionContext): ExecuteResult {
    const handler = this.handlers.get(ctx.node.op);
    if (handler === undefined) {
      throw new Error(`no opcode handler registered for "${ctx.node.op}"`);
    }
    return handler.execute(ctx);
  }
}
