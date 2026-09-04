import { describe, expect, it } from "vitest";
import { COG_DRAFT, DIE_PUNCH, RECAST, SHIM_KIT } from "../content/cards.js";
import { COGTOOTH, MAINSPRING } from "../content/faces.js";
import {
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("Tempo generic utility", () => {
  it("Cog Draft generates and draws", () => {
    const after = expectOk(
      advance(actionsReady([COG_DRAFT]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([COG_DRAFT]), P1, 0),
      }),
    );
    expect(eventTypes(after)).toContain("symbol-generated");
  });

  it("Die Punch stamps after play", () => {
    const after = expectOk(
      advance(actionsReady([DIE_PUNCH]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([DIE_PUNCH]), P1, 0),
      }),
    );
    expect(eventTypes(after)).toContain("card-played");
  });

  it("Shim Kit opens a silence choice", () => {
    const ready = actionsReady([SHIM_KIT]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type).toBe("choose-silence-host");
  });

  it("Recast opens replace-synthetic-face", () => {
    let state = actionsReady([RECAST]);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    state = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: {
          ...state.dice[dieId]!,
          slots: state.dice[dieId]!.slots.map((slot, index) =>
            index === 0 ? { ...slot, faceCardId: MAINSPRING, faceCardOwnerId: P1 } : slot,
          ),
        },
      },
    };
    const played = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("replace-synthetic-face");
    expect(COGTOOTH).toBeDefined();
  });
});
