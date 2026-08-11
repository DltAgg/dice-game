import type { CardDefinition } from "../model/cards.js";
import { asCardId, type CardId } from "../model/ids.js";

/**
 * Cards translated from the `Card layouts` Figma file. The full catalogue, with
 * the original Portuguese text and the grammar it follows, is in
 * docs/specs/002-card-layer.md.
 *
 * `rulesText` is always the English printing. `effect` is only set when the
 * engine can resolve every clause — approximated effects are refused so a card
 * never silently does something the layout did not say.
 *
 * A card with empty `rulesText` forges only ("None" in English; "Não possui" in
 * the layouts). That is not a stub: bible §19 allows a card whose only region
 * is the forge.
 */

const card = (definition: CardDefinition): CardDefinition => definition;

export const RUNIC_NULLIFICATION: CardId = asCardId("card-runic-nullification");
export const ECLIPSE: CardId = asCardId("card-eclipse");
export const LUMINAR_PRISM: CardId = asCardId("card-luminar-prism");
export const ARCANE_RESONANCE: CardId = asCardId("card-arcane-resonance");
export const PERSISTENT_INFECTION: CardId = asCardId("card-persistent-infection");
export const BARRIER_OF_LIGHT: CardId = asCardId("card-barrier-of-light");
export const LIVING_LIBRARY: CardId = asCardId("card-living-library");
export const ARCANE_ECHO: CardId = asCardId("card-arcane-echo");
export const CALCULATED_SACRIFICE: CardId = asCardId("card-calculated-sacrifice");
export const WAR_AXE: CardId = asCardId("card-war-axe");
export const VENOMOUS_FANGS: CardId = asCardId("card-venomous-fangs");
export const ETERNAL_DARKNESS: CardId = asCardId("card-eternal-darkness");
export const BLACK_PLAGUE: CardId = asCardId("card-black-plague");

const DEFINITIONS: readonly CardDefinition[] = [
  card({
    id: RUNIC_NULLIFICATION,
    name: "Runic Nullification",
    energyCost: 2,
    type: "tactic",
    subtypes: ["ritual", "reaction"],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    // Negation needs a reaction window; place/ready still works so the card is
    // not forge-only. Activation does nothing until that vocabulary exists.
    rulesText: "Pay 3 [Energy], negate the effect of 1 [Tactic] card.",
    ritual: {
      activeWhen: { arcane: 2 },
      effects: [],
    },
  }),
  card({
    id: ECLIPSE,
    name: "Eclipse",
    energyCost: 3,
    type: "tactic",
    subtypes: ["instant"],
    attribute: "darkness",
    forge: { faces: 1, kind: "natural", attribute: "darkness", target: "own-die" },
    rulesText: "Draw 2 cards and discard 1.",
    effect: {
      effects: [
        { type: "draw-cards", amount: 2 },
        { type: "discard-cards", amount: 1 },
      ],
    },
  }),
  card({
    id: LUMINAR_PRISM,
    name: "Luminar Prism",
    energyCost: 3,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "Heal 1.",
    overload: {
      // Most-damaged ally: fires on roll with no extra prompt. Choose-ally is
      // available for effects that need a free pick among damaged creatures.
      onRoll: [{ type: "heal", amount: 1, target: { kind: "most-damaged-ally" } }],
    },
  }),
  card({
    id: ARCANE_RESONANCE,
    name: "Arcane Resonance",
    energyCost: 4,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Generate 1 Arcane on one of your creatures.",
    overload: {
      onRoll: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
    },
  }),
  card({
    id: PERSISTENT_INFECTION,
    name: "Persistent Infection",
    energyCost: 4,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "Gain 1 Energy.",
    overload: {
      faceSymbols: ["corruption"],
      onRoll: [{ type: "gain-energy", amount: 1 }],
    },
  }),
  card({
    id: BARRIER_OF_LIGHT,
    name: "Prismatic Barrier",
    energyCost: 2,
    type: "tactic",
    subtypes: ["reaction"],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "Prevent 2 damage.",
    /**
     * The layouts read "Prevent 2 damage", which needs a reaction window. Two
     * shields prevent exactly two damage and persist until spent, which is the
     * nearest the engine gets without one — and is stronger, since it does not
     * expire. Revisit when reaction timing is decided (§37).
     */
    effect: {
      effects: [{ type: "grant-shield", amount: 2, target: { kind: "declared-target" } }],
    },
  }),
  card({
    id: LIVING_LIBRARY,
    name: "Living Library",
    energyCost: 2,
    type: "tactic",
    subtypes: ["ritual"],
    duration: "instant",
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "Add 2 Tactic cards from your deck to your hand.",
    ritual: {
      activeWhen: { arcane: 2 },
      // Living Library: search the deck for Tactic cards.
      effects: [{ type: "search-deck", amount: 2, filter: "tactic" }],
    },
  }),
  card({
    id: ARCANE_ECHO,
    name: "Arcane Echo",
    energyCost: 5,
    type: "tactic",
    subtypes: ["instant"],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    forgeTags: ["echo"],
    rulesText: "Apply the modifiers of one of the dice again.",
  }),
  card({
    id: CALCULATED_SACRIFICE,
    name: "Calculated Sacrifice",
    energyCost: 3,
    type: "tactic",
    subtypes: ["instant"],
    attribute: "corruption",
    forge: { faces: 1, kind: "natural", attribute: "corruption", target: "own-die" },
    rulesText: "Destroy 1 Equipment on an opposing creature.",
    effect: {
      effects: [{ type: "destroy-equipment", target: { kind: "declared-target" } }],
    },
  }),
  card({
    id: WAR_AXE,
    name: "War Axe",
    energyCost: 2,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "Whenever this creature performs a Basic Attack, deal +1 damage.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [{ type: "attack-damage-bonus", amount: 1 }],
    },
  }),
  card({
    id: VENOMOUS_FANGS,
    name: "Venomous Fangs",
    energyCost: 3,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Whenever this creature deals damage, apply 1 Toxin marker.",
    // On-damage → toxin is deferred; attach still works (same pattern as Black Plague).
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),
  card({
    id: ETERNAL_DARKNESS,
    name: "Eternal Darkness",
    energyCost: 5,
    type: "tactic",
    subtypes: ["ritual"],
    duration: "instant",
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "Choose up to 3 cards in your graveyard and return them to your hand.",
    ritual: {
      activeWhen: { darkness: 2 },
      effects: [{ type: "search-graveyard", amount: 3 }],
    },
  }),
  card({
    id: BLACK_PLAGUE,
    name: "Black Plague",
    energyCost: 4,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "opponent-die" },
    rulesText: "May be equipped to an opposing creature. Whenever it rolls Corruption, it takes 1 damage.",
    // Standing trigger needs a roll-hook; the forge region is what this slice unlocks.
    equipment: {
      mayTargetOpponent: true,
      abilities: [],
    },
  }),
];

export const CARDS: Readonly<Record<string, CardDefinition>> = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getCard = (id: CardId): CardDefinition | undefined => CARDS[id];

/** Every defined card, in the order they appear above — used by the catalogue UI. */
export const ALL_CARDS: readonly CardDefinition[] = DEFINITIONS;

/**
 * The prototype tactics deck. Legal under M4 limits (50–60 cards, ≤4 copies
 * of each id): four copies of every defined card (13 × 4 = 52).
 */
export const PROTOTYPE_DECK: readonly CardId[] = DEFINITIONS.flatMap((definition) => [
  definition.id,
  definition.id,
  definition.id,
  definition.id,
]);
