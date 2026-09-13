import type { EffectDefinition } from "../model/effects.js";
import type { EffectNode, ValueExpr } from "./nodes.js";

export interface AstIssue {
  readonly path: string;
  readonly message: string;
}

export class AstValidator {
  validate(node: EffectNode | EffectDefinition): readonly AstIssue[] {
    const issues: AstIssue[] = [];
    this.walk(this.asNode(node), "$", issues);
    return issues;
  }

  private asNode(node: EffectNode | EffectDefinition): EffectNode {
    if ("op" in node) return node;
    return { op: node.type as EffectNode["op"] };
  }

  private walk(node: EffectNode, path: string, issues: AstIssue[]): void {
    if (node.op === undefined || String(node.op).length === 0) {
      issues.push({ path, message: "missing op" });
      return;
    }
    if (node.amount !== undefined) this.walkValue(node.amount, `${path}.amount`, issues);
    for (const child of node.then ?? []) this.walk(child, `${path}.then`, issues);
    for (const child of node.else ?? []) this.walk(child, `${path}.else`, issues);
    for (const child of node.effects ?? []) this.walk(child, `${path}.effects`, issues);
    if (node.op === "mark" && node.token === undefined) {
      issues.push({ path, message: "mark requires token" });
    }
    if (node.op === "branch" && node.when === undefined) {
      issues.push({ path, message: "branch requires when" });
    }
    if (node.op === "modify" && node.stat === undefined) {
      issues.push({ path, message: "modify requires stat" });
    }
  }

  private walkValue(expr: ValueExpr, path: string, issues: AstIssue[]): void {
    switch (expr.kind) {
      case "literal":
        if (!Number.isFinite(expr.value)) {
          issues.push({ path, message: "literal amount must be finite" });
        }
        break;
      case "min":
      case "max":
        if (expr.of.length === 0) issues.push({ path, message: `${expr.kind} needs operands` });
        for (const child of expr.of) this.walkValue(child, path, issues);
        break;
      case "count":
      case "remaining":
        break;
      default:
        issues.push({ path, message: `unknown value kind` });
    }
  }
}
