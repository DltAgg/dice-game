import type { Attribute } from "./attributes.js";
import type { FaceKind } from "./dice.js";
import type { EffectDefinition } from "./effects.js";
import type { CardId, CardInstanceId, CreatureId, FaceCardId, PlayerId } from "./ids.js";
import type { SymbolRequirement, SymbolType } from "./symbols.js";

/**
 * The card model, taken from the `Tactics card layout` template in the Card
 * layouts Figma file. See docs/specs/002-card-layer.md for the grammar and the
 * translated catalogue.
 *
 * The shape every card shares:
 *
 *   Name                                  ⟨cost⟩
 *   [Tactic / Type / Attribute]
 *   [Forge] N face [Natural|Synthetic] [Attribute] on your die
 *   or
 *   ⟨effect⟩
 *
 * The **or** is the whole design. A card is either forged onto a die or played
 * for its effect, never both, which is bible §19–20's two functional regions
 * expressed as a single choice.
 */

/**
 * Every card in the file is a Tactic. The field exists because the type line
 * prints it, and because bible §12 distinguishes card kinds — a creature card
 * is not a tactic.
 */
export type CardType = "tactic";

/** The subtype drives what the effect region is allowed to do. */
export type CardSubtype =
  /** Resolves once, immediately. */
  | "instant"
  /** Waits on the field until its attribute condition is met. */
  | "ritual"
  /** Resolves in response to something else happening. */
  | "reaction"
  /** Attaches to a creature and grants a standing ability. */
  | "equipment"
  /** Attaches to an existing die face and modifies it. */
  | "overload";

/**
 * Printed as a second modifier on Rituals, separating one that keeps applying
 * from one that resolves and is finished.
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
 */
export interface ForgeRegion {
  readonly faces: number;
  readonly kind: FaceKind;
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
 * Standing abilities granted while the card is attached to a creature. Kept as
 * a closed union of what the reducer actually honours. Equipment may still
 * attach with an empty `abilities` list when its trigger is deferred (e.g.
 * Venomous Fangs, Black Plague).
 */
export type EquipmentAbility =
  /** Adds to the damage of every attack the bearer makes (War Axe). */
  { readonly type: "attack-damage-bonus"; readonly amount: number };

/**
 * How the card attaches. Present only on Equipment subtypes; its presence is
 * what makes PLAY_CARD install the card rather than resolve `effect`.
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
}

/**
 * Ritual field presence. Present on playable Rituals; PLAY_CARD places the card
 * onto the engine area in `preparing`, and ACTIVATE_RITUAL fires the effects
 * once the orientation is `ready`.
 */
export interface RitualRegion {
  /**
   * Attribute gate that flips the ritual to ready. Absent when the print has
   * no `[Active when: …]` (e.g. Paradox) — the ritual is ready as soon as it
   * leaves preparing.
   */
  readonly activeWhen?: SymbolRequirement;
  readonly effects: readonly EffectDefinition[];
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
  readonly duration?: CardDuration;
  /**
   * The card's own attribute, which is *not* necessarily the attribute it
   * forges — Eternal Darkness is Arcane and forges Darkness.
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
   * Instant / one-shot effect region. Absent while unimplemented, or when the
   * card's only playable region is equipment / overload / ritual / forge.
   */
  readonly effect?: EffectRegion;
  /** Present on playable Equipment. Absent means the subtype is not yet wired. */
  readonly equipment?: EquipmentRegion;
  /** Present on playable Overloads. */
  readonly overload?: OverloadRegion;
  /** Present on playable Rituals. */
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
}
