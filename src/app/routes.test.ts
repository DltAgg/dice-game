import { describe, expect, it } from "vitest";
import { APP_NAV, APP_PATHS, pathFromView, viewFromPath } from "./routes.js";

const VIEWS = ["lobby", "match", "decks", "catalogue", "rules", "metrics"] as const;

describe("app view routes", () => {
  it("maps each shell view to a path and back", () => {
    for (const view of VIEWS) {
      expect(viewFromPath(pathFromView(view))).toBe(view);
    }
  });

  it("treats / as play/lobby without making lobby’s canonical path /", () => {
    expect(viewFromPath("/")).toBe("lobby");
    expect(pathFromView("lobby")).toBe("/play");
  });

  it("ignores trailing slashes", () => {
    expect(viewFromPath("/decks/")).toBe("decks");
    expect(viewFromPath("/catalogue/")).toBe("catalogue");
    expect(viewFromPath("/rules/")).toBe("rules");
  });

  it("falls unknown paths back to lobby", () => {
    expect(viewFromPath("/nope")).toBe("lobby");
    expect(viewFromPath("")).toBe("lobby");
  });

  it("exposes one nav item per canonical path", () => {
    expect(APP_NAV.map((item) => item.to)).toEqual(Object.values(APP_PATHS));
  });
});
