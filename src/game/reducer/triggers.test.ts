import { describe, expect, it } from "vitest";
import {
  ABYSSAL_SACRIFICE,
  ARCHMAGES_GRIMOIRE,
  ASSEMBLY_LINE,
  BLACK_PLAGUE,
  BLADE_OF_SERENE_LIGHT,
  CALL_TO_ARMS,
  ECLIPSE,
  FOUNDRY,
  HUNTERS_COLLAR,
  HUNTING_ARMOUR,
  MUTANT_SPORES,
  SERVOMOTOR,
  TOXIC_BLESSING,
  TOXIC_HEART,
  VENOMOUS_FANGS,
  WILD_CARAPACE,
  WILD_ECHO,
} from "../content/cards.js";
import { CONTROL_SQUAD } from "../content/creatures.js";
import {
  GARUDA,
  LENS_CHOIR,
  MINOTAUR,
  PROTOTYPE_SQUAD,
  VOID_SUMMONER,
} from "../content/creatures.js";
import {
  CONVERSION_RUNE,
  ENGINE_TEST_FACE_DECK,
  faceIdForSymbol,
  INFECTION,
  INSIGHT_RUNE,
  PRIMORDIAL_FURY,
  SPORES,
  VENOM,
  VITAL_SPARK,
} from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import {
  asAttackId,
  asCardInstanceId,
  asSymbolInstanceId,
  type CardId,
  type CreatureId,
  type DieId,
  type FaceCardId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { SHIELD } from "../model/symbols.js";
import { ritualsOf } from "../rules/cards.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withDamage,
  withEnergy,
  withHand,
  withPhase,
  withShields,
  withSymbols,
  withTokens,
  advanceResolvingChain as advance,
  newMatchWithDecks,
} from "../testing/scenario.js";
import { createDraft } from "./draft.js";
import { drainResolution } from "./resolution.js";
import { setCreaturePosition } from "./zones.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function withToxin(state: GameState, creatureId: CreatureId, toxinMarkers: number): GameState {
  const creature = state.creatures[creatureId];
  if (creature === undefined) throw new Error("expected creature");
  return {
    ...state,
    creatures: { ...state.creatures, [creatureId]: { ...creature, toxinMarkers } },
  };
}

function equip(state: GameState, creatureId: CreatureId): GameState {
  return expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredTargetCreatureId: creatureId,
    }),
  );
}

describe("on-deal-damage equipment", () => {
  it("applies toxin from Venomous Fangs when the bearer deals HP damage", () => {
    const attackerId = creatureIdAt(actionsReady([VENOMOUS_FANGS]), P1, 0);
    const targetId = creatureIdAt(actionsReady([VENOMOUS_FANGS]), P2, 0);
    let state = equip(actionsReady([VENOMOUS_FANGS]), attackerId);
    state = withPhase(withTokens(state, attackerId, { martial: 2 }), "actions");

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.toxinMarkers).toBe(1);
    expect(eventTypes(after)).toContain("toxin-applied");
  });

  it("does not fire when Shields soak the entire hit", () => {
    const base = actionsReady([VENOMOUS_FANGS]);
    const attackerId = creatureIdAt(base, P1, 0);
    const targetId = creatureIdAt(base, P2, 0);
    let state = equip(base, attackerId);
    state = withPhase(
      withTokens(withShields(state, targetId, 10), attackerId, { martial: 2 }),
      "actions",
    );

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.toxinMarkers).toBe(0);
    expect(eventTypes(after)).not.toContain("toxin-applied");
  });

  it("opens choose-ally heal from Blade of Serene Light after dealing damage", () => {
    const base = actionsReady([BLADE_OF_SERENE_LIGHT]);
    const attackerId = creatureIdAt(base, P1, 0);
    const allyId = creatureIdAt(base, P1, 1);
    const targetId = creatureIdAt(base, P2, 0);
    let state = equip(base, attackerId);
    state = withDamage(state, allyId, 2);
    state = withPhase(withTokens(state, attackerId, { martial: 2 }), "actions");

    const afterAttack = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId,
      }),
    );

    expect(afterAttack.pendingDecision?.type).toBe("choose-creature");

    const afterHeal = expectOk(
      advance(afterAttack, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );

    expect(afterHeal.creatures[allyId]?.damage).toBe(1);
    expect(eventTypes(afterHeal)).toContain("creature-healed");
  });
});

