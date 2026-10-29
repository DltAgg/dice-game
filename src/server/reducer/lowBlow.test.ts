import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import {
  asCardId,
  asCreatureDefinitionId,
  asFaceCardId,
  type CreatureDefinitionId,
  type CreatureId,
  type DieId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { dieForCreature } from "../rules/fighters.js";
import { createMatch } from "../setup/createMatch.js";
import {
  expectOk,
  handCardIdAt,
  P1,
  P2,
  resolveOpenChain,
  withHand,
} from "../testing/scenario.js";
import { advance } from "./reduce.js";

const LOW_BLOW = asCardId("card-low-blow");
const GRAB = asFaceCardId("face-natural-magnus-grab");
const KICK = asFaceCardId("face-natural-vega-kick");
const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");

function fighterBaseDie(id: CreatureDefinitionId): DieFaceLayout {
  const die = getCreatureDefinition(id)?.baseDie;
  if (die === undefined || die.length !== 6) throw new Error(String(id));
  return [die[0]!, die[1]!, die[2]!, die[3]!, die[4]!, die[5]!];
}

function skirmishActions(): GameState {
  const squad = [VEGA_ID, MAGNUS_ID, RYU_ID] as const;
  const startingDice = squad.map((id) => fighterBaseDie(id));
  const faceDeck = [...new Set(startingDice.flat())];
  const seat = { squad, deck: [] as const, faceDeck, startingDice };
  const match = createMatch({
    matchId: "match-low-blow",
    seed: 1,
    config: { ...TAG_FIGHTER_RULES, deckMinCards: 0, deckOutEnabled: false },
    players: [
      { id: P1, ...seat },
      { id: P2, ...seat },
    ],
  });
  const rolled = expectOk(advance(match, { type: "ROLL_DICE", playerId: P1 }));
  return expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: P1 }));
}

function fighterOf(state: GameState, definitionId: CreatureDefinitionId): CreatureId {
  const id = state.players[P1]?.creatureIds.find(
    (creatureId) => state.creatures[creatureId]?.definitionId === definitionId,
  );
  if (id === undefined) throw new Error(String(definitionId));
  return id;
}

function dieIdOf(state: GameState, creatureId: CreatureId): DieId {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  return die.id;
}

function showFace(state: GameState, creatureId: CreatureId, faceId: string): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  const slot = die.slots.findIndex((entry) => entry.faceCardId === faceId);
  if (slot < 0) throw new Error(faceId);
  return {
    ...state,
    dice: { ...state.dice, [die.id]: { ...die, rolledSlotIndex: slot } },
  };
}

function withActive(state: GameState, creatureId: CreatureId): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("player");
  return {
    ...state,
    players: { ...state.players, [P1]: { ...player, activeCreatureId: creatureId } },
  };
}

function damageOf(state: GameState): number {
  const active = state.players[P2]?.activeCreatureId;
  if (active === undefined) throw new Error("active");
  return state.creatures[active]?.damage ?? 0;
}

describe("Low Blow", () => {
  it("replaces a Magnus slot with Grab and strikes 4, plus the light kick's +1", () => {
    const definition = getCard(LOW_BLOW);
    expect(definition?.name).toBe("Low Blow");
    expect(definition?.rulesText).toBe(
      "Stays on Fighter.\n[Replace] to Grab. [Moveset Low Blow].\nLow Blow · Medium Punch · Starter\nGrab + Light kick: [Strike 4].",
    );
    expect(definition?.addedTechnique).toMatchObject({
      sequenceRole: "starter",
      hitStrength: "medium",
      hitType: "punch",
      primaryFaceId: GRAB,
      secondary: { hitStrength: "light", hitType: "kick" },
      effects: [{ type: "damage", amount: 4, target: { kind: "declared-target" } }],
    });

    const actions = skirmishActions();
    const opened = showFace(actions, fighterOf(actions, VEGA_ID), KICK);
    const magnus = fighterOf(opened, MAGNUS_ID);
    const vega = fighterOf(opened, VEGA_ID);
    const dieId = dieIdOf(opened, magnus);
    const handed = withHand(opened, P1, [LOW_BLOW]);
    const played = resolveOpenChain(
      expectOk(
        advance(handed, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(handed, P1, 0),
          declaredTargetCreatureId: magnus,
          dieId,
          slotIndex: 0,
          declaredFaceCardId: GRAB,
        }),
      ),
    );
    expect(played.dice[dieId]?.slots[0]?.faceCardId).toBe(GRAB);
    expect(played.dice[dieId]?.rolledSlotIndex).toBe(0);
    expect(played.creatures[magnus]?.addedTechniques?.map((technique) => technique.id)).toContain(
      "technique-magnus-low-blow",
    );

    const ready = withActive(played, magnus);
    const vegaDie = dieIdOf(ready, vega);
    const before = damageOf(ready);
    const declared = expectOk(
      advance(ready, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: magnus,
        techniqueId: "technique-magnus-low-blow",
        secondaryDieId: vegaDie,
      }),
    );
    const hit = resolveOpenChain(declared);
    expect(damageOf(hit)).toBe(before + 5);
    expect(hit.offensiveState).toBe("combo");
  });

  it("refuses the moveset on a Fighter other than Magnus", () => {
    const opened = skirmishActions();
    const vega = fighterOf(opened, VEGA_ID);
    const handed = withHand(opened, P1, [LOW_BLOW]);
    const refused = advance(handed, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(handed, P1, 0),
      declaredTargetCreatureId: vega,
      dieId: dieIdOf(handed, vega),
      slotIndex: 0,
      declaredFaceCardId: GRAB,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_TARGET");
  });
});
