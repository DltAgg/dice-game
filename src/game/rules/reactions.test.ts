import { describe, expect, it } from "vitest";
import { ARCANE_SILENCE, SEAL_THE_RITE, getCard } from "../content/cards.js";
import type { ChainLink, GameState } from "../model/state.js";
import { asEffectInstanceId, asPlayerId } from "../model/ids.js";
import {
  isLegalHandReaction,
  negateEffectsLegalAgainstTop,
  topChainLinkOf,
} from "./reactions.js";

const P1 = asPlayerId("p1");

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
    const seal = getCard(SEAL_THE_RITE);
    expect(seal).toBeDefined();
    const effects = seal!.effect!.effects;

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
    const silence = getCard(ARCANE_SILENCE);
    expect(silence).toBeDefined();
    expect(isLegalHandReaction(stateWithTop(link("tactic-effect")), silence!)).toBe(true);
    expect(isLegalHandReaction(stateWithTop(link("ritual-place")), silence!)).toBe(true);
    expect(isLegalHandReaction(stateWithTop(link("attack")), silence!)).toBe(false);
  });

  it("refuses Seal the Rite when top is not a ritual link", () => {
    const seal = getCard(SEAL_THE_RITE);
    expect(seal).toBeDefined();
    expect(isLegalHandReaction(stateWithTop(link("tactic-effect")), seal!)).toBe(false);
    expect(isLegalHandReaction(stateWithTop(link("ritual-activate")), seal!)).toBe(true);
  });
});
