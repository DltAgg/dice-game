import { describe, expect, it } from "vitest";
import {
  DISPEL_CIRCLE,
  ECLIPSE,
  FADE,
  LIVING_LIBRARY,
  SEAL_THE_RITE,
  SIPHON_SIGIL,
} from "../content/cards.js";
import type { CardId } from "../model/ids.js";
import { asCardInstanceId } from "../model/ids.js";
import { graveyardOf, ritualsOf } from "../rules/cards.js";
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
  withEnergy,
  withHand,
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
        ritualProgress: orientation === "ready" ? { arcane: 2 } : {},
        ritualProgressCreditedThisTurn: [],
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

describe("Siphon Sigil (discard-attribute-tokens)", () => {
  it("strips tokens in ATTRIBUTES order after choose-enemy", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    const ready = withTokens(actionsReady([SIPHON_SIGIL]), targetId, {
      darkness: 1,
      martial: 1,
      wild: 1,
    });
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const afterChain = resolveOpenChain(opened);
    expect(afterChain.pendingDecision?.type).toBe("choose-creature");

    const after = expectOk(
      advance(afterChain, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    // martial then wild taken; darkness remains.
    expect(after.creatures[targetId]?.attributeTokens).toEqual({ darkness: 1 });
    expect(eventTypes(after)).toContain("attribute-tokens-discarded");
  });

  it("whiffs legally when the enemy has no tokens", () => {
    const ready = actionsReady([SIPHON_SIGIL]);
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
    expect(after.creatures[targetId]?.attributeTokens).toEqual({});
    expect(eventTypes(after)).not.toContain("attribute-tokens-discarded");
    expect(graveyardOf(after, P1).some((c) => c.cardId === SIPHON_SIGIL)).toBe(true);
  });

  it("discards all remaining when fewer than amount", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    const ready = withTokens(actionsReady([SIPHON_SIGIL]), targetId, { arcane: 1 });
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
    expect(after.creatures[targetId]?.attributeTokens).toEqual({});
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
          ritualProgress: {},
          ritualProgressCreditedThisTurn: [],
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
    const state = withHand(
      withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY]), P1, 10),
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

describe("Fade (negate-tactic)", () => {
  it("negates the top tactic link from hand", () => {
    const state = withHand(
      withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10),
      P2,
      [FADE],
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
