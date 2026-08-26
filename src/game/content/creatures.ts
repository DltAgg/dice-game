import type { CreatureDefinition } from "../model/creatures.js";
import {
  asAttackId,
  asCreatureDefinitionId,
  type CreatureDefinitionId,
} from "../model/ids.js";

/**
 * Creatures from the Figma *Creature card* page (English printing) — the six
 * Slow-game-test cards. HP is a uniform +4 band over the original Figma Slow
 * print (playtest: skirmishes ended before control could interact). Passives
 * and multi-clause riders print in full; attack `effect` is the damage line.
 * Control attack resource riders are wired via `on-attack` + `attackKinds`
 * (no attack `effects[]` yet). Do not approximate missing riders.
 *
 * Plus authored Mechanical / Luminar creatures for Tempo and Combo Mechanical
 * constructed (not on builtin Aggro/Control squads), Nightbound Adept for
 * two-color Control (Arcane / Darkness), and Toxin / Corruption bodies for
 * the builtin Burn squad.
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

/** Luminar — Tempo glue: absorb → attack bonus, heal / ally buff. */
export const PRISM_HERALD: CreatureDefinitionId =
  asCreatureDefinitionId("creature-prism-herald");
/** Luminar — Combo glue: absorb / attack → generate Luminar. */
export const LENS_CHOIR: CreatureDefinitionId = asCreatureDefinitionId("creature-lens-choir");
/** Luminar — Tempo/support: Luminar discount + ally-attack heal. */
export const AEGIS_LINK: CreatureDefinitionId = asCreatureDefinitionId("creature-aegis-link");
/** Mechanical — Tempo: absorb → attack bonus; Overclock regenerates Mechanical. */
export const COGWORK_DRIVER: CreatureDefinitionId =
  asCreatureDefinitionId("creature-cogwork-driver");
/** Mechanical — Combo: absorb → generate Mechanical; Stamp Pulse re-fires dice. */
export const SERVO_ASSEMBLY: CreatureDefinitionId =
  asCreatureDefinitionId("creature-servo-assembly");
/** Mechanical — Combo: roll Mechanical → attack bonus; forge-discount special. */
export const CLOCKWORK_DYNAMO: CreatureDefinitionId =
  asCreatureDefinitionId("creature-clockwork-dynamo");
/** Darkness — Control closer/disruption: absorb hate + Darkness fuel. */
export const NIGHTBOUND_ADEPT: CreatureDefinitionId = asCreatureDefinitionId(
  "creature-nightbound-adept",
);

/** Toxin — Burn tank: enemy toxin ticks spread extra markers. */
export const MARROW_FIEND: CreatureDefinitionId =
  asCreatureDefinitionId("creature-marrow-fiend");
/** Corruption — Burn pinger: opponent turn-start damage. */
export const CINDER_WIGHT: CreatureDefinitionId =
  asCreatureDefinitionId("creature-cinder-wight");
/** Toxin — Burn converter: Toxin discount + absorb → apply Toxin. */
export const ICHOR_HYDRA: CreatureDefinitionId =
  asCreatureDefinitionId("creature-ichor-hydra");

