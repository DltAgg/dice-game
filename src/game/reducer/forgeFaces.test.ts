import { describe, expect, it } from "vitest";
import { GREAT_CONTAMINATION, RITUAL_OF_CONTAMINATION, ECLIPSE } from "../content/cards.js";
import { getFaceCard, syntheticFaceId } from "../content/faces.js";
import { ritualsOf } from "../rules/cards.js";
import { symbolCountsOn } from "../rules/dice.js";
import type { AttributeTokens } from "../model/symbols.js";
import type { CardId } from "../model/ids.js";
import {
  eventTypes,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function placedReadyRitual(cardId: CardId, progress: AttributeTokens) {
  const base = actionsReady([cardId]);
  const placed = advance(base, {
    type: "PLAY_CARD",
    playerId: P1,
    cardInstanceId: handCardIdAt(base, P1, 0),
  });
  if (!placed.ok) throw new Error("test: place failed");
  const ritualId = ritualsOf(placed.state, P1)[0]?.id;
  if (ritualId === undefined) throw new Error("test: no ritual");
  return {
    ritualId,
    state: {
      ...placed.state,
      cards: {
        ...placed.state.cards,
        [ritualId]: {
          ...placed.state.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: progress,
        },
      },
    },
  };
}

describe("forge-faces (Great Contamination)", () => {
  it("pauses for the controller to forge 3 Corruption faces on an opponent die", () => {
    const { state, ritualId } = placedReadyRitual(GREAT_CONTAMINATION, {
      arcane: 1,
      corruption: 2,
    });

    const activated = advance(state, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });

    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(eventTypes(activated.state)).toContain("forge-faces-started");
    expect(activated.state.pendingDecision).toEqual({
      type: "forge-faces",
      controllerId: P1,
      faces: 3,
      kind: "synthetic",
      attribute: "corruption",
      target: "opponent-die",
      sourceCardInstanceId: ritualId,
      sourceFaceCardId: null,
    });
  });

  it("installs the named face on the opponent die, owned by the controller, and draws", () => {
    const { state: placed, ritualId } = placedReadyRitual(GREAT_CONTAMINATION, {
      arcane: 1,
      corruption: 2,
    });
    const player = placed.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const withDeck = withHand(placed, P1, [ECLIPSE, ECLIPSE, ECLIPSE]);
    const deckPlayer = withDeck.players[P1];
    if (deckPlayer === undefined) throw new Error("test: no player");
    const deckIds = deckPlayer.hand;
    const seeded = {
      ...withDeck,
      cards: {
        ...withDeck.cards,
        ...Object.fromEntries(
          deckIds.map((id) => [id, { ...withDeck.cards[id]!, zone: "deck" as const }]),
        ),
        [ritualId]: withDeck.cards[ritualId]!,
      },
      players: {
        ...withDeck.players,
        [P1]: { ...deckPlayer, hand: [], deck: deckIds, ritual: player.ritual },
      },
    };

    const activated = advance(seeded, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const dieId = activated.state.players[P2]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no opponent die");
    const faceCardId = syntheticFaceId("corruption");

    const resolved = advance(activated.state, {
      type: "RESOLVE_FORGE_FACES",
      playerId: P1,
      dieId,
      slotIndexes: [0, 1, 2],
      faceCardId,
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.pendingDecision).toBeNull();
    const die = resolved.state.dice[dieId];
    expect(die?.slots[0]?.faceCardId).toBe(faceCardId);
    expect(die?.slots[1]?.faceCardId).toBe(faceCardId);
    expect(die?.slots[2]?.faceCardId).toBe(faceCardId);
    expect(die?.slots[0]?.faceCardOwnerId).toBe(P1);
    expect(symbolCountsOn(die!).corruption).toBe(3);
    expect(resolved.state.players[P1]?.facePool.includes(faceCardId)).toBe(false);
    expect(resolved.state.players[P1]?.hand).toHaveLength(3);
    expect(eventTypes(resolved.state)).toContain("face-forged");
    expect(eventTypes(resolved.state)).toContain("forge-faces-resolved");
  });

  it("refuses other actions while forge-faces is pending", () => {
    const { state, ritualId } = placedReadyRitual(GREAT_CONTAMINATION, {
      arcane: 1,
      corruption: 2,
    });
    const activated = advance(state, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const blocked = advance(activated.state, { type: "END_TURN", playerId: P1 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("PENDING_DECISION");
  });

  it("refuses the controller's own die", () => {
    const { state, ritualId } = placedReadyRitual(GREAT_CONTAMINATION, {
      arcane: 1,
      corruption: 2,
    });
    const activated = advance(state, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const ownDieId = activated.state.players[P1]?.dieIds[0];
    if (ownDieId === undefined) throw new Error("test: no die");
    const refused = advance(activated.state, {
      type: "RESOLVE_FORGE_FACES",
      playerId: P1,
      dieId: ownDieId,
      slotIndexes: [0, 1, 2],
      faceCardId: syntheticFaceId("corruption"),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_TARGET");
  });

  it("fizzles when the controller has no eligible Corruption face", () => {
    const { state, ritualId } = placedReadyRitual(GREAT_CONTAMINATION, {
      arcane: 1,
      corruption: 2,
    });
    const player = state.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const stripped = {
      ...state,
      players: {
        ...state.players,
        [P1]: {
          ...player,
          facePool: player.facePool.filter((id) => getFaceCard(id)?.symbol !== "corruption"),
        },
      },
    };

    const activated = advance(stripped, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(activated.state.pendingDecision).toBeNull();
    expect(eventTypes(activated.state)).not.toContain("forge-faces-started");
  });
});

describe("forge-faces (Ritual of Contamination)", () => {
  it("opens a one-face opponent forge when played with Arcane + Corruption", () => {
    const state = withSymbols(actionsReady([RITUAL_OF_CONTAMINATION]), P1, [
      "arcane",
      "corruption",
    ]);
    const played = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(played.state.pendingDecision).toEqual({
      type: "forge-faces",
      controllerId: P1,
      faces: 1,
      kind: "synthetic",
      attribute: "corruption",
      target: "opponent-die",
      sourceCardInstanceId: handCardIdAt(state, P1, 0),
      sourceFaceCardId: null,
    });

    const dieId = played.state.players[P2]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no opponent die");
    const resolved = advance(played.state, {
      type: "RESOLVE_FORGE_FACES",
      playerId: P1,
      dieId,
      slotIndexes: [4],
      faceCardId: syntheticFaceId("corruption"),
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.dice[dieId]?.slots[4]?.faceCardId).toBe(syntheticFaceId("corruption"));
    expect(resolved.state.dice[dieId]?.slots[4]?.faceCardOwnerId).toBe(P1);
  });
});
