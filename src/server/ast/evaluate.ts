import type { ValueExpr } from "./nodes.js";

export class ValueEvaluator {
  evaluate(expr: ValueExpr | undefined, remaining = 0): number {
    if (expr === undefined) return 0;
    switch (expr.kind) {
      case "literal":
        return expr.value;
      case "min":
        return Math.min(...expr.of.map((child) => this.evaluate(child, remaining)));
      case "max":
        return Math.max(...expr.of.map((child) => this.evaluate(child, remaining)));
      case "remaining":
        return remaining;
      case "count":
        return remaining;
    }
  }
}