describe("on-roll-symbol equipment", () => {
  it("damages the Black Plague host when its controller rolls Corruption", () => {
    const base = actionsReady([BLACK_PLAGUE]);
    const hostId = creatureIdAt(base, P2, 0);
    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: hostId,
      }),
    );

    // Patch P2 die face 0 to Corruption and force that face on roll.
    const dieId = dieIdOf(equipped, P2, 0);
    const die = equipped.dice[dieId];
    if (die === undefined) throw new Error("expected die");
    const slots = die.slots.map((slot, index) =>
      index === 0
        ? {
            ...slot,
            faceCardId: INFECTION,
          }
        : slot,
    );
    let rolled: GameState = {
      ...equipped,
      activePlayerId: P2,
      energy: { holderId: P2, value: 5 },
      phase: "roll",
      dice: { ...equipped.dice, [dieId]: { ...die, slots } },
    };
    rolled = withDie(rolled, dieId, { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P2, 1), { retained: true, rolledSlotIndex: 1 });

    const after = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P2 }));

    expect(after.creatures[hostId]?.damage).toBe(1);
    expect(eventTypes(after)).toContain("damage-dealt");
  });
});

describe("on-toxin-damage equipment", () => {
  it("heals the Toxic Heart bearer when an ally takes toxin tick HP damage", () => {
    const base = actionsReady([TOXIC_HEART]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = equip(base, bearerId);
    const damaged = withDamage(withToxin(equipped, bearerId, 2), bearerId, 3);

    const asP2 = {
      ...damaged,
      activePlayerId: P2,
      energy: { holderId: P2, value: 3 },
      phase: "actions" as const,
    };
    const after = expectOk(advance(asP2, { type: "END_TURN", playerId: P2 }));

    // 2 toxin damage then heal 1 → net +1 from starting 3.
    expect(after.creatures[bearerId]?.damage).toBe(4);
    expect(eventTypes(after)).toContain("creature-healed");
  });
});

describe("on-absorb equipment", () => {
  it("heals the Wild Carapace host when it absorbs Wild", () => {
    const base = actionsReady([WILD_CARAPACE]);
    const hostId = creatureIdAt(base, P1, 0);
    let state = withDamage(equip(base, hostId), hostId, 2);
    state = withPhase(state, "actions");
    const symbolId = asSymbolInstanceId("sym-wild");
    state = {
      ...state,
      symbols: {
        ...state.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "wild",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };

    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: hostId,
        symbolId,
      }),
    );

    expect(after.creatures[hostId]?.damage).toBe(1);
  });

  it("draws and asks to discard when Archmage's Grimoire absorbs Arcane", () => {
    // Control squad: Archmage (index 0) is Arcane.
    const base = withEnergy(
      withHand(
        withPhase(
          newMatch({
            players: [
              { id: P1, squad: CONTROL_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
              { id: P2, squad: CONTROL_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
            ],
          }),
          "actions",
        ),
        P1,
        [ARCHMAGES_GRIMOIRE],
      ),
      P1,
      10,
    );
    const hostId = creatureIdAt(base, P1, 0);
    let state = equip(base, hostId);

    const deckCardId = asCardInstanceId("deck-spare-eclipse");
    const player = state.players[P1];
    if (player === undefined) throw new Error("p1");
    state = {
      ...state,
      cards: {
        ...state.cards,
        [deckCardId]: {
          id: deckCardId,
          cardId: BLACK_PLAGUE,
          ownerId: P1,
          zone: "deck",
          attachedToCreatureId: null,
          attachedToFaceCardId: null,
          ritualOrientation: null,
          ritualProgress: null,
          ritualProgressCreditedThisTurn: null,
        },
      },
      players: {
        ...state.players,
        [P1]: { ...player, deck: [deckCardId, ...player.deck], hand: [] },
      },
    };

    state = withPhase(state, "actions");
    const symbolId = asSymbolInstanceId("sym-arcane");
    state = {
      ...state,
      symbols: {
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "arcane",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };

    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: hostId,
        symbolId,
      }),
    );

    expect(eventTypes(after)).toContain("card-drawn");
    expect(after.pendingDecision?.type).toBe("discard-cards");
  });
});

