import { describe, expect, it } from "vitest";
import { BRACE, SHIFT } from "@server/content/cards.js";
import { MAGNUS, RYU, VEGA } from "@server/content/creatures.js";
import { TAG_SKIRMISH_LOADOUT } from "@server/content/loadouts/index.js";
import { TAG_FIGHTER_RULES } from "@server/model/config.js";
import type { DieState } from "@server/model/dice.js";
import { asFaceCardId, type CreatureDefinitionId, type CreatureId, type FaceCardId } from "@server/model/ids.js";
import type { GameState } from "@server/model/state.js";
import { legalFaceActions, showingFaceCard } from "@server/rules/faceActions.js";
import { dieForCreature } from "@server/rules/fighters.js";
import { createMatch } from "@server/setup/createMatch.js";
import { expectOk, handCardIdAt, P1, P2, resolveOpenChain, withHand } from "@server/testing/scenario.js";
import { advance } from "@server/reducer/reduce.js";
import { hitButtonLabel, stagedShowingDrop } from "./showingFaceDrop";

const JAB = asFaceCardId("face-natural-jab");
const KICK = asFaceCardId("face-natural-kick");
const PROJECTILE = asFaceCardId("face-natural-projectile");
const FOCUS = asFaceCardId("face-natural-focus");
const GRAB = asFaceCardId("face-natural-grab");
const DASH = asFaceCardId("face-natural-dash");

function inActions(): GameState {
  const match = createMatch({
    matchId: "match-showing-drop",
    seed: 1,
    config: TAG_FIGHTER_RULES,
    players: [
      {
        id: P1,
        squad: TAG_SKIRMISH_LOADOUT.squad,
        deck: TAG_SKIRMISH_LOADOUT.deck,
        faceDeck: TAG_SKIRMISH_LOADOUT.faceDeck,
        startingDice: TAG_SKIRMISH_LOADOUT.startingDice,
      },
      {
        id: P2,
        squad: TAG_SKIRMISH_LOADOUT.squad,
        deck: TAG_SKIRMISH_LOADOUT.deck,
        faceDeck: TAG_SKIRMISH_LOADOUT.faceDeck,
        startingDice: TAG_SKIRMISH_LOADOUT.startingDice,
      },
    ],
  });
  const rolled = expectOk(advance(match, { type: "ROLL_DICE", playerId: P1 }));
  const opened = expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: P1 }));
  if (opened.phase !== "actions" || opened.pendingDecision !== null) {
    throw new Error(`expected actions, phase ${opened.phase}`);
  }
  return opened;
}

function fighter(state: GameState, definitionId: CreatureDefinitionId): CreatureId {
  const id = state.players[P1]?.creatureIds.find(
    (creatureId) => state.creatures[creatureId]?.definitionId === definitionId,
  );
  if (id === undefined) throw new Error(definitionId);
  return id;
}

function show(state: GameState, creatureId: CreatureId, faceId: FaceCardId): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  const slot = die.slots.findIndex((entry) => entry.faceCardId === faceId);
  if (slot < 0) throw new Error(faceId);
  const next: DieState = { ...die, rolledSlotIndex: slot };
  return { ...state, dice: { ...state.dice, [die.id]: next } };
}

