import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GameState } from "@server";
import { creatureIdAt, newMatch, P1, withDefeatedCreature } from "@server/testing/scenario.js";
import { Battlefield } from "./Battlefield.js";

function renderBattlefield(state: GameState, facing: "up" | "down"): string {
  return renderToStaticMarkup(
    createElement(Battlefield, {
      state,
      playerId: P1,
      label: "Player 1",
      facing,
      intent: { kind: "idle" },
      absorbArmed: false,
      onCreatureClick: () => undefined,
      onAttackChoose: () => undefined,
      onCancelAttack: () => undefined,
      actingPlayerId: P1,
      canAct: false,
      onRitualActivate: () => undefined,
    }),
  );
}

function laneOrder(html: string): readonly string[] {
  return [...html.matchAll(/data-frontline-lane="(\d)"/g)].map((match) => match[1] ?? "");
}

describe("Battlefield frontline lanes", () => {
  it("keeps two fixed columns at match start", () => {
    const html = renderBattlefield(newMatch(), "up");
    expect(laneOrder(html)).toEqual(["0", "1"]);
    expect(html).toContain("Test Body A");
    expect(html).toContain("Test Body B");
    expect(html).not.toContain("Empty frontline");
    expect(html).toContain("grid-cols-2");
  });

  it("leaves lane 0 empty when only lane 1 is occupied, without reordering", () => {
    const base = newMatch();
    const state = withDefeatedCreature(base, creatureIdAt(base, P1, 0));
    for (const facing of ["up", "down"] as const) {
      const html = renderBattlefield(state, facing);
      expect(laneOrder(html)).toEqual(["0", "1"]);
      expect(html).toContain("Empty frontline");
      expect(html).toContain("Test Body B");
      expect(html).not.toContain("Test Body A");
      expect(html.indexOf("Empty frontline")).toBeLessThan(html.indexOf("Test Body B"));
      expect(html).not.toContain(`data-creature-id="${creatureIdAt(state, P1, 0)}"`);
    }
  });
});
