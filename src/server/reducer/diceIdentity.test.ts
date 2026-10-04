import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import { advance } from "../reducer/reduce.js";
import { secondaryDiceFor, matchingTechniques } from "../rules/faceActions.js";
import { testCard, testCreature, testFace } from "../testing/fixtures/builders.js";
import { TEST_FACE_DECK } from "../testing/fixtures/kit.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withHand,
  withPhase,
} from "../testing/scenario.js";

const JAB = testFace({
  id: "face-test-id-jab",
  name: "Jab",
  rulesText: "",
  faceType: "attack",
  primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
});
const LARIAT = testFace({
  id: "face-test-id-lariat",
  name: "Lariat",
  rulesText: "",
  faceType: "attack",
  primaryEffects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
});

const JAB_DIE = [JAB.id, JAB.id, JAB.id, JAB.id, JAB.id, JAB.id] as DieFaceLayout;
const LARIAT_DIE = [LARIAT.id, LARIAT.id, LARIAT.id, LARIAT.id, LARIAT.id, LARIAT.id] as DieFaceLayout;

const TECHNIQUE = {
  id: "technique-id-lariat",
  name: "Lariat Grab",
  primaryFaceId: LARIAT.id,
  secondary: { faceType: "attack" as const },
  effects: [{ type: "damage" as const, amount: 1, target: { kind: "declared-target" as const } }],
};

const MAGNUS = testCreature({
  id: "creature-test-id-magnus",
  name: "Magnus",
  baseDie: LARIAT_DIE,
  techniques: [TECHNIQUE],
});
const VEGA = testCreature({
  id: "creature-test-id-vega",
  name: "Vega",
  techniques: [TECHNIQUE],
});
const RYU = testCreature({
  id: "creature-test-id-ryu",
  name: "Ryu",
  assistEffects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }],
});

const OWN_DIE = testCard({
  id: "card-test-id-magnus-die",
  type: "modify",
  modifySubject: "die",
  fighterRestriction: MAGNUS.id,
  exceptionalMeterCost: 1,
  effect: { effects: [] },
});
const OWN_MOVE = testCard({
  id: "card-test-id-magnus-move",
  type: "modify",
  modifySubject: "moveset",
  fighterRestriction: MAGNUS.id,
  exceptionalMeterCost: 1,
  effect: { effects: [] },
});
const ANY_MOVE = testCard({
  id: "card-test-id-any-move",
  type: "modify",
  modifySubject: "moveset",
  exceptionalMeterCost: 1,
  effect: { effects: [] },
});

const CONFIG = {
  ...DEFAULT_RULES_CONFIG,
  dicePerPlayer: 3,
  facesPerDie: 6,
  deckMinCards: 0,
  deckOutEnabled: false,
  cardsDrawnPerTurn: 0,
  consumeDiceOnFaceActions: false,
  maxFacesOfSameAttributePerDie: 6,
  startingMaxOnRollFacesPerDie: 6,
};

function opened() {
  return newMatch({
    config: CONFIG,
    players: [
      {
        id: P1,
        squad: [MAGNUS.id, VEGA.id, RYU.id],
        deck: [],
        faceDeck: TEST_FACE_DECK,
        startingDice: [JAB_DIE, JAB_DIE, JAB_DIE],
      },
      {
        id: P2,
        squad: [MAGNUS.id, VEGA.id, RYU.id],
        deck: [],
        faceDeck: TEST_FACE_DECK,
        startingDice: [JAB_DIE, JAB_DIE, JAB_DIE],
      },
    ],
  });
}

function show(state: ReturnType<typeof opened>, playerId: typeof P1, index: number, slot: number) {
  const dieId = state.players[playerId]?.dieIds[index];
  if (dieId === undefined) throw new Error("die");
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return {
    ...state,
    phase: "actions" as const,
    dice: { ...state.dice, [dieId]: { ...die, rolledSlotIndex: slot } },
  };
}

