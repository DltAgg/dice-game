import { ATTRIBUTES, type Attribute } from "../../model/attributes.js";
import type { CardDefinition } from "../../model/cards.js";
import type { CreatureDefinition } from "../../model/creatures.js";
import type { FaceCardDefinition, StartingDiceLayout } from "../../model/dice.js";
import type { CardId, CreatureDefinitionId, FaceCardId } from "../../model/ids.js";
import { SHIELD } from "../../model/symbols.js";
import {
  asTestAttackId,
  asTestCardId,
  asTestCreatureId,
  asTestFaceId,
  testAttack,
  testCard,
  testCreature,
  testFace,
  testNaturalFaceId,
} from "./builders.js";

export const TEST_SHIELD_FACE_ID: FaceCardId = asTestFaceId("untyped-shield");

export const TEST_SYNTHETIC_MECHANICAL_A: FaceCardId = asTestFaceId("synthetic-mechanical-a");
export const TEST_SYNTHETIC_MECHANICAL_B: FaceCardId = asTestFaceId("synthetic-mechanical-b");
export const TEST_SYNTHETIC_MECHANICAL_C: FaceCardId = asTestFaceId("synthetic-mechanical-c");
export const TEST_SYNTHETIC_LUMINAR_A: FaceCardId = asTestFaceId("synthetic-luminar-a");
export const TEST_SYNTHETIC_LUMINAR_B: FaceCardId = asTestFaceId("synthetic-luminar-b");
export const TEST_SYNTHETIC_LUMINAR_C: FaceCardId = asTestFaceId("synthetic-luminar-c");

export const TEST_BODY_A: CreatureDefinitionId = asTestCreatureId("body-a");
export const TEST_BODY_B: CreatureDefinitionId = asTestCreatureId("body-b");
export const TEST_LEGEND: CreatureDefinitionId = asTestCreatureId("legend");

export const TEST_CRANK = asTestAttackId("crank");
export const TEST_RETOOL = asTestAttackId("retool");
export const TEST_KINDLE = asTestAttackId("kindle");
export const TEST_VIGIL = asTestAttackId("vigil");
export const TEST_DRIVE_SHAFT = asTestAttackId("drive-shaft");

export const TEST_CRANK_FUEL = { mechanical: 1, luminar: 1 } as const;
export const TEST_RETOOL_FUEL = { mechanical: 2, luminar: 1 } as const;
export const TEST_KINDLE_FUEL = { luminar: 2 } as const;
export const TEST_DRIVE_SHAFT_FUEL = { mechanical: 1, luminar: 1, martial: 1 } as const;

export const TEST_SQUAD: readonly CreatureDefinitionId[] = [TEST_BODY_A, TEST_BODY_B, TEST_LEGEND];

export const TEST_FACE_DECK: readonly FaceCardId[] = [
  TEST_SYNTHETIC_MECHANICAL_A,
  TEST_SYNTHETIC_MECHANICAL_B,
  TEST_SYNTHETIC_MECHANICAL_C,
  TEST_SYNTHETIC_LUMINAR_A,
  TEST_SYNTHETIC_LUMINAR_B,
  TEST_SYNTHETIC_LUMINAR_C,
];

const openingDie = (): StartingDiceLayout[number] => [
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("luminar"),
  testNaturalFaceId("luminar"),
  testNaturalFaceId("martial"),
  TEST_SHIELD_FACE_ID,
];

export const TEST_STARTING_DICE: StartingDiceLayout = [openingDie(), openingDie()];

const DECK_FILLER_COUNT = 14;

export const TEST_DECK_FILLER_IDS: readonly CardId[] = Array.from(
  { length: DECK_FILLER_COUNT },
  (_, index) => asTestCardId(`deck-filler-${String(index)}`),
);

export const TEST_LEGAL_DECK: readonly CardId[] = TEST_DECK_FILLER_IDS.flatMap((id) => [id, id, id]);

function identityNatural(attribute: Attribute): FaceCardDefinition {
  return testFace({
    id: testNaturalFaceId(attribute),
    name: attribute,
    kind: "natural",
    symbol: attribute,
    rulesText: "",
  });
}

function namedSynthetic(id: FaceCardId, symbol: Attribute, name: string): FaceCardDefinition {
  return testFace({
    id,
    name,
    kind: "synthetic",
    symbol,
    rulesText: "",
  });
}

function fillerCard(id: CardId, index: number): CardDefinition {
  return testCard({
    id,
    name: `Test Filler ${String(index)}`,
    playCost: { mechanical: 2 },
    attribute: "mechanical",
    type: "instant",
    effect: { effects: [{ type: "draw-cards", amount: 1 }] },
  });
}

function bodyA(): CreatureDefinition {
  return testCreature({
    id: TEST_BODY_A,
    name: "Test Body A",
    life: 14,
    attributes: ["mechanical"],
    attacks: [
      testAttack({
        id: TEST_CRANK,
        name: "Crank",
        discards: { mechanical: 1, any: 1 },
        rulesText: "[Strike 2].",
      }),
      testAttack({
        id: TEST_RETOOL,
        name: "Retool",
        kind: "special",
        requires: { mechanical: 2, any: 1 },
        discards: { mechanical: 2 },
        rulesText: "[Strike 2].",
      }),
    ],
  });
}

