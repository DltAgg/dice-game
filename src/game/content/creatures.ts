import type { CreatureDefinition } from "../model/creatures.js";
import {
  asAbilityId,
  asAttackId,
  asCreatureDefinitionId,
  type CreatureDefinitionId,
} from "../model/ids.js";

/**
 * Creatures from the Figma *Creature card* page (English printing) — the six
 * Slow-game-test cards. Passives and fuller special riders print in full; only
 * the damage line (and a few simple single-effect riders) are modelled.
 * Multi-clause attacks stay partial until attack `effects[]` exists — do not
 * approximate missing riders.
 *
 * Engine abilities on the aggro trio are vertical-slice absorb ↔ resolve hooks
 * (bible §31 placeholders), not Figma print.
 */

export const MINOTAUR: CreatureDefinitionId = asCreatureDefinitionId("creature-minotaur");
export const VARCOLAC: CreatureDefinitionId = asCreatureDefinitionId("creature-varcolac");
export const GARUDA: CreatureDefinitionId = asCreatureDefinitionId("creature-garuda");
export const ARCHMAGE: CreatureDefinitionId = asCreatureDefinitionId("creature-archmage");
export const CORRUPTING_ELDER: CreatureDefinitionId = asCreatureDefinitionId(
  "creature-corrupting-elder",
);
export const VOID_SUMMONER: CreatureDefinitionId = asCreatureDefinitionId(
  "creature-void-summoner",
);

