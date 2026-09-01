import type { ExecutionContext, IOpcodeHandler } from "../registry.js";
import { applySilence } from "../../reducer/silenceApply.js";

export class SilenceHandler implements IOpcodeHandler {
  readonly op = "silence";

  execute(ctx: ExecutionContext) {
    applySilence(ctx.draft, ctx.pending, ctx.pending.effect);
    return { paused: false };
  }
}
