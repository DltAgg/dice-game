import { describe, expect, it } from "vitest";
import { BRACE } from "../content/cards.js";
import { MAGNUS, RYU, VEGA } from "../content/creatures.js";
import { TAG_SKIRMISH_LOADOUT } from "../content/loadouts/index.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieState } from "../model/dice.js";
import {
  asFaceCardId,
  type CreatureDefinitionId,
  type CreatureId,
  type FaceCardId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { legalFaceActions, matchingTechniques } from "../rules/faceActions.js";
import { dieForCreature } from "../rules/fighters.js";
import { createMatch } from "../setup/createMatch.js";
import { expectOk, handCardIdAt, P1, P2, resolveOpenChain, withHand } from "../testing/scenario.js";
import { advance } from "./reduce.js";

const JAB = asFaceCardId("face-natural-jab");
const KICK = asFaceCardId("face-natural-vega-kick");
const GRAB = asFaceCardId("face-natural-magnus-grab");
const DASH = asFaceCardId("face-natural-vega-dash");
const PROJECTILE = asFaceCardId("face-natural-ryu-projectile");
const RUSH = asFaceCardId("face-natural-vega-rush");
const CHARGE = asFaceCardId("face-natural-ryu-charge");

function inActions(): GameState {
  const match = createMatch({
    matchId: "match-playtest-combo",
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
  if (rolled.phase !== "actions" || rolled.pendingDecision !== null) {
    throw new Error(`expected an open actions window, phase ${rolled.phase}`);
  }
  return rolled;
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

function withActive(state: GameState, creatureId: CreatureId): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("p1");
  return {
    ...state,
    players: { ...state.players, [P1]: { ...player, activeCreatureId: creatureId } },
  };
}

describe("playtest hits and techniques", () => {
  it("enters Combo from a lone starter face, then leaves it when the sequence ends", () => {
    let open = inActions();
    const vega = fighter(open, VEGA);
    open = show(open, vega, JAB);
    expect(open.offensiveState).toBe("open");
    expect(legalFaceActions(open, P1)).toContain(vega);

    const combo = resolveOpenChain(
      expectOk(advance(open, { type: "USE_FACE", playerId: P1, creatureId: vega })),
    );
    expect(combo.offensiveState).toBe("combo");
    expect(combo.players[P1]?.comboCount).toBe(1);
    expect(legalFaceActions(combo, P1)).not.toContain(vega);

    const stopped = expectOk(advance(combo, { type: "END_SEQUENCE", playerId: P1 }));
    expect(stopped.activePlayerId).toBe(P2);
    expect(stopped.phase).toBe("roll");
    expect(stopped.offensiveState).toBe("open");
    expect(stopped.aggressorPlayerId).toBe(P2);
    expect(legalFaceActions(stopped, P1)).toEqual([]);
  });

  it("lets a Reserve hit with a showing face and keeps Techniques on the Active Fighter", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    expect(state.players[P1]?.activeCreatureId).toBe(vega);
    state = show(state, ryu, JAB);
    expect(legalFaceActions(state, P1)).toContain(ryu);
    expect(matchingTechniques(state, P1, ryu)).toEqual([]);

    const hit = expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: ryu }));
    expect(hit.chainStack.at(-1)?.sourceCreatureId).toBe(ryu);

    const technique = advance(state, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: ryu,
      techniqueId: "technique-ryu-check-fire",
      secondaryDieId: dieForCreature(state, vega)!.id,
    });
    expect(technique.ok).toBe(false);
    if (!technique.ok) expect(technique.error).toBe("INVALID_TARGET");
  });

  it("enters Combo from a starter Technique, then accepts an extender Technique", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    state = show(show(state, vega, KICK), ryu, PROJECTILE);
    const step = matchingTechniques(state, P1, vega).find(
      (match) => match.techniqueId === "technique-vega-step-jab",
    );
    expect(step).toBeDefined();

    const combo = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "USE_TECHNIQUE",
          playerId: P1,
          creatureId: vega,
          techniqueId: step!.techniqueId,
          secondaryDieId: step!.secondaryDieId,
        }),
      ),
    );
    expect(combo.offensiveState).toBe("combo");
    expect(combo.players[P1]?.comboCount).toBe(1);

    const continued = show(withActive(combo, ryu), ryu, PROJECTILE);
    const shot = matchingTechniques(continued, P1, ryu).find(
      (match) => match.techniqueId === "technique-ryu-focused-shot",
    );
    expect(shot).toBeDefined();
    const extended = resolveOpenChain(
      expectOk(
        advance(continued, {
          type: "USE_TECHNIQUE",
          playerId: P1,
          creatureId: ryu,
          techniqueId: shot!.techniqueId,
          secondaryDieId: shot!.secondaryDieId,
        }),
      ),
    );
    expect(extended.offensiveState).toBe("combo");
    expect(extended.activePlayerId).toBe(P1);
    expect(extended.players[P1]?.comboCount).toBe(2);
  });

  it("uses Rush as a finisher from an open sequence and refuses Charge without Meter", () => {
    let state = inActions();
    const vega = fighter(state, VEGA);
    const ryu = fighter(state, RYU);
    state = show(show(state, vega, RUSH), ryu, CHARGE);
    expect(legalFaceActions(state, P1)).toContain(vega);
    expect(legalFaceActions(state, P1)).not.toContain(ryu);

    const unpaid = advance(state, { type: "USE_FACE", playerId: P1, creatureId: ryu });
    expect(unpaid.ok).toBe(false);
    if (!unpaid.ok) expect(unpaid.error).toBe("INSUFFICIENT_METER");

    const finished = resolveOpenChain(
      expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: vega })),
    );
    expect(finished.activePlayerId).toBe(P2);
    expect(finished.phase).toBe("roll");
    const defender = finished.players[P2]!.activeCreatureId;
    expect(finished.creatures[defender]?.damage).toBe(4);

    const paid = {
      ...state,
      players: {
        ...state.players,
        [P1]: { ...state.players[P1]!, meter: 1 },
      },
    };
    const charged = resolveOpenChain(
      expectOk(advance(paid, { type: "USE_FACE", playerId: P1, creatureId: ryu })),
    );
    expect(charged.activePlayerId).toBe(P2);
    expect(charged.players[P1]?.meter).toBe(1 - 1 + 4);
  });

  it("lets Dash extend after Brace answers Grab", () => {
    let state = withHand(inActions(), P2, [BRACE]);
    const vega = fighter(state, VEGA);
    const magnus = fighter(state, MAGNUS);
    state = show(show(state, magnus, GRAB), vega, DASH);
    const defender = state.players[P2]!.activeCreatureId;

    const declared = expectOk(advance(state, { type: "USE_FACE", playerId: P1, creatureId: magnus }));
    expect(declared.offensiveState).toBe("open");
    expect(declared.pendingDecision?.type).toBe("reaction-priority");
    const during = advance(declared, { type: "USE_FACE", playerId: P1, creatureId: vega });
    expect(during.ok).toBe(false);
    if (!during.ok) expect(during.error).toBe("PENDING_DECISION");

    const yielded = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const answered = expectOk(
      advance(yielded, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(yielded, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(answered);
    expect(resolved.creatures[defender]?.damage).toBe(1);
    expect(resolved.log.some((entry) => entry.event.type === "chain-link-negated")).toBe(false);
    expect(resolved.offensiveState).toBe("combo");
    expect(resolved.aggressorPlayerId).toBe(P1);
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.chainStack).toHaveLength(0);

    const extended = advance(resolved, { type: "USE_FACE", playerId: P1, creatureId: vega });
    expect(extended.ok).toBe(true);
    if (extended.ok) {
      expect(extended.state.chainStack.at(-1)?.sequenceRole).toBe("extender");
    }
  });
});
