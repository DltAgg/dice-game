import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import type { CardDefinition } from "../model/cards.js";
import type { EffectDefinition } from "../model/effects.js";
import { asCardId, asEffectInstanceId } from "../model/ids.js";
import type { ChainLink, GameState } from "../model/state.js";
import { advance } from "../reducer/reduce.js";
import { TEST_PLAYABLE, TEST_REACTION_PREVENT } from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withAttributePool,
  withPile,
  withHand,
  withPhase,
  withTokens,
} from "../testing/scenario.js";
import { DRIVE_SHAFT, DRIVE_SHAFT_FUEL } from "../testing/tempoCatalogue.js";
import {
  hasLegalReactionOffer,
  isEnabledHandReaction,
  isLegalHandReaction,
  negateEffectsLegalAgainstTop,
  preventEffectsLegalAgainstChain,
  topChainLinkOf,
} from "./reactions.js";

function exampleReaction(effects: readonly EffectDefinition[]): CardDefinition {
  return {
    id: asCardId("card-example-reaction"),
    name: "Example Reaction",
    playCost: { luminar: 1 },
    type: "reaction",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "synthetic", attribute: "luminar", target: "own-die" },
    rulesText: "Negate.",
    effect: { effects },
  };
}

function link(kind: ChainLink["kind"], negated = false): ChainLink {
  return {
    id: asEffectInstanceId("chain-1"),
    kind,
    controllerId: P1,
    cardInstanceId: null,
    effects: [],
    sourceCreatureId: null,
    declaredTargetCreatureId: null,
    equipTargetCreatureId: null,
    overloadFaceCardId: null,
    attackerId: null,
    attackId: null,
    attackTargetId: null,
    attackEffect: null,
    attackFollowUpEffects: [],
    ritualDuration: null,
    negated,
  };
}

function stateWithTop(top: ChainLink | undefined): GameState {
  return {
    chainStack: top === undefined ? [] : [top],
  } as unknown as GameState;
}

describe("reaction chain-target gates (UI queries)", () => {
  it("reads the top link", () => {
    const top = link("ritual-place");
    expect(topChainLinkOf(stateWithTop(top))).toBe(top);
    expect(topChainLinkOf(stateWithTop(undefined))).toBeUndefined();
  });

  it("allows negate-ritual only vs ritual-place / ritual-activate", () => {
    const effects: readonly EffectDefinition[] = [{ type: "negate-ritual" }];

    expect(negateEffectsLegalAgainstTop(stateWithTop(link("ritual-place")), effects)).toBe(true);
    expect(negateEffectsLegalAgainstTop(stateWithTop(link("ritual-activate")), effects)).toBe(
      true,
    );
    expect(negateEffectsLegalAgainstTop(stateWithTop(link("tactic-effect")), effects)).toBe(false);
    expect(negateEffectsLegalAgainstTop(stateWithTop(link("attack")), effects)).toBe(false);
    expect(
      negateEffectsLegalAgainstTop(stateWithTop(link("ritual-place", true)), effects),
    ).toBe(false);
  });

  it("allows negate-card any against non-attack tops", () => {
    const silence = exampleReaction([{ type: "negate-card", cardTypes: "any" }]);
    expect(isLegalHandReaction(stateWithTop(link("tactic-effect")), silence)).toBe(true);
    expect(isLegalHandReaction(stateWithTop(link("ritual-place")), silence)).toBe(true);
    expect(isLegalHandReaction(stateWithTop(link("attack")), silence)).toBe(false);
  });

  it("refuses negate-ritual when top is not a ritual link", () => {
    const seal = exampleReaction([{ type: "negate-ritual" }]);
    expect(isLegalHandReaction(stateWithTop(link("tactic-effect")), seal)).toBe(false);
    expect(isLegalHandReaction(stateWithTop(link("ritual-activate")), seal)).toBe(true);
  });
});

function openedAttackOnP2(
  hand: Parameters<typeof withHand>[2],
  p2Pool?: Parameters<typeof withAttributePool>[2],
): GameState {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 2);
  const target = creatureIdAt(base, P2, 0);
  const fueled = withTokens(base, attacker, DRIVE_SHAFT_FUEL);
  const withP2 =
    p2Pool === undefined ? withPile(fueled, P2, 10) : withAttributePool(fueled, P2, p2Pool);
  const combat = withHand(withP2, P2, hand);
  return expectOk(
    advance(combat, {
      type: "ATTACK",
      playerId: P1,
      attackerId: attacker,
      attackId: DRIVE_SHAFT,
      targetId: target,
    }),
  );
}

describe("hasLegalReactionOffer (query)", () => {
  it("is false when the priority seat has no reaction in hand or ready ritual-reaction", () => {
    const opened = openedAttackOnP2([]);
    expect(opened.pendingDecision?.type).toBe("reaction-priority");
    expect(hasLegalReactionOffer(opened, P2)).toBe(false);
  });

  it("waits when a prevent reaction is legal on an attack targeting you", () => {
    const opened = openedAttackOnP2([TEST_REACTION_PREVENT]);
    const prevent = getCard(TEST_REACTION_PREVENT);
    expect(prevent).toBeDefined();
    expect(isLegalHandReaction(opened, prevent!)).toBe(true);
    expect(isEnabledHandReaction(opened, P2, prevent!)).toBe(true);
    expect(hasLegalReactionOffer(opened, P2)).toBe(true);
  });

  it("does not wait when a prevent is chain-legal but the pile cannot pay playCost", () => {
    const opened = openedAttackOnP2([TEST_REACTION_PREVENT], { mechanical: 10 });
    const prevent = getCard(TEST_REACTION_PREVENT)!;
    expect(isLegalHandReaction(opened, prevent)).toBe(true);
    expect(isEnabledHandReaction(opened, P2, prevent)).toBe(false);
    expect(hasLegalReactionOffer(opened, P2)).toBe(false);
  });

  it("waits when a prevent reaction can answer an attack on you", () => {
    const opened = openedAttackOnP2([TEST_REACTION_PREVENT]);
    expect(hasLegalReactionOffer(opened, P2)).toBe(true);
  });

  it("does not treat a prevent reaction as an offer when the top link is not an attack", () => {
    const ready = withHand(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10),
      P2,
      [TEST_REACTION_PREVENT],
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const prevent = getCard(TEST_REACTION_PREVENT)!;
    expect(isLegalHandReaction(opened, prevent)).toBe(true);
    expect(isEnabledHandReaction(opened, P2, prevent)).toBe(false);
    expect(hasLegalReactionOffer(opened, P2)).toBe(false);
  });

  it("waits when an example negate reaction can target a tactic on the chain", () => {
    const ready = withHand(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10),
      P2,
      [TEST_PLAYABLE],
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(hasLegalReactionOffer(opened, P2)).toBe(false);
    const negate = exampleReaction([{ type: "negate-card", cardTypes: "any" }]);
    expect(isLegalHandReaction(opened, negate)).toBe(true);
  });

  it("treats prevent effects as illegal without an attack targeting the seat", () => {
    const effects: readonly EffectDefinition[] = [
      { type: "grant-attack-prevent", amount: 1, target: { kind: "chain-attack-target" } },
    ];
    expect(preventEffectsLegalAgainstChain(stateWithTop(link("tactic-effect")), P1, effects)).toBe(
      false,
    );
    expect(preventEffectsLegalAgainstChain(stateWithTop(undefined), P1, [])).toBe(true);
  });
});
