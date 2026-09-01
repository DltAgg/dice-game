import type { ExecutionContext, IOpcodeHandler } from "../registry.js";
import { applyDesynthesize } from "../../reducer/desynthesize.js";

export class DesynthesizeHandler implements IOpcodeHandler {
  readonly op = "desynthesize";

  execute(ctx: ExecutionContext) {
    applyDesynthesize(ctx.draft, ctx.pending, ctx.pending.effect);
    return { paused: false };
  }
}