const FIGMA_DEFINITIONS: readonly CreatureDefinition[] = [
  {
    id: MINOTAUR,
    name: "War Minotaur",
    life: 13,
    attributes: ["martial"],
    passiveRulesText: "Ignore 1 [Shield] on the target.",
    attacks: [
      {
        id: asAttackId("attack-minotaur-heavy-axe"),
        name: "Heavy Axe",
        kind: "basic",
        requires: { martial: 1 },
        range: false,
        rulesText: "Deal 3 damage.",
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-minotaur-poisoned-charge"),
        name: "Poisoned Charge",
        kind: "special",
        requires: { martial: 1, toxin: 1 },
        range: false,
        rulesText:
          "Deal 4 damage and 1 [Toxin] marker. If War Minotaur is in the back row, swap it with a frontline creature.",
        effect: { type: "damage", amount: 4, target: { kind: "declared-target" } },
      },
    ],
    engineAbilities: [
      {
        id: asAbilityId("ability-minotaur-bulwark"),
        name: "Bulwark",
        consumes: { martial: 1 },
        effect: { type: "grant-shield", amount: 1, target: { kind: "source-creature" } },
      },
    ],
  },
  {
    id: VARCOLAC,
    name: "Varcolac",
    life: 9,
    attributes: ["wild"],
    passiveRulesText: "On attack, another ally: this creature's next attack deals +1 damage.",
    standingAbilities: [
      {
        type: "on-attack",
        attackerRelation: "ally-other",
        effects: [
          {
            type: "grant-next-attack-bonus",
            amount: 1,
            target: { kind: "source-creature" },
          },
        ],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-varcolac-charge"),
        name: "Charge",
        kind: "basic",
        requires: { wild: 1 },
        range: false,
        rulesText: "Deal 2 damage.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-varcolac-coordinated-hunt"),
        name: "Coordinated Hunt",
        kind: "special",
        requires: { wild: 1, martial: 1 },
        range: false,
        rulesText:
          "Deal 4 damage. If another ally attacked this turn, [push] the target to the back row.",
        effect: { type: "damage", amount: 4, target: { kind: "declared-target" } },
      },
    ],
    engineAbilities: [
      {
        id: asAbilityId("ability-varcolac-hunt-call"),
        name: "Hunt Call",
        consumes: { wild: 1 },
        effect: { type: "generate-symbol", symbol: "martial", amount: 1 },
      },
    ],
  },
  {
    id: GARUDA,
    name: "Garuda",
    life: 7,
    attributes: ["wild"],
    passiveRulesText: "[Range] (May attack any position).",
    attacks: [
      {
        id: asAttackId("attack-garuda-dive"),
        name: "Dive",
        kind: "basic",
        requires: { wild: 1 },
        range: true,
        rulesText:
          "Deal 2 damage. On deal damage: you may swap Garuda with a frontline creature.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-garuda-bombardment"),
        name: "Bombardment",
        kind: "special",
        requires: { wild: 1, toxin: 1 },
        range: true,
        rulesText:
          "Deal 3 damage. Every enemy on the frontline receives 1 [Toxin] marker.",
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
      },
    ],
    engineAbilities: [
      {
        id: asAbilityId("ability-garuda-mend"),
        name: "Mend",
        consumes: { wild: 1 },
        effect: { type: "heal", amount: 2, target: { kind: "source-creature" } },
      },
    ],
  },
  {
    id: ARCHMAGE,
    name: "Archmage of the Runes",
    life: 8,
    attributes: ["arcane"],
    passiveRulesText:
      "The first [Tactic] [Arcane] used each turn costs 1 Energy less.",
    attacks: [
      {
        id: asAttackId("attack-archmage-arcane-burst"),
        name: "Arcane Burst",
        kind: "basic",
        requires: { arcane: 1 },
        range: false,
        rulesText: "Deal 2 damage. Draw 1 card.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-archmage-mystic-overload"),
        name: "Mystic Overload",
        kind: "special",
        requires: { arcane: 1, luminar: 1 },
        range: false,
        rulesText: "Deal 3 damage and grant 2 [Shields] to frontline creatures.",
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
      },
    ],
    engineAbilities: [],
  },
  {
    id: CORRUPTING_ELDER,
    name: "Corrupting Elder",
    life: 10,
    attributes: ["arcane"],
    passiveRulesText: "On opponent roll Corruption: deal 1 damage.",
    standingAbilities: [
      {
        type: "on-roll-symbol",
        symbol: "corruption",
        rollingPlayer: "opponent",
        effects: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-elder-decay-touch"),
        name: "Touch of Decay",
        kind: "basic",
        requires: { arcane: 1 },
        range: false,
        rulesText: "Deal 2 damage. The target loses 1 [Shield].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-elder-contamination"),
        name: "Contamination",
        kind: "special",
        requires: { arcane: 1, corruption: 1 },
        range: false,
        rulesText:
          "Deal 4 damage. [Forge] 1 [Corruption] face onto the opponent's die.",
        effect: { type: "damage", amount: 4, target: { kind: "declared-target" } },
      },
    ],
    engineAbilities: [],
  },
  {
    id: VOID_SUMMONER,
    name: "Void Summoner",
    life: 9,
    attributes: ["arcane"],
    passiveRulesText: "On absorb Natural: generate 1 Arcane.",
    standingAbilities: [
      {
        type: "on-absorb",
        absorberRelation: "any",
        faceKinds: ["natural"],
        effects: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-void-rupture"),
        name: "Rupture",
        kind: "basic",
        requires: { arcane: 1 },
        range: false,
        rulesText: "Deal 2 damage. [Convert] a symbol.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-void-dimensional-rift"),
        name: "Dimensional Rift",
        kind: "special",
        requires: { arcane: 1, darkness: 1 },
        range: false,
        rulesText: "Deal 3 damage. [Retain] a die.",
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
      },
    ],
    engineAbilities: [],
  },
];

export const CREATURES: Readonly<Record<string, CreatureDefinition>> = Object.fromEntries(
  FIGMA_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getCreatureDefinition = (id: CreatureDefinitionId): CreatureDefinition | undefined =>
  CREATURES[id];

/** The six Figma Slow-game-test creatures, in board order. */
export const ALL_CREATURES: readonly CreatureDefinition[] = FIGMA_DEFINITIONS;

/**
 * Builtin Aggro loadout squad: Martial / Wild pressure (bible §27).
 * Deployment order: Minotaur front, Varcolac mid, Garuda back.
 * Also the default scenario squad for combat / engine tests.
 */
export const PROTOTYPE_SQUAD: readonly CreatureDefinitionId[] = [MINOTAUR, VARCOLAC, GARUDA];

/**
 * Builtin Control loadout squad: Arcane engine (bible §27).
 * Deployment order: Archmage, Corrupting Elder, Void Summoner.
 */
export const CONTROL_SQUAD: readonly CreatureDefinitionId[] = [
  ARCHMAGE,
  CORRUPTING_ELDER,
  VOID_SUMMONER,
];