function bodyB(): CreatureDefinition {
  return testCreature({
    id: TEST_BODY_B,
    name: "Test Body B",
    life: 13,
    attributes: ["luminar"],
    attacks: [
      testAttack({
        id: TEST_KINDLE,
        name: "Kindle",
        discards: { luminar: 2 },
        rulesText: "[Strike 2].",
      }),
      testAttack({
        id: TEST_VIGIL,
        name: "Vigil",
        kind: "special",
        requires: { luminar: 2, any: 1 },
        discards: { luminar: 2 },
        rulesText: "[Strike 2].",
      }),
    ],
  });
}

function legend(): CreatureDefinition {
  return testCreature({
    id: TEST_LEGEND,
    name: "Test Legend",
    life: 12,
    attributes: ["mechanical", "luminar"],
    legendary: true,
    attacks: [
      testAttack({
        id: TEST_DRIVE_SHAFT,
        name: "Drive Shaft",
        discards: { mechanical: 1, luminar: 1, any: 1 },
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
        rulesText: "[Strike 3].",
      }),
    ],
  });
}

/** Registers identity faces, a synthetic pool, a legal squad, and a 42-card deck. */
export function installDefaultTestCatalogue(): void {
  for (const attribute of ATTRIBUTES) identityNatural(attribute);
  testFace({
    id: TEST_SHIELD_FACE_ID,
    name: "Shield",
    kind: "untyped",
    symbol: SHIELD,
    rulesText: "",
  });
  namedSynthetic(TEST_SYNTHETIC_MECHANICAL_A, "mechanical", "Synthetic Mechanical A");
  namedSynthetic(TEST_SYNTHETIC_MECHANICAL_B, "mechanical", "Synthetic Mechanical B");
  namedSynthetic(TEST_SYNTHETIC_MECHANICAL_C, "mechanical", "Synthetic Mechanical C");
  namedSynthetic(TEST_SYNTHETIC_LUMINAR_A, "luminar", "Synthetic Luminar A");
  namedSynthetic(TEST_SYNTHETIC_LUMINAR_B, "luminar", "Synthetic Luminar B");
  namedSynthetic(TEST_SYNTHETIC_LUMINAR_C, "luminar", "Synthetic Luminar C");
  bodyA();
  bodyB();
  legend();
  TEST_DECK_FILLER_IDS.forEach((id, index) => fillerCard(id, index));
}

export const TEST_PLAYABLE: CardId = asTestCardId("playable");
export const TEST_REACTION_PREVENT: CardId = asTestCardId("reaction-prevent");
export const TEST_NATURAL_FORGE: CardId = asTestCardId("natural-forge");
export const TEST_REQUIRES_GATE: CardId = asTestCardId("requires-gate");
export const TEST_OVERCHARGE_ARCANE: CardId = asTestCardId("overcharge-arcane");
export const TEST_OVERCHARGE_MECHANICAL: CardId = asTestCardId("overcharge-mechanical");

export function installSharedBehaviorCards(): void {
  testCard({
    id: TEST_PLAYABLE,
    name: "Test Playable",
    playCost: { mechanical: 2 },
    attribute: "mechanical",
    type: "instant",
    effect: {
      effects: [
        { type: "generate-symbol", symbol: "mechanical", amount: 2 },
        { type: "draw-cards", amount: 1 },
      ],
    },
  });
  testCard({
    id: TEST_REACTION_PREVENT,
    name: "Test Reaction Prevent",
    playCost: { luminar: 1 },
    attribute: "luminar",
    type: "reaction",
    forge: { faces: 1, kind: "synthetic", attribute: "luminar", target: "own-die" },
    effect: {
      effects: [
        { type: "grant-attack-prevent", amount: 1, target: { kind: "chain-attack-target" } },
      ],
    },
  });
  testCard({
    id: TEST_NATURAL_FORGE,
    name: "Test Natural Forge",
    playCost: { luminar: 2 },
    attribute: "luminar",
    type: "instant",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    effect: { effects: [{ type: "draw-cards", amount: 1 }] },
  });
  testCard({
    id: TEST_REQUIRES_GATE,
    name: "Test Requires Gate",
    playCost: { mechanical: 2 },
    attribute: "mechanical",
    type: "instant",
    forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    effect: {
      requires: { mechanical: 2 },
      effects: [{ type: "draw-cards", amount: 1 }],
    },
  });
  testCard({
    id: TEST_OVERCHARGE_ARCANE,
    name: "Test Overcharge Arcane",
    playCost: { arcane: 2 },
    attribute: "arcane",
    type: "instant",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    effect: { effects: [{ type: "draw-cards", amount: 1 }] },
  });
  testCard({
    id: TEST_OVERCHARGE_MECHANICAL,
    name: "Test Overcharge Mechanical",
    playCost: { mechanical: 2 },
    attribute: "mechanical",
    type: "instant",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    effect: { effects: [{ type: "draw-cards", amount: 1 }] },
  });
}
