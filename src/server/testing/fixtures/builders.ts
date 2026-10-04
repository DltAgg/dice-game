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
  return registerOverlayCard({
    name: "Test Card",
    type: "modify",
    subtypes: [],
    forge: {
      faces: 1,
      target: "own-die",
    },
    rulesText: "Test.",
    ...overrides,
    id,
  });
}

export function testFace(overrides: WithStringId<FaceCardDefinition> = {}): FaceCardDefinition {
  const id = asFaceCardId(overrides.id ?? `face-test-${nextSuffix()}`);
  return registerOverlayFace({
    name: "Test Face",
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
  return registerOverlayCreature({
    name: "Test Creature",
    life: 10,
    passiveRulesText: "",
    attacks: [
      testAttack({
        id: `${id}-basic`,
      }),
    ],
    ...overrides,
    id,
  });
}

export const testNaturalFaceId = (name: string): FaceCardId =>
  asFaceCardId(`face-test-natural-${name}`);

export const asTestCardId = (slug: string): CardId => asCardId(`card-test-${slug}`);
export const asTestCreatureId = (slug: string): CreatureDefinitionId =>
  asCreatureDefinitionId(`creature-test-${slug}`);
export const asTestFaceId = (slug: string): FaceCardId => asFaceCardId(`face-test-${slug}`);
export const asTestAttackId = (slug: string): AttackId => asAttackId(`attack-test-${slug}`);
