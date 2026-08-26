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
 * TEMP (2026-08-13): printed `?` Energy costs are authored as fixed integers
 * (no `variableEnergy`) until variable spend UX / scaling effects are wired.
 * Restore `variableEnergy: true` with minimum 1 when that lands — see
 * docs/OPEN_DESIGN.md and resolveEnergyPayment.
 * Default printed cost is 2+. `energyCost: 1` is niche (keyed discount enabler,
 * tightly gated overload) — not a cheap-support band. Starting Energy 3 should
 * sequence a 2-cost with leftover 1 via Camshaft / Aegis Link / similar, not
 * dump three 1-drops.
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
export const COUNTERGLYPH: CardId = asCardId("card-counterglyph");
export const FADE: CardId = asCardId("card-fade");
export const UMBRAL_BOLT: CardId = asCardId("card-umbral-bolt");
export const RIFT_COLLAPSE: CardId = asCardId("card-rift-collapse");
export const UNMAKE: CardId = asCardId("card-unmake");
export const GLOOM_RESONANCE: CardId = asCardId("card-gloom-resonance");
export const UMBRAL_BRAND: CardId = asCardId("card-umbral-brand");
export const RAISE_GUARD: CardId = asCardId("card-raise-guard");
export const SIDESTEP: CardId = asCardId("card-sidestep");
export const RETHROW: CardId = asCardId("card-rethrow");
export const SIFT: CardId = asCardId("card-sift");
export const SECOND_WIND: CardId = asCardId("card-second-wind");
export const WARDING_CHARM: CardId = asCardId("card-warding-charm");
export const SLOW_BURN: CardId = asCardId("card-slow-burn");
export const VENOM_FONT: CardId = asCardId("card-venom-font");
export const CONCENTRATE: CardId = asCardId("card-concentrate");
export const ICHOR_SHEATH: CardId = asCardId("card-ichor-sheath");
export const FESTER: CardId = asCardId("card-fester");
export const SMOLDER: CardId = asCardId("card-smolder");
export const CINDER_HEX: CardId = asCardId("card-cinder-hex");
export const EMBER_TIDE: CardId = asCardId("card-ember-tide");
export const CONSULT: CardId = asCardId("card-consult");
export const BURY_THE_NAME: CardId = asCardId("card-bury-the-name");
export const GRAVE_WHISPER: CardId = asCardId("card-grave-whisper");
export const DRESS_RANKS: CardId = asCardId("card-dress-ranks");
export const SHARE_THE_KILL: CardId = asCardId("card-share-the-kill");
export const DEN_SHARE: CardId = asCardId("card-den-share");

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
    rulesText: "Pay 2 Energy. [Negate Instant].",
    ritual: {
      activeWhen: { arcane: 2 },
      spend: { arcane: 2 },
      additionalEnergy: 2,
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
    rulesText: "[Draw 2]. [Discard 1].",
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
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "On roll: [Heal 1].",
    overload: {
      // Most-damaged ally: fires on roll with no extra prompt. Choose-ally is
      // available for effects that need a free pick among damaged creatures.
      onRoll: [{ type: "heal", amount: 1, target: { kind: "most-damaged-ally" } }],
    },
  }),
  card({
    id: ARCANE_RESONANCE,
    name: "Arcane Resonance",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "On roll: [Generate 1 Arcane].",
    overload: {
      onRoll: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
    },
  }),
  card({
    id: PERSISTENT_INFECTION,
    name: "Persistent Infection",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "Can only overload a Corruption face.\nOn roll: [Gain 1 Energy].",
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
    rulesText: "[Prevent].",
    effect: {
      effects: [
        { type: "grant-attack-prevent", amount: 1, target: { kind: "chain-attack-target" } },
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
    rulesText: "[Search 2] Instant or Ritual cards.",
    ritual: {
      activeWhen: { arcane: 2 },
      spend: { arcane: 2 },
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
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    forgeTags: ["echo"],
    rulesText: "[Stamp].",
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
    rulesText: "[Destroy Equipment].",
    effect: {
      effects: [{ type: "destroy-equipment", target: { kind: "choose-enemy" } }],
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
    rulesText: "On basic attack: +1 damage.",
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
    rulesText: "On deal damage: [Mark 1 Toxin].",
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
    rulesText: "[Recall 3].",
    ritual: {
      activeWhen: { darkness: 2 },
      spend: { darkness: 2 },
      effects: [{ type: "search-graveyard", amount: 3 }],
    },
  }),
  card({
    id: BLACK_PLAGUE,
    name: "Black Plague",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "opponent-die" },
    rulesText:
      "May be equipped to an opposing creature.\nOn roll Corruption: [Strike 1] this creature.",
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
    energyCost: 3,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "[Forge 3 Synthetic Corruption] on one of the opponent's dice.",
    ritual: {
      activeWhen: { corruption: 2 },
      spend: { corruption: 2 },
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
      "Consume every synthetic Corruption face from one die of one player and deal twice the number consumed as damage, split across up to 2 creatures.",
    ritual: {
      activeWhen: { corruption: 3 },
      spend: { corruption: 3 },
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
    // No Active when / Spend on print; place/ready still works.
    ritual: {
      effects: [{ type: "replay-graveyard-tactic" }],
    },
  }),
  card({
    id: LATENT_CORRUPTION,
    name: "Latent Corruption",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "Can only overload an Arcane face.\nOn roll: [Generate 1 Arcane].",
    overload: {
      faceSymbols: ["arcane"],
      onRoll: [{ type: "generate-symbol", symbol: "arcane", amount: 1 }],
    },
  }),
  card({
    id: ARCANE_AMPLIFIER,
    name: "Arcane Amplifier",
    energyCost: 1,
    type: "overload",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Can only overload an Arcane face.\nOn roll: [Generate 1 Arcane].",
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
    rulesText: "On prevent damage: [Draw 2].",
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
    rulesText: "[Convert 2].",
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
    rulesText: "[Mill 2] Rituals of different attributes.",
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
    energyCost: 4,
    type: "reaction",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 2, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "[Negate].",
    effect: {
      effects: [{ type: "negate-card", cardTypes: "any" }],
    },
  }),
  card({
    id: RITUAL_OF_CONTAMINATION,
    name: "Ritual of Contamination",
    energyCost: 1,
    type: "instant",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "[Forge 1 Synthetic Corruption] on the opponent's die.",
    effect: {
      requires: { corruption: 1 },
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
    rulesText: "On deal damage: [Heal 1] on an allied creature.",
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
      "Can only equip an Arcane or Darkness creature.\nOn absorb Arcane or Darkness: [Draw 1]. [Discard 1].",
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
    rulesText: "On discard: [Generate 1 Darkness].",
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

  // --- Aggro deck (printed `?` → temporary fixed costs; On-roll overloads 1) ---
  card({
    id: BLESSING_OF_THE_HUNT,
    name: "Blessing of the Hunt",
    energyCost: 1,
    type: "overload",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On roll: [Generate 1 Martial].",
    overload: {
      onRoll: [{ type: "generate-symbol", symbol: "martial", amount: 1 }],
    },
  }),
  card({
    id: MARTIAL_BLESSING,
    name: "Martial Blessing",
    energyCost: 1,
    type: "overload",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On roll: [Empower 1].",
    overload: {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
    },
  }),
  card({
    id: TOXIC_BLESSING,
    name: "Toxic Blessing",
    energyCost: 1,
    type: "overload",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "Can only overload a Toxin face.\nOn roll: [Mark 1 Toxin on attacks].",
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
    rulesText: "Can only overload a Toxin face.\nOn absorb: [Heal 1].",
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
    rulesText: "Can only overload a Natural Wild face.\nOn absorb: [Generate 1 Wild].",
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
    energyCost: 1,
    type: "overload",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "Can only overload a Natural Wild face.\nOn roll: once per turn you may [Reroll] this face. If it lands on this face again, [Strike 1] 2 of your creatures.",
    overload: {
      faceSymbols: ["wild"],
      faceKinds: ["natural"],
      onRoll: [
        { type: "optional-reroll-die", oncePerTurn: true, sameFaceAllyDamage: 1 },
      ],
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
      "Can only overload a Natural Martial face.\nOn absorb: [Pierce 2].",
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
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "On absorb Martial: this creature may [Reposition].",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["martial"],
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
    rulesText: "On special attack: [Mark 1 Toxin].",
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
    rulesText: "On basic attack, allied creature to the left: +1 damage.",
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
    rulesText: "On special attack: [Generate 1 Wild] on another card.",
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
    rulesText: "On toxin damage: [Heal 1] this creature.",
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
    rulesText: "On absorb Wild: [Generate 1 Martial].",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["wild"],
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
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText:
      "Can only equip a Martial creature.\nOn attack, once per turn: another ally may [Reposition].",
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
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
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
    rulesText: "On basic attack: [Strip 1 Shield].",
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
    rulesText: "On absorb Wild: [Heal 1].",
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
    rulesText: "Can only overload a Mechanical face.\nOn absorb: [Generate 1 Mechanical].",
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
    rulesText: "[Forge 2 Synthetic Mechanical] on your die.",
    ritual: {
      activeWhen: { mechanical: 2 },
      spend: { mechanical: 2 },
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
    rulesText: "Can only overload a Mechanical face.\nOn roll: [Generate 1 Mechanical].",
    overload: {
      faceSymbols: ["mechanical"],
      onRoll: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
    },
  }),
  card({
    id: SPARE_COG,
    name: "Spare Cog",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "[Generate 1 Mechanical].",
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
    rulesText: "[Forge 2 Synthetic Mechanical] on your die.",
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
    rulesText: "On absorb Mechanical: [Gain 1 Energy].",
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
    // Niche Energy 1: Mechanical-face-gated forge-discount enabler, not a
    // generator. The 1-Energy play pattern is this discount on a 2+ forge.
    energyCost: 1,
    type: "overload",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText:
      "Can only overload a Mechanical face.\nOn roll: [Discount 1] forge.",
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
    rulesText: "On absorb Mechanical, once per turn: [Generate 1 Mechanical].",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["mechanical"],
          oncePerTurn: true,
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
    rulesText:
      "[Generate 1 Mechanical]. [Discount 1] forge.",
    effect: {
      effects: [
        { type: "generate-symbol", symbol: "mechanical", amount: 1 },
        { type: "arm-forge-discount", amount: 1 },
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
      "[Generate 1 Mechanical]. [Discount 1] forge.",
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
    rulesText: "[Stamp].",
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
    rulesText: "[Double].",
    effect: {
      requires: { mechanical: 2 },
      effects: [{ type: "arm-resolve-next-face-effect-twice" }],
    },
  }),
  card({
    id: CLOCKWORK,
    name: "Clockwork",
    energyCost: 2,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    rulesText: "On roll Mechanical: [Generate 1 Mechanical].",
    ritual: {
      activeWhen: { mechanical: 1 },
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
    rulesText: "[Recall 1] that costs 2 or less.",
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
      "[Reforge].",
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
    rulesText: "[Forge 1 Synthetic Martial] on your die.",
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
    rulesText: "[Strike 2].",
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
    rulesText: "[Empower 2].",
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
    rulesText: "[Generate 1 Martial]. [Empower 1].",
    effect: {
      effects: [
        { type: "generate-symbol", symbol: "martial", amount: 1 },
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
    rulesText: "On attack: [Generate 1 Martial].",
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
    rulesText: "[Forge 1 Synthetic Wild] on your die.",
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
    rulesText: "[Empower 2] on an allied creature.",
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
    rulesText: "[Generate 1 Wild]. [Empower 1].",
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
    rulesText: "[Strip 2 Shield].",
    effect: {
      effects: [{ type: "remove-shield", amount: 2, target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: SNARL,
    name: "Snarl",
    energyCost: 1,
    type: "overload",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "Can only overload a Natural Wild face.\nOn roll: [Empower 1].",
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
    rulesText: "[Mark 2 Toxin].",
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
      "[Empower 1]. [Mark 1 Toxin on attacks].",
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
    rulesText: "[Empower 2].",
    ritual: {
      activeWhen: { martial: 2 },
      spend: { martial: 2 },
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
    rulesText: "On attack: [Empower 1].",
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
    rulesText: "On absorb Wild: [Empower 1].",
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
    rulesText: "[Forge 2 Synthetic Toxin] on your die.",
    ritual: {
      activeWhen: { toxin: 2 },
      spend: { toxin: 2 },
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
    rulesText: "[Drain 2].",
    effect: {
      effects: [
        { type: "drain-attribute-tokens", amount: 2, target: { kind: "choose-enemy" } },
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
    rulesText: "[Destroy Ritual].",
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
    rulesText: "[Negate Ritual].",
    effect: {
      effects: [{ type: "negate-ritual" }],
    },
  }),
  card({
    id: COUNTERGLYPH,
    name: "Counterglyph",
    energyCost: 0,
    type: "reaction",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "[Negate Instant].",
    effect: {
      requires: { arcane: 1 },
      effects: [{ type: "negate-card", cardTypes: ["instant"] }],
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
    rulesText: "[Negate].",
    effect: {
      effects: [{ type: "negate-card", cardTypes: "any" }],
    },
  }),
  // --- Control two-color (Arcane / Darkness) closers + Darkness engine ---
  card({
    id: UMBRAL_BOLT,
    name: "Umbral Bolt",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "[Strike 3].",
    effect: {
      requires: { darkness: 1 },
      effects: [{ type: "damage", amount: 3, target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: RIFT_COLLAPSE,
    name: "Rift Collapse",
    energyCost: 4,
    type: "ritual",
    subtypes: ["instant"],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "[Strike 4].",
    ritual: {
      activeWhen: { arcane: 1, darkness: 1 },
      spend: { arcane: 1, darkness: 1 },
      effects: [{ type: "damage", amount: 4, target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: UNMAKE,
    name: "Unmake",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "[Destroy Equipment].",
    effect: {
      effects: [{ type: "destroy-equipment", target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: GLOOM_RESONANCE,
    name: "Gloom Resonance",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "Can only overload a Darkness face.\nOn roll: [Generate 1 Darkness].",
    overload: {
      faceSymbols: ["darkness"],
      onRoll: [{ type: "generate-symbol", symbol: "darkness", amount: 1 }],
    },
  }),
  card({
    id: UMBRAL_BRAND,
    name: "Umbral Brand",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText:
      "Can only equip an Arcane or Darkness creature.\nOn absorb Darkness, once per turn: [Strike 1].",
    equipment: {
      mayTargetOpponent: false,
      creatureAttributes: ["arcane", "darkness"],
      abilities: [
        {
          type: "on-absorb",
          symbols: ["darkness"],
          oncePerTurn: true,
          effects: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
        },
      ],
    },
  }),
  // --- Generic utility toolkit (Control / Burn splash copies; other lists stay clear) ---
  // Splashable 2-cost Support tools. Look-top (Sift / Second Wind) is Arcane;
  // prevent (Sidestep) is Luminar; shield / own-die reroll stay shared secondaries.
  // Ids: card-raise-guard, card-sidestep, card-rethrow, card-sift,
  // card-second-wind, card-warding-charm.
  card({
    id: RAISE_GUARD,
    name: "Raise Guard",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "[Mark 2 Shield].",
    effect: {
      effects: [{ type: "grant-shield", amount: 2, target: { kind: "choose-ally" } }],
    },
  }),
  card({
    id: SIDESTEP,
    name: "Sidestep",
    energyCost: 2,
    type: "reaction",
    subtypes: [],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "[Prevent].",
    effect: {
      effects: [
        { type: "grant-attack-prevent", amount: 1, target: { kind: "chain-attack-target" } },
      ],
    },
  }),
  card({
    id: RETHROW,
    name: "Rethrow",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "[Reroll].",
    effect: {
      effects: [{ type: "optional-reroll-die" }],
    },
  }),
  card({
    id: SIFT,
    name: "Sift",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText:
      "[Insight 2].",
    effect: {
      effects: [{ type: "look-top-deck", amount: 2 }],
    },
  }),
  card({
    id: SECOND_WIND,
    name: "Second Wind",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText:
      "[Gain 1 Energy]. [Insight 1].",
    effect: {
      effects: [{ type: "gain-energy", amount: 1 }, { type: "peek-deck-optional-bottom" }],
    },
  }),
  card({
    id: WARDING_CHARM,
    name: "Warding Charm",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "On absorb, once per turn: [Mark 1 Shield] this creature.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          oncePerTurn: true,
          effects: [{ type: "grant-shield", amount: 1, target: { kind: "source-creature" } }],
        },
      ],
    },
  }),
  // --- Toxin / Corruption continuous-burn package (builtin Burn list) ---
  card({
    id: SLOW_BURN,
    name: "Slow Burn",
    energyCost: 3,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "On start of opponent's turn: [Mark 1 Toxin] the enemy with the most damage.",
    ritual: {
      activeWhen: { toxin: 2 },
      effects: [],
      standingAbilities: [
        {
          type: "on-turn-start",
          whoseTurn: "opponent",
          effects: [{ type: "apply-toxin", amount: 1, target: { kind: "most-damaged-enemy" } }],
        },
      ],
    },
  }),
  card({
    id: VENOM_FONT,
    name: "Venom Font",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "On absorb Toxin: [Mark 1 Toxin].",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["toxin"],
          absorberRelation: "self",
          effects: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
        },
      ],
    },
  }),
  card({
    id: CONCENTRATE,
    name: "Concentrate",
    energyCost: 3,
    type: "instant",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "[Mark 2 Toxin] a chosen enemy that already has Toxin.",
    effect: {
      requires: { toxin: 1 },
      effects: [
        {
          type: "conditional",
          when: { type: "any-enemy-has-toxin" },
          then: [{ type: "apply-toxin", amount: 2, target: { kind: "choose-enemy-with-toxin" } }],
        },
      ],
    },
  }),
  card({
    id: ICHOR_SHEATH,
    name: "Ichor Sheath",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText: "Can only overload a Toxin face.\nOn absorb: [Strike 1].",
    overload: {
      faceSymbols: ["toxin"],
      onRoll: [],
      onAbsorb: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
    },
  }),
  card({
    id: FESTER,
    name: "Fester",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "toxin",
    forge: { faces: 1, kind: "synthetic", attribute: "toxin", target: "own-die" },
    rulesText:
      "On toxin damage: [Mark 1 Toxin] the opposing creature that took that damage.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-toxin-damage",
          damagedOwner: "opponent",
          effects: [{ type: "apply-toxin", amount: 1, target: { kind: "declared-target" } }],
        },
      ],
    },
  }),
  card({
    id: SMOLDER,
    name: "Smolder",
    energyCost: 3,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText: "On start of opponent's turn: [Strike 1] the enemy with the most damage.",
    ritual: {
      activeWhen: { corruption: 2 },
      effects: [],
      standingAbilities: [
        {
          type: "on-turn-start",
          whoseTurn: "opponent",
          effects: [{ type: "damage", amount: 1, target: { kind: "most-damaged-enemy" } }],
        },
      ],
    },
  }),
  card({
    id: CINDER_HEX,
    name: "Cinder Hex",
    energyCost: 3,
    type: "equipment",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "opponent-die" },
    rulesText:
      "May be equipped to an opposing creature.\nOn start of turn: [Strike 1] this creature.",
    equipment: {
      mayTargetOpponent: true,
      abilities: [
        {
          type: "on-turn-start",
          whoseTurn: "controller",
          effects: [{ type: "damage", amount: 1, target: { kind: "source-creature" } }],
        },
      ],
    },
  }),
  card({
    id: EMBER_TIDE,
    name: "Ember Tide",
    energyCost: 2,
    type: "overload",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Can only overload a Corruption face.\nOn roll: [Strike 1].\nOn absorb: [Mark 1 Toxin].",
    overload: {
      faceSymbols: ["corruption"],
      onRoll: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
    },
  }),
  // --- Attribute exclusive proving cards (2026-08-21 signatures) ---
  card({
    id: CONSULT,
    name: "Consult",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText:
      "[Insight 3].",
    effect: {
      effects: [{ type: "look-top-deck", amount: 3 }],
    },
  }),
  card({
    id: BURY_THE_NAME,
    name: "Bury the Name",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "Opponent [Mill 3].",
    effect: {
      effects: [{ type: "mill-cards", amount: 3, player: "opponent" }],
    },
  }),
  card({
    id: GRAVE_WHISPER,
    name: "Grave Whisper",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText:
      "Can only equip an Arcane or Darkness creature.\nOn absorb Darkness, once per turn: opponent [Mill 1].",
    equipment: {
      mayTargetOpponent: false,
      creatureAttributes: ["arcane", "darkness"],
      abilities: [
        {
          type: "on-absorb",
          symbols: ["darkness"],
          // Pile bank has no absorbing creature; ally = owner banks Darkness.
          absorberRelation: "ally",
          oncePerTurn: true,
          effects: [{ type: "mill-cards", amount: 1, player: "opponent" }],
        },
      ],
    },
  }),
  card({
    id: DRESS_RANKS,
    name: "Dress Ranks",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "[Reposition].",
    effect: {
      effects: [{ type: "reposition-creature", target: { kind: "choose-ally" } }],
    },
  }),
  card({
    id: SHARE_THE_KILL,
    name: "Share the Kill",
    energyCost: 2,
    type: "instant",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "Move 1 absorbed attribute token from one allied creature to another allied creature.",
    effect: {
      effects: [
        {
          type: "transfer-attribute-tokens",
          amount: 1,
          from: { kind: "choose-ally-with-tokens" },
          to: { kind: "choose-ally-other" },
        },
      ],
    },
  }),
  card({
    id: DEN_SHARE,
    name: "Den Share",
    energyCost: 2,
    type: "equipment",
    subtypes: [],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "On absorb Wild, once per turn: copy 1 attribute token from this creature onto another allied creature.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [
        {
          type: "on-absorb",
          symbols: ["wild"],
          absorberRelation: "self",
          oncePerTurn: true,
          effects: [
            {
              type: "copy-attribute-tokens",
              amount: 1,
              from: { kind: "source-creature" },
              to: { kind: "choose-ally-other" },
            },
          ],
        },
      ],
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
 * Builtin Aggro tactics deck (spec 002: Martial / Wild only). Converts dice
 * into creature pressure — no Toxin (that is Burn / Combo splash). Densifies
 * Martial/Wild equipment, overloads, reach, and Temper/Untamed special forges.
 * Legal: 40–50 cards, ≤3 copies per id.
 */
const PROTOTYPE_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Martial / Wild pressure equipment
  [WAR_AXE, 3],
  [TWIN_BLADES, 3],
  [WHETSTONE, 3],
  [INSIGNIA_OF_COMMAND, 2],
  [HUNTERS_COLLAR, 2],
  [PREDATORS_CLAWS, 2],
  // Overloads
  [MARTIAL_BLESSING, 3],
  [WILD_ECHO, 3],
  [RUST, 2],
  // Reach / conversion
  [OPENING_CUT, 3],
  [PRESS_THE_ATTACK, 3],
  [SHARE_THE_KILL, 2],
  [DEN_SHARE, 2],
  [DRESS_RANKS, 2],
  [TEMPER, 2],
  [UNTAMED, 2],
  // Ritual engines
  [CALL_TO_ARMS, 2],
  [PACK_LAW, 2],
];
export const PROTOTYPE_DECK: readonly CardId[] = PROTOTYPE_DECK_COUNTS.flatMap(
  ([id, copies]) => Array.from({ length: copies }, () => id),
);

/**
 * Builtin control tactics deck (spec 002: Arcane / Darkness only). Long-term
 * engine + disruption, converting that engine into lethal damage — not
 * Corruption contaminate, not Toxin burn, not cheap Aggro combat. Legal:
 * 40–50 cards, ≤3 copies per id.
 */
const CONTROL_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Engine / filter
  [LIVING_LIBRARY, 3],
  [ECLIPSE, 3],
  [ARCANE_AMPLIFIER, 3],
  [ARCANE_RESONANCE, 3],
  [ARCHMAGES_GRIMOIRE, 3],
  [GLOOM_RESONANCE, 3],
  [ETERNAL_DARKNESS, 3],
  // Interaction
  [FADE, 3],
  [SIPHON_SIGIL, 3],
  [SEAL_THE_RITE, 3],
  [RUNIC_NULLIFICATION, 2],
  [UNMAKE, 2],
  // Engine-converted damage
  [UMBRAL_BOLT, 3],
  [RIFT_COLLAPSE, 2],
  [CONSULT, 2],
  [BURY_THE_NAME, 2],
];

export const CONTROL_DECK: readonly CardId[] = CONTROL_DECK_COUNTS.flatMap(([id, copies]) =>
  Array.from({ length: copies }, () => id),
);

/**
 * Builtin Tempo tactics deck — Mechanical / Luminar sequencing with light Wild /
 * Toxin splash. Showcases clean absorb→pressure (Ratchet / Servomotor / Foundry
 * feeding Cogwork Driver and Prism Herald), Camshaft / Blueprint discounts, and
 * Aegis Link’s Luminar cost reduction — not Martial face-race and not Control
 * disruption. Legal: 40–50 cards, ≤3 copies per id.
 */
const TEMPO_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Absorb → pressure
  [RATCHET, 3],
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
  // Luminar glue (Aegis discount)
  [BLADE_OF_SERENE_LIGHT, 3],
  [LUMINAR_PRISM, 3],
  [BARRIER_OF_LIGHT, 3],
  [GLIMMER, 3],
  // Wild splash — special-forge conversion, not Aggro beatdown
  [UNTAMED, 2],
];

export const TEMPO_DECK: readonly CardId[] = TEMPO_DECK_COUNTS.flatMap(([id, copies]) =>
  Array.from({ length: copies }, () => id),
);

/**
 * Builtin Combo Mechanical tactics deck — densifies wave 1+2 Mechanical engine
 * cards around absorb-vs-pool tension (Ratchet / Transmission / Foundry vs
 * Governor / Clockwork / Camshaft), with Stamp / Coupling / Reforge payoffs and
 * Luminar + Wild glue for Lens Choir. Showcases chaining and symbol conversion,
 * not large generic damage. Legal: 40–50 cards, ≤3 copies per id.
 */
const COMBO_MECHANICAL_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Absorb line
  [RATCHET, 3],
  [SERVOMOTOR, 3],
  [TRANSMISSION, 3],
  [FOUNDRY, 3],
  // Pool / roll line
  [GOVERNOR, 3],
  [CAMSHAFT, 3],
  [CLOCKWORK, 3],
  [BLUEPRINT, 3],
  // Forge density
  [ASSEMBLY_LINE, 3],
  [DIE_PRESS, 3],
  // Combo payoffs
  [STAMP, 3],
  [COUPLING, 3],
  [REFORGE, 3],
  // Luminar glue
  [LUMINAR_PRISM, 2],
  // Wild splash — pack feeding (Lens Choir token share) + Untamed specials
  [UNTAMED, 2],
  [SHARE_THE_KILL, 2],
];

export const COMBO_MECHANICAL_DECK: readonly CardId[] = COMBO_MECHANICAL_DECK_COUNTS.flatMap(
  ([id, copies]) => Array.from({ length: copies }, () => id),
);

/**
 * Builtin Burn tactics deck (spec 002): Toxin ticks + Corruption DoT, with a
 * thin generic toolkit so the list can survive creature combat. Marker splash
 * (Dose) densifies the engine; Aggro beatdown (Fangs, Blight Strike, Stinger)
 * stays off the maindeck. Legal: 40–50 cards, ≤3 copies per id.
 */
export const BURN_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  // Continuous DoT engine
  [SLOW_BURN, 3],
  [SMOLDER, 3],
  [VENOM_FONT, 3],
  [FESTER, 3],
  [CINDER_HEX, 3],
  [CONCENTRATE, 3],
  [ICHOR_SHEATH, 3],
  [EMBER_TIDE, 3],
  // Marker / forge conversion (not Aggro attacks)
  [DOSE, 3],
  [VIRULENT_RITE, 3],
  [RITUAL_OF_CONTAMINATION, 3],
  [GREAT_CONTAMINATION, 2],
  [PERSISTENT_INFECTION, 3],
  [BLACK_PLAGUE, 2],
  // Survive creature combat (thin generic toolkit)
  [RAISE_GUARD, 3],
];

export const BURN_DECK: readonly CardId[] = BURN_DECK_COUNTS.flatMap(([id, copies]) =>
  Array.from({ length: copies }, () => id),
);
