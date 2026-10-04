import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TAG_FIGHTER_RULES } from "@server";
import type {
  CreatureId,
  DieId,
  DieSlot,
  FaceCardId,
  GameState,
  PlayerId,
} from "@server";
import { testCreature, testFace } from "@server/testing/fixtures/index.js";
import { TagSkirmishSeatPanel } from "./TagSkirmishSeatPanel";

const STRIKE_FACE = "face-strike-ui" as FaceCardId;
const P1 = "p1" as PlayerId;

function tagSkirmishBoard(): GameState {
  testFace({
    id: STRIKE_FACE,
    name: "Strike",
    technique: "strike",
  });
  const fighterDef = testCreature({
    id: "creature-ui-fighter",
    name: "Korr",
    life: 8,
    assistEffects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }],
  });

  const c0 = "c0" as CreatureId;
  const c1 = "c1" as CreatureId;
  const c2 = "c2" as CreatureId;
  const d0 = "d0" as DieId;
  const d1 = "d1" as DieId;
  const d2 = "d2" as DieId;
  const slot: DieSlot = {
    index: 0,
    faceCardId: STRIKE_FACE,
    faceCardOwnerId: P1,
  };

  return {
    status: "in-progress",
    pendingDecision: null,
    phase: "actions",
    activePlayerId: P1,
    turn: 1,
    config: TAG_FIGHTER_RULES,
    players: {
      [P1]: {
        creatureIds: [c0, c1, c2],
        dieIds: [d0, d1, d2],
        activeCreatureId: c0,
        meter: 3,
        comboCount: 2,
        overload: [],
        overchargeByFace: {},
        spentOncePerTurnKeys: [],
        deck: [],
        hand: [],
        graveyard: [],
        equipment: [],
        ritual: [],
      },
    },
    creatures: {
      [c0]: {
        id: c0,
        ownerId: P1,
        definitionId: fighterDef.id,
        position: "frontline",
        defeated: false,
        damage: 0,
        equipmentIds: [],
        attacksUsedThisCombat: 0,
        extraAttacksThisTurn: 0,
        shields: 0,
        toxinMarkers: 0,
        attackPreventCount: 0,
        nextAttackBonus: 0,
      },
      [c1]: {
        id: c1,
        ownerId: P1,
        definitionId: fighterDef.id,
        position: "back",
        defeated: false,
        damage: 0,
        equipmentIds: [],
        attacksUsedThisCombat: 0,
        extraAttacksThisTurn: 0,
        shields: 0,
        toxinMarkers: 0,
        attackPreventCount: 0,
        nextAttackBonus: 0,
      },
      [c2]: {
        id: c2,
        ownerId: P1,
        definitionId: fighterDef.id,
        position: "back",
        defeated: true,
        damage: 8,
        equipmentIds: [],
        attacksUsedThisCombat: 0,
        extraAttacksThisTurn: 0,
        shields: 0,
        toxinMarkers: 0,
        attackPreventCount: 0,
        nextAttackBonus: 0,
      },
    },
    dice: {
      [d0]: { id: d0, ownerId: P1, rolledSlotIndex: 0, slots: [slot] },
      [d1]: { id: d1, ownerId: P1, rolledSlotIndex: null, slots: [slot] },
      [d2]: { id: d2, ownerId: P1, rolledSlotIndex: 0, slots: [slot] },
    },
    cards: {},
  } as unknown as GameState;
}

describe("TagSkirmishSeatPanel", () => {
  it("shows meter, combo, active/reserve, die technique, and KO", () => {
    const html = renderToStaticMarkup(
      createElement(TagSkirmishSeatPanel, {
        state: tagSkirmishBoard(),
        playerId: P1,
        label: "Player 1",
        facing: "up",
        intent: { kind: "idle" },
        absorbArmed: false,
        actingPlayerId: P1,
        canAct: true,
        onCreatureClick: () => undefined,
        onAttackChoose: () => undefined,
        onCancelAttack: () => undefined,
        onRitualActivate: () => undefined,
        onTag: () => undefined,
        onAssist: () => undefined,
      }),
    );
    expect(html).toContain("Meter");
    expect(html).toContain("3/8");
    expect(html).toContain("Combo");
    expect(html).toContain("2");
    expect(html).toContain("Active");
    expect(html).toContain("Reserve");
    expect(html).toContain("Strike");
    expect(html).toContain("strike");
    expect(html).toContain("KO");
    expect(html).toContain(">Tag<");
    expect(html).toContain(">Assist<");
    const reserveAt = html.indexOf(">Reserve<");
    const tagAt = html.indexOf(">Tag<", reserveAt);
    const unrolledAt = html.indexOf("Unrolled", reserveAt);
    expect(reserveAt).toBeGreaterThan(-1);
    expect(tagAt).toBeGreaterThan(reserveAt);
    expect(unrolledAt).toBeGreaterThan(tagAt);
    expect(html.indexOf(">Active<")).toBeLessThan(html.indexOf(">Reserve<"));
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Tag<\/button>/);
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Assist<\/button>/);
  });

  it("disables Tag and Assist when Meter cannot pay them", () => {
    const state = tagSkirmishBoard();
    const player = state.players[P1];
    if (player === undefined) throw new Error("player");
    const broke = {
      ...state,
      players: {
        ...state.players,
        [P1]: { ...player, meter: 0 },
      },
    };
    const html = renderToStaticMarkup(
      createElement(TagSkirmishSeatPanel, {
        state: broke,
        playerId: P1,
        label: "Player 1",
        facing: "up",
        intent: { kind: "idle" },
        absorbArmed: false,
        actingPlayerId: P1,
        canAct: true,
        onCreatureClick: () => undefined,
        onAttackChoose: () => undefined,
        onCancelAttack: () => undefined,
        onRitualActivate: () => undefined,
        onTag: () => undefined,
        onAssist: () => undefined,
      }),
    );
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Tag<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Assist<\/button>/);
  });

  it("puts reserves above the active fighter when the seat faces down", () => {
    const html = renderToStaticMarkup(
      createElement(TagSkirmishSeatPanel, {
        state: tagSkirmishBoard(),
        playerId: P1,
        label: "Player 2",
        facing: "down",
        intent: { kind: "idle" },
        absorbArmed: false,
        actingPlayerId: P1,
        canAct: true,
        onCreatureClick: () => undefined,
        onAttackChoose: () => undefined,
        onCancelAttack: () => undefined,
        onRitualActivate: () => undefined,
        onTag: () => undefined,
        onAssist: () => undefined,
      }),
    );
    expect(html.indexOf(">Reserve<")).toBeLessThan(html.indexOf(">Active<"));
    const assistAt = html.indexOf(">Assist<");
    expect(assistAt).toBeGreaterThan(html.indexOf(">Reserve<"));
    expect(assistAt).toBeLessThan(html.indexOf(">Active<"));
  });
});
