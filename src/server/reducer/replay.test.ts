import { describe, expect, it } from "vitest";
import { COG_DRAFT, QUICKSET_JIG } from "../content/cards.js";
import type { GameState } from "../model/state.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
} from "../testing/scenario.js";
import { advance } from "./reduce.js";

function jsonClone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

describe("replay", () => {
  it("round-trips state through JSON after Cog Draft", () => {
    const start = withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10);
    const played = expectOk(
      advance(start, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(start, P1, 0),
      }),
    );
    const cloned = jsonClone(played);
    expect(cloned.players[P1]?.attributePool.mechanical).toBe(played.players[P1]?.attributePool.mechanical);
  });

  it("replays equipment attach after chain resolves", () => {
    const start = withPile(withHand(withPhase(newMatch(), "actions"), P1, [QUICKSET_JIG]), P1, 10);
    const creature = Object.values(start.creatures).find((c) => c.ownerId === P1)?.id;
    if (creature === undefined) throw new Error("creature");
    const opened = expectOk(
      advance(start, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(start, P1, 0),
        declaredTargetCreatureId: creature,
      }),
    );
    const resolved = resolveOpenChain(opened);
    const cloned = jsonClone(resolved);
    expect(cloned.cards[handCardIdAt(start, P1, 0)]?.zone).toBe("equipment");
  });
});
