import { describe, expect, it } from "vitest";
import {
  DISPEL_CIRCLE,
  ECLIPSE,
  FADE,
  LIVING_LIBRARY,
  LUMINAR_PRISM,
  MARTIAL_BLESSING,
  MIND_CONTROL,
  SEAL_THE_RITE,
  SIPHON_SIGIL,
} from "../content/cards.js";
import { CRUSH, HEXBRAND } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { CardId, DieId, FaceCardId } from "../model/ids.js";
import { asCardInstanceId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf, overloadsOnFace, ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withActivePlayer,
  withEnergy,
  withHand,
  withAttributePool,
  withPhase,
  withTokens,
} from "../testing/scenario.js";

const actionsReady = (cards: readonly CardId[], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

/** Places a ritual on P2's field without opening a live chain window. */
function withOpponentRitual(
  state: ReturnType<typeof newMatch>,
  cardId: CardId,
  orientation: "preparing" | "ready" | "exhausted" = "preparing",
) {
  const id = asCardInstanceId(`given-${P2}-ritual-${cardId}`);
  const player = state.players[P2];
  if (player === undefined) throw new Error("test: no p2");
  return {
    ...state,
    cards: {
      ...state.cards,
      [id]: {
        id,
        cardId,
        ownerId: P2,
        zone: "ritual" as const,
        attachedToCreatureId: null,
        attachedToFaceCardId: null,
        ritualOrientation: orientation,
      },
    },
    players: {
      ...state.players,
      [P2]: {
        ...player,
        ritual: [...player.ritual, id],
      },
    },
  };
}

describe("Siphon Sigil (drain-attribute-tokens)", () => {
  it("prompts which tokens to drain when the enemy has a mix", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    const ready = withAttributePool(
      withTokens(withHand(withPhase(newMatch(), "actions"), P1, [SIPHON_SIGIL]), targetId, {
        darkness: 1,
        martial: 1,
        wild: 1,
      }),
      P1,
      { arcane: 3 },
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const afterChain = resolveOpenChain(opened);
    expect(afterChain.pendingDecision?.type).toBe("choose-creature");

    const afterCreature = expectOk(
      advance(afterChain, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(afterCreature.pendingDecision).toMatchObject({
      type: "choose-attribute-tokens",
      controllerId: P1,
      creatureId: targetId,
      amount: 2,
    });

    const refused = advance(afterCreature, {
      type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS",
      playerId: P1,
      discarded: { martial: 1, wild: 1, darkness: 1 },
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error).toBe("INVALID_CHOICE");
      expect(refused.state).toBe(afterCreature);
    }

    const after = expectOk(
      advance(afterCreature, {
        type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS",
        playerId: P1,
        discarded: { darkness: 1, wild: 1 },
      }),
    );
    expect(after.players[P2]?.attributePool).toEqual({ martial: 1 });
    expect(after.players[P1]?.attributePool).toEqual({ darkness: 1, wild: 1 });
    expect(eventTypes(after)).toContain("attribute-tokens-drained");
  });

  it("whiffs legally when the enemy has no tokens", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [SIPHON_SIGIL]),
      P1,
      { arcane: 3 },
    );
    const targetId = creatureIdAt(ready, P2, 0);
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const afterChain = resolveOpenChain(opened);
    const after = expectOk(
      advance(afterChain, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.players[P1]?.attributePool).toEqual({});
    expect(eventTypes(after)).not.toContain("attribute-tokens-drained");
    expect(graveyardOf(after, P1).some((c) => c.cardId === SIPHON_SIGIL)).toBe(true);
  });

  it("drains all remaining when fewer than amount", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    const ready = withAttributePool(
      withTokens(withHand(withPhase(newMatch(), "actions"), P1, [SIPHON_SIGIL]), targetId, {
        arcane: 1,
      }),
      P1,
      { arcane: 3 },
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const after = expectOk(
      advance(resolveOpenChain(opened), {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.players[P2]?.attributePool).toEqual({});
    expect(after.players[P1]?.attributePool).toEqual({ arcane: 1 });
  });

  it("drains a homogeneous pile without a token prompt", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    const ready = withAttributePool(
      withTokens(withHand(withPhase(newMatch(), "actions"), P1, [SIPHON_SIGIL]), targetId, {
        martial: 3,
      }),
      P1,
      { arcane: 3 },
    );
    const after = expectOk(
      advance(resolveOpenChain(expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
        }),
      )), {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.pendingDecision).toBeNull();
    expect(after.players[P2]?.attributePool).toEqual({ martial: 1 });
    expect(after.players[P1]?.attributePool).toEqual({ martial: 2 });
  });
});

describe("Dispel Circle (destroy-ritual)", () => {
  it("prompts choose-ritual and sends the opposing ritual to GY", () => {
    const base = withOpponentRitual(actionsReady([DISPEL_CIRCLE]), LIVING_LIBRARY, "ready");
    const ritualId = ritualsOf(base, P2)[0]?.id;
    expect(ritualId).toBeDefined();

    const opened = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
      }),
    );
    const afterChain = resolveOpenChain(opened);
    expect(afterChain.pendingDecision?.type).toBe("choose-ritual");

    const after = expectOk(
      advance(afterChain, {
        type: "RESOLVE_CHOOSE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId!,
      }),
    );
    expect(ritualsOf(after, P2)).toHaveLength(0);
    expect(graveyardOf(after, P2).some((c) => c.id === ritualId)).toBe(true);
    expect(eventTypes(after)).toContain("ritual-destroyed");
  });

  it("whiffs when the opponent has no field ritual", () => {
    const ready = actionsReady([DISPEL_CIRCLE]);
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const after = resolveOpenChain(opened);
    expect(after.pendingDecision).toBeNull();
    expect(eventTypes(after)).not.toContain("ritual-destroyed");
    expect(graveyardOf(after, P1).some((c) => c.cardId === DISPEL_CIRCLE)).toBe(true);
  });

  it("refuses choosing own ritual", () => {
    const withOwn = withOpponentRitual(actionsReady([DISPEL_CIRCLE]), LIVING_LIBRARY);
    // Also put a ritual on P1.
    const ownId = asCardInstanceId(`given-${P1}-ritual-${LIVING_LIBRARY}`);
    const player = withOwn.players[P1]!;
    const both = {
      ...withOwn,
      cards: {
        ...withOwn.cards,
        [ownId]: {
          id: ownId,
          cardId: LIVING_LIBRARY,
          ownerId: P1,
          zone: "ritual" as const,
          attachedToCreatureId: null,
          attachedToFaceCardId: null,
          ritualOrientation: "preparing" as const,
        },
      },
      players: {
        ...withOwn.players,
        [P1]: { ...player, ritual: [...player.ritual, ownId] },
      },
    };
    const opposingId = ritualsOf(both, P2)[0]!.id;
    const opened = expectOk(
      advance(both, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(both, P1, 0),
      }),
    );
    const afterChain = resolveOpenChain(opened);
    const refused = advance(afterChain, {
      type: "RESOLVE_CHOOSE_RITUAL",
      playerId: P1,
      cardInstanceId: ownId,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_CHOICE");

    const ok = expectOk(
      advance(afterChain, {
        type: "RESOLVE_CHOOSE_RITUAL",
        playerId: P1,
        cardInstanceId: opposingId,
      }),
    );
    expect(ritualsOf(ok, P2)).toHaveLength(0);
  });
});

