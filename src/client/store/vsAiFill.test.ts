import { describe, expect, it } from "vitest";
import { CONTROL_SAVED_DECK_ID, TEMPO_SAVED_DECK_ID } from "@client/decks";
import { MATCH_P1, MATCH_P2, newMatchState } from "./localMatchEngine.js";
import { fillAiSeat, policyRngStateFromMatchSeed, shouldFillAiSeat } from "./vsAiFill.js";

describe("vsAiFill", () => {
  it("fills only local vs-AI (bound human + AI seats)", () => {
    expect(
      shouldFillAiSeat({ mode: "local", aiPlayerId: MATCH_P2, localPlayerId: MATCH_P1 }),
    ).toBe(true);
    expect(
      shouldFillAiSeat({ mode: "local", aiPlayerId: null, localPlayerId: null }),
    ).toBe(false);
    expect(
      shouldFillAiSeat({ mode: "host", aiPlayerId: MATCH_P2, localPlayerId: MATCH_P1 }),
    ).toBe(false);
  });

  it("does not step while the human is the actor", () => {
    const state = newMatchState(1, TEMPO_SAVED_DECK_ID, CONTROL_SAVED_DECK_ID);
    const filled = fillAiSeat({
      state,
      aiPlayerId: MATCH_P2,
      rngState: policyRngStateFromMatchSeed(1),
      strength: "fast",
      step: () => {
        throw new Error("AI must not act on the human seat");
      },
    });
    expect(filled.steps).toBe(0);
    expect(filled.state).toBe(state);
  });
});
