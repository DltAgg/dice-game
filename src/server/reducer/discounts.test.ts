import { describe, expect, it } from "vitest";
import { COLLAPSE_OF_REALITY, TOME_OF_INTERDICTION, WAR_AXE } from "../content/cards.js";
import { CONTROL_SQUAD } from "../content/creatures.js";
import { ENGINE_TEST_FACE_DECK } from "../content/faces.js";
import {
  creatureIdAt,
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

function controlMatch() {
  return newMatch({
    players: [
      { id: P1, squad: CONTROL_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      { id: P2, squad: CONTROL_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
    ],
  });
}

const actionsReady = (cards: Parameters<typeof withHand>[2], fuel = 10) =>
  withEnergy(withHand(withPhase(controlMatch(), "actions"), P1, cards), P1, fuel);

describe("play-cost-discount", () => {
  it("discounts the first Arcane tactic Archmage's controller plays, not the second", () => {
    const state = actionsReady([COLLAPSE_OF_REALITY, COLLAPSE_OF_REALITY]);
    const firstId = handCardIdAt(state, P1, 0);
    const secondId = handCardIdAt(state, P1, 1);

    const first = expectOk(advance(state, { type: "PLAY_CARD", playerId: P1, cardInstanceId: firstId }));
    expect(first.players[P1]?.attributePool.arcane).toBe(7);
    const afterConvert =
      first.pendingDecision?.type === "convert-symbols"
        ? expectOk(
            advance(first, {
              type: "RESOLVE_CONVERT_SYMBOLS",
              playerId: P1,
              replacements: [],
            }),
          )
        : first;

    const second = expectOk(
      advance(withPhase(afterConvert, "actions"), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: secondId,
      }),
    );
    expect(second.players[P1]?.attributePool.arcane).toBe(3);
  });

  it("does not discount FORGE_CARD", () => {
    const state = actionsReady([COLLAPSE_OF_REALITY]);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");

    const forged = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [5])),
    );
    expect(forged.players[P1]?.attributePool.arcane).toBe(6);
  });

  it("lets Tome discount Instant Arcane after Archmage spent on the Tome", () => {
    const state = actionsReady([TOME_OF_INTERDICTION, COLLAPSE_OF_REALITY]);
    const archmageId = creatureIdAt(state, P1, 0);
    const equipped = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: archmageId,
      }),
    );
    expect(equipped.players[P1]?.attributePool.arcane).toBe(8);

    const collapseId = handCardIdAt(equipped, P1, 0);
    const played = expectOk(
      advance(withPhase(equipped, "actions"), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: collapseId,
      }),
    );
    expect(played.players[P1]?.attributePool.arcane).toBe(5);
  });

  it("does not let Tome discount a non-instant Arcane card", () => {
    const state = actionsReady([TOME_OF_INTERDICTION, WAR_AXE]);
    const archmageId = creatureIdAt(state, P1, 0);
    const equipped = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: archmageId,
      }),
    );

    const martial = expectOk(
      advance(withPhase(equipped, "actions"), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(equipped, P1, 0),
        declaredTargetCreatureId: archmageId,
      }),
    );
    expect(martial.players[P1]?.attributePool.martial).toBe(8);
    expect(martial.players[P1]?.attributePool.arcane).toBe(8);
  });
});
