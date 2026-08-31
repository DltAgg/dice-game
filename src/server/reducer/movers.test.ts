import { describe, expect, it } from "vitest";
import { RECAST } from "../content/cards.js";

describe("Tempo movers", () => {
  it("Recast is the catalogue card for synthetic replacement", () => {
    expect(RECAST).toBeDefined();
  });
});
