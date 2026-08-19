import { describe, expect, it } from "vitest";
import {
  BATTLE_HYMN,
  BLIGHT_STRIKE,
  CALL_TO_ARMS,
  DOSE,
  OPENING_CUT,
  PACK_LAW,
  PACK_SURGE,
  POUNCE,
  PRESS_THE_ATTACK,
  RENDING_MARK,
  RIPOSTE,
  SNARL,
  TEMPER,
  UNTAMED,
  VIRULENT_RITE,
  WHETSTONE,
} from "../content/cards.js";
import {
  BLOODSCENT,
  CLEAVING_STRIKE,
  CRUSH,
  GORE,
  NEEDLE,
  RENDING_CLAW,
  SEEP,
  VENOM,
  WARHORN,
  faceIdForSymbol,
} from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asAttackId, type CardId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { AttributeTokens } from "../model/symbols.js";
import { ritualsOf } from "../rules/cards.js";
import { symbolCountsOn } from "../rules/dice.js";
import { usableSymbols } from "../rules/symbols.js";
import { advance as reduceAdvance } from "./reduce.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withEnergy,
  withHand,
  withPhase,
  withShields,
  withSymbols,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
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

function placedReadyRitual(cardId: CardId, progress: AttributeTokens) {
  const base = actionsReady([cardId]);
  const placed = expectOk(
    advance(base, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
    }),
  );
  const ritualId = ritualsOf(placed, P1)[0]?.id;
  if (ritualId === undefined) throw new Error("test: no ritual");
  return {
    ritualId,
    state: {
      ...placed,
      cards: {
        ...placed.cards,
        [ritualId]: {
          ...placed.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: progress,
        },
      },
    },
  };
}

function rolledSymbol(
  state: GameState,
  symbol: "martial" | "wild" | "toxin",
  dieId: DieId,
) {
  const found = Object.values(state.symbols).find(
    (s) => s.symbol === symbol && s.status === "rolled" && s.sourceDieId === dieId,
  );
  if (found === undefined) throw new Error(`expected rolled ${symbol}`);
  return found;
}

describe("Temper", () => {
  it("pauses to forge 1 Synthetic Martial face", () => {
    const ready = actionsReady([TEMPER]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision).toEqual({
      type: "forge-faces",
      controllerId: P1,
      faces: 1,
      kind: "synthetic",
      attribute: "martial",
      target: "own-die",
      sourceCardInstanceId: handCardIdAt(ready, P1, 0),
      sourceFaceCardId: null,
    });

    const dieId = dieIdOf(played);
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_FORGE_FACES",
        playerId: P1,
        dieId,
        slotIndexes: [0],
        faceCardId: CRUSH,
      }),
    );
    expect(resolved.dice[dieId]?.slots[0]?.faceCardId).toBe(CRUSH);
  });
});

