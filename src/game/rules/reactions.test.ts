import { describe, expect, it } from "vitest";
import type { CardDefinition } from "../model/cards.js";
import type { EffectDefinition } from "../model/effects.js";
import { asCardId, asEffectInstanceId, asPlayerId } from "../model/ids.js";
import type { ChainLink, GameState } from "../model/state.js";
import {
  isLegalHandReaction,
  negateEffectsLegalAgainstTop,
  topChainLinkOf,
} from "./reactions.js";

const P1 = asPlayerId("p1");

function exampleReaction(effects: readonly EffectDefinition[]): CardDefinition {
  return {
    id: asCardId("card-example-reaction"),
    name: "Example Reaction",
    energyCost: 1,
    type: "reaction",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
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
