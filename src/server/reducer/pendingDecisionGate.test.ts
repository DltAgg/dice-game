import { describe, expect, it } from "vitest";
import { advance } from "./reduce.js";
import {
  TEST_PLAYABLE,
  TEST_REACTION_PREVENT,
  testCard,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
  withTokens,
} from "../testing/scenario.js";
import { CRANK, CRANK_FUEL } from "../testing/tempoCatalogue.js";

const CHOOSE_ALLY_SHIELD = testCard({
  id: "card-test-choose-ally-shield",
  playCost: { luminar: 2 },
  attribute: "luminar",
  effect: {
    effects: [
      { type: "grant-shield", amount: 2, target: { kind: "choose-ally" } },
      { type: "next-attack-bonus", amount: 1 },
    ],
  },
});

const playCard = (state: ReturnType<typeof newMatch>) =>
  resolveOpenChain(
    expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    ),
  );

describe("pending decision gates", () => {
  it("choose-ally shield opens choose-creature before resolving shields", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [CHOOSE_ALLY_SHIELD.id]),
      P1,
      10,
    );
    const played = playCard(ready);
    expect(played.pendingDecision?.type).toBe("choose-creature");
  });

  it("blocks Pass while choose-creature is pending", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [CHOOSE_ALLY_SHIELD.id]),
      P1,
      10,
    );
    const played = playCard(ready);
    const pass = advance(played, { type: "PASS_PRIORITY", playerId: P1 });
    expect(pass.ok).toBe(false);
  });

  it("a prevent reaction does not open a discard gate on attacks", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 0);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(withPile(withTokens(base, attacker, CRANK_FUEL), P2, 10), P2, [
      TEST_REACTION_PREVENT,
    ]);
    const opened = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: CRANK,
        targetId: target,
      }),
    );
    expect(opened.pendingDecision?.type).toBe("reaction-priority");
  });

  it("a generate-and-draw instant resolves without a pending gate when affordable", () => {
    const ready = withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10);
    const after = playCard(ready);
    expect(after.pendingDecision).toBeNull();
  });
});