describe("Opening Cut", () => {
  it("deals 2 damage after choosing an enemy when Martial is in the pool", () => {
    const ready = withSymbols(actionsReady([OPENING_CUT]), P1, ["martial"]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-creature");
    const targetId = creatureIdAt(played, P2, 0);
    const after = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(2);
  });

  it("refuses without Martial in the pool", () => {
    const ready = actionsReady([OPENING_CUT]);
    const refused = advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INSUFFICIENT_SYMBOLS");
  });
});

describe("Press the Attack", () => {
  it("arms +2 on the controller's next attack", () => {
    const ready = actionsReady([PRESS_THE_ATTACK]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(2);
  });
});

describe("Riposte", () => {
  it("prevents 1 from an attack and arms the defender's next attack +1", () => {
    const combat = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(combat, P1, 0);
    const target = creatureIdAt(combat, P2, 0);
    const armed = withHand(withTokens(combat, attacker, { martial: 2 }), P2, [RIPOSTE]);
    const opened = expectOk(
      reduceAdvance(armed, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: HEAVY_AXE,
        targetId: target,
      }),
    );
    const riposted = expectOk(
      reduceAdvance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(riposted);
    expect(resolved.creatures[target]?.damage).toBe(2);
    expect(resolved.attackBonusThisTurn).toEqual({ [P2]: 1 });
  });
});

describe("Whetstone", () => {
  it("generates Martial when the bearer attacks", () => {
    const ready = actionsReady([WHETSTONE]);
    const bearerId = creatureIdAt(ready, P1, 0);
    const equipped = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    const fueled = withTokens(withPhase(equipped, "actions"), bearerId, { martial: 2 });
    const after = expectOk(
      advance(fueled, {
        type: "ATTACK",
        playerId: P1,
        attackerId: bearerId,
        attackId: HEAVY_AXE,
        targetId: creatureIdAt(fueled, P2, 0),
      }),
    );
    const generated = usableSymbols(after, P1).filter((s) => s.symbol === "martial");
    expect(generated).toHaveLength(1);
    expect(generated[0]?.sourceDieId).toBeNull();
  });
});

describe("Untamed", () => {
  it("pauses to forge 1 Synthetic Wild face", () => {
    const ready = actionsReady([UNTAMED]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision).toEqual({
      type: "forge-faces",
      controllerId: P1,
      faces: 1,
      kind: "synthetic",
      attribute: "wild",
      target: "own-die",
      sourceCardInstanceId: handCardIdAt(ready, P1, 0),
      sourceFaceCardId: null,
    });
    const dieId = dieIdOf(played);
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_FORGE_FACES",
        playerId: P1,
        dieId,
        slotIndexes: [0],
        faceCardId: RENDING_CLAW,
      }),
    );
    expect(resolved.dice[dieId]?.slots[0]?.faceCardId).toBe(RENDING_CLAW);
  });
});

describe("Pounce", () => {
  it("grants +2 next-attack on a chosen ally when Wild is in the pool", () => {
    const ready = withSymbols(actionsReady([POUNCE]), P1, ["wild"]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const allyId = creatureIdAt(played, P1, 1);
    const after = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );
    expect(after.creatures[allyId]?.nextAttackBonus).toBe(2);
  });
});

describe("Pack Surge", () => {
  it("generates Wild and arms next attack +1", () => {
    const ready = actionsReady([PACK_SURGE]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(1);
    expect(usableSymbols(after, P1).filter((s) => s.symbol === "wild")).toHaveLength(1);
  });
});

describe("Rending Mark", () => {
  it("strips 2 Shield from a chosen enemy", () => {
    const ready = actionsReady([RENDING_MARK]);
    const targetId = creatureIdAt(ready, P2, 0);
    const shielded = withShields(ready, targetId, 3);
    const played = expectOk(
      advance(shielded, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(shielded, P1, 0),
      }),
    );
    const after = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.creatures[targetId]?.shields).toBe(1);
  });
});

describe("Snarl", () => {
  it("arms next attack +1 when the overloaded Natural Wild face is rolled", () => {
    const wildFace = faceIdForSymbol("wild");
    const ready = installFace(actionsReady([SNARL]), wildFace);
    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: wildFace,
      }),
    );
    const afterRoll = rollShowingSlot(attached, 0);
    expect(afterRoll.attackBonusThisTurn[P1]).toBe(1);
  });
});

describe("Dose", () => {
  it("applies 2 Toxin after choosing an enemy when Toxin is in the pool", () => {
    const ready = withSymbols(actionsReady([DOSE]), P1, ["toxin"]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const targetId = creatureIdAt(played, P2, 0);
    const after = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.creatures[targetId]?.toxinMarkers).toBe(2);
  });
});

