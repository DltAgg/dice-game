import { describe, expect, it } from "vitest";
import { HUNTERS_COLLAR, PREDATORS_CLAWS } from "../content/cards.js";
import { asSymbolInstanceId, type CreatureId } from "../model/ids.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function equip(state: ReturnType<typeof newMatch>, creatureId: CreatureId, handIndex = 0) {
  return expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, handIndex),
      declaredTargetCreatureId: creatureId,
    }),
  );
}

describe("reposition via setCreaturePosition", () => {
  it("moves the Claws bearer and fires Hunter's Collar", () => {
    const base = actionsReady([PREDATORS_CLAWS, HUNTERS_COLLAR]);
    const bearerId = creatureIdAt(base, P1, 0);
    let state = equip(base, bearerId, 0);
    state = equip(withHand(withPhase(state, "actions"), P1, [HUNTERS_COLLAR]), bearerId, 0);
    expect(state.creatures[bearerId]?.position).toBe("frontline");

    const symbolId = asSymbolInstanceId("sym-wild-move");
    state = withPhase(
      {
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
      },
      "absorption",
    );

    const absorbed = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, creatureId: bearerId, symbolId }),
    );
    expect(absorbed.pendingDecision?.type).toBe("choose-creature");

    const moved = expectOk(
      advance(absorbed, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: bearerId,
      }),
    );

    expect(moved.creatures[bearerId]?.position).toBe("back");
    expect(usableSymbols(moved, P1).some((symbol) => symbol.symbol === "martial")).toBe(true);
    expect(eventTypes(moved)).toContain("choose-creature-resolved");
  });

  it("lets an optional reposition be declined", () => {
    const base = actionsReady([PREDATORS_CLAWS]);
    const bearerId = creatureIdAt(base, P1, 0);
    let state = equip(base, bearerId);
    const symbolId = asSymbolInstanceId("sym-wild-skip");
    state = withPhase(
      {
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
      },
      "absorption",
    );

    const absorbed = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, creatureId: bearerId, symbolId }),
    );
    const declined = expectOk(
      advance(absorbed, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: null,
      }),
    );

    expect(declined.creatures[bearerId]?.position).toBe("frontline");
    expect(declined.pendingDecision).toBeNull();
  });
});
