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
 *
 * TEMP (2026-08-13): printed `?` Energy costs are authored as fixed `energyCost: 2`
 * (no `variableEnergy`) until variable spend UX / scaling effects are wired.
 * Restore `variableEnergy: true` with minimum 1 when that lands — see
 * docs/OPEN_DESIGN.md and resolveEnergyPayment.
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
export const GREAT_CONTAMINATION: CardId = asCardId("card-great-contamination");
export const EXTERMINATION: CardId = asCardId("card-extermination");
export const PARADOX: CardId = asCardId("card-paradox");
export const LATENT_CORRUPTION: CardId = asCardId("card-latent-corruption");
export const ARCANE_AMPLIFIER: CardId = asCardId("card-arcane-amplifier");
export const LUMINAR_JUDGEMENT: CardId = asCardId("card-luminar-judgement");
export const GLIMMER: CardId = asCardId("card-glimmer");
export const COLLAPSE_OF_REALITY: CardId = asCardId("card-collapse-of-reality");
export const DARK_PACT: CardId = asCardId("card-dark-pact");
export const MIND_CONTROL: CardId = asCardId("card-mind-control");
export const ARCANE_SILENCE: CardId = asCardId("card-arcane-silence");
export const RITUAL_OF_CONTAMINATION: CardId = asCardId("card-ritual-of-contamination");
export const BLADE_OF_SERENE_LIGHT: CardId = asCardId("card-blade-of-serene-light");
export const ARCHMAGES_GRIMOIRE: CardId = asCardId("card-archmages-grimoire");
export const TOME_OF_INTERDICTION: CardId = asCardId("card-tome-of-interdiction");
export const ABYSSAL_SACRIFICE: CardId = asCardId("card-abyssal-sacrifice");
export const MIRRORED_RUNE: CardId = asCardId("card-mirrored-rune");
export const BLESSING_OF_THE_HUNT: CardId = asCardId("card-blessing-of-the-hunt");
export const MARTIAL_BLESSING: CardId = asCardId("card-martial-blessing");
export const TOXIC_BLESSING: CardId = asCardId("card-toxic-blessing");
export const MUTANT_SPORES: CardId = asCardId("card-mutant-spores");
export const WILD_ECHO: CardId = asCardId("card-wild-echo");
export const ADRENALINE: CardId = asCardId("card-adrenaline");
export const RUST: CardId = asCardId("card-rust");
export const PREDATORS_CLAWS: CardId = asCardId("card-predators-claws");
export const SERRATED_STINGER: CardId = asCardId("card-serrated-stinger");
export const WAR_BANNER: CardId = asCardId("card-war-banner");
export const ALPHAS_HIDE: CardId = asCardId("card-alphas-hide");
export const TOXIC_HEART: CardId = asCardId("card-toxic-heart");
export const HUNTERS_COLLAR: CardId = asCardId("card-hunters-collar");
export const INSIGNIA_OF_COMMAND: CardId = asCardId("card-insignia-of-command");
export const HUNTING_ARMOUR: CardId = asCardId("card-hunting-armour");
export const TWIN_BLADES: CardId = asCardId("card-twin-blades");
export const WILD_CARAPACE: CardId = asCardId("card-wild-carapace");
export const RATCHET: CardId = asCardId("card-ratchet");
export const ASSEMBLY_LINE: CardId = asCardId("card-assembly-line");
export const GOVERNOR: CardId = asCardId("card-governor");
export const SPARE_COG: CardId = asCardId("card-spare-cog");
export const DIE_PRESS: CardId = asCardId("card-die-press");
export const FOUNDRY: CardId = asCardId("card-foundry");
export const TRANSMISSION: CardId = asCardId("card-transmission");
export const CAMSHAFT: CardId = asCardId("card-camshaft");
export const SERVOMOTOR: CardId = asCardId("card-servomotor");
export const SAFETY_LATCH: CardId = asCardId("card-safety-latch");
export const BLUEPRINT: CardId = asCardId("card-blueprint");
export const STAMP: CardId = asCardId("card-stamp");
export const COUPLING: CardId = asCardId("card-coupling");
export const CLOCKWORK: CardId = asCardId("card-clockwork");
export const RECALIBRATE: CardId = asCardId("card-recalibrate");
export const REFORGE: CardId = asCardId("card-reforge");
export const TEMPER: CardId = asCardId("card-temper");
export const OPENING_CUT: CardId = asCardId("card-opening-cut");
export const PRESS_THE_ATTACK: CardId = asCardId("card-press-the-attack");
export const RIPOSTE: CardId = asCardId("card-riposte");
export const WHETSTONE: CardId = asCardId("card-whetstone");
export const UNTAMED: CardId = asCardId("card-untamed");
export const POUNCE: CardId = asCardId("card-pounce");
export const PACK_SURGE: CardId = asCardId("card-pack-surge");
export const RENDING_MARK: CardId = asCardId("card-rending-mark");
export const SNARL: CardId = asCardId("card-snarl");
export const DOSE: CardId = asCardId("card-dose");
export const BLIGHT_STRIKE: CardId = asCardId("card-blight-strike");
export const CALL_TO_ARMS: CardId = asCardId("card-call-to-arms");
export const BATTLE_HYMN: CardId = asCardId("card-battle-hymn");
export const PACK_LAW: CardId = asCardId("card-pack-law");
export const VIRULENT_RITE: CardId = asCardId("card-virulent-rite");
export const SIPHON_SIGIL: CardId = asCardId("card-siphon-sigil");
export const DISPEL_CIRCLE: CardId = asCardId("card-dispel-circle");
export const SEAL_THE_RITE: CardId = asCardId("card-seal-the-rite");
export const FADE: CardId = asCardId("card-fade");

