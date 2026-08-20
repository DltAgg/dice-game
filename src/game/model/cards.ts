import type { Attribute } from "./attributes.js";
import type { FaceKind, ForgeableFaceKind } from "./dice.js";
import type { EffectDefinition } from "./effects.js";
import type { CardId, CardInstanceId, CreatureId, FaceCardId, PlayerId } from "./ids.js";
import type { SymbolRequirement, SymbolType, AttributeTokens } from "./symbols.js";

/**
 * The card model, taken from the `Tactics card layout` template in the Card
 * layouts Figma file. See docs/specs/002-card-layer.md for the grammar and the
 * translated catalogue.
 *
 * The shape every card shares:
 *
 *   Name                                  ⟨cost⟩
 *   [Type / … / Attribute]
 *   [Forge] N face [Natural|Synthetic] [Attribute] on your die
 *   or
 *   ⟨effect⟩
 *
 * The **or** is the whole design. A card is either forged onto a die or played
 * for its effect, never both, which is bible §19–20's two functional regions
 * expressed as a single choice.
 */

/**
 * Main kinds that sit in the hand deck. Creatures and faces are separate
 * catalogues. Instant / Reaction / Equipment / Overload are first-class types
 * (the former umbrella "tactic" main type is gone). Ritual keeps subtypes on
 * the type line (`[Ritual / Instant / …]`, `[Ritual / Continuous / …]`, …).
 */
export type CardType =
  | "instant"
  | "reaction"
  | "equipment"
  | "overload"
  | "ritual";

/**
 * Type-line modifiers after the main kind. Only Rituals use these in print;
 * Instant / Reaction / Equipment / Overload are main `CardType` values.
 */
export type CardSubtype =
  /** Leaves after activation (rituals). */
  | "instant"
  /** Stays in play after activation (rituals); exhausts until the owner's next turn. */
  | "continuous"
  /** Resolves in response to something else (ritual reactions). */
  | "reaction";

/**
 * How a Ritual behaves after activation. Derived from subtypes (`instant` /
 * `continuous`); kept as its own alias because the resolution chain stores it.
 */
export type CardDuration = "instant" | "continuous";

/**
 * How a Ritual sits on the engine field. Preparing is tapped, ready is
 * untapped, exhausted is diagonal (once-per-turn already used this turn).
 */
export type RitualOrientation = "preparing" | "ready" | "exhausted";

/** Which die a forge acts on. */
export type ForgeTarget = "own-die" | "opponent-die";

/**
 * The forge region. Bible §13: forging replaces the face card backing a
 * physical slot, so the count, kind and attribute together say what goes in.
 *
 * Natural forges are legal only for dual-kind attributes (Martial, Wild,
 * Arcane, Luminar). Toxin / Mechanical / Corruption / Darkness must forge
 * `kind: "synthetic"` — see `attributeAllowsNaturalFaces`.
 */
export interface ForgeRegion {
  readonly faces: number;
  readonly kind: ForgeableFaceKind;
  readonly attribute: Attribute;
  readonly target: ForgeTarget;
}

/**
 * The effect region. `requires` is the bracketed gate the layouts print before
 * the effect text; it is checked against the player's symbol pool, the same
 * supply engine abilities draw on.
 *
 * How the gate prints depends on the subtype: Rituals say `[Active when: …]`,
 * Instants say `[Requires: …]`. The UI formatter picks the label; the engine
 * only cares that the symbols are present.
 */
export interface EffectRegion {
  readonly requires?: SymbolRequirement;
  /** An extra Energy cost inside the effect, on top of the header cost. */
  readonly additionalEnergy?: number;
  readonly effects: readonly EffectDefinition[];
}

/**
 * Standing abilities granted while attached / while a passive or continuous
 * ritual is eligible. Closed union of what the reducer honours (`010`).
 *
 * Prefer shared events + relation filters over coupled types
 * (`on-ally-attack`, `on-opponent-roll-symbol`). See
 * `.cursor/skills/implement-hooks/SKILL.md`.
 */
export type CreatureRelation = "self" | "ally" | "ally-other" | "any";
export type PlayerRelation = "controller" | "opponent" | "any";