describe("Blight Strike", () => {
  it("arms next-attack +1 and attack-toxin", () => {
    const ready = actionsReady([BLIGHT_STRIKE]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(1);
    expect(after.attackToxinThisTurn[P1]).toBe(1);
  });
});

describe("Call to Arms", () => {
  it("arms next attack +2 when activated", () => {
    const { state, ritualId } = placedReadyRitual(CALL_TO_ARMS, { martial: 2 });
    const after = expectOk(
      advance(state, {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(2);
  });
});

describe("Battle Hymn", () => {
  it("queues +1 for the next attack after an ally attacks", () => {
    const { state } = placedReadyRitual(BATTLE_HYMN, { martial: 2 });
    const attackerId = creatureIdAt(state, P1, 0);
    const fueled = withTokens(withPhase(state, "actions"), attackerId, { martial: 2 });
    const after = expectOk(
      advance(fueled, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId: creatureIdAt(fueled, P2, 0),
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(1);
  });
});

describe("Pack Law", () => {
  it("arms next attack +1 when an ally absorbs Wild", () => {
    const { state } = placedReadyRitual(PACK_LAW, { wild: 2 });
    const seeded = installFace(state, faceIdForSymbol("wild"));
    const afterRoll = rollShowingSlot(seeded, 0);
    const wild = rolledSymbol(afterRoll, "wild", dieIdOf(afterRoll));
    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: wild.id,
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(1);
  });
});

describe("Virulent Rite", () => {
  it("pauses to forge 2 Synthetic Toxin faces", () => {
    const { state, ritualId } = placedReadyRitual(VIRULENT_RITE, { toxin: 2 });
    const activated = expectOk(
      advance(state, {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );
    expect(activated.pendingDecision).toEqual({
      type: "forge-faces",
      controllerId: P1,
      faces: 2,
      kind: "synthetic",
      attribute: "toxin",
      target: "own-die",
      sourceCardInstanceId: ritualId,
      sourceFaceCardId: null,
    });
    const dieId = dieIdOf(activated);
    const faceCardId = VENOM;
    const resolved = expectOk(
      advance(activated, {
        type: "RESOLVE_FORGE_FACES",
        playerId: P1,
        dieId,
        slotIndexes: [0, 1],
        faceCardId,
      }),
    );
    expect(symbolCountsOn(resolved.dice[dieId]!).toxin).toBe(2);
  });
});

describe("authored aggro faces", () => {
  it("Warhorn generates Martial on roll and arms next attack on absorb", () => {
    const afterRoll = rollShowingSlot(installFace(newMatch(), WARHORN), 0);
    const generated = usableSymbols(afterRoll, P1).filter(
      (s) => s.symbol === "martial" && s.sourceDieId === null,
    );
    expect(generated).toHaveLength(1);
    const martial = rolledSymbol(afterRoll, "martial", dieIdOf(afterRoll));
    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: martial.id,
      }),
    );
    expect(after.attackBonusThisTurn[P1]).toBe(1);
  });

  it("Cleaving Strike removes 2 Shield from the most-shielded enemy on roll", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    const seeded = withShields(installFace(newMatch(), CLEAVING_STRIKE), targetId, 3);
    const afterRoll = rollShowingSlot(seeded, 0);
    expect(afterRoll.creatures[targetId]?.shields).toBe(1);
  });

  it("Bloodscent arms next attack on roll and generates Wild on absorb", () => {
    const afterRoll = rollShowingSlot(installFace(newMatch(), BLOODSCENT), 0);
    expect(afterRoll.attackBonusThisTurn[P1]).toBe(1);
    const wild = rolledSymbol(afterRoll, "wild", dieIdOf(afterRoll));
    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: wild.id,
      }),
    );
    expect(usableSymbols(after, P1).filter((s) => s.symbol === "wild")).toHaveLength(1);
  });

  it("Gore prompts choose-enemy on roll", () => {
    const state = rollShowingSlot(installFace(newMatch(), GORE), 0);
    expect(state.pendingDecision?.type).toBe("choose-creature");
  });

  it("Needle prompts choose-enemy toxin on absorb", () => {
    const afterRoll = rollShowingSlot(installFace(newMatch(), NEEDLE), 0);
    expect(afterRoll.attackBonusThisTurn[P1]).toBe(1);
    const toxin = rolledSymbol(afterRoll, "toxin", dieIdOf(afterRoll));
    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: toxin.id,
      }),
    );
    expect(after.pendingDecision?.type).toBe("choose-creature");
  });

  it("Seep generates Toxin on roll and arms attack-toxin on absorb", () => {
    const afterRoll = rollShowingSlot(installFace(newMatch(), SEEP), 0);
    expect(
      usableSymbols(afterRoll, P1).filter((s) => s.symbol === "toxin" && s.sourceDieId === null),
    ).toHaveLength(1);
    const toxin = rolledSymbol(afterRoll, "toxin", dieIdOf(afterRoll));
    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: toxin.id,
      }),
    );
    expect(after.attackToxinThisTurn[P1]).toBe(1);
  });
});
