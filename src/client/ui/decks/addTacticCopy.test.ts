import { describe, expect, it } from "vitest";
import { TAG_FIGHTER_RULES, TAG_SKIRMISH_LOADOUT, asCardId, type CardId } from "@server";
import type { DeckDraft } from "@client/decks";
import { deckAfterTacticAdd } from "./addTacticCopy.js";

const PARRY = asCardId("card-parry");
const BRACE = asCardId("card-brace");
const SHIFT = asCardId("card-shift");
const OPEN_PALM = asCardId("card-open-palm");
const ANCHOR = asCardId("card-anchor");

function draftWith(deck: readonly CardId[]): DeckDraft {
  return {
    name: "Probe",
    squad: TAG_SKIRMISH_LOADOUT.squad,
    deck,
    faceDeck: TAG_SKIRMISH_LOADOUT.faceDeck,
    startingDice: TAG_SKIRMISH_LOADOUT.startingDice,
  };
}

function three(id: CardId): CardId[] {
  return [id, id, id];
}

describe("deckAfterTacticAdd", () => {
  it("refuses a further combat card and shows the engine reason", () => {
    const deck = [...three(PARRY), ...three(BRACE), ...three(SHIFT), OPEN_PALM];
    const draft = draftWith(deck);
    const result = deckAfterTacticAdd(draft, PARRY, 4);
    expect(result.deck).toBe(draft.deck);
    expect(result.refusedReason).toBe("tactics deck has 10 response combat cards, max 9");
  });

  it("adds a non-combat card while the combat cap is full", () => {
    const deck = [...three(PARRY), ...three(BRACE), ...three(SHIFT), OPEN_PALM];
    const result = deckAfterTacticAdd(draftWith(deck), OPEN_PALM, 3);
    expect(result.refusedReason).toBeNull();
    expect(result.deck).toEqual([...deck, OPEN_PALM]);
  });

  it("keeps a deck-size add, and a copy-cap add does not change the list", () => {
    const deck = Array.from({ length: TAG_FIGHTER_RULES.deckMaxCards }, () => OPEN_PALM);
    expect(deck).toHaveLength(40);
    const grown = deckAfterTacticAdd(draftWith(deck), ANCHOR, 3);
    expect(grown.refusedReason).toBeNull();
    expect(grown.deck).toEqual([...deck, ANCHOR]);

    const capped = draftWith(three(PARRY));
    const same = deckAfterTacticAdd(capped, PARRY, 3);
    expect(same.deck).toBe(capped.deck);
    expect(same.refusedReason).toBeNull();
  });
});