describe("Seal the Rite (negate-ritual)", () => {
  it("negates an opposing ritual place", () => {
    const state = withEnergy(
      withHand(
        withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY]), P1, 10),
        P2,
        [SEAL_THE_RITE],
      ),
      P2,
      10,
    );
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(opened.chainStack[0]?.kind).toBe("ritual-place");

    const sealed = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    expect(sealed.chainStack).toHaveLength(2);

    const resolved = resolveOpenChain(sealed);
    expect(ritualsOf(resolved, P1)).toHaveLength(0);
    expect(graveyardOf(resolved, P1).some((c) => c.cardId === LIVING_LIBRARY)).toBe(true);
    expect(eventTypes(resolved)).toContain("chain-link-negated");
  });

  it("refuses when the top link is a tactic effect", () => {
    const state = withHand(
      withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10),
      P2,
      [SEAL_THE_RITE],
    );
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const refused = advance(opened, {
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: handCardIdAt(opened, P2, 0),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_CHAIN_TARGET");
  });
});

describe("Fade (negate-card any)", () => {
  it("negates the top card link from hand", () => {
    const state = withEnergy(
      withHand(
        withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10),
        P2,
        [FADE],
      ),
      P2,
      10,
    );
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const faded = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    expect(faded.chainStack).toHaveLength(2);
    const resolved = resolveOpenChain(faded);
    expect(eventTypes(resolved)).toContain("chain-link-negated");
  });
});

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((s, index) =>
    index === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollShowingSlot(state: GameState, slot: number): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: slot });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 4 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("Hexbrand (drain-attribute-tokens)", () => {
  it("prompts which token to drain on roll when the enemy has a mix", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    const seeded = withTokens(installFace(newMatch(), HEXBRAND), targetId, {
      martial: 1,
      wild: 1,
    });
    const afterRoll = rollShowingSlot(seeded, 0);
    expect(afterRoll.pendingDecision?.type).toBe("choose-creature");

    const afterCreature = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(afterCreature.pendingDecision).toMatchObject({
      type: "choose-attribute-tokens",
      amount: 1,
      creatureId: targetId,
    });

    const after = expectOk(
      advance(afterCreature, {
        type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS",
        playerId: P1,
        discarded: { wild: 1 },
      }),
    );
    expect(after.players[P2]?.attributePool).toEqual({ martial: 1 });
    expect(after.players[P1]?.attributePool).toEqual({ corruption: 1, wild: 1 });
  });
});

