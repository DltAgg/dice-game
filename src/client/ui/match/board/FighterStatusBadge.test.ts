import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FighterNameRow, fighterStatuses } from "./FighterStatusBadge";

describe("fighter status badges", () => {
  it("lists only the states that are on", () => {
    expect(fighterStatuses({ cannotTagIn: true, silenced: true })).toEqual([
      "cannot-tag-in",
      "silenced",
    ]);
    expect(fighterStatuses({})).toEqual([]);
  });

  it("places a prohibited Tag in mark on the right of the name", () => {
    const html = renderToStaticMarkup(
      createElement(FighterNameRow, {
        name: "Vega",
        statuses: fighterStatuses({ cannotTagIn: true }),
      }),
    );
    expect(html.indexOf("Vega")).toBeGreaterThan(-1);
    expect(html.indexOf("Vega")).toBeLessThan(html.indexOf("Tag in"));
    expect(html).toContain('aria-label="Cannot Tag in"');
    expect(html).toContain("rotate-[15deg]");
    expect(html).toContain("bg-red-400/40");
    expect(html).toContain("ml-auto");
  });
});