describe("on-absorb overloads", () => {
  it("heals when Mutant Spores' overloaded Toxin face is absorbed", () => {
    const toxinFace = SPORES;
    const base = actionsReady([MUTANT_SPORES]);
    const allyId = creatureIdAt(base, P1, 0);

    // Overload requires the face card installed on an owned die.
    const dieId = dieIdOf(base);
    const die = base.dice[dieId];
    if (die === undefined) throw new Error("die");
    const slots = die.slots.map((slot, index) =>
      index === 0 ? { ...slot, faceCardId: toxinFace, faceCardOwnerId: P1 } : slot,
    );
    let prepared: GameState = {
      ...base,
      dice: { ...base.dice, [dieId]: { ...die, slots } },
    };
    prepared = withDamage(prepared, allyId, 2);

    const attached = expectOk(
      advance(prepared, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(prepared, P1, 0),
        declaredFaceCardId: toxinFace,
      }),
    );

    let rolled: GameState = { ...attached, phase: "roll" };
    rolled = withDie(rolled, dieId, { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 1 });

    const afterRoll = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    const toxin = Object.values(afterRoll.symbols).find(
      (s) => s.symbol === "toxin" && s.status === "rolled" && s.sourceDieId === dieId,
    );
    if (toxin === undefined) throw new Error("expected rolled toxin");

    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: allyId,
        symbolId: toxin.id,
      }),
    );

    expect(after.creatures[allyId]?.damage).toBe(1);
  });

  it("generates Wild when Wild Echo's face is absorbed", () => {
    const wildFace = faceIdForSymbol("wild");
    const base = actionsReady([WILD_ECHO]);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: wildFace,
      }),
    );

    let rolled: GameState = withPhase(attached, "roll");
    // Starting die slot 1 is Wild.
    rolled = withDie(rolled, dieIdOf(rolled, P1, 0), { retained: true, rolledSlotIndex: 1 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });

    const afterRoll = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    const wild = Object.values(afterRoll.symbols).find(
      (s) => s.symbol === "wild" && s.status === "rolled",
    );
    if (wild === undefined) throw new Error("expected wild");

    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: wild.id,
      }),
    );

    const generated = usableSymbols(after, P1).filter(
      (s) => s.symbol === "wild" && s.sourceDieId === null,
    );
    expect(generated.length).toBeGreaterThanOrEqual(1);
  });
});