const FIGMA_DEFINITIONS: readonly CreatureDefinition[] = [
  {
    id: MINOTAUR,
    name: "War Minotaur",
    life: 17,
    attributes: ["martial"],
    passiveRulesText: "[Pierce 1].",
    standingAbilities: [{ type: "ignore-shield", amount: 1 }],
    attacks: [
      {
        id: asAttackId("attack-minotaur-heavy-axe"),
        name: "Heavy Axe",
        kind: "basic",
        discards: { martial: 1 },
        range: false,
        rulesText: "[Strike 3].",
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-minotaur-war-charge"),
        name: "War Charge",
        kind: "special",
        requires: { martial: 1, wild: 1 },
        discards: { martial: 1 },
        range: false,
        rulesText:
          "[Strike 4]. If War Minotaur is in the back row, [Swap] with a frontline creature.",
        effect: { type: "damage", amount: 4, target: { kind: "declared-target" } },
        followUpEffects: [
          {
            type: "conditional",
            when: { type: "source-position", position: "back" },
            then: [{ type: "swap-positions", with: { kind: "choose-allied-frontline" } }],
          },
        ],
      },
    ],
  },
  {
    id: VARCOLAC,
    name: "Varcolac",
    life: 13,
    attributes: ["wild"],
    passiveRulesText: "On attack, another ally: [Frenzy] this creature.",
    standingAbilities: [
      {
        type: "on-attack",
        attackerRelation: "ally-other",
        effects: [
          {
            type: "grant-extra-attack",
            amount: 1,
            target: { kind: "source-creature" },
          },
        ],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [
          {
            type: "grant-extra-attack",
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
        discards: { wild: 1 },
        range: false,
        rulesText: "[Strike 2].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-varcolac-coordinated-hunt"),
        name: "Coordinated Hunt",
        kind: "special",
        requires: { wild: 1, martial: 1 },
        discards: { wild: 1 },
        range: false,
        rulesText: "[Strike 4]. [Frenzy].",
        effect: { type: "damage", amount: 4, target: { kind: "declared-target" } },
      },
    ],
  },
  {
    id: GARUDA,
    name: "Garuda",
    life: 11,
    attributes: ["wild"],
    passiveRulesText: "[Range] (May attack any position).",
    attacks: [
      {
        id: asAttackId("attack-garuda-dive"),
        name: "Dive",
        kind: "basic",
        discards: { wild: 1 },
        range: true,
        rulesText: "[Strike 2].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-garuda-bombardment"),
        name: "Bombardment",
        kind: "special",
        requires: { wild: 1, martial: 1 },
        discards: { wild: 1 },
        range: true,
        rulesText:
          "[Strike 3]. Every enemy on the frontline [Strip 1 Shield].",
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
        followUpEffects: [
          { type: "remove-shield", amount: 1, target: { kind: "enemy-frontline" } },
        ],
      },
    ],
  },
  {
    id: ARCHMAGE,
    name: "Archmage of the Runes",
    life: 12,
    attributes: ["arcane"],
    passiveRulesText:
      "The first [Arcane] card used each turn costs 1 Energy less.",
    standingAbilities: [
      {
        type: "energy-cost-discount",
        amount: 1,
        oncePerTurn: true,
        attributes: ["arcane"],
      },
      {
        type: "on-attack",
        attackKinds: ["basic"],
        effects: [{ type: "draw-cards", amount: 1 }],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [
          { type: "gain-energy", amount: 1 },
          { type: "generate-symbol", symbol: "arcane", amount: 1 },
        ],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-archmage-arcane-burst"),
        name: "Arcane Burst",
        kind: "basic",
        discards: { arcane: 1 },
        range: false,
        rulesText: "[Strike 2]. [Draw 1].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-archmage-mystic-overload"),
        name: "Mystic Overload",
        kind: "special",
        requires: { arcane: 1, darkness: 1 },
        discards: { arcane: 1 },
        range: false,
        rulesText: "[Strike 2]. [Gain 1 Energy]. [Generate 1 Arcane].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
    ],
  },
  {
    id: CORRUPTING_ELDER,
    name: "Corrupting Elder",
    life: 14,
    attributes: ["arcane"],
    passiveRulesText: "On opponent roll Corruption: [Strike 1].",
    standingAbilities: [
      {
        type: "on-roll-symbol",
        symbol: "corruption",
        rollingPlayer: "opponent",
        effects: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      },
      {
        type: "on-attack",
        attackKinds: ["basic"],
        effects: [
          { type: "remove-shield", amount: 1, target: { kind: "declared-target" } },
        ],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [{ type: "generate-symbol", symbol: "corruption", amount: 1 }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-elder-decay-touch"),
        name: "Touch of Decay",
        kind: "basic",
        discards: { arcane: 1 },
        range: false,
        rulesText: "[Strike 2]. [Strip 1 Shield].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-elder-contamination"),
        name: "Contamination",
        kind: "special",
        requires: { arcane: 1, corruption: 1 },
        discards: { corruption: 1 },
        range: false,
        rulesText: "[Strike 2]. [Generate 1 Corruption].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
    ],
  },
  {
    id: VOID_SUMMONER,
    name: "Void Summoner",
    life: 13,
    attributes: ["arcane"],
    passiveRulesText: "On absorb Natural: [Generate 1 Arcane].",
    standingAbilities: [
      {
        type: "on-absorb",
        absorberRelation: "ally",
        faceKinds: ["natural"],
        effects: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
      },
      {
        type: "on-attack",
        attackKinds: ["basic"],
        effects: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [
          { type: "gain-energy", amount: 1 },
          { type: "draw-cards", amount: 1 },
        ],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-void-rupture"),
        name: "Rupture",
        kind: "basic",
        discards: { arcane: 1 },
        range: false,
        rulesText: "[Strike 2]. [Generate 1 Arcane].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-void-dimensional-rift"),
        name: "Dimensional Rift",
        kind: "special",
        requires: { arcane: 1, darkness: 1 },
        discards: { darkness: 1 },
        range: false,
        rulesText: "[Strike 2]. [Gain 1 Energy]. [Draw 1].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
    ],
  },
];

/**
 * Mechanical / Luminar catalogue for Tempo and Combo Mechanical constructed.
 * Fully wired with existing `010` / `012` vocabulary — no deferred clauses.
 */
const TEMPO_COMBO_DEFINITIONS: readonly CreatureDefinition[] = [
  {
    id: PRISM_HERALD,
    name: "Prism Herald",
    life: 13,
    attributes: ["luminar"],
    passiveRulesText: "On absorb Luminar: [Empower 1] this creature.",
    standingAbilities: [
      {
        type: "on-absorb",
        symbols: ["luminar"],
        absorberRelation: "ally",
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
        id: asAttackId("attack-prism-herald-gleam"),
        name: "Gleam",
        kind: "basic",
        discards: { luminar: 1 },
        range: false,
        rulesText: "[Strike 2]. [Heal 1] on the most damaged ally.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
        followUpEffects: [
          { type: "heal", amount: 1, target: { kind: "most-damaged-ally" } },
        ],
      },
      {
        id: asAttackId("attack-prism-herald-concord"),
        name: "Concord",
        kind: "special",
        requires: { luminar: 1, mechanical: 1 },
        discards: { luminar: 1 },
        range: false,
        rulesText: "[Strike 2]. [Empower 1] on an allied creature.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
        followUpEffects: [
          {
            type: "grant-next-attack-bonus",
            amount: 1,
            target: { kind: "choose-ally" },
          },
        ],
      },
    ],
  },
  {
    id: LENS_CHOIR,
    name: "Lens Choir",
    life: 12,
    attributes: ["luminar"],
    passiveRulesText: "On absorb Luminar, once per turn: [Generate 1 Luminar].",
    standingAbilities: [
      {
        type: "on-absorb",
        symbols: ["luminar"],
        absorberRelation: "ally",
        oncePerTurn: true,
        effects: [{ type: "generate-symbol", symbol: "luminar", amount: 1 }],
      },
      {
        type: "on-attack",
        attackKinds: ["basic"],
        effects: [{ type: "generate-symbol", symbol: "luminar", amount: 1 }],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [
          { type: "gain-energy", amount: 1 },
          { type: "generate-symbol", symbol: "luminar", amount: 1 },
        ],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-lens-choir-focus"),
        name: "Focus Beam",
        kind: "basic",
        discards: { luminar: 1 },
        range: false,
        rulesText: "[Strike 1]. [Generate 1 Luminar].",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-lens-choir-cascade"),
        name: "Cascade",
        kind: "special",
        requires: { luminar: 1, wild: 1 },
        discards: { luminar: 1 },
        range: false,
        rulesText: "[Strike 2]. [Gain 1 Energy]. [Generate 1 Luminar].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
    ],
  },
  {
    id: AEGIS_LINK,
    name: "Aegis Link",
    life: 14,
    attributes: ["luminar"],
    passiveRulesText:
      "The first [Luminar] card used each turn costs 1 Energy less.\nOn attack, another ally: [Heal 1] on the most damaged ally.",
    standingAbilities: [
      {
        type: "energy-cost-discount",
        amount: 1,
        oncePerTurn: true,
        attributes: ["luminar"],
      },
      {
        type: "on-attack",
        attackerRelation: "ally-other",
        effects: [
          { type: "heal", amount: 1, target: { kind: "most-damaged-ally" } },
        ],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-aegis-link-ward-strike"),
        name: "Ward Strike",
        kind: "basic",
        discards: { luminar: 1 },
        range: false,
        rulesText: "[Strike 2]. [Mark 1 Shield] this creature.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
        followUpEffects: [
          { type: "grant-shield", amount: 1, target: { kind: "source-creature" } },
        ],
      },
      {
        id: asAttackId("attack-aegis-link-beacon"),
        name: "Beacon",
        kind: "special",
        requires: { luminar: 1, mechanical: 1 },
        discards: { luminar: 1 },
        range: false,
        rulesText: "[Strike 2]. [Prevent] on an allied creature.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
        followUpEffects: [
          {
            type: "grant-attack-prevent",
            amount: 1,
            target: { kind: "choose-ally" },
          },
        ],
      },
    ],
  },
  {
    id: COGWORK_DRIVER,
    name: "Cogwork Driver",
    life: 14,
    attributes: ["mechanical"],
    passiveRulesText: "On absorb Mechanical: [Empower 1] this creature.",
    standingAbilities: [
      {
        type: "on-absorb",
        symbols: ["mechanical"],
        absorberRelation: "ally",
        effects: [
          {
            type: "grant-next-attack-bonus",
            amount: 1,
            target: { kind: "source-creature" },
          },
        ],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-cogwork-driver-drive"),
        name: "Drive",
        kind: "basic",
        discards: { mechanical: 1 },
        range: false,
        rulesText: "[Strike 2].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-cogwork-driver-overclock"),
        name: "Overclock",
        kind: "special",
        requires: { mechanical: 1, luminar: 1 },
        discards: { mechanical: 1 },
        range: false,
        rulesText: "[Strike 3]. [Generate 1 Mechanical].",
        effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
      },
    ],
  },
  {
    id: SERVO_ASSEMBLY,
    name: "Servo Assembly",
    life: 13,
    attributes: ["mechanical"],
    passiveRulesText: "On absorb Mechanical: [Generate 1 Mechanical].",
    standingAbilities: [
      {
        type: "on-absorb",
        symbols: ["mechanical"],
        absorberRelation: "ally",
        effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      },
      {
        type: "on-attack",
        attackKinds: ["basic"],
        effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-servo-assembly-ratchet"),
        name: "Ratchet",
        kind: "basic",
        discards: { mechanical: 1 },
        range: false,
        rulesText: "[Strike 1]. [Generate 1 Mechanical].",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-servo-assembly-stamp-pulse"),
        name: "Stamp Pulse",
        kind: "special",
        requires: { mechanical: 2 },
        discards: { mechanical: 1 },
        range: false,
        rulesText: "[Strike 2]. [Stamp].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
        followUpEffects: [{ type: "reapply-die-modifiers" }],
      },
    ],
  },
  {
    id: CLOCKWORK_DYNAMO,
    name: "Clockwork Dynamo",
    life: 12,
    attributes: ["mechanical"],
    passiveRulesText: "On roll Mechanical: [Empower 1] this creature.",
    standingAbilities: [
      {
        type: "on-roll-symbol",
        symbol: "mechanical",
        rollingPlayer: "controller",
        effects: [
          {
            type: "grant-next-attack-bonus",
            amount: 1,
            target: { kind: "source-creature" },
          },
        ],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [{ type: "arm-forge-discount", amount: 1 }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-clockwork-dynamo-spark"),
        name: "Spark",
        kind: "basic",
        discards: { mechanical: 1 },
        range: false,
        rulesText: "[Strike 2].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-clockwork-dynamo-recalibrate"),
        name: "Recalibrate",
        kind: "special",
        requires: { mechanical: 1, luminar: 1 },
        discards: { mechanical: 1 },
        range: false,
        rulesText:
          "[Strike 2]. [Discount 1] forge.",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
    ],
  },
];

/**
 * Darkness catalogue creature for two-color Control (Arcane / Darkness).
 * Fully wired with existing `010` / `011` vocabulary — no deferred clauses.
 */
const CONTROL_REWORK_DEFINITIONS: readonly CreatureDefinition[] = [
  {
    id: NIGHTBOUND_ADEPT,
    name: "Nightbound Adept",
    life: 14,
    attributes: ["darkness"],
    passiveRulesText: "On absorb Darkness, once per turn: [Drain 1].",
    standingAbilities: [
      {
        type: "on-absorb",
        symbols: ["darkness"],
        absorberRelation: "ally",
        oncePerTurn: true,
        effects: [
          { type: "drain-attribute-tokens", amount: 1, target: { kind: "choose-enemy" } },
        ],
      },
      {
        type: "on-attack",
        attackKinds: ["basic"],
        effects: [{ type: "generate-symbol", symbol: "darkness", amount: 1 }],
      },
      {
        type: "on-attack",
        attackKinds: ["special"],
        effects: [{ type: "lose-energy", amount: 1, player: "opponent" }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-nightbound-adept-umbral-touch"),
        name: "Umbral Touch",
        kind: "basic",
        discards: { darkness: 1 },
        range: false,
        rulesText: "[Strike 2]. [Generate 1 Darkness].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-nightbound-adept-eclipse-pulse"),
        name: "Eclipse Pulse",
        kind: "special",
        requires: { arcane: 1, darkness: 1 },
        discards: { darkness: 1 },
        range: false,
        rulesText: "[Strike 2]. [Lose 1 Energy].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
    ],
  },
];

const BURN_DEFINITIONS: readonly CreatureDefinition[] = [
  {
    id: MARROW_FIEND,
    name: "Marrow Fiend",
    life: 15,
    attributes: ["toxin"],
    passiveRulesText:
      "On toxin damage: [Mark 1 Toxin] the opposing creature that took that damage.",
    standingAbilities: [
      {
        type: "on-toxin-damage",
        damagedOwner: "opponent",
        effects: [{ type: "apply-toxin", amount: 1, target: { kind: "declared-target" } }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-marrow-fiend-gnaw"),
        name: "Gnaw",
        kind: "basic",
        discards: { toxin: 1 },
        range: false,
        rulesText: "[Strike 2].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-marrow-fiend-spread-rot"),
        name: "Spread Rot",
        kind: "special",
        requires: { toxin: 2 },
        discards: { toxin: 1 },
        range: false,
        rulesText:
          "[Strike 1]. Every enemy on the frontline [Mark 1 Toxin].",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
        followUpEffects: [
          { type: "apply-toxin", amount: 1, target: { kind: "enemy-frontline" } },
        ],
      },
    ],
  },
  {
    id: CINDER_WIGHT,
    name: "Cinder Wight",
    life: 14,
    attributes: ["corruption"],
    passiveRulesText:
      "On start of opponent's turn: [Strike 1] the enemy with the most damage.",
    standingAbilities: [
      {
        type: "on-turn-start",
        whoseTurn: "opponent",
        effects: [{ type: "damage", amount: 1, target: { kind: "most-damaged-enemy" } }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-cinder-wight-cinder-touch"),
        name: "Cinder Touch",
        kind: "basic",
        discards: { corruption: 1 },
        range: false,
        rulesText: "[Strike 2].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
      },
      {
        id: asAttackId("attack-cinder-wight-brand"),
        name: "Brand",
        kind: "special",
        requires: { corruption: 1, toxin: 1 },
        discards: { corruption: 1 },
        range: false,
        rulesText: "[Strike 1]. [Mark 1 Toxin].",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
        followUpEffects: [
          { type: "apply-toxin", amount: 1, target: { kind: "declared-target" } },
        ],
      },
    ],
  },
  {
    id: ICHOR_HYDRA,
    name: "Ichor Hydra",
    life: 12,
    attributes: ["toxin"],
    passiveRulesText:
      "The first [Toxin] card used each turn costs 1 Energy less.\nOn absorb Toxin: [Mark 1 Toxin].",
    standingAbilities: [
      {
        type: "energy-cost-discount",
        amount: 1,
        oncePerTurn: true,
        attributes: ["toxin"],
      },
      {
        type: "on-absorb",
        symbols: ["toxin"],
        absorberRelation: "ally",
        effects: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
      },
    ],
    attacks: [
      {
        id: asAttackId("attack-ichor-hydra-fang"),
        name: "Fang",
        kind: "basic",
        discards: { toxin: 1 },
        range: false,
        rulesText: "[Strike 1]. [Mark 1 Toxin].",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
        followUpEffects: [
          { type: "apply-toxin", amount: 1, target: { kind: "declared-target" } },
        ],
      },
      {
        id: asAttackId("attack-ichor-hydra-molt-venom"),
        name: "Molt Venom",
        kind: "special",
        requires: { toxin: 1, corruption: 1 },
        discards: { toxin: 1 },
        range: false,
        rulesText: "[Strike 2]. [Mark 1 Toxin].",
        effect: { type: "damage", amount: 2, target: { kind: "declared-target" } },
        followUpEffects: [
          { type: "apply-toxin", amount: 1, target: { kind: "declared-target" } },
        ],
      },
    ],
  },
];

const ALL_DEFINITIONS: readonly CreatureDefinition[] = [
  ...FIGMA_DEFINITIONS,
  ...TEMPO_COMBO_DEFINITIONS,
  ...CONTROL_REWORK_DEFINITIONS,
  ...BURN_DEFINITIONS,
];

export const CREATURES: Readonly<Record<string, CreatureDefinition>> = Object.fromEntries(
  ALL_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getCreatureDefinition = (id: CreatureDefinitionId): CreatureDefinition | undefined =>
  CREATURES[id];

/** Figma Slow-game-test creatures plus Mechanical / Luminar Tempo–Combo catalogue. */
export const ALL_CREATURES: readonly CreatureDefinition[] = ALL_DEFINITIONS;

/**
 * Builtin Aggro loadout squad: Martial + Wild only (bible §27). Attack costs
 * spend Martial and/or Wild — no Toxin gates. Deployment order: Minotaur
 * front, Varcolac mid, Garuda back. Also the default scenario squad for
 * combat / engine tests.
 */
export const PROTOTYPE_SQUAD: readonly CreatureDefinitionId[] = [MINOTAUR, VARCOLAC, GARUDA];
/**
 * Builtin Control loadout squad: Arcane + Darkness engine (bible §27).
 * Deployment order: Archmage, Nightbound Adept, Void Summoner.
 * Attacks and passives spend Arcane and/or Darkness only — no Corruption or
 * Luminar attack costs. Corrupting Elder stays in the catalogue for other lists.
 */
export const CONTROL_SQUAD: readonly CreatureDefinitionId[] = [
  ARCHMAGE,
  NIGHTBOUND_ADEPT,
  VOID_SUMMONER,
];

/**
 * Builtin Tempo squad: Mechanical absorb→pressure + Luminar discount/sustain.
 * Deployment order: Cogwork Driver, Prism Herald, Aegis Link.
 */
export const TEMPO_SQUAD: readonly CreatureDefinitionId[] = [
  COGWORK_DRIVER,
  PRISM_HERALD,
  AEGIS_LINK,
];

/**
 * Builtin Combo Mechanical squad: Mech symbol loops + Luminar cascade glue.
 * Deployment order: Servo Assembly, Clockwork Dynamo, Lens Choir.
 */
export const COMBO_MECHANICAL_SQUAD: readonly CreatureDefinitionId[] = [
  SERVO_ASSEMBLY,
  CLOCKWORK_DYNAMO,
  LENS_CHOIR,
];

/**
 * Builtin Burn squad: Toxin / Corruption DoT vocabulary (bible §27).
 * Deployment order: Marrow Fiend front, Cinder Wight mid, Ichor Hydra back.
 */
export const BURN_SQUAD: readonly CreatureDefinitionId[] = [
  MARROW_FIEND,
  CINDER_WIGHT,
  ICHOR_HYDRA,
];
