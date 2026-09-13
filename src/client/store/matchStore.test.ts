import { describe, expect, it } from "vitest";
import { actingPlayerId, legalActions } from "@ai";
import { CONTROL_SAVED_DECK_ID, TEMPO_SAVED_DECK_ID } from "@client/decks";
import { MATCH_P1, MATCH_P2, useMatchStore } from "./matchStore.js";

/** Resolve the human's current turn (prefer END_TURN). Store fill then plays the AI seat. */
function finishCurrentHumanTurn(humanSeat: typeof MATCH_P1, cap = 80): void {
  for (let i = 0; i < cap; i += 1) {
    const { state } = useMatchStore.getState();
    if (state.status !== "in-progress") return;
    if (actingPlayerId(state) !== humanSeat) return;
    const legal = legalActions(state, humanSeat);
    const end = legal.find((action) => action.type === "END_TURN");
    if (end !== undefined) {
      useMatchStore.getState().dispatch(end);
      return;
    }
    const chosen = legal[0];
    if (chosen === undefined) return;
    const ok = useMatchStore.getState().dispatch(chosen);
    if (!ok) return;
  }
}

describe("matchStore vs-AI", () => {
  it("startVsAi binds the human seat and leaves the other to the AI", () => {
    useMatchStore.getState().startVsAi({
      humanSeat: MATCH_P1,
      humanDeckId: TEMPO_SAVED_DECK_ID,
      aiDeckId: CONTROL_SAVED_DECK_ID,
      strength: "fast",
      seed: 7,
    });
    const store = useMatchStore.getState();
    expect(store.mode).toBe("local");
    expect(store.localPlayerId).toBe(MATCH_P1);
    expect(store.aiPlayerId).toBe(MATCH_P2);
    expect(store.aiStrength).toBe("fast");
    expect(store.aiRng).not.toBeNull();
    expect(store.view).toBe("match");
    expect(actingPlayerId(store.state)).toBe(MATCH_P1);
  });

  it("startLocal still uses hotseat (no bound seat)", () => {
    useMatchStore.getState().startLocal(TEMPO_SAVED_DECK_ID, CONTROL_SAVED_DECK_ID);
    const store = useMatchStore.getState();
    expect(store.localPlayerId).toBeNull();
    expect(store.aiPlayerId).toBeNull();
    expect(store.aiRng).toBeNull();
  });

  it("human dispatch then AI advances while it is the AI seat", { timeout: 20_000 }, () => {
    useMatchStore.getState().startVsAi({
      humanSeat: MATCH_P1,
      humanDeckId: TEMPO_SAVED_DECK_ID,
      aiDeckId: CONTROL_SAVED_DECK_ID,
      strength: "fast",
      seed: 11,
    });
    const rolled = useMatchStore.getState().dispatch({
      type: "ROLL_DICE",
      playerId: MATCH_P1,
    });
    expect(rolled).toBe(true);
    expect(actingPlayerId(useMatchStore.getState().state)).toBe(MATCH_P1);

    finishCurrentHumanTurn(MATCH_P1);
    const after = useMatchStore.getState();
    expect(after.state.status).toBe("in-progress");
    expect(actingPlayerId(after.state)).toBe(MATCH_P1);
    expect(after.state.turn).toBeGreaterThan(1);
  });

  it("fills the AI opener when the human sits P2", { timeout: 20_000 }, () => {
    useMatchStore.getState().startVsAi({
      humanSeat: MATCH_P2,
      humanDeckId: CONTROL_SAVED_DECK_ID,
      aiDeckId: TEMPO_SAVED_DECK_ID,
      strength: "fast",
      seed: 3,
    });
    const store = useMatchStore.getState();
    expect(store.localPlayerId).toBe(MATCH_P2);
    expect(store.aiPlayerId).toBe(MATCH_P1);
    expect(actingPlayerId(store.state)).toBe(MATCH_P2);
  });
});
