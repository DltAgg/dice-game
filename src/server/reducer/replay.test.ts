import { describe, expect, it } from "vitest";
import { COG_DRAFT, ECHO_OF_THE_BURIED, QUICKSET_JIG } from "../content/cards.js";
import type { GameState } from "../model/state.js";
import { graveyardOf, replayableGraveyardTactics } from "../rules/cards.js";
import {
  advanceResolvingChain,
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

  it("Echo with only itself in GY fizzles replay", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [ECHO_OF_THE_BURIED]),
      P1,
      10,
    );
    const echoId = handCardIdAt(ready, P1, 0);
    const played = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: echoId,
      }),
    );
    expect(played.pendingDecision).toBeNull();
    expect(graveyardOf(played, P1).some((card) => card.id === echoId)).toBe(true);
    expect(replayableGraveyardTactics(played, P1, echoId)).toEqual([]);
  });

  it("Echo cannot choose itself when another Instant is in GY", () => {
    const first = withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10);
    const afterDraft = expectOk(
      advanceResolvingChain(first, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(first, P1, 0),
      }),
    );
    const cogId = graveyardOf(afterDraft, P1)[0]?.id;
    if (cogId === undefined) throw new Error("cog");
    const ready = withPile(withHand(afterDraft, P1, [ECHO_OF_THE_BURIED]), P1, 10);
    const echoId = handCardIdAt(ready, P1, 0);
    const played = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: echoId,
      }),
    );
    expect(played.pendingDecision?.type).toBe("replay-graveyard-tactic");
    const source =
      played.pendingDecision?.type === "replay-graveyard-tactic"
        ? played.pendingDecision.sourceCardInstanceId
        : null;
    const eligible = replayableGraveyardTactics(played, P1, source);
    expect(eligible).toContain(cogId);
    expect(eligible).not.toContain(echoId);
    expect(source).toBe(echoId);

    const refused = advance(played, {
      type: "RESOLVE_REPLAY_GRAVEYARD",
      playerId: P1,
      cardInstanceId: echoId,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_CHOICE");
  });
});
