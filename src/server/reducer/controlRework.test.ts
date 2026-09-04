import { describe, expect, it } from "vitest";
import { DAYBREAK_RITE, COG_DRAFT, GLINT_VEIL, MIRRORWARD, RADIANT_ACCORD } from "../content/cards.js";
import { TEMPO_SQUAD } from "../content/creatures.js";
import { TEMPO_FACE_DECK, TEMPO_STARTING_DICE } from "../content/loadouts/index.js";
import { HALO_LAMP, LUCENT_CHOIR } from "../content/faces.js";
import type { GameState } from "../model/state.js";
import { ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withDamage,
  withPile,
  withHand,
  withPhase,
} from "../testing/scenario.js";
import { DRIVE_SHAFT, DRIVE_SHAFT_FUEL } from "../testing/tempoCatalogue.js";

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function tempoMatch(): GameState {
  return newMatch({
    players: [
      { id: P1, squad: TEMPO_SQUAD, deck: [], faceDeck: TEMPO_FACE_DECK, startingDice: TEMPO_STARTING_DICE },
      { id: P2, squad: TEMPO_SQUAD, deck: [], faceDeck: TEMPO_FACE_DECK, startingDice: TEMPO_STARTING_DICE },
    ],
  });
}

describe("Tempo luminar control surface", () => {
  it("Daybreak Rite activates when the pile meets its gate", () => {
    const ready = actionsReady([DAYBREAK_RITE]);
    const placed = resolveOpenChain(
      expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
        }),
      ),
    );
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    const allyId = creatureIdAt(placed, P1, 0);
    const armed = {
      ...placed,
      cards: {
        ...placed.cards,
        [ritualId]: { ...placed.cards[ritualId]!, ritualOrientation: "ready" as const },
      },
      players: {
        ...placed.players,
        [P1]: { ...placed.players[P1]!, attributePool: { luminar: 3 } },
      },
    };
    const wounded = withDamage(armed, allyId, 4);
    let activated = resolveOpenChain(
      expectOk(
        advance(wounded, {
          type: "ACTIVATE_RITUAL",
          playerId: P1,
          cardInstanceId: ritualId,
        }),
      ),
    );
    while (activated.pendingDecision?.type === "choose-creature") {
      activated = expectOk(
        advance(activated, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: allyId,
        }),
      );
    }
    activated = resolveOpenChain(activated);
    expect(ritualsOf(activated, P1).some((card) => card.id === ritualId)).toBe(true);
    expect(activated.cards[ritualId]?.ritualOrientation).toBe("exhausted");
    expect(activated.creatures[allyId]?.damage).toBe(0);
  });

  it("Radiant Accord stays on field as a continuous ritual", () => {
    const ready = actionsReady([RADIANT_ACCORD]);
    const placed = resolveOpenChain(
      expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
        }),
      ),
    );
    expect(ritualsOf(placed, P1)).toHaveLength(1);
    expect(ritualsOf(placed, P1)[0]?.ritualOrientation).toBe("ready");
  });

  it("Mirrorward prevents and reflects on an attack chain", () => {
    const base = withPhase(tempoMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 2);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(
      withPile(withPile(base, P1, 10), P2, 10),
      P2,
      [MIRRORWARD],
    );
    const opened = expectOk(
      advance(
        { ...combat, players: { ...combat.players, [P1]: { ...combat.players[P1]!, attributePool: { ...DRIVE_SHAFT_FUEL } } } },
        {
          type: "ATTACK",
          playerId: P1,
          attackerId: attacker,
          attackId: DRIVE_SHAFT,
          targetId: target,
        },
      ),
    );
    const judged = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(judged);
    expect(resolved.creatures[target]?.damage).toBe(0);
  });

  it("Glint Veil is a legal reaction on attacks only", () => {
    const ready = withHand(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10),
      P2,
      [GLINT_VEIL],
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const denied = advance(opened, {
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: handCardIdAt(opened, P2, 0),
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("INVALID_CHAIN_TARGET");
  });

  it("Tempo face deck includes Luminar specials", () => {
    expect(TEMPO_FACE_DECK).toEqual(expect.arrayContaining([HALO_LAMP, LUCENT_CHOIR]));
  });
});