const DEFINITIONS: readonly CardDefinition[] = [
  // --- Early wired / partial entries (some also appear in PROTOTYPE_DECK) ---
  card({
    id: RUNIC_NULLIFICATION,
    name: "Runic Nullification",
    energyCost: 2,
    type: "ritual",
    subtypes: ["reaction"],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "Pay 3 [Energy], negate the effect of 1 Instant card.",
    ritual: {
      activeWhen: { arcane: 2 },
      additionalEnergy: 3,
      effects: [{ type: "negate-card", cardTypes: ["instant"] }],
    },
  }),
  card({
    id: ECLIPSE,
    name: "Eclipse",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
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
    type: "overload",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "On roll: heal 1.",
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
    type: "overload",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "On roll: generate 1 Arcane.",
    overload: {
      onRoll: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
    },
  }),
  card({
    id: PERSISTENT_INFECTION,
    name: "Persistent Infection",
    energyCost: 4,
    type: "overload",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "Can only overload a Corruption face.\nOn roll: gain 1 Energy.",
    overload: {
      faceSymbols: ["corruption"],
      onRoll: [{ type: "gain-energy", amount: 1 }],
    },
  }),
  card({
    id: BARRIER_OF_LIGHT,
    name: "Prismatic Barrier",
    energyCost: 2,
    type: "reaction",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "Prevent 2 damage.",
    effect: {
      effects: [
        { type: "grant-damage-prevent", amount: 2, target: { kind: "chain-attack-target" } },
      ],
    },
  }),
  card({
    id: LIVING_LIBRARY,
    name: "Living Library",
    energyCost: 2,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "Add 2 Instant or Ritual cards from your deck to your hand.",
    ritual: {
      activeWhen: { arcane: 2 },
      // Living Library: Instant or Ritual from deck.
      effects: [{ type: "search-deck", amount: 2, filter: ["instant", "ritual"] }],
    },
  }),
  card({
    id: ARCANE_ECHO,
    name: "Arcane Echo",
    energyCost: 5,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    forgeTags: ["echo"],
    rulesText: "Apply the modifiers of one of the dice again.",
    effect: {
      effects: [{ type: "reapply-die-modifiers" }],
    },
  }),
  card({
    id: CALCULATED_SACRIFICE,
    name: "Calculated Sacrifice",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "Destroy 1 Equipment on an opposing creature.",
    effect: {
      effects: [{ type: "destroy-equipment", target: { kind: "declared-target" } }],
    },
  }),
  card({
    id: WAR_AXE,
    name: "War Axe",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On basic attack: deal +1 damage.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [{ type: "attack-damage-bonus", amount: 1, attackKinds: ["basic"] }],
    },
  }),
  card({
    id: VENOMOUS_FANGS,
    name: "Venomous Fangs",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "On deal damage: apply 1 Toxin marker.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-deal-damage",
          effects: [{ type: "apply-toxin", amount: 1, target: { kind: "declared-target" } }],
        },
      ],
    },
  }),
  card({
    id: ETERNAL_DARKNESS,
    name: "Eternal Darkness",
    energyCost: 5,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "darkness",
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
    type: "equipment",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "opponent-die" },
    rulesText:
      "May be equipped to an opposing creature.\nOn roll Corruption: this creature takes 1 damage.",
    equipment: {
      mayTargetOpponent: true,
      abilities: [
        {
          type: "on-roll-symbol",
          symbol: "corruption",
          rollingPlayer: "controller",
          effects: [{ type: "damage", amount: 1, target: { kind: "source-creature" } }],
        },
      ],
    },
  }),

  // --- Control deck (remaining) ---
  card({
    id: GREAT_CONTAMINATION,
    name: "Great Contamination",
    energyCost: 5,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Forge 3 Synthetic Corruption faces on one of the opponent's dice.",
    ritual: {
      activeWhen: { arcane: 1, corruption: 2 },
      effects: [
        {
          type: "forge-faces",
          faces: 3,
          kind: "synthetic",
          attribute: "corruption",
          target: "opponent-die",
        },
      ],
    },
  }),
  card({
    id: EXTERMINATION,
    name: "Extermination",
    energyCost: 6,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Consume every Synthetic Corruption face from one die of one player and deal twice the number consumed as damage, split across up to 2 creatures.",
    ritual: {
      activeWhen: { corruption: 3 },
      effects: [{ type: "extermination" }],
    },
  }),
  card({
    id: PARADOX,
    name: "Paradox",
    energyCost: 3,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText:
      "Choose 1 Instant or Ritual card in your graveyard and use its effect immediately, ignoring its requirements.",
    // No Active when on print; place/ready still works.
    ritual: {
      effects: [{ type: "replay-graveyard-tactic" }],
    },
  }),
  card({
    id: LATENT_CORRUPTION,
    name: "Latent Corruption",
    energyCost: 4,
    type: "overload",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "Can only overload an Arcane face.\nOn roll: generate 1 additional Arcane.",
    overload: {
      faceSymbols: ["arcane"],
      onRoll: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
    },
  }),
  card({
    id: ARCANE_AMPLIFIER,
    name: "Arcane Amplifier",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Can only overload an Arcane face.\nOn roll: generate 1 additional Arcane.",
    overload: {
      faceSymbols: ["arcane"],
      onRoll: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
    },
  }),
  card({
    id: LUMINAR_JUDGEMENT,
    name: "Luminar Judgement",
    energyCost: 4,
    type: "reaction",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText:
      "On ally would take damage: prevent it; if you do, deal that much to the attacking creature.",
    effect: {
      effects: [{ type: "prevent-attack-reflect" }],
    },
  }),
  card({
    id: GLIMMER,
    name: "Glimmer",
    energyCost: 2,
    type: "reaction",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "synthetic", attribute: "luminar", target: "own-die" },
    rulesText: "On prevent damage: draw 2 cards.",
    effect: {
      effects: [{ type: "arm-prevent-draw", amount: 2 }],
    },
  }),
  card({
    id: COLLAPSE_OF_REALITY,
    name: "Collapse of Reality",
    energyCost: 4,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Convert up to two symbols into any other 2 Natural symbols.",
    effect: {
      effects: [{ type: "convert-symbols", amount: 2 }],
    },
  }),
  card({
    id: DARK_PACT,
    name: "Dark Pact",
    energyCost: 4,
    type: "instant",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "Send 2 Ritual cards of different attributes from your deck to the graveyard.",
    effect: {
      effects: [{ type: "dark-pact" }],
    },
  }),
  card({
    id: MIND_CONTROL,
    name: "Mind Control",
    energyCost: 6,
    type: "instant",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Choose one: remove every Overload from 1 opposing face; or remove 1 Overload from up to 2 opposing faces.",
    effect: {
      effects: [{ type: "mind-control" }],
    },
  }),
  card({
    id: ARCANE_SILENCE,
    name: "Arcane Silence",
    energyCost: 5,
    type: "reaction",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 2, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "Negate the effect of 1 card.",
    effect: {
      effects: [{ type: "negate-card", cardTypes: "any" }],
    },
  }),
  card({
    id: RITUAL_OF_CONTAMINATION,
    name: "Ritual of Contamination",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "Forge 1 Synthetic Corruption face on the opponent's die.",
    effect: {
      requires: { arcane: 1, corruption: 1 },
      effects: [
        {
          type: "forge-faces",
          faces: 1,
          kind: "synthetic",
          attribute: "corruption",
          target: "opponent-die",
        },
      ],
    },
  }),
  card({
    id: BLADE_OF_SERENE_LIGHT,
    name: "Blade of Serene Light",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "On deal damage: heal 1 on an allied creature.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-deal-damage",
          effects: [{ type: "heal", amount: 1, target: { kind: "choose-ally" } }],
        },
      ],
    },
  }),
  card({
    id: ARCHMAGES_GRIMOIRE,
    name: "Archmage's Grimoire",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText:
      "Can only equip an Arcane or Darkness creature.\n" +
      "On absorb Arcane or Darkness: draw 1 card and discard 1.",
    equipment: {
      mayTargetOpponent: false,
      creatureAttributes: ["arcane", "darkness"],
      abilities: [
        {
          type: "on-absorb",
          symbols: ["arcane", "darkness"],
          effects: [
            { type: "draw-cards", amount: 1 },
            { type: "discard-cards", amount: 1 },
          ],
        },
      ],
    },
  }),
  card({
    id: TOME_OF_INTERDICTION,
    name: "Tome of Interdiction",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "The first Instant Arcane used each turn costs 1 less Energy.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "energy-cost-discount",
          amount: 1,
          oncePerTurn: true,
          cardTypes: ["instant"],
          attributes: ["arcane"],
        },
      ],
    },
  }),
  card({
    id: ABYSSAL_SACRIFICE,
    name: "Abyssal Sacrifice",
    energyCost: 3,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "On discard: generate 1 Darkness. (You may choose how to use it.)",
    ritual: {
      activeWhen: { arcane: 1, darkness: 1 },
      effects: [],
      standingAbilities: [
        {
          type: "on-discard",
          discardingPlayer: "controller",
          effects: [{ type: "generate-symbol", symbol: "darkness", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: MIRRORED_RUNE,
    name: "Mirrored Rune",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "On absorb Arcane: copy another symbol onto it.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["arcane"],
          effects: [{ type: "copy-pool-symbol" }],
        },
      ],
    },
  }),

  // --- Aggro deck (printed `?` → temporary fixed cost 2; see file header) ---
  card({
    id: BLESSING_OF_THE_HUNT,
    name: "Blessing of the Hunt",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On roll: generate Martial.",
    overload: {
      onRoll: [{ type: "generate-symbol", symbol: "martial", amount: 1 }],
    },
  }),
  card({
    id: MARTIAL_BLESSING,
    name: "Martial Blessing",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On roll: the next attack this turn deals +1 damage.",
    overload: {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
    },
  }),
  card({
    id: TOXIC_BLESSING,
    name: "Toxic Blessing",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "Can only overload a Toxin face.\nOn roll: all attacks this turn apply 1 Toxin marker.",
    overload: {
      faceSymbols: ["toxin"],
      onRoll: [{ type: "arm-attack-toxin", amount: 1 }],
    },
  }),
  card({
    id: MUTANT_SPORES,
    name: "Mutant Spores",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "Can only overload a Toxin face.\nOn absorb: heal 1.",
    overload: {
      faceSymbols: ["toxin"],
      onRoll: [],
      onAbsorb: [{ type: "heal", amount: 1, target: { kind: "most-damaged-ally" } }],
    },
  }),
  card({
    id: WILD_ECHO,
    name: "Wild Echo",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Can only overload a Natural Wild face.\nOn absorb: generate Wild.",
    overload: {
      faceSymbols: ["wild"],
      faceKinds: ["natural"],
      onRoll: [],
      onAbsorb: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
    },
  }),
  card({
    id: ADRENALINE,
    name: "Adrenaline",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "Can only overload a Natural Wild face.\n" +
      "On roll: once per turn you may reroll this face. If it lands on this face again, deal 1 damage to 2 of your creatures.",
    overload: {
      faceSymbols: ["wild"],
      faceKinds: ["natural"],
      onRoll: [{ type: "optional-reroll-die" }],
    },
  }),
  card({
    id: RUST,
    name: "Rust",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText:
      "Can only overload a Natural Martial face.\nOn absorb: your attacks this turn ignore 2 Shield.",
    overload: {
      faceSymbols: ["martial"],
      faceKinds: ["natural"],
      onRoll: [],
      onAbsorb: [{ type: "arm-ignore-shield", amount: 2 }],
    },
  }),
  card({
    id: PREDATORS_CLAWS,
    name: "Predator's Claws",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "On absorb Wild: this creature may move 1 position.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["wild"],
          effects: [
            { type: "reposition-creature", target: { kind: "source-creature" }, optional: true },
          ],
        },
      ],
    },
  }),
  card({
    id: SERRATED_STINGER,
    name: "Serrated Stinger",
    energyCost: 4,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "On special attack: apply 1 Toxin marker.",
    ritual: {
      activeWhen: { wild: 1, toxin: 1 },
      effects: [],
      standingAbilities: [
        {
          type: "on-attack",
          attackerRelation: "ally",
          attackKinds: ["special"],
          effects: [
            { type: "apply-toxin", amount: 1, target: { kind: "declared-target" } },
          ],
        },
      ],
    },
  }),
  card({
    id: WAR_BANNER,
    name: "War Banner",
    energyCost: 4,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "On basic attack, allied creature to the left: deal +1 damage.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "attack-damage-bonus",
          amount: 1,
          attackKinds: ["basic"],
          bearerRelation: "left-ally",
        },
      ],
    },
  }),
  card({
    id: ALPHAS_HIDE,
    name: "Alpha's Hide",
    energyCost: 4,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "On special attack: generate Wild on another card.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-attack",
          attackKinds: ["special"],
          attackerRelation: "self",
          effects: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: TOXIC_HEART,
    name: "Toxic Heart",
    energyCost: 5,
    type: "equipment",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "On toxin damage: heal 1 on this creature.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-toxin-damage",
          effects: [{ type: "heal", amount: 1, target: { kind: "source-creature" } }],
        },
      ],
    },
  }),
  card({
    id: HUNTERS_COLLAR,
    name: "Hunter's Collar",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "On change position: generate Martial.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-change-position",
          creatureRelation: "self",
          effects: [{ type: "generate-symbol", symbol: "martial", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: INSIGNIA_OF_COMMAND,
    name: "Insignia of Command",
    energyCost: 5,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "Can only equip a Martial creature.\nOn attack, once per turn: another ally may reposition.",
    equipment: {
      mayTargetOpponent: false,
      creatureAttributes: ["martial"],
      abilities: [
        {
          type: "on-attack",
          attackerRelation: "self",
          oncePerTurn: true,
          effects: [
            {
              type: "reposition-creature",
              target: { kind: "choose-ally-other" },
              optional: true,
            },
          ],
        },
      ],
    },
  }),
  card({
    id: HUNTING_ARMOUR,
    name: "Hunting Armour",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "On take damage, once per turn: reduce it by 1.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-take-damage",
          reduceBy: 1,
          oncePerTurn: true,
        },
      ],
    },
  }),
  card({
    id: TWIN_BLADES,
    name: "Twin Blades",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On basic attack: remove 1 Shield from the target.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-attack",
          attackKinds: ["basic"],
          effects: [
            { type: "remove-shield", amount: 1, target: { kind: "declared-target" } },
          ],
        },
      ],
    },
  }),
  card({
    id: WILD_CARAPACE,
    name: "Wild Carapace",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "On absorb Wild: heal 1.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["wild"],
          effects: [{ type: "heal", amount: 1, target: { kind: "source-creature" } }],
        },
      ],
    },
  }),

  // --- Mechanical assembly ---
  card({
    id: RATCHET,
    name: "Ratchet",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Can only overload a Mechanical face.\nOn absorb: generate Mechanical.",
    overload: {
      faceSymbols: ["mechanical"],
      onRoll: [],
      onAbsorb: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
    },
  }),
  card({
    id: ASSEMBLY_LINE,
    name: "Assembly Line",
    energyCost: 3,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Forge 2 Synthetic Mechanical faces on your die.",
    ritual: {
      activeWhen: { mechanical: 2 },
      effects: [
        {
          type: "forge-faces",
          faces: 2,
          kind: "synthetic",
          attribute: "mechanical",
          target: "own-die",
        },
      ],
    },
  }),
  card({
    id: GOVERNOR,
    name: "Governor",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Can only overload a Mechanical face.\nOn roll: generate Mechanical.",
    overload: {
      faceSymbols: ["mechanical"],
      onRoll: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
    },
  }),
  card({
    id: SPARE_COG,
    name: "Spare Cog",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Generate 1 Mechanical.",
    effect: {
      effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
    },
  }),
  card({
    id: DIE_PRESS,
    name: "Die Press",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Forge 2 Synthetic Mechanical faces on your die.",
    effect: {
      requires: { mechanical: 2 },
      effects: [
        {
          type: "forge-faces",
          faces: 2,
          kind: "synthetic",
          attribute: "mechanical",
          target: "own-die",
        },
      ],
    },
  }),
  card({
    id: FOUNDRY,
    name: "Foundry",
    energyCost: 3,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "On absorb Mechanical: gain 1 Energy.",
    ritual: {
      activeWhen: { mechanical: 2 },
      effects: [],
      standingAbilities: [
        {
          type: "on-absorb",
          symbols: ["mechanical"],
          absorberRelation: "ally",
          effects: [{ type: "gain-energy", amount: 1 }],
        },
      ],
    },
  }),

  // --- Mechanical combo wave 2 (sequencing / conversion / loops) ---
  card({
    id: TRANSMISSION,
    name: "Transmission",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Can only overload a Mechanical face.\nOn absorb: copy another symbol onto it.",
    overload: {
      faceSymbols: ["mechanical"],
      onRoll: [],
      onAbsorb: [{ type: "copy-pool-symbol" }],
    },
  }),
  card({
    id: CAMSHAFT,
    name: "Camshaft",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText:
      "Can only overload a Mechanical face.\n" +
      "On roll: the next face you install this turn costs 1 Energy less.",
    overload: {
      faceSymbols: ["mechanical"],
      onRoll: [{ type: "arm-forge-discount", amount: 1 }],
    },
  }),
  card({
    id: SERVOMOTOR,
    name: "Servomotor",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "On absorb Mechanical: generate Mechanical.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["mechanical"],
          effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: SAFETY_LATCH,
    name: "Safety Latch",
    energyCost: 2,
    type: "reaction",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Prevent 1 damage. Generate 1 Mechanical.",
    effect: {
      effects: [
        { type: "grant-damage-prevent", amount: 1, target: { kind: "chain-attack-target" } },
        { type: "generate-symbol", symbol: "mechanical", amount: 1 },
      ],
    },
  }),
  card({
    id: BLUEPRINT,
    name: "Blueprint",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText:
      "Generate 1 Mechanical.\nThe next face you install this turn costs 1 Energy less.",
    effect: {
      effects: [
        { type: "generate-symbol", symbol: "mechanical", amount: 1 },
        { type: "arm-forge-discount", amount: 1 },
      ],
    },
  }),
  card({
    id: STAMP,
    name: "Stamp",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Apply the modifiers of one of your dice again.",
    effect: {
      requires: { mechanical: 1 },
      effects: [{ type: "reapply-die-modifiers" }],
    },
  }),
  card({
    id: COUPLING,
    name: "Coupling",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "The next face effect you resolve this turn is resolved twice.",
    effect: {
      requires: { mechanical: 2 },
      effects: [{ type: "arm-resolve-next-face-effect-twice" }],
    },
  }),
  card({
    id: CLOCKWORK,
    name: "Clockwork",
    energyCost: 3,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "On roll Mechanical: generate Mechanical.",
    ritual: {
      activeWhen: { mechanical: 2 },
      effects: [],
      standingAbilities: [
        {
          type: "on-roll-symbol",
          symbol: "mechanical",
          rollingPlayer: "controller",
          effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: RECALIBRATE,
    name: "Recalibrate",
    energyCost: 3,
    type: "reaction",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "Return a card that costs 2 or less from your discard pile to your hand.",
    effect: {
      effects: [{ type: "search-graveyard", amount: 1, maxEnergyCost: 2 }],
    },
  }),
  card({
    id: REFORGE,
    name: "Reforge",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText:
      "Choose one Synthetic Mechanical face on one of your dice; return it to your face pool " +
      "and install a different Synthetic Mechanical face from your pool onto that slot. " +
      "This is not a forge — no forge-draw.",
    effect: {
      requires: { mechanical: 1 },
      effects: [
        {
          type: "replace-synthetic-face",
          kind: "synthetic",
          attribute: "mechanical",
        },
      ],
    },
  }),

  // --- Martial / Wild / Toxin aggro package (authored) ---
  card({
    id: TEMPER,
    name: "Temper",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "Forge 1 Synthetic Martial face on your die.",
    effect: {
      effects: [
        {
          type: "forge-faces",
          faces: 1,
          kind: "synthetic",
          attribute: "martial",
          target: "own-die",
        },
      ],
    },
  }),
  card({
    id: OPENING_CUT,
    name: "Opening Cut",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "Deal 2 damage to a chosen enemy.",
    effect: {
      requires: { martial: 1 },
      effects: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: PRESS_THE_ATTACK,
    name: "Press the Attack",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "The next attack this turn deals +2 damage.",
    effect: {
      effects: [{ type: "next-attack-bonus", amount: 2 }],
    },
  }),
  card({
    id: RIPOSTE,
    name: "Riposte",
    energyCost: 2,
    type: "reaction",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "Prevent 1 damage. The next attack this turn deals +1 damage.",
    effect: {
      effects: [
        { type: "grant-damage-prevent", amount: 1, target: { kind: "chain-attack-target" } },
        { type: "next-attack-bonus", amount: 1 },
      ],
    },
  }),
  card({
    id: WHETSTONE,
    name: "Whetstone",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On attack: generate 1 Martial.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-attack",
          attackerRelation: "self",
          effects: [{ type: "generate-symbol", symbol: "martial", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: UNTAMED,
    name: "Untamed",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Forge 1 Synthetic Wild face on your die.",
    effect: {
      effects: [
        {
          type: "forge-faces",
          faces: 1,
          kind: "synthetic",
          attribute: "wild",
          target: "own-die",
        },
      ],
    },
  }),
  card({
    id: POUNCE,
    name: "Pounce",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Choose an allied creature. Its next attack deals +2 damage.",
    effect: {
      requires: { wild: 1 },
      effects: [
        { type: "grant-next-attack-bonus", amount: 2, target: { kind: "choose-ally" } },
      ],
    },
  }),
  card({
    id: PACK_SURGE,
    name: "Pack Surge",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Generate 1 Wild. The next attack this turn deals +1 damage.",
    effect: {
      effects: [
        { type: "generate-symbol", symbol: "wild", amount: 1 },
        { type: "next-attack-bonus", amount: 1 },
      ],
    },
  }),
  card({
    id: RENDING_MARK,
    name: "Rending Mark",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "A chosen enemy creature loses 2 Shield.",
    effect: {
      effects: [{ type: "remove-shield", amount: 2, target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: SNARL,
    name: "Snarl",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "Can only overload a Natural Wild face.\nOn roll: the next attack this turn deals +1 damage.",
    overload: {
      faceSymbols: ["wild"],
      faceKinds: ["natural"],
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
    },
  }),
  card({
    id: DOSE,
    name: "Dose",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "Apply 2 Toxin markers to a chosen enemy.",
    effect: {
      requires: { toxin: 1 },
      effects: [{ type: "apply-toxin", amount: 2, target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: BLIGHT_STRIKE,
    name: "Blight Strike",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText:
      "The next attack this turn deals +1 damage. All attacks this turn apply 1 Toxin marker.",
    effect: {
      effects: [
        { type: "next-attack-bonus", amount: 1 },
        { type: "arm-attack-toxin", amount: 1 },
      ],
    },
  }),
  card({
    id: CALL_TO_ARMS,
    name: "Call to Arms",
    energyCost: 3,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "The next attack this turn deals +2 damage.",
    ritual: {
      activeWhen: { martial: 2 },
      effects: [{ type: "next-attack-bonus", amount: 2 }],
    },
  }),
  card({
    id: BATTLE_HYMN,
    name: "Battle Hymn",
    energyCost: 3,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On attack: the next attack this turn deals +1 damage.",
    ritual: {
      activeWhen: { martial: 2 },
      effects: [],
      standingAbilities: [
        {
          type: "on-attack",
          attackerRelation: "ally",
          effects: [{ type: "next-attack-bonus", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: PACK_LAW,
    name: "Pack Law",
    energyCost: 3,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "On absorb Wild: the next attack this turn deals +1 damage.",
    ritual: {
      activeWhen: { wild: 2 },
      effects: [],
      standingAbilities: [
        {
          type: "on-absorb",
          symbols: ["wild"],
          absorberRelation: "ally",
          effects: [{ type: "next-attack-bonus", amount: 1 }],
        },
      ],
    },
  }),
  card({
    id: VIRULENT_RITE,
    name: "Virulent Rite",
    energyCost: 3,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "Forge 2 Synthetic Toxin faces on your die.",
    ritual: {
      activeWhen: { toxin: 2 },
      effects: [
        {
          type: "forge-faces",
          faces: 2,
          kind: "synthetic",
          attribute: "toxin",
          target: "own-die",
        },
      ],
    },
  }),
  // --- Control interaction proving cards (engine vocab `011` / `008`) ---
  card({
    id: SIPHON_SIGIL,
    name: "Siphon Sigil",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "A chosen enemy creature discards 2 attribute tokens.",
    effect: {
      effects: [
        { type: "discard-attribute-tokens", amount: 2, target: { kind: "choose-enemy" } },
      ],
    },
  }),
  card({
    id: DISPEL_CIRCLE,
    name: "Dispel Circle",
    energyCost: 4,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Send 1 opposing Ritual to its owner's graveyard.",
    effect: {
      effects: [{ type: "destroy-ritual", target: { kind: "choose-opponent-ritual" } }],
    },
  }),
  card({
    id: SEAL_THE_RITE,
    name: "Seal the Rite",
    energyCost: 3,
    type: "reaction",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "Negate 1 Ritual.",
    effect: {
      effects: [{ type: "negate-ritual" }],
    },
  }),
  card({
    id: FADE,
    name: "Fade",
    energyCost: 3,
    type: "reaction",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "Negate the effect of 1 card.",
    effect: {
      effects: [{ type: "negate-card", cardTypes: "any" }],
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
 * Builtin aggro tactics deck (spec 002 “Aggro deck” identity: Martial / Wild /
 * Toxin pressure). Tuned for the +4 creature HP band: densifies live reach /
 * conversion (Opening Cut, Dose, Temper…) and drops deferred equipment plus
 * Control/Support splash. Legal under M4: 50–60 cards, ≤4 copies per id.
 */
const PROTOTYPE_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Pressure equipment / continuous
  [WAR_AXE, 4],
  [VENOMOUS_FANGS, 3],
  [HUNTING_ARMOUR, 2],
  [SERRATED_STINGER, 2],
  [HUNTERS_COLLAR, 2],
  [WHETSTONE, 2],
  [TOXIC_HEART, 2],
  [WILD_CARAPACE, 2],
  // Overloads
  [MARTIAL_BLESSING, 2],
  [BLESSING_OF_THE_HUNT, 2],
  [TOXIC_BLESSING, 2],
  [WILD_ECHO, 2],
  [MUTANT_SPORES, 2],
  [SNARL, 2],
  // Reach / tempo (tankier boards)
  [OPENING_CUT, 2],
  [PRESS_THE_ATTACK, 2],
  [DOSE, 3],
  [BLIGHT_STRIKE, 2],
  [POUNCE, 2],
  [PACK_SURGE, 2],
  [RENDING_MARK, 2],
  [CALL_TO_ARMS, 2],
  [BATTLE_HYMN, 2],
  [PACK_LAW, 2],
  [VIRULENT_RITE, 2],
  [RIPOSTE, 2],
  [TEMPER, 2],
  [UNTAMED, 2],
];

export const PROTOTYPE_DECK: readonly CardId[] = PROTOTYPE_DECK_COUNTS.flatMap(
  ([id, copies]) => Array.from({ length: copies }, () => id),
);

/**
 * Builtin control tactics deck (spec 002 “Control deck” identity: Arcane /
 * Corruption / Darkness). Engine + disruption for resource-generating control
 * creatures; live interaction (Fade / Siphon / Dispel / Seal) replaces deferred
 * dead weight (Paradox, Tome, Mirrored Rune, Extermination, Mind Control,
 * Collapse). Legal under M4: 50–60 cards, ≤4 copies per id.
 */
const CONTROL_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Engine / filter
  [LIVING_LIBRARY, 4],
  [ECLIPSE, 4],
  [ARCANE_AMPLIFIER, 4],
  [ARCANE_RESONANCE, 3],
  [ARCHMAGES_GRIMOIRE, 3],
  [ABYSSAL_SACRIFICE, 3],
  [PERSISTENT_INFECTION, 3],
  [LATENT_CORRUPTION, 3],
  // Interaction (new + deepen)
  [FADE, 4],
  [SIPHON_SIGIL, 4],
  [DISPEL_CIRCLE, 3],
  [SEAL_THE_RITE, 3],
  [ARCANE_SILENCE, 2],
  [RUNIC_NULLIFICATION, 2],
  [CALCULATED_SACRIFICE, 3],
  [BLACK_PLAGUE, 3],
  [GREAT_CONTAMINATION, 3],
  [ETERNAL_DARKNESS, 3],
  [RITUAL_OF_CONTAMINATION, 3],
];

export const CONTROL_DECK: readonly CardId[] = CONTROL_DECK_COUNTS.flatMap(([id, copies]) =>
  Array.from({ length: copies }, () => id),
);

/**
 * Builtin Tempo tactics deck — Mechanical / Luminar sequencing with light Wild /
 * Toxin splash. Showcases clean absorb→pressure (Ratchet / Servomotor / Foundry
 * feeding Cogwork Driver and Prism Herald), Camshaft / Blueprint discounts, and
 * Aegis Link’s Luminar cost reduction — not Martial face-race and not Control
 * disruption. Legal under M4: 50–60 cards, ≤4 copies per id.
 */
const TEMPO_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Absorb → pressure
  [RATCHET, 4],
  [SERVOMOTOR, 3],
  [FOUNDRY, 3],
  [TRANSMISSION, 2],
  // Discounts / forge tempo
  [CAMSHAFT, 3],
  [BLUEPRINT, 3],
  [SPARE_COG, 3],
  [GOVERNOR, 2],
  [ASSEMBLY_LINE, 2],
  [DIE_PRESS, 2],
  // Incremental tools
  [SAFETY_LATCH, 3],
  [STAMP, 2],
  [RECALIBRATE, 2],
  [CLOCKWORK, 2],
  // Luminar glue (Aegis discount)
  [BLADE_OF_SERENE_LIGHT, 3],
  [LUMINAR_PRISM, 3],
  [BARRIER_OF_LIGHT, 3],
  [GLIMMER, 3],
  [LUMINAR_JUDGEMENT, 2],
  // Wild / Toxin splash — conversion, not Aggro beatdown
  [WILD_ECHO, 2],
  [UNTAMED, 2],
  [PACK_SURGE, 2],
  [DOSE, 2],
];

export const TEMPO_DECK: readonly CardId[] = TEMPO_DECK_COUNTS.flatMap(([id, copies]) =>
  Array.from({ length: copies }, () => id),
);

/**
 * Builtin Combo Mechanical tactics deck — densifies wave 1+2 Mechanical engine
 * cards around absorb-vs-pool tension (Ratchet / Transmission / Foundry vs
 * Governor / Clockwork / Camshaft), with Stamp / Coupling / Reforge payoffs and
 * Luminar + Wild glue for Lens Choir. Showcases chaining and symbol conversion,
 * not large generic damage. Legal under M4: 50–60 cards, ≤4 copies per id.
 */
const COMBO_MECHANICAL_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Absorb line
  [RATCHET, 4],
  [SERVOMOTOR, 3],
  [TRANSMISSION, 3],
  [FOUNDRY, 4],
  // Pool / roll line
  [GOVERNOR, 3],
  [CAMSHAFT, 3],
  [CLOCKWORK, 4],
  [BLUEPRINT, 3],
  // Forge density
  [ASSEMBLY_LINE, 3],
  [DIE_PRESS, 3],
  // Combo payoffs
  [STAMP, 3],
  [COUPLING, 3],
  [REFORGE, 3],
  [RECALIBRATE, 2],
  [SAFETY_LATCH, 2],
  // Luminar glue
  [LUMINAR_PRISM, 2],
  [BLADE_OF_SERENE_LIGHT, 2],
  [GLIMMER, 2],
  [BARRIER_OF_LIGHT, 2],
  // Wild / Toxin — Lens Choir Cascade + Combo attrition splash
  [WILD_ECHO, 2],
  [UNTAMED, 2],
  [DOSE, 2],
];

export const COMBO_MECHANICAL_DECK: readonly CardId[] = COMBO_MECHANICAL_DECK_COUNTS.flatMap(
  ([id, copies]) => Array.from({ length: copies }, () => id),
);