describe("on-roll / on-absorb faces", () => {
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
    let rolled: GameState = withPhase(state, "roll");
    rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: slot });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
    return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
  }

  it("draws on Insight Rune roll", () => {
    let state = installFace(newMatchWithDecks(), INSIGHT_RUNE);
    const handBefore = state.players[P1]?.hand.length ?? 0;
    state = rollShowingSlot(state, 0);
    expect(state.players[P1]?.hand.length).toBe(handBefore + 1);
  });

  it("gains Energy when Conversion Rune is absorbed", () => {
    let state = installFace(newMatch(), CONVERSION_RUNE);
    const energyBefore =
      state.energy.holderId === P1 ? state.energy.value : 0;
    state = rollShowingSlot(state, 0);
    if (state.pendingDecision?.type === "convert-symbols") {
      state = expectOk(
        advance(state, { type: "RESOLVE_CONVERT_SYMBOLS", playerId: P1, replacements: [] }),
      );
    }
    const arcane = Object.values(state.symbols).find(
      (s) => s.symbol === "arcane" && s.status === "rolled" && s.sourceDieId === dieIdOf(state),
    );
    if (arcane === undefined) throw new Error("expected arcane");
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(state, P1, 0),
        symbolId: arcane.id,
      }),
    );
    expect(after.energy.holderId).toBe(P1);
    expect(after.energy.value).toBe(energyBefore + 1);
  });

  it("heals on Vital Spark roll and prevents on absorb", () => {
    const allyId = creatureIdAt(newMatch(), P1, 0);
    let state = withDamage(installFace(newMatch(), VITAL_SPARK), allyId, 2);
    state = rollShowingSlot(state, 0);
    expect(state.creatures[allyId]?.damage).toBe(1);

    const luminar = Object.values(state.symbols).find(
      (s) => s.symbol === "luminar" && s.status === "rolled" && s.sourceDieId === dieIdOf(state),
    );
    if (luminar === undefined) throw new Error("expected luminar");
    const afterAbsorb = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: allyId,
        symbolId: luminar.id,
      }),
    );
    expect(afterAbsorb.creatures[allyId]?.damagePreventBuffer).toBe(1);
  });

  it("grants next-attack bonus when Primordial Fury is absorbed", () => {
    let state = installFace(newMatch(), PRIMORDIAL_FURY);
    state = rollShowingSlot(state, 0);
    const wild = Object.values(state.symbols).find(
      (s) => s.symbol === "wild" && s.status === "rolled" && s.sourceDieId === dieIdOf(state),
    );
    if (wild === undefined) throw new Error("expected wild");
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(state, P1, 0),
        symbolId: wild.id,
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(1);
  });

  it("prompts choose-enemy when Venom is rolled", () => {
    const state = rollShowingSlot(installFace(newMatch(), VENOM), 0);
    expect(state.pendingDecision?.type).toBe("choose-creature");
  });
});

const aggroMatch = () =>
  newMatch({
    players: [
      { id: P1, squad: PROTOTYPE_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      { id: P2, squad: PROTOTYPE_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
    ],
  });

describe("on-attack shared event", () => {
  it("buffs Varcolac when another ally attacks (ally-other filter)", () => {
    const base = aggroMatch();
    // Deployment: Minotaur 0, Varcolac 1, Garuda 2
    const minotaurId = creatureIdAt(base, P1, 0);
    const varcolacId = creatureIdAt(base, P1, 1);
    const targetId = creatureIdAt(base, P2, 0);

    let state = withPhase(withTokens(base, minotaurId, { martial: 2 }), "actions");
    state = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: minotaurId,
        attackId: asAttackId("attack-minotaur-heavy-axe"),
        targetId,
      }),
    );

    expect(state.creatures[varcolacId]?.nextAttackBonus).toBe(1);
  });
});

describe("on-take-damage reduce", () => {
  it("reduces the first hit by 1 once per turn with Hunting Armour", () => {
    const base = actionsReady([HUNTING_ARMOUR]);
    const bearerId = creatureIdAt(base, P1, 0);
    const attackerId = creatureIdAt(base, P2, 0);
    let state = equip(base, bearerId);
    state = {
      ...state,
      activePlayerId: P2,
      energy: { holderId: P2, value: 5 },
      phase: "actions",
    };
    state = withTokens(state, attackerId, { martial: 2 });

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P2,
        attackerId,
        attackId: asAttackId("attack-minotaur-heavy-axe"),
        targetId: bearerId,
      }),
    );
    // Heavy Axe deals 3; Armour reduces first hit by 1 → 2 HP
    expect(after.creatures[bearerId]?.damage).toBe(2);
  });
});

