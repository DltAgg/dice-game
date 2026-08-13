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
 * `?` header costs are `variableEnergy: true` with `energyCost: 1` (pay 1+).
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
    rulesText: "Pay 3 [Energy], negate the effect of 1 [Tactic] card.",
    ritual: {
      activeWhen: { arcane: 2 },
      additionalEnergy: 3,
      effects: [{ type: "negate-tactic" }],
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
    type: "tactic",
    subtypes: ["overload"],
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
    type: "tactic",
    subtypes: ["overload"],
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
    type: "tactic",
    subtypes: ["reaction"],
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
    rulesText:
      "May be equipped to an opposing creature.\nWhenever that creature rolls Corruption, it takes 1 damage.",
    equipment: {
      mayTargetOpponent: true,
      abilities: [
        {
          type: "on-roll-symbol",
          symbol: "corruption",
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
      effects: [],
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
      effects: [],
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
      "Choose 1 Tactic card in your graveyard and use its effect immediately, ignoring its requirements.",
    // No Active when on print; place/ready still works. GY replay is deferred.
    ritual: {
      effects: [],
    },
  }),
  card({
    id: LATENT_CORRUPTION,
    name: "Latent Corruption",
    energyCost: 4,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
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
    type: "tactic",
    subtypes: ["overload"],
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
    type: "tactic",
    subtypes: ["reaction"],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText:
      "When an ally would take damage, prevent it; if you do, deal that much to the attacking creature.",
    effect: {
      effects: [{ type: "prevent-attack-reflect" }],
    },
  }),
  card({
    id: GLIMMER,
    name: "Glimmer",
    energyCost: 2,
    type: "tactic",
    subtypes: ["reaction"],
    attribute: "luminar",
    forge: { faces: 1, kind: "synthetic", attribute: "luminar", target: "own-die" },
    rulesText: "When you prevent damage, draw 2 cards.",
    effect: {
      effects: [{ type: "arm-prevent-draw", amount: 2 }],
    },
  }),
  card({
    id: COLLAPSE_OF_REALITY,
    name: "Collapse of Reality",
    energyCost: 4,
    type: "tactic",
    subtypes: ["instant"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Convert up to two symbols into any other 2 Natural symbols.",
  }),
  card({
    id: DARK_PACT,
    name: "Dark Pact",
    energyCost: 4,
    type: "tactic",
    subtypes: ["instant"],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText: "Send 2 Tactic cards of different attributes from your deck to the graveyard.",
  }),
  card({
    id: MIND_CONTROL,
    name: "Mind Control",
    energyCost: 6,
    type: "tactic",
    subtypes: ["instant"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Choose one: remove every Overload from 1 opposing face; or remove 1 Overload from up to 2 opposing faces.",
  }),
  card({
    id: ARCANE_SILENCE,
    name: "Arcane Silence",
    energyCost: 5,
    type: "tactic",
    subtypes: ["reaction"],
    attribute: "arcane",
    forge: { faces: 2, kind: "synthetic", attribute: "arcane", target: "own-die" },
    rulesText: "Negate the effect of 1 Tactic card.",
    effect: {
      effects: [{ type: "negate-tactic" }],
    },
  }),
  card({
    id: RITUAL_OF_CONTAMINATION,
    name: "Ritual of Contamination",
    energyCost: 2,
    type: "tactic",
    subtypes: ["instant"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Requires: Arcane + Corruption.\nForge 1 Synthetic Corruption face on the opponent's die.",
  }),
  card({
    id: BLADE_OF_SERENE_LIGHT,
    name: "Blade of Serene Light",
    energyCost: 2,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "luminar",
    forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    rulesText: "Whenever this creature deals damage, heal 1 on an allied creature.",
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
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "darkness",
    forge: { faces: 1, kind: "synthetic", attribute: "darkness", target: "own-die" },
    rulesText:
      "Can only equip an Arcane or Darkness creature.\n" +
      "Whenever this creature absorbs Arcane or Darkness, draw 1 card and discard 1.",
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
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "The first Instant Arcane Tactic used each turn costs 1 less Energy.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
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
    rulesText: "Whenever you discard a card, generate 1 Darkness. (You may choose how to use it.)",
    ritual: {
      activeWhen: { arcane: 1, darkness: 1 },
      effects: [],
    },
  }),
  card({
    id: MIRRORED_RUNE,
    name: "Mirrored Rune",
    energyCost: 3,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Whenever this creature absorbs Arcane, copy another symbol onto it.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),

  // --- Aggro deck (variable `?` costs + remaining equipment / rituals) ---
  card({
    id: BLESSING_OF_THE_HUNT,
    name: "Blessing of the Hunt",
    energyCost: 1,
    variableEnergy: true,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "On roll: generate Martial.",
    overload: {
      onRoll: [{ type: "generate-symbol", symbol: "martial", amount: 1 }],
    },
  }),
  card({
    id: MARTIAL_BLESSING,
    name: "Martial Blessing",
    energyCost: 1,
    variableEnergy: true,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "On roll: the next attack this turn deals +1 damage.",
    overload: {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
    },
  }),
  card({
    id: TOXIC_BLESSING,
    name: "Toxic Blessing",
    energyCost: 1,
    variableEnergy: true,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
    rulesText: "Can only overload a Toxin face.\nOn roll: all attacks this turn apply 1 Toxin marker.",
    overload: {
      faceSymbols: ["toxin"],
      onRoll: [],
    },
  }),
  card({
    id: MUTANT_SPORES,
    name: "Mutant Spores",
    energyCost: 1,
    variableEnergy: true,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "arcane",
    forge: { faces: 1, kind: "natural", attribute: "arcane", target: "own-die" },
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
    energyCost: 1,
    variableEnergy: true,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
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
    energyCost: 1,
    variableEnergy: true,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Can only overload a Natural Wild face.\n" +
      "On roll: once per turn you may reroll this face. If it lands on this face again, deal 1 damage to 2 of your creatures.",
    overload: {
      faceSymbols: ["wild"],
      faceKinds: ["natural"],
      onRoll: [],
    },
  }),
  card({
    id: RUST,
    name: "Rust",
    energyCost: 1,
    variableEnergy: true,
    type: "tactic",
    subtypes: ["overload"],
    attribute: "corruption",
    forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
    rulesText:
      "Can only overload a Natural Martial face.\nOn absorb: your attacks this turn ignore 2 Shield.",
    overload: {
      faceSymbols: ["martial"],
      faceKinds: ["natural"],
      onRoll: [],
    },
  }),
  card({
    id: PREDATORS_CLAWS,
    name: "Predator's Claws",
    energyCost: 2,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Whenever this creature absorbs Wild, it may move 1 position.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),
  card({
    id: SERRATED_STINGER,
    name: "Serrated Stinger",
    energyCost: 4,
    type: "ritual",
    subtypes: ["continuous"],
    attribute: "toxin",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Special Attacks apply 1 Toxin marker.",
    ritual: {
      activeWhen: { wild: 1, toxin: 1 },
      effects: [],
    },
  }),
  card({
    id: WAR_BANNER,
    name: "War Banner",
    energyCost: 4,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "The allied creature to the left deals +1 damage on Basic Attacks.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),
  card({
    id: ALPHAS_HIDE,
    name: "Alpha's Hide",
    energyCost: 4,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Whenever this creature performs a Special Attack, generate Wild on another card.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),
  card({
    id: TOXIC_HEART,
    name: "Toxic Heart",
    energyCost: 5,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Whenever a Toxin marker deals damage, heal 1 on this creature.",
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
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Whenever this creature changes position, generate Martial on 1 card.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),
  card({
    id: INSIGNIA_OF_COMMAND,
    name: "Insignia of Command",
    energyCost: 5,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText:
      "Can only equip a Martial creature.\nOnce per turn, when this creature attacks, another ally may reposition.",
    equipment: {
      mayTargetOpponent: false,
      creatureAttributes: ["martial"],
      abilities: [],
    },
  }),
  card({
    id: HUNTING_ARMOUR,
    name: "Hunting Armour",
    energyCost: 2,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "The first time this creature takes damage each turn, reduce it by 1.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),
  card({
    id: TWIN_BLADES,
    name: "Twin Blades",
    energyCost: 3,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "martial",
    forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
    rulesText: "Whenever this creature performs a Basic Attack, push the target one position.",
    equipment: {
      mayTargetOpponent: false,
      abilities: [],
    },
  }),
  card({
    id: WILD_CARAPACE,
    name: "Wild Carapace",
    energyCost: 3,
    type: "tactic",
    subtypes: ["equipment"],
    attribute: "wild",
    forge: { faces: 1, kind: "natural", attribute: "wild", target: "own-die" },
    rulesText: "Whenever this creature absorbs Wild, heal 1.",
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
];

export const CARDS: Readonly<Record<string, CardDefinition>> = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getCard = (id: CardId): CardDefinition | undefined => CARDS[id];

/** Every defined card, in the order they appear above — used by the catalogue UI. */
export const ALL_CARDS: readonly CardDefinition[] = DEFINITIONS;

/**
 * Builtin aggro tactics deck (spec 002 “Aggro deck” identity: Martial / Wild /
 * Toxin pressure). Legal under M4: 50–60 cards, ≤4 copies per id.
 */
const PROTOTYPE_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  [WAR_AXE, 4],
  [VENOMOUS_FANGS, 4],
  [TWIN_BLADES, 4],
  [WAR_BANNER, 3],
  [HUNTING_ARMOUR, 3],
  [PREDATORS_CLAWS, 3],
  [HUNTERS_COLLAR, 2],
  [SERRATED_STINGER, 2],
  [MARTIAL_BLESSING, 4],
  [BLESSING_OF_THE_HUNT, 4],
  [RUST, 3],
  [TOXIC_BLESSING, 3],
  [WILD_ECHO, 2],
  [ADRENALINE, 2],
  [CALCULATED_SACRIFICE, 2],
  [LUMINAR_JUDGEMENT, 2],
  [GLIMMER, 2],
  [ALPHAS_HIDE, 2],
  [MUTANT_SPORES, 2],
];

export const PROTOTYPE_DECK: readonly CardId[] = PROTOTYPE_DECK_COUNTS.flatMap(
  ([id, copies]) => Array.from({ length: copies }, () => id),
);

/**
 * Builtin control tactics deck (spec 002 “Control deck” identity: Arcane /
 * Corruption / Darkness). Legal under M4: 50–60 cards, ≤4 copies per id.
 */
const CONTROL_DECK_COUNTS: ReadonlyArray<readonly [CardId, number]> = [
  [LIVING_LIBRARY, 4],
  [ECLIPSE, 4],
  [ARCANE_AMPLIFIER, 4],
  [ARCANE_RESONANCE, 3],
  [PARADOX, 3],
  [CALCULATED_SACRIFICE, 3],
  [PERSISTENT_INFECTION, 3],
  [ARCHMAGES_GRIMOIRE, 3],
  [TOME_OF_INTERDICTION, 3],
  [ABYSSAL_SACRIFICE, 3],
  [MIRRORED_RUNE, 3],
  [LATENT_CORRUPTION, 2],
  [BLACK_PLAGUE, 2],
  [ETERNAL_DARKNESS, 2],
  [GREAT_CONTAMINATION, 2],
  [EXTERMINATION, 2],
  [MIND_CONTROL, 2],
  [ARCANE_SILENCE, 2],
  [LUMINAR_PRISM, 2],
  [COLLAPSE_OF_REALITY, 2],
];

export const CONTROL_DECK: readonly CardId[] = CONTROL_DECK_COUNTS.flatMap(([id, copies]) =>
  Array.from({ length: copies }, () => id),
);
