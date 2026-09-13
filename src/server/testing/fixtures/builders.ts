import type { CardDefinition } from "../../model/cards.js";
import type { AttackDefinition, CreatureDefinition } from "../../model/creatures.js";
import type { FaceCardDefinition } from "../../model/dice.js";
import {
  asAttackId,
  asCardId,
  asCreatureDefinitionId,
  asFaceCardId,
  type AttackId,
  type CardId,
  type CreatureDefinitionId,
  type FaceCardId,
} from "../../model/ids.js";
import type { Attribute } from "../../model/attributes.js";
import {
  registerOverlayCard,
  registerOverlayCreature,
  registerOverlayFace,
} from "../../content/runtimeOverlay.js";

let autoSeq = 0;

const nextSuffix = (): string => {
  autoSeq += 1;
  return String(autoSeq);
};

type WithStringId<T> = Omit<Partial<T>, "id"> & { readonly id?: string };

export function testCard(overrides: WithStringId<CardDefinition> = {}): CardDefinition {
  const id = asCardId(overrides.id ?? `card-test-${nextSuffix()}`);
  const attribute = overrides.attribute ?? "mechanical";
  return registerOverlayCard({
    name: "Test Card",
    playCost: { [attribute]: 2 },
    type: "instant",
    subtypes: [],
    attribute,
    forge: {
      faces: 1,
      kind: "synthetic",
      attribute,
      target: "own-die",
    },
    rulesText: "Test.",
    ...overrides,
    id,
  });
}

export function testFace(overrides: WithStringId<FaceCardDefinition> = {}): FaceCardDefinition {
  const id = asFaceCardId(overrides.id ?? `face-test-${nextSuffix()}`);
  const symbol = overrides.symbol ?? "mechanical";
  const kind = overrides.kind ?? (symbol === "shield" ? "untyped" : "synthetic");
  return registerOverlayFace({
    name: "Test Face",
    kind,
    symbol,
    rulesText: "",
    onRoll: [],
    onAbsorb: [],
    maxOverloads: 1,
    forgeRestriction: null,
    ...overrides,
    id,
  });
}

export function testAttack(overrides: WithStringId<AttackDefinition> = {}): AttackDefinition {
  const id = asAttackId(overrides.id ?? `attack-test-${nextSuffix()}`);
  return {
    name: "Test Strike",
    kind: "basic",
    range: false,
    rulesText: "[Strike 2].",
    effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
    ...overrides,
    id,
  };
}

export function testCreature(overrides: WithStringId<CreatureDefinition> = {}): CreatureDefinition {
  const id = asCreatureDefinitionId(overrides.id ?? `creature-test-${nextSuffix()}`);
  const attributes = overrides.attributes ?? (["mechanical"] as const);
  return registerOverlayCreature({
    name: "Test Creature",
    life: 10,
    attributes: [...attributes],
    passiveRulesText: "",
    attacks: [
      testAttack({
        id: `${id}-basic`,
        discards: { [attributes[0] ?? "mechanical"]: 1 },
      }),
    ],
    ...overrides,
    id,
  });
}

export const testNaturalFaceId = (attribute: Attribute): FaceCardId =>
  asFaceCardId(`face-test-natural-${attribute}`);

export const asTestCardId = (slug: string): CardId => asCardId(`card-test-${slug}`);
export const asTestCreatureId = (slug: string): CreatureDefinitionId =>
  asCreatureDefinitionId(`creature-test-${slug}`);
export const asTestFaceId = (slug: string): FaceCardId => asFaceCardId(`face-test-${slug}`);
export const asTestAttackId = (slug: string): AttackId => asAttackId(`attack-test-${slug}`);