describe("fighter dice", () => {
  it("starts each fighter from their base die and keeps that base when the current die changes", () => {
    const state = opened();
    const magnusId = state.players[P1]?.creatureIds[0];
    const vegaId = state.players[P1]?.creatureIds[1];
    if (magnusId === undefined || vegaId === undefined) throw new Error("squad");
    const magnusDie = state.players[P1]?.dieIds[0];
    const vegaDie = state.players[P1]?.dieIds[1];
    if (magnusDie === undefined || vegaDie === undefined) throw new Error("dice");
    expect(state.dice[magnusDie]?.boundCreatureId).toBe(magnusId);
    expect(state.dice[vegaDie]?.boundCreatureId).toBe(vegaId);
    expect(state.dice[magnusDie]?.slots.map((slot) => slot.faceCardId)).toEqual([...LARIAT_DIE]);
    expect(state.dice[magnusDie]?.baseSlots).toEqual([...LARIAT_DIE]);
    expect(state.dice[vegaDie]?.slots.map((slot) => slot.faceCardId)).toEqual([...JAB_DIE]);

    const funded = {
      ...state,
      players: {
        ...state.players,
        [P1]: { ...state.players[P1]!, meter: 3 },
      },
    };
    const ready = withHand(withPhase(funded, "actions"), P1, [OWN_DIE.id]);
    const wrong = advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
      mode: "exceptional",
      dieId: vegaDie,
      slotIndex: 0,
      declaredFaceCardId: LARIAT.id,
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe("INVALID_TARGET");

    const written = resolveOpenChain(
      expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
          mode: "exceptional",
          dieId: magnusDie,
          slotIndex: 0,
          declaredFaceCardId: JAB.id,
        }),
      ),
    );
    expect(written.dice[magnusDie]?.slots[0]?.faceCardId).toBe(JAB.id);
    expect(written.dice[magnusDie]?.baseSlots).toEqual([...LARIAT_DIE]);

    const again = opened();
    const fresh = again.players[P1]?.dieIds[0];
    expect(again.dice[fresh ?? ""]?.slots.map((slot) => slot.faceCardId)).toEqual([...LARIAT_DIE]);
  });

  it("lets a generic moveset card touch either fighter and keeps a specific one on its fighter", () => {
    const funded = opened();
    const withMeter = {
      ...funded,
      players: { ...funded.players, [P1]: { ...funded.players[P1]!, meter: 3 } },
    };
    const vega = withMeter.players[P1]?.creatureIds[1];
    const magnus = withMeter.players[P1]?.creatureIds[0];
    if (vega === undefined || magnus === undefined) throw new Error("squad");
    const specific = withHand(withPhase(withMeter, "actions"), P1, [OWN_MOVE.id]);
    const denied = advance(specific, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(specific, P1, 0),
      mode: "exceptional",
      declaredTargetCreatureId: vega,
      techniqueId: TECHNIQUE.id,
    });
    expect(denied.ok).toBe(false);

    const generic = withHand(withPhase(withMeter, "actions"), P1, [ANY_MOVE.id]);
    const applied = resolveOpenChain(
      expectOk(
        advance(generic, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(generic, P1, 0),
          mode: "exceptional",
          declaredTargetCreatureId: vega,
          techniqueId: TECHNIQUE.id,
        }),
      ),
    );
    expect(applied.creatures[vega]?.enabledTechniqueIds).toContain(TECHNIQUE.id);
    expect(applied.creatures[magnus]?.enabledTechniqueIds ?? []).not.toContain(TECHNIQUE.id);
    const attached = Object.values(applied.cards).find((card) => card.cardId === ANY_MOVE.id);
    expect(attached?.zone).toBe("equipment");
    expect(attached?.attachedToCreatureId).toBe(vega);
  });

  it("rolls every fighter die, including a KOed fighter, as separate results", () => {
    let state = opened();
    const ko = state.players[P1]?.creatureIds[2];
    if (ko === undefined) throw new Error("ryu");
    state = {
      ...state,
      creatures: {
        ...state.creatures,
        [ko]: { ...state.creatures[ko]!, defeated: true },
      },
    };
    const rolled = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    const dice = rolled.players[P1]?.dieIds ?? [];
    expect(dice).toHaveLength(3);
    for (const dieId of dice) {
      expect(rolled.dice[dieId]?.rolledSlotIndex).not.toBeNull();
    }
    expect(new Set(dice).size).toBe(3);

    const shown = show(show(rolled, P1, 0, 0), P1, 1, 0);
    const primary = shown.players[P1]?.dieIds[0];
    const other = shown.players[P1]?.dieIds[1];
    const opponent = shown.players[P2]?.dieIds[0];
    if (primary === undefined || other === undefined || opponent === undefined) throw new Error("dice");
    const secondaries = secondaryDiceFor(shown, P1, primary);
    expect(secondaries).toContain(other);
    expect(secondaries).not.toContain(primary);
    expect(secondaries).not.toContain(opponent);

    const sameFace = advance(shown, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: shown.players[P1]!.activeCreatureId,
      techniqueId: TECHNIQUE.id,
      secondaryDieId: primary,
    });
    expect(sameFace.ok).toBe(false);

    const used = expectOk(
      advance(shown, {
        type: "USE_FACE",
        playerId: P1,
        creatureId: shown.players[P1]!.activeCreatureId,
      }),
    );
    expect(matchingTechniques(resolveOpenChain(used), P1, shown.players[P1]!.activeCreatureId).length).toBeGreaterThan(
      0,
    );
  });

  it("refuses to make a KOed fighter Active and still lets them Assist", () => {
    let state = show(opened(), P1, 2, 0);
    const reserve = state.players[P1]?.creatureIds[2];
    const active = state.players[P1]?.activeCreatureId;
    if (reserve === undefined || active === undefined) throw new Error("squad");
    const player = state.players[P1];
    if (player === undefined) throw new Error("player");
    state = {
      ...state,
      creatures: {
        ...state.creatures,
        [reserve]: { ...state.creatures[reserve]!, defeated: true },
      },
      players: { ...state.players, [P1]: { ...player, meter: 2 } },
    };
    const tagged = advance(state, { type: "TAG", playerId: P1, reserveCreatureId: reserve });
    expect(tagged.ok).toBe(false);
    const assisted = expectOk(
      advance(state, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve }),
    );
    expect(resolveOpenChain(assisted).players[P1]?.activeCreatureId).toBe(active);
    expect(resolveOpenChain(assisted).creatures[active]?.shields).toBe(0);
  });
});