describe("on-discard continuous ritual", () => {
  it("generates Darkness when Abyssal Sacrifice's controller discards", () => {
    const base = withEnergy(
      withHand(withPhase(newMatchWithDecks(), "actions"), P1, [ABYSSAL_SACRIFICE]),
      P1,
      10,
    );
    const placed = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
      }),
    );
    const ritualId = Object.values(placed.cards).find(
      (c) => c.cardId === ABYSSAL_SACRIFICE && c.zone === "ritual",
    )?.id;
    if (ritualId === undefined) throw new Error("ritual");

    let ready: GameState = {
      ...placed,
      cards: {
        ...placed.cards,
        [ritualId]: {
          ...placed.cards[ritualId]!,
          ritualOrientation: "ready",
          ritualProgress: { arcane: 1, darkness: 1 },
        },
      },
    };
    ready = withEnergy(withHand(withPhase(ready, "actions"), P1, [ECLIPSE]), P1, 10);

    const afterEclipse = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(afterEclipse.pendingDecision?.type).toBe("discard-cards");
    const hand = afterEclipse.players[P1]?.hand ?? [];
    const discarded = expectOk(
      advance(afterEclipse, {
        type: "RESOLVE_DISCARD",
        playerId: P1,
        cardInstanceIds: [hand[0]!],
      }),
    );
    const darkness = usableSymbols(discarded, P1).filter((s) => s.symbol === "darkness");
    expect(darkness.length).toBeGreaterThanOrEqual(1);
    const ritual = discarded.cards[ritualId];
    expect(ritual?.ritualOrientation).toBe("ready");
    expect(ritual?.ritualProgress).toEqual({ arcane: 1, darkness: 1 });
  });
});

describe("Void Summoner on-absorb Natural", () => {
  it("generates Arcane when any creature absorbs a Natural face", () => {
    const state0 = newMatch({
      players: [
        {
          id: P1,
          squad: [VOID_SUMMONER, MINOTAUR, GARUDA],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
        {
          id: P2,
          squad: [MINOTAUR, GARUDA, VOID_SUMMONER],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
      ],
    });
    // Starting die slot 0 is typically Martial (natural).
    let state = withPhase(state0, "roll");
    state = withDie(state, dieIdOf(state), { retained: true, rolledSlotIndex: 0 });
    state = withDie(state, dieIdOf(state, P1, 1), { retained: true, rolledSlotIndex: 1 });
    state = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    const martial = Object.values(state.symbols).find(
      (s) => s.symbol === "martial" && s.status === "rolled" && s.sourceDieId === dieIdOf(state),
    );
    if (martial === undefined) throw new Error("martial");
    const absorber = creatureIdAt(state, P1, 1);
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: absorber,
        symbolId: martial.id,
      }),
    );
    const arcane = usableSymbols(after, P1).filter((s) => s.symbol === "arcane");
    expect(arcane.length).toBeGreaterThanOrEqual(1);
  });

  it("does not generate Arcane when a creature absorbs an untyped Shield face", () => {
    const state0 = newMatch({
      players: [
        {
          id: P1,
          squad: [VOID_SUMMONER, MINOTAUR, GARUDA],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
        {
          id: P2,
          squad: [MINOTAUR, GARUDA, VOID_SUMMONER],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
      ],
    });
    // Starting die slot 4 is Shield (untyped).
    let state = withPhase(state0, "roll");
    state = withDie(state, dieIdOf(state), { retained: true, rolledSlotIndex: 4 });
    state = withDie(state, dieIdOf(state, P1, 1), { retained: true, rolledSlotIndex: 1 });
    state = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    const shield = Object.values(state.symbols).find(
      (s) => s.symbol === SHIELD && s.status === "rolled" && s.sourceDieId === dieIdOf(state),
    );
    if (shield === undefined) throw new Error("shield");
    const absorber = creatureIdAt(state, P1, 1);
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: absorber,
        symbolId: shield.id,
      }),
    );
    const arcane = usableSymbols(after, P1).filter((s) => s.symbol === "arcane");
    expect(arcane).toHaveLength(0);
  });
});

