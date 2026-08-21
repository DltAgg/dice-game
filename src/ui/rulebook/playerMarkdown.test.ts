import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { headingSlug, rulebookToc, stripHtmlComments } from "./playerMarkdown.js";

const rulebookPath = fileURLToPath(new URL("../../../docs/RULEBOOK.md", import.meta.url));
const rulebookSource = readFileSync(rulebookPath, "utf8");

describe("player rulebook markdown", () => {
  it("keeps play sections and hides agent comments", () => {
    const player = stripHtmlComments(rulebookSource);
    expect(player).toContain("## 1. Object of the game");
    expect(player).toContain("## 5. Turn structure");
    expect(player).not.toContain(".cursor/rules/rulebook.mdc");
    expect(player).not.toContain("Related docs (agents)");
  });

  it("builds a table of contents from h2 headings", () => {
    const toc = rulebookToc(stripHtmlComments(rulebookSource));
    expect(toc.some((entry) => entry.id === "1-object-of-the-game")).toBe(true);
    expect(headingSlug("5. Turn structure")).toBe("5-turn-structure");
  });
});
