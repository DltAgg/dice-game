import { describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../content/creatures.js";
import { TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import {
  asCardId,
  asCardInstanceId,
  asCreatureDefinitionId,
  asFaceCardId,
  type CreatureDefinitionId,
  type CreatureId,
  type FaceCardId,
  type PlayerId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { dieForCreature } from "../rules/fighters.js";
import { createMatch } from "../setup/createMatch.js";
import { expectOk, P1, P2, resolveOpenChain } from "../testing/scenario.js";
import { advance } from "./reduce.js";

const VEGA_ID = asCreatureDefinitionId("creature-vega");
const MAGNUS_ID = asCreatureDefinitionId("creature-magnus");
const RYU_ID = asCreatureDefinitionId("creature-ryu");
const GRAB = asFaceCardId("face-power-grab");
const HEAVY = asFaceCardId("face-heavy");
const BRACE = asCardId("card-brace");

function fighterBaseDie(id: CreatureDefinitionId): DieFaceLayout {
  const die = getCreatureDefinition(id)?.baseDie;
  if (die === undefined || die.length !== 6) throw new Error(String(id));
  return [die[0]!, die[1]!, die[2]!, die[3]!, die[4]!, die[5]!];
}

function skirmish(): GameState {
  const squad = [MAGNUS_ID, VEGA_ID, RYU_ID] as const;
  const startingDice = squad.map((id) => fighterBaseDie(id));
  const faceDeck = [...new Set(startingDice.flat())];
  const deck = [BRACE, BRACE, BRACE, BRACE, BRACE, BRACE, BRACE, BRACE];
  const seat = { squad, deck, faceDeck, startingDice };
  const match = createMatch({
    matchId: "match-finisher-draw",
    seed: 1,
    config: {
      ...TAG_FIGHTER_RULES,
      deckMinCards: 0,
      deckMaxCopiesPerCard: 8,
      deckOutEnabled: false,
      turnDrawMode: "up-to",
      cardsDrawnUpTo: 5,
    },
    players: [
      { id: P1, ...seat },
      { id: P2, ...seat },
    ],
  });
  const rolled = expectOk(advance(match, { type: "ROLL_DICE", playerId: P1 }));
  return expectOk(advance(rolled, { type: "ADVANCE_PHASE", playerId: P1 }));
}

function fighterOf(state: GameState, definitionId: CreatureDefinitionId, playerId: PlayerId): CreatureId {
  const id = state.players[playerId]?.creatureIds.find(
    (creatureId) => state.creatures[creatureId]?.definitionId === definitionId,
  );
  if (id === undefined) throw new Error(String(definitionId));
  return id;
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

/** Hand is already at the up-to cap, plus the Brace that will be spent. */
function handAboveCap(state: GameState): GameState {
  const player = state.players[P2];
  if (player === undefined) throw new Error("player");
  const id = asCardInstanceId("given-p2-extra-brace");
  return {
    ...state,
    cards: {
      ...state.cards,
      [id]: {
        id,
        cardId: BRACE,
        ownerId: P2,
        zone: "hand",
        attachedToCreatureId: null,
        attachedToFaceCardId: null,
        ritualOrientation: null,
      },
    },
    players: {
      ...state.players,
      [P2]: { ...player, hand: [...player.hand, id] },
    },
  };
}

describe("finisher response draw", () => {
  it("replaces a card played into a finisher when the hand is already at the up-to cap", () => {
    const opened = handAboveCap(skirmish());
    const before = opened.players[P2]?.hand.length ?? 0;
    expect(before).toBeGreaterThan(5);
    const magnus = fighterOf(opened, MAGNUS_ID, P1);
    const started = resolveOpenChain(
      expectOk(advance(showFace(opened, magnus, GRAB), { type: "USE_FACE", playerId: P1, creatureId: magnus })),
    );
    const declared = expectOk(
      advance(showFace(started, magnus, HEAVY), { type: "USE_FACE", playerId: P1, creatureId: magnus }),
    );
    const passed = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const braceId = passed.players[P2]?.hand.at(-1);
    if (braceId === undefined) throw new Error("brace");
    const played = expectOk(
      advance(passed, { type: "PLAY_CARD", playerId: P2, cardInstanceId: braceId }),
    );
    const resolved = resolveOpenChain(played);
    expect(resolved.activePlayerId).toBe(P2);
    expect(resolved.phase).toBe("roll");
    expect(resolved.players[P2]?.hand.length).toBe(before);
  });
});