describe("staged showing-face drops", () => {
  it("uses any Fighter's legal showing face as a hit", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    state = show(show(state, vega, JAB), ryu, PROJECTILE);
    expect(stagedShowingDrop(state, P1, [vega, null])).toEqual({ kind: "hit", creatureId: vega });
    expect(stagedShowingDrop(state, P1, [ryu, null])).toEqual({ kind: "hit", creatureId: ryu });
    state = show(state, ryu, FOCUS);
    expect(stagedShowingDrop(state, P1, [ryu, null])).toEqual({
      kind: "pending",
      message: "Focus is an extender. Land a starter first.",
    });
  });

  it("refuses Rush and Charge as the first hit, then tells Charge it needs Meter in combo", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    const rush = asFaceCardId("face-natural-rush");
    const charge = asFaceCardId("face-natural-charge");
    state = show(show(state, vega, rush), ryu, charge);
    expect(stagedShowingDrop(state, P1, [vega, null])).toEqual({
      kind: "pending",
      message: "Rush is a finisher. Land a starter first.",
    });
    expect(stagedShowingDrop(state, P1, [ryu, null])).toEqual({
      kind: "pending",
      message: "Charge is a finisher. Land a starter first.",
    });
    const combo = { ...state, offensiveState: "combo" as const };
    expect(stagedShowingDrop(combo, P1, [vega, null])).toEqual({ kind: "hit", creatureId: vega });
    expect(stagedShowingDrop(combo, P1, [ryu, null])).toEqual({
      kind: "pending",
      message: "Charge needs 1 Meter.",
    });
    const paid = {
      ...combo,
      players: {
        ...combo.players,
        [P1]: { ...combo.players[P1]!, meter: 1 },
      },
    };
    expect(stagedShowingDrop(paid, P1, [ryu, null])).toEqual({ kind: "hit", creatureId: ryu });
  });

  it("matches a Technique only when one face is the Active Fighter", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    state = show(show(state, vega, KICK), ryu, PROJECTILE);
    const technique = stagedShowingDrop(state, P1, [ryu, vega]);
    expect(technique.kind).toBe("technique");
    if (technique.kind === "technique") {
      expect(technique.creatureId).toBe(vega);
      expect(technique.matches.some((match) => match.techniqueId === "technique-vega-step-jab")).toBe(true);
    }
    const magnus = state.players[P1]!.creatureIds.find((id) => id !== vega && id !== ryu)!;
    expect(stagedShowingDrop(state, P1, [ryu, magnus]).kind).toBe("pending");
  });

  it("uses both Dash extender sentences, then offers the hit once combo starts", () => {
    let state = withHand(inActions(), P2, [BRACE]);
    const vega = fighter(state, VEGA);
    const magnus = fighter(state, MAGNUS);
    state = show(show(state, magnus, GRAB), vega, DASH);

    expect(stagedShowingDrop(state, P1, [vega, null])).toEqual({
      kind: "pending",
      message: "Dash is an extender. Land a starter first.",
    });

    const declared = expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: magnus }));
    expect(declared.offensiveState).toBe("open");
    expect(declared.pendingDecision).not.toBeNull();
    expect(legalFaceActions(declared, P1)).not.toContain(vega);
    expect(stagedShowingDrop(declared, P1, [vega, null])).toEqual({
      kind: "pending",
      message: "The current hit has to resolve before Dash can extend.",
    });

    const yielded = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const answered = expectOk(
      advance(yielded, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(yielded, P2, 0),
      }),
    );
    expect(stagedShowingDrop(answered, P1, [vega, null])).toEqual({
      kind: "pending",
      message: "The current hit has to resolve before Dash can extend.",
    });

    const combo = resolveOpenChain(answered);
    expect(combo.offensiveState).toBe("combo");
    expect(combo.chainStack).toHaveLength(0);
    expect(combo.pendingDecision).toBeNull();
    expect(legalFaceActions(combo, P1)).toContain(vega);
    expect(stagedShowingDrop(combo, P1, [vega, null])).toEqual({ kind: "hit", creatureId: vega });
    const die = dieForCreature(combo, vega);
    const face = die === undefined ? undefined : showingFaceCard(combo, die.id);
    expect(hitButtonLabel(face, face?.name ?? "Dash")).toBe("Extender · Dash");
  });

  it("keeps the attacker on offense after Check Focus is Shifted", () => {
    let state = inActions();
    const ryu = fighter(state, RYU);
    const vega = fighter(state, VEGA);
    const p2Ryu = state.players[P2]!.creatureIds.find(
      (id) => state.creatures[id]?.definitionId === RYU,
    )!;
    const p2Reserve = state.players[P2]!.creatureIds.find((id) => id !== p2Ryu)!;
    state = {
      ...state,
      players: {
        ...state.players,
        [P1]: { ...state.players[P1]!, activeCreatureId: ryu },
        [P2]: { ...state.players[P2]!, activeCreatureId: p2Ryu },
      },
    };
    state = show(show(state, ryu, FOCUS), vega, DASH);
    const secondary = dieForCreature(state, vega);
    if (secondary === undefined) throw new Error("dash die");
    const declared = expectOk(
      advance(state, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: ryu,
        techniqueId: "technique-ryu-check-fire",
        secondaryDieId: secondary.id,
      }),
    );
    const yielded = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const shifted = withHand(yielded, P2, [SHIFT]);
    const answered = expectOk(
      advance(shifted, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(shifted, P2, 0),
        declaredTargetCreatureId: p2Reserve,
      }),
    );
    const resolved = resolveOpenChain(answered);
    expect(resolved.aggressorPlayerId).toBe(P1);
    expect(resolved.offensiveState).toBe("combo");
    expect(resolved.usedSequenceActionIds).toEqual(["technique:technique-ryu-check-fire"]);
    expect(stagedShowingDrop(resolved, P1, [vega, null])).toEqual({
      kind: "hit",
      creatureId: vega,
    });
    const extended = expectOk(
      advance(resolved, { type: "USE_FACE", playerId: P1, creatureId: vega }),
    );
    expect(extended.chainStack.some((link) => link.sequenceRole === "extender")).toBe(true);
    expect(extended.aggressorPlayerId).toBe(P1);
  });

  it("lets Dash extend after Shift redirects Check Focus onto the attacker's wounded fighter", () => {
    let state = inActions();
    const ryu = fighter(state, RYU);
    const vega = fighter(state, VEGA);
    const p2Ryu = state.players[P2]!.creatureIds.find(
      (id) => state.creatures[id]?.definitionId === RYU,
    )!;
    const wounded = state.creatures[vega];
    if (wounded === undefined) throw new Error("vega");
    state = {
      ...state,
      players: {
        ...state.players,
        [P1]: { ...state.players[P1]!, activeCreatureId: ryu },
        [P2]: { ...state.players[P2]!, activeCreatureId: p2Ryu },
      },
      creatures: {
        ...state.creatures,
        [vega]: { ...wounded, damage: 12 },
      },
    };
    state = show(show(state, ryu, FOCUS), vega, DASH);
    const secondary = dieForCreature(state, vega);
    if (secondary === undefined) throw new Error("dash die");
    const declared = expectOk(
      advance(state, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: ryu,
        techniqueId: "technique-ryu-check-fire",
        secondaryDieId: secondary.id,
      }),
    );
    const yielded = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const shifted = withHand(yielded, P2, [SHIFT]);
    const answered = expectOk(
      advance(shifted, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(shifted, P2, 0),
        declaredTargetCreatureId: vega,
      }),
    );
    const resolved = resolveOpenChain(answered);
    expect(resolved.creatures[vega]?.defeated).toBe(true);
    expect(resolved.activePlayerId).toBe(P1);
    expect(resolved.offensiveState).toBe("combo");
    expect(resolved.aggressorPlayerId).toBe(P1);
    expect(stagedShowingDrop(resolved, P1, [vega, null])).toEqual({
      kind: "hit",
      creatureId: vega,
    });
  });
});