describe("Lens Choir on-absorb Luminar once per turn", () => {
  it("generates Luminar once, then refuses to loop by absorbing that generated pip", () => {
    const state0 = newMatch({
      players: [
        {
          id: P1,
          squad: [LENS_CHOIR, MINOTAUR, GARUDA],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
        {
          id: P2,
          squad: [MINOTAUR, GARUDA, LENS_CHOIR],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
      ],
    });
    const choir = creatureIdAt(state0, P1, 0);
    const primed = withSymbols(withPhase(state0, "actions"), P1, ["luminar"], "available");
    const firstPip = usableSymbols(primed, P1).find((s) => s.symbol === "luminar");
    if (firstPip === undefined) throw new Error("luminar");

    const afterFirst = expectOk(
      advance(primed, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: choir,
        symbolId: firstPip.id,
      }),
    );
    const generated = usableSymbols(afterFirst, P1).filter((s) => s.symbol === "luminar");
    expect(generated).toHaveLength(1);
    const offspring = generated[0];
    if (offspring === undefined) throw new Error("generated");

    const afterSecond = expectOk(
      advance(afterFirst, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: choir,
        symbolId: offspring.id,
      }),
    );
    expect(usableSymbols(afterSecond, P1).filter((s) => s.symbol === "luminar")).toHaveLength(0);
  });
});

