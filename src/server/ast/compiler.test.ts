import { describe, expect, it } from "vitest";
import { AstCompiler } from "./compiler.js";
import { AstValidator } from "./validator.js";
import { ValueEvaluator } from "./evaluate.js";
import { literal } from "./nodes.js";

const compiler = new AstCompiler();
const validator = new AstValidator();
const values = new ValueEvaluator();

describe("AstCompiler", () => {
  it("maps apply-toxin to mark toxin", () => {
    const node = compiler.compileLegacy({
      type: "apply-toxin",
      amount: 2,
      target: { kind: "choose-enemy" },
    });
    expect(node).toEqual({
      op: "mark",
      token: "toxin",
      amount: literal(2),
      target: { kind: "choose-enemy" },
    });
  });

  it("maps arm-ignore-shield to modify until end of turn", () => {
    const node = compiler.compileLegacy({ type: "arm-ignore-shield", amount: 1 });
    expect(node.op).toBe("modify");
    expect(node.stat).toBe("ignore-shield");
    expect(node.duration).toEqual({ kind: "end-of-turn" });
  });

  it("maps play-cost-discount to modify until consumed", () => {
    const node = compiler.compileLegacy({ type: "play-cost-discount", amount: 1 });
    expect(node).toEqual({
      op: "modify",
      stat: "play-cost-discount",
      amount: literal(1),
      duration: { kind: "until-consumed" },
    });
  });

  it("maps silence to the silence opcode with hosts", () => {
    const node = compiler.compileLegacy({
      type: "silence",
      hosts: ["creature", "face"],
      target: { kind: "choose-opponent-silence-host", hosts: ["creature", "face"] },
    });
    expect(node.op).toBe("silence");
    expect(node.hosts).toEqual(["creature", "face"]);
    expect(node.target).toEqual({
      kind: "choose-opponent-silence-host",
      hosts: ["creature", "face"],
    });
  });

  it("maps bounce to the bounce opcode with hosts", () => {
    const node = compiler.compileLegacy({
      type: "bounce",
      hosts: ["ritual", "equipment", "overload"],
      target: {
        kind: "choose-opponent-bounce-card",
        hosts: ["ritual", "equipment", "overload"],
      },
    });
    expect(node).toEqual({
      op: "bounce",
      hosts: ["ritual", "equipment", "overload"],
      target: {
        kind: "choose-opponent-bounce-card",
        hosts: ["ritual", "equipment", "overload"],
      },
    });
  });

  it("maps desynthesize to the desynthesize opcode", () => {
    const node = compiler.compileLegacy({
      type: "desynthesize",
      target: { kind: "choose-any-synthetic-slot" },
    });
    expect(node).toEqual({
      op: "desynthesize",
      target: { kind: "choose-any-synthetic-slot" },
    });
  });

  it("maps conditional to branch with combinable atoms", () => {
    const node = compiler.compileLegacy({
      type: "conditional",
      when: { type: "any-enemy-has-toxin" },
      then: [{ type: "draw-cards", amount: 1 }],
    });
    expect(node.op).toBe("branch");
    expect(node.when).toEqual({ kind: "any-enemy-has-toxin" });
    expect(node.then?.[0]?.op).toBe("draw");
  });
});

describe("AstValidator", () => {
  it("rejects mark without a token", () => {
    const issues = validator.validate({ op: "mark", amount: literal(1) });
    expect(issues.some((issue) => issue.message.includes("token"))).toBe(true);
  });

  it("accepts compiled legacy damage", () => {
    const node = compiler.compileLegacy({
      type: "damage",
      amount: 3,
      target: { kind: "declared-target" },
    });
    expect(validator.validate(node)).toEqual([]);
  });

  it("maps Cross forge fromAttribute onto replace-synthetic-face", () => {
    const node = compiler.compileLegacy({
      type: "replace-synthetic-face",
      faces: 1,
      attribute: "luminar",
      fromAttribute: "mechanical",
    });
    expect(node).toEqual({
      op: "replace-synthetic-face",
      faces: 1,
      attribute: "luminar",
      fromAttribute: "mechanical",
    });
  });
});

describe("ValueEvaluator", () => {
  it("evaluates literal and min", () => {
    expect(values.evaluate(literal(4))).toBe(4);
    expect(
      values.evaluate({
        kind: "min",
        of: [literal(3), literal(1), { kind: "remaining" }],
      }, 2),
    ).toBe(1);
  });
});
