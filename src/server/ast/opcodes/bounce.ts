import type { ExecutionContext, IOpcodeHandler } from "../registry.js";
import { applyBounce } from "../../reducer/bounceApply.js";

export class BounceHandler implements IOpcodeHandler {
  readonly op = "bounce";

  execute(ctx: ExecutionContext) {
    applyBounce(ctx.draft, ctx.pending, ctx.pending.effect);
    return { paused: false };
  }
}