describe("ritual absorb shares on-absorb hooks", () => {
  const ritualInZone = (state: GameState, cardId: CardId) => {
    const ritual = ritualsOf(state, P1).find((card) => card.cardId === cardId);
    if (ritual === undefined) throw new Error(`test: missing ritual ${cardId}`);
    return ritual;
  };

  it("Foundry gains Energy when an allied ritual absorbs Mechanical", () => {
    const base = actionsReady([FOUNDRY, ASSEMBLY_LINE]);
    const afterFoundry = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
      }),
    );
    const afterAssembly = expectOk(
      advance(afterFoundry, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(afterFoundry, P1, 0),
      }),
    );
    const foundryId = ritualInZone(afterAssembly, FOUNDRY).id;
    const assemblyId = ritualInZone(afterAssembly, ASSEMBLY_LINE).id;
    const foundry = afterAssembly.cards[foundryId];
    if (foundry === undefined) throw new Error("foundry");
    let state: GameState = {
      ...withEnergy(afterAssembly, P1, 5),
      cards: {
        ...afterAssembly.cards,
        [foundryId]: {
          ...foundry,
          ritualOrientation: "ready",
          ritualProgress: { mechanical: 2 },
        },
      },
    };
    state = withSymbols(withPhase(state, "actions"), P1, ["mechanical"], "rolled");
    const mechanical = Object.values(state.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled",
    );
    if (mechanical === undefined) throw new Error("mechanical");

    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL_TO_RITUAL",
        playerId: P1,
        cardInstanceId: assemblyId,
        symbolId: mechanical.id,
      }),
    );

    expect(after.cards[assemblyId]?.ritualProgress).toEqual({ mechanical: 1 });
    expect(after.energy).toEqual({ holderId: P1, value: 6 });
  });

  it("Foundry's on-absorb fires when the completing Mechanical assignment readies it", () => {
    const base = actionsReady([FOUNDRY]);
    const placed = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
      }),
    );
    const foundryId = ritualInZone(placed, FOUNDRY).id;
    const foundry = placed.cards[foundryId];
    if (foundry === undefined) throw new Error("foundry");
    let state: GameState = {
      ...withEnergy(placed, P1, 5),
      cards: {
        ...placed.cards,
        [foundryId]: {
          ...foundry,
          ritualOrientation: "preparing",
          ritualProgress: { mechanical: 1 },
          ritualProgressCreditedThisTurn: [],
        },
      },
    };
    state = withSymbols(withPhase(state, "actions"), P1, ["mechanical"], "rolled");
    const mechanical = Object.values(state.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled",
    );
    if (mechanical === undefined) throw new Error("mechanical");

    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL_TO_RITUAL",
        playerId: P1,
        cardInstanceId: foundryId,
        symbolId: mechanical.id,
      }),
    );

    expect(after.cards[foundryId]?.ritualProgress).toEqual({ mechanical: 2 });
    expect(after.cards[foundryId]?.ritualOrientation).toBe("ready");
    expect(after.energy).toEqual({ holderId: P1, value: 6 });
  });

  it("credits ritualProgress immediately, not at END_TURN", () => {
    const base = actionsReady([ASSEMBLY_LINE]);
    const placed = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
      }),
    );
    const ritualId = ritualInZone(placed, ASSEMBLY_LINE).id;
    const absorbing = withSymbols(
      withPhase(placed, "actions"),
      P1,
      ["mechanical"],
      "rolled",
    );
    const mechanical = Object.values(absorbing.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled",
    );
    if (mechanical === undefined) throw new Error("mechanical");

    const after = expectOk(
      advance(absorbing, {
        type: "ABSORB_SYMBOL_TO_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
        symbolId: mechanical.id,
      }),
    );
    expect(after.cards[ritualId]?.ritualProgress).toEqual({ mechanical: 1 });

    const afterEnd = expectOk(advance(after, { type: "END_TURN", playerId: P1 }));
    expect(afterEnd.cards[ritualId]?.ritualProgress).toEqual({ mechanical: 1 });
  });

  it("still banks creature attribute tokens until END_TURN", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial"], "rolled");
    const creatureId = creatureIdAt(state, P1, 0);
    const martial = Object.values(state.symbols).find((s) => s.symbol === "martial");
    if (martial === undefined) throw new Error("martial");

    const absorbed = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: martial.id,
      }),
    );
    expect(absorbed.creatures[creatureId]?.attributeTokens).toEqual({});

    const nextTurn = expectOk(advance(absorbed, { type: "END_TURN", playerId: P1 }));
    expect(nextTurn.creatures[creatureId]?.attributeTokens).toEqual({ martial: 1 });
  });

  it("does not fire self-only equipment when a ritual absorbs Mechanical", () => {
    const base = actionsReady([SERVOMOTOR, ASSEMBLY_LINE]);
    const equipped = equip(base, creatureIdAt(base, P1, 0));
    const afterRitual = expectOk(
      advance(equipped, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(equipped, P1, 0),
      }),
    );
    const ritualId = ritualInZone(afterRitual, ASSEMBLY_LINE).id;
    const absorbing = withSymbols(
      withPhase(afterRitual, "actions"),
      P1,
      ["mechanical"],
      "rolled",
    );
    const mechanical = Object.values(absorbing.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled",
    );
    if (mechanical === undefined) throw new Error("mechanical");

    const after = expectOk(
      advance(absorbing, {
        type: "ABSORB_SYMBOL_TO_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
        symbolId: mechanical.id,
      }),
    );
    expect(usableSymbols(after, P1).filter((s) => s.symbol === "mechanical")).toHaveLength(0);
  });

  it("Void Summoner generates Arcane when a ritual absorbs a Natural face", () => {
    const state0 = newMatch({
      players: [
        {
          id: P1,
          squad: [VOID_SUMMONER, MINOTAUR, GARUDA],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
        {
          id: P2,
          squad: [MINOTAUR, GARUDA, VOID_SUMMONER],
          deck: [],
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
      ],
    });
    const ready = withEnergy(withHand(withPhase(state0, "actions"), P1, [CALL_TO_ARMS]), P1, 10);
    const placed = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const ritualId = ritualInZone(placed, CALL_TO_ARMS).id;
    let rolled: GameState = withPhase(placed, "roll");
    rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 1 });
    const afterRoll = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    const martial = Object.values(afterRoll.symbols).find(
      (s) => s.symbol === "martial" && s.status === "rolled" && s.sourceDieId === dieIdOf(afterRoll),
    );
    if (martial === undefined) throw new Error("martial");

    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL_TO_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
        symbolId: martial.id,
      }),
    );
    const arcane = usableSymbols(after, P1).filter((s) => s.symbol === "arcane");
    expect(arcane.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Toxic Blessing arm-attack-toxin", () => {
  it("applies toxin on attacks after the overloaded face is rolled", () => {
    const toxinFace = SPORES;
    const base = actionsReady([TOXIC_BLESSING]);
    const dieId = dieIdOf(base);
    const die = base.dice[dieId];
    if (die === undefined) throw new Error("die");
    const slots = die.slots.map((slot, index) =>
      index === 0 ? { ...slot, faceCardId: toxinFace, faceCardOwnerId: P1 } : slot,
    );
    const prepared: GameState = {
      ...base,
      dice: { ...base.dice, [dieId]: { ...die, slots } },
    };
    const attached = expectOk(
      advance(prepared, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(prepared, P1, 0),
        declaredFaceCardId: toxinFace,
      }),
    );
    let rolled: GameState = withPhase(attached, "roll");
    rolled = withDie(rolled, dieId, { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 1 });
    const afterRoll = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    expect(afterRoll.attackToxinThisTurn[P1]).toBe(1);

    const attackerId = creatureIdAt(afterRoll, P1, 0);
    const targetId = creatureIdAt(afterRoll, P2, 0);
    let combat = withPhase(withTokens(afterRoll, attackerId, { martial: 2 }), "actions");
    combat = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: asAttackId("attack-minotaur-heavy-axe"),
        targetId,
      }),
    );
    expect(combat.creatures[targetId]?.toxinMarkers).toBe(1);
  });
});

