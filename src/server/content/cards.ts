import type { CardDefinition } from "../model/cards.js";
import { asCardId, type CardId } from "../model/ids.js";
import cardOrder from "./cards/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";

/**
 * Header play/forge costs use the attribute pile (`playCost`). See docs/RULEBOOK.md §6.
 */

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

/** Attribute-bridge glue (playtest stranded-pile fix). */
export const BLOODLINE_PACT: CardId = asCardId("card-bloodline-pact");
export const PACK_DRILL: CardId = asCardId("card-pack-drill");
export const CROSSCUT: CardId = asCardId("card-crosscut");
export const WARPATH_HARNESS: CardId = asCardId("card-warpath-harness");
export const SHADOW_CIPHER: CardId = asCardId("card-shadow-cipher");
export const VEILED_TOME: CardId = asCardId("card-veiled-tome");
export const UMBRAL_LENS: CardId = asCardId("card-umbral-lens");
export const ICHOR_EXCHANGE: CardId = asCardId("card-ichor-exchange");
export const BLIGHT_TRADE: CardId = asCardId("card-blight-trade");
export const SEEPING_BRAND: CardId = asCardId("card-seeping-brand");
export const PRISM_CONDUIT: CardId = asCardId("card-prism-conduit");
export const HUNT_BEACON: CardId = asCardId("card-hunt-beacon");
export const GEAR_SALUTE: CardId = asCardId("card-gear-salute");
export const RUNIC_COG: CardId = asCardId("card-runic-cog");

const cardModules = import.meta.glob("./cards/card-*.json", { eager: true, import: "default" });
const loadedCards = catalogueFromModules<CardDefinition>(cardModules, cardOrder);

export const CARDS: Readonly<Record<string, CardDefinition>> = loadedCards.byId;
export const getCard = (id: CardId): CardDefinition | undefined => CARDS[id];
export const ALL_CARDS: readonly CardDefinition[] = loadedCards.list;

export {
  AGGRO_DECK,
  BURN_DECK,
  BURN_DECK_COUNTS,
  COMBO_MECHANICAL_DECK,
  CONTROL_DECK,
  PROTOTYPE_DECK,
  TEMPO_DECK,
} from "./loadouts/index.js";
