import { describe, expect, it } from "vitest";
import { RYU_FORM } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { VEGA_KICK } from "../content/faces.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import {
  asCreatureDefinitionId,
  asFaceCardId,
  type CreatureDefinitionId,
  type CreatureId,
  type DieId,
  type FaceCardId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { canUseFace, matchingTechniques, showingFaceCard } from "../rules/faceActions.js";
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

const FORM_ID = asFaceCardId("face-natural-ryu-form");
const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");
const HIDDEN_SLOT = 3;

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
    matchId: "match-form-starter",
    seed: 1,
    config: { ...TAG_FIGHTER_RULES, deckMinCards: 0, deckOutEnabled: false },
    players: [
      { id: P1, ...seat },
      { id: P2, ...seat },
    ],
  });
  const rolled = expectOk(advance(match, { type: "ROLL_DICE", playerId: P1 }));
  if (
    rolled.phase !== "actions" ||
    rolled.pendingDecision !== null ||
    rolled.offensiveState !== "open"
  ) {
    throw new Error(`expected an open sequence, phase ${rolled.phase}`);
  }
  return rolled;
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

function showSlot(state: GameState, creatureId: CreatureId, slotIndex: number): GameState {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) throw new Error("die");
  return {
    ...state,
    dice: { ...state.dice, [die.id]: { ...die, rolledSlotIndex: slotIndex } },
  };
}

function showFace(state: GameState, creatureId: CreatureId, faceId: FaceCardId): GameState {
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

function playForm(state: GameState, ryuId: CreatureId, slotIndex: number): GameState {
  const opened = withHand(state, P1, [RYU_FORM]);
  const played = expectOk(
    advance(opened, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(opened, P1, 0),
      declaredTargetCreatureId: ryuId,
      dieId: dieIdOf(opened, ryuId),
      slotIndex,
      declaredFaceCardId: FORM_ID,
    }),
  );
  return resolveOpenChain(played);
}

function damageOf(state: GameState): number {
  const active = state.players[P2]?.activeCreatureId;
  if (active === undefined) throw new Error("active");
  return state.creatures[active]?.damage ?? 0;
}

describe("Ryu Form showing starter", () => {
  it("shows Form after replacing a hidden slot and strikes as a starter", () => {
    const opened = skirmishActions();
    const ryu = fighterOf(opened, RYU_ID);
    const shown = showSlot(opened, ryu, 0);
    const dieId = dieIdOf(shown, ryu);
    const hiddenFace = shown.dice[dieId]?.slots[0]?.faceCardId;
    const formed = playForm(shown, ryu, HIDDEN_SLOT);

    expect(formed.offensiveState).toBe("open");
    expect(formed.dice[dieId]?.rolledSlotIndex).toBe(HIDDEN_SLOT);
    expect(formed.dice[dieId]?.slots[HIDDEN_SLOT]?.faceCardId).toBe(FORM_ID);
    expect(formed.dice[dieId]?.slots[0]?.faceCardId).toBe(hiddenFace);
    expect(showingFaceCard(formed, dieId)?.id).toBe(FORM_ID);
    expect(canUseFace(formed, P1, ryu)).toBe(true);

    const before = damageOf(formed);
    const declared = expectOk(
      advance(formed, { type: "USE_FACE", playerId: P1, creatureId: ryu }),
    );
    expect(
      declared.chainStack.some(
        (link) => link.kind === "combat-action" && link.sequenceRole === "starter",
      ),
    ).toBe(true);
    const hit = resolveOpenChain(declared);
    expect(damageOf(hit)).toBe(before + 1);
    expect(hit.offensiveState).toBe("combo");
  });

  it("refuses the showing Form starter once the sequence is in combo", () => {
    const opened = skirmishActions();
    const ryu = fighterOf(opened, RYU_ID);
    const jabbing = showSlot(opened, ryu, 0);
    const jab = resolveOpenChain(
      expectOk(advance(jabbing, { type: "USE_FACE", playerId: P1, creatureId: ryu })),
    );
    expect(jab.offensiveState).toBe("combo");

    const formed = playForm(jab, ryu, HIDDEN_SLOT);
    const dieId = dieIdOf(formed, ryu);
    expect(formed.dice[dieId]?.rolledSlotIndex).toBe(HIDDEN_SLOT);
    expect(showingFaceCard(formed, dieId)?.id).toBe(FORM_ID);
    expect(formed.offensiveState).toBe("combo");
    expect(canUseFace(formed, P1, ryu)).toBe(false);

    const refused = advance(formed, { type: "USE_FACE", playerId: P1, creatureId: ryu });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error).toBe("INVALID_TARGET");
      expect(refused.state).toBe(formed);
    }
  });

  it("resolves Beast Form as a starter the same turn Form replaces a hidden slot", () => {
    const opened = skirmishActions();
    const ryu = fighterOf(opened, RYU_ID);
    const vega = fighterOf(opened, VEGA_ID);
    const ready = showFace(withActive(showSlot(opened, ryu, 0), ryu), vega, VEGA_KICK);
    const formed = playForm(ready, ryu, HIDDEN_SLOT);
    const dieId = dieIdOf(formed, ryu);
    const vegaDie = dieForCreature(formed, vega);
    if (vegaDie === undefined) throw new Error("vega die");

    expect(showingFaceCard(formed, dieId)?.id).toBe(FORM_ID);
    expect(matchingTechniques(formed, P1, ryu)).toEqual(
      expect.arrayContaining([
        { techniqueId: "technique-ryu-beast-form", secondaryDieId: vegaDie.id },
      ]),
    );

    const declared = expectOk(
      advance(formed, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: ryu,
        techniqueId: "technique-ryu-beast-form",
        secondaryDieId: vegaDie.id,
      }),
    );
    expect(
      declared.chainStack.some(
        (link) =>
          link.kind === "combat-action" &&
          link.sequenceRole === "starter" &&
          link.sequenceActionId === "technique:technique-ryu-beast-form",
      ),
    ).toBe(true);
    expect(resolveOpenChain(declared).offensiveState).toBe("combo");
  });
});
