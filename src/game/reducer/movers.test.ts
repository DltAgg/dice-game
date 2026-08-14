import { describe, expect, it } from "vitest";
import { HUNTERS_COLLAR } from "../content/cards.js";
import { asAttackId } from "../model/ids.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { createDraft } from "./draft.js";
import { drainResolution } from "./resolution.js";
import { setCreaturePosition } from "./zones.js";

const DIVE = asAttackId("attack-garuda-dive");
const POISONED_CHARGE = asAttackId("attack-minotaur-poisoned-charge");

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function equip(state: ReturnType<typeof newMatch>, creatureId: ReturnType<typeof creatureIdAt>) {
  return expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredTargetCreatureId: creatureId,
    }),
  );
}

describe("ally swap via Garuda Dive", () => {
  it("swaps Garuda (back) with Minotaur (frontline) and fires Collar on the bearer", () => {
    const base = actionsReady([HUNTERS_COLLAR]);
    const minotaurId = creatureIdAt(base, P1, 0);
    const garudaId = creatureIdAt(base, P1, 2);
    expect(base.creatures[minotaurId]?.position).toBe("frontline");
    expect(base.creatures[garudaId]?.position).toBe("back");

    let state = equip(base, garudaId);
    state = withPhase(withTokens(state, garudaId, { wild: 1 }), "actions");

    const afterAttack = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: garudaId,
        attackId: DIVE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(afterAttack.pendingDecision?.type).toBe("choose-creature");
    if (afterAttack.pendingDecision?.type === "choose-creature") {
      expect(afterAttack.pendingDecision.filter).toBe("allied-frontline");
    }

    const rejectEnemy = advance(afterAttack, {
      type: "RESOLVE_CHOOSE_CREATURE",
      playerId: P1,
      creatureId: creatureIdAt(afterAttack, P2, 0),
    });
    expect(rejectEnemy.ok).toBe(false);
    if (!rejectEnemy.ok) expect(rejectEnemy.error).toBe("INVALID_CHOICE");

    const afterSwap = expectOk(
      advance(afterAttack, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: minotaurId,
      }),
    );

    expect(afterSwap.creatures[garudaId]?.position).toBe("frontline");
    expect(afterSwap.creatures[minotaurId]?.position).toBe("back");
    const martial = usableSymbols(afterSwap, P1).filter((s) => s.symbol === "martial");
    expect(martial.length).toBe(1);
  });
});

describe("War Minotaur Poisoned Charge swap", () => {
  it("swaps when Minotaur attacks from the back row", () => {
    let state = withPhase(newMatch(), "actions");
    const minotaurId = creatureIdAt(state, P1, 0);
    const varcolacId = creatureIdAt(state, P1, 1);
    const garudaId = creatureIdAt(state, P1, 2);

    const draft = createDraft(state);
    // Place Minotaur in back; keep two frontline allies for a legal swap target.
    setCreaturePosition(draft, minotaurId, "back");
    setCreaturePosition(draft, garudaId, "frontline");
    draft.resolutionStack = [];
    state = draft;
    expect(state.creatures[minotaurId]?.position).toBe("back");
    expect(state.creatures[varcolacId]?.position).toBe("frontline");

    state = withTokens(state, minotaurId, { martial: 1, toxin: 1 });
    const afterAttack = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: minotaurId,
        attackId: POISONED_CHARGE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(afterAttack.pendingDecision?.type).toBe("choose-creature");
    const afterSwap = expectOk(
      advance(afterAttack, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: varcolacId,
      }),
    );
    expect(afterSwap.creatures[minotaurId]?.position).toBe("frontline");
    expect(afterSwap.creatures[varcolacId]?.position).toBe("back");
  });

  it("does not swap when Minotaur is already frontline", () => {
    let state = withPhase(newMatch(), "actions");
    const minotaurId = creatureIdAt(state, P1, 0);
    expect(state.creatures[minotaurId]?.position).toBe("frontline");
    state = withTokens(state, minotaurId, { martial: 1, toxin: 1 });

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: minotaurId,
        attackId: POISONED_CHARGE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(after.pendingDecision?.type).not.toBe("choose-creature");
    expect(after.creatures[minotaurId]?.position).toBe("frontline");
    expect(after.creatures[creatureIdAt(after, P2, 0)]?.toxinMarkers).toBe(1);
  });
});

describe("on-change-position", () => {
  it("fires once per creature that actually moved", () => {
    const base = actionsReady([HUNTERS_COLLAR]);
    const bearerId = creatureIdAt(base, P1, 0);
    const otherId = creatureIdAt(base, P1, 1);
    const equipped = equip(base, bearerId);

    const draft = createDraft(equipped);
    setCreaturePosition(draft, bearerId, "back");
    setCreaturePosition(draft, otherId, "back");
    drainResolution(draft);

    expect(draft.creatures[bearerId]?.position).toBe("back");
    expect(draft.creatures[otherId]?.position).toBe("back");
    // Only the Collar bearer generates Martial.
    const martial = usableSymbols(draft, P1).filter((s) => s.symbol === "martial");
    expect(martial.length).toBe(1);
  });

  it("does not fire when setCreaturePosition is a no-op", () => {
    const base = actionsReady([HUNTERS_COLLAR]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = equip(base, bearerId);

    const draft = createDraft(equipped);
    setCreaturePosition(draft, bearerId, "frontline");
    drainResolution(draft);

    expect(usableSymbols(draft, P1).filter((s) => s.symbol === "martial")).toHaveLength(0);
  });
});