export type StandingTrigger =
  /**
   * Adds to attack damage the bearer deals. Optional `attackKinds` (War Axe:
   * Basic only).
   */
  {
      readonly type: "attack-damage-bonus";
      readonly amount: number;
      readonly attackKinds?: readonly ("basic" | "special")[];
      /**
       * Who receives the bonus. Default `self` (gear on the attacker).
       * `left-ally`: the previous living creature in the owner's `creatureIds`
       * (War Banner).
       */
      readonly bearerRelation?: "self" | "left-ally";
    }
  /**
   * Reduce PLAY_CARD / ritual place / equip / overload Energy (not FORGE).
   * Min cost 0. `oncePerTurn` spends a host key on the first matching play.
   */
  | {
      readonly type: "energy-cost-discount";
      readonly amount: number;
      readonly oncePerTurn?: boolean;
      readonly cardTypes?: readonly CardType[];
      readonly subtypes?: readonly CardSubtype[];
      readonly attributes?: readonly Attribute[];
    }
  /** Attacker ignores this many Shield on the attack target (War Minotaur). */
  | {
      readonly type: "ignore-shield";
      readonly amount: number;
    }
  /** After the bearer deals HP damage (Venomous Fangs, Blade of Serene Light). */
  | {
      readonly type: "on-deal-damage";
      readonly effects: readonly EffectDefinition[];
    }
  /** After a toxin tick deals HP damage to an ally of the bearer (Toxic Heart). */
  | {
      readonly type: "on-toxin-damage";
      readonly effects: readonly EffectDefinition[];
    }
  /**
   * When a player rolls a die showing this symbol. Filter whose roll with
   * `rollingPlayer` (default `controller` — Black Plague).
   */
  | {
      readonly type: "on-roll-symbol";
      readonly symbol: SymbolType;
      readonly rollingPlayer?: PlayerRelation;
      readonly effects: readonly EffectDefinition[];
    }
  /**
   * When a creature or ritual absorbs a symbol. Default absorber is the host
   * (`self`). Optional `symbols` / `faceKinds` filters; omit to fire on any
   * absorb. Ritual assignment shares this event; identity is instance id.
   * `oncePerTurn` spends a host key (Lens Choir).
   */
  | {
      readonly type: "on-absorb";
      readonly symbols?: readonly SymbolType[];
      readonly faceKinds?: readonly FaceKind[];
      readonly absorberRelation?: CreatureRelation;
      readonly oncePerTurn?: boolean;
      readonly effects: readonly EffectDefinition[];
    }
  /**
   * When a creature declares an attack. Default attacker is the host (`self`).
   * Optional `attackKinds` / `oncePerTurn`.
   */
  | {
      readonly type: "on-attack";
      readonly attackKinds?: readonly ("basic" | "special")[];
      readonly attackerRelation?: CreatureRelation;
      readonly oncePerTurn?: boolean;
      readonly effects: readonly EffectDefinition[];
    }
  /**
   * Incoming damage on the host. `reduceBy` applies inside `dealDamage` before
   * prevent/Shields; optional `effects` queue after HP is dealt.
   */
  | {
      readonly type: "on-take-damage";
      readonly reduceBy?: number;
      readonly oncePerTurn?: boolean;
      readonly effects?: readonly EffectDefinition[];
    }
  /** When a player discards cards. Default `discardingPlayer: "controller"`. */
  | {
      readonly type: "on-discard";
      readonly discardingPlayer?: PlayerRelation;
      readonly effects: readonly EffectDefinition[];
    }
  /**
   * When a creature changes battlefield position (ally swap / reposition).
   * Default `creatureRelation: "self"` (the host moved). Enemy push is banned.
   */
  | {
      readonly type: "on-change-position";
      readonly creatureRelation?: CreatureRelation;
      readonly effects: readonly EffectDefinition[];
    };

/** @deprecated Use `StandingTrigger` — alias kept for existing imports. */
export type EquipmentAbility = StandingTrigger;

/**
 * How the card attaches. Present on Equipment cards; its presence is what
 * makes PLAY_CARD install the card rather than resolve `effect`.
 */
export interface EquipmentRegion {
  /** Black Plague can sit on an opposing creature; most equipment cannot. */
  readonly mayTargetOpponent: boolean;
  /**
   * When set, the host creature must share at least one of these attributes
   * ("Martial creatures only").
   */
  readonly creatureAttributes?: readonly Attribute[];
  readonly abilities: readonly EquipmentAbility[];
}

/**
 * Overload attachment. Present on playable Overloads; its presence is what
 * makes PLAY_CARD install onto a face card rather than resolve as a one-shot.
 */
export interface OverloadRegion {
  /** When set, only faces producing these symbols may host the overload. */
  readonly faceSymbols?: readonly SymbolType[];
  /** When set, only faces of these kinds may host the overload. */
  readonly faceKinds?: readonly FaceKind[];
  /** Fired when any die face showing this face card is rolled. */
  readonly onRoll: readonly EffectDefinition[];
  /**
   * Fired when a symbol is absorbed from a die showing this face card
   * (Mutant Spores, Wild Echo). Omit or leave empty when deferred.
   */
  readonly onAbsorb?: readonly EffectDefinition[];
}

/**
 * Ritual field presence. Present on playable Rituals; PLAY_CARD places the card
 * onto the engine area in `preparing`, and ACTIVATE_RITUAL fires the effects
 * once the orientation is `ready`.
 */