describe("Mind Control (choose among attached overloads)", () => {
  it("requires naming which overload to strip when a face has two", () => {
    let state = installFace(newMatch(), CRUSH);
    state = withEnergy(
      withHand(withPhase(state, "actions"), P1, [LUMINAR_PRISM, MARTIAL_BLESSING]),
      P1,
      10,
    );
    state = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(state, P1, 0),
          declaredFaceCardId: CRUSH,
        }),
      ),
    );
    state = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(state, P1, 0),
          declaredFaceCardId: CRUSH,
        }),
      ),
    );
    const attached = overloadsOnFace(state, P1, CRUSH).map((card) => card.id);
    expect(attached).toHaveLength(2);
    const keepId = attached[0]!;
    const stripId = attached[1]!;

    const p2Turn = withEnergy(
      withHand(withPhase(withActivePlayer(state, P2), "actions"), P2, [MIND_CONTROL]),
      P2,
      10,
    );
    const pending = resolveOpenChain(
      expectOk(
        advance(p2Turn, {
          type: "PLAY_CARD",
          playerId: P2,
          cardInstanceId: handCardIdAt(p2Turn, P2, 0),
        }),
      ),
    );
    expect(pending.pendingDecision?.type).toBe("mind-control");

    const silent = advance(pending, {
      type: "RESOLVE_MIND_CONTROL",
      playerId: P2,
      mode: "strip-one-each",
      faceCardIds: [CRUSH],
    });
    expect(silent.ok).toBe(false);
    if (!silent.ok) {
      expect(silent.error).toBe("INVALID_CHOICE");
      expect(silent.state).toBe(pending);
    }

    const after = expectOk(
      advance(pending, {
        type: "RESOLVE_MIND_CONTROL",
        playerId: P2,
        mode: "strip-one-each",
        faceCardIds: [CRUSH],
        overloadInstanceIds: [stripId],
      }),
    );
    expect(overloadsOnFace(after, P1, CRUSH).map((card) => card.id)).toEqual([keepId]);
    expect(graveyardOf(after, P1).some((card) => card.id === stripId)).toBe(true);
  });
});