describe("Hunter's Collar on-change-position", () => {
  it("generates Martial when the bearer changes position", () => {
    const base = actionsReady([HUNTERS_COLLAR]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = equip(base, bearerId);
    expect(equipped.creatures[bearerId]?.position).toBe("frontline");

    const draft = createDraft(equipped);
    setCreaturePosition(draft, bearerId, "back");
    drainResolution(draft);
    expect(draft.creatures[bearerId]?.position).toBe("back");
    const martial = usableSymbols(draft, P1).filter((s) => s.symbol === "martial");
    expect(martial.length).toBeGreaterThanOrEqual(1);
  });
});

describe("control creature attack riders", () => {
  const controlMatch = () =>
    newMatch({
      players: [
        { id: P1, squad: CONTROL_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
        { id: P2, squad: CONTROL_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      ],
    });

  it("Archmage Arcane Burst deals 2, draws 1, and burns the Arcane token", () => {
    let state = withEnergy(withPhase(controlMatch(), "actions"), P1, 5);
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const deckCardId = asCardInstanceId("deck-burst-draw");
    const player = state.players[P1];
    if (player === undefined) throw new Error("p1");
    state = {
      ...state,
      cards: {
        ...state.cards,
        [deckCardId]: {
          id: deckCardId,
          cardId: ECLIPSE,
          ownerId: P1,
          zone: "deck",
          attachedToCreatureId: null,
          attachedToFaceCardId: null,
          ritualOrientation: null,
          ritualProgress: null,
          ritualProgressCreditedThisTurn: null,
        },
      },
      players: {
        ...state.players,
        [P1]: { ...player, deck: [deckCardId, ...player.deck] },
      },
    };
    state = withTokens(state, attackerId, { arcane: 1 });

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: asAttackId("attack-archmage-arcane-burst"),
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.damage).toBe(2);
    expect(after.creatures[attackerId]?.attributeTokens.arcane).toBeUndefined();
    expect(eventTypes(after)).toContain("card-drawn");
    expect(after.players[P1]?.hand).toContain(deckCardId);
  });

  it("Corrupting Elder Touch of Decay strips 1 Shield then deals 2", () => {
    let state = withEnergy(withPhase(controlMatch(), "actions"), P1, 5);
    const attackerId = creatureIdAt(state, P1, 1);
    const targetId = creatureIdAt(state, P2, 0);
    state = withShields(withTokens(state, attackerId, { arcane: 1 }), targetId, 1);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: asAttackId("attack-elder-decay-touch"),
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.shields).toBe(0);
    expect(after.creatures[targetId]?.damage).toBe(2);
  });

  it("Void Summoner Rupture deals 2 and generates Arcane", () => {
    let state = withEnergy(withPhase(controlMatch(), "actions"), P1, 5);
    const attackerId = creatureIdAt(state, P1, 2);
    const targetId = creatureIdAt(state, P2, 0);
    state = withTokens(state, attackerId, { arcane: 1 });

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: asAttackId("attack-void-rupture"),
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.damage).toBe(2);
    const arcane = usableSymbols(after, P1).filter((s) => s.symbol === "arcane");
    expect(arcane.length).toBeGreaterThanOrEqual(1);
  });
});