export interface RitualRegion {
  /**
   * Attribute gate that flips the ritual to ready. Progress is cumulative:
   * printed as `Arcane + Arcane` (not `2× Arcane`). Multiple matching pool
   * symbols may be assigned in the same turn (including two+ of the same
   * attribute) until this requirement is filled. Absent when the print has
   * no `[Active when: …]` (e.g. Paradox) — the ritual is ready as soon as
   * it leaves preparing.
   */
  readonly activeWhen?: SymbolRequirement;
  /**
   * Extra Energy paid on ACTIVATE_RITUAL (Runic Nullification’s “Pay 3
   * Energy”), on top of the header cost paid when placing the ritual.
   */
  readonly additionalEnergy?: number;
  readonly effects: readonly EffectDefinition[];
  /**
   * Standing triggers while this continuous ritual is `ready` on the field
   * (Abyssal Sacrifice, Serrated Stinger). Instant/reaction rituals ignore.
   * Standing fire does not spend Active-when progress or exhaust the ritual.
   */
  readonly standingAbilities?: readonly StandingTrigger[];
}

export interface CardDefinition {
  readonly id: CardId;
  readonly name: string;
  /**
   * Header Energy cost. Fixed cards pay exactly this; variable (`?`) cards pay
   * at least this much (always 1) and may pay more — see `variableEnergy`.
   */
  readonly energyCost: number;
  /**
   * Figma `?` cost: pay `energyCost` or more (declared as `energyPaid` on
   * PLAY_CARD / FORGE_CARD). Extra spend is available for effects that scale
   * off the amount paid once that vocabulary exists.
   */
  readonly variableEnergy?: boolean;
  readonly type: CardType;
  readonly subtypes: readonly CardSubtype[];
  /**
   * The card's own attribute. Current catalogue cards forge this same
   * attribute (`forge.attribute`). The two fields stay separate so a future
   * splash forge is still representable.
   */
  readonly attribute: Attribute;
  readonly forge: ForgeRegion;
  /**
   * Tags that satisfy face forge restrictions (e.g. `"echo"` for Arcane Echo).
   */
  readonly forgeTags?: readonly "echo"[];
  /**
   * English rules text for the effect region, as printed below "or". Taken from
   * the Figma layouts after translation. Empty string means the layout's
   * "Não possui" — the card forges and does nothing else.
   *
   * Kept as prose rather than derived from `effect`, because most of the
   * catalogue names vocabulary the engine cannot express yet and the printed
   * wording is the authority the UI must follow.
   */
  readonly rulesText: string;
  /**
   * Instant / reaction one-shot effect region. Absent while unimplemented, or
   * when the card's only playable region is equipment / overload / ritual / forge.
   */
  readonly effect?: EffectRegion;
  /** Present on playable Equipment (`type: "equipment"`). */
  readonly equipment?: EquipmentRegion;
  /** Present on playable Overloads (`type: "overload"`). */
  readonly overload?: OverloadRegion;
  /** Present on playable Rituals (`type: "ritual"`). */
  readonly ritual?: RitualRegion;
}

/**
 * Where a card instance sits. `equipment`, `overload` and `ritual` are board
 * zones: the card is attached or waiting on the field, not sitting in a pile.
 */
export type CardZone = "deck" | "hand" | "graveyard" | "equipment" | "overload" | "ritual";

export interface CardInstance {
  readonly id: CardInstanceId;
  readonly cardId: CardId;
  readonly ownerId: PlayerId;
  readonly zone: CardZone;
  /** Set only while `zone === "equipment"`. */
  readonly attachedToCreatureId: CreatureId | null;
  /**
   * Set only while `zone === "overload"`. The overload sits on this face card;
   * every die face that references it will fire the overload when rolled.
   */
  readonly attachedToFaceCardId: FaceCardId | null;
  /** Set only while `zone === "ritual"`. */
  readonly ritualOrientation: RitualOrientation | null;
  /**
   * Cumulative Active-when progress while `zone === "ritual"`. Credited
   * immediately when the owner assigns a matching unabsorbed pool symbol onto
   * the ritual during actions (same window and `on-absorb` event as creature
   * absorb; unlike creature tokens this is not delayed to end of turn). The
   * owner may assign multiple pips in one turn, including the same attribute
   * more than once, until `activeWhen` is filled. Null outside the ritual zone.
   */
  readonly ritualProgress: AttributeTokens | null;
  /**
   * Attributes credited toward `ritualProgress` this turn (telemetry; may
   * repeat). Not a legality cap — a second matching pip is legal until the
   * gate is filled. Cleared at the start of the owner's turn. Null outside
   * the ritual zone.
   */
  readonly ritualProgressCreditedThisTurn: readonly Attribute[] | null;
}
