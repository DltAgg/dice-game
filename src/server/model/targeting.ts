import type { DualKindAttribute } from "./attributes.js";
import type { CreatureId, CardInstanceId, DieId } from "./ids.js";

/** Hosts a `[Silence]` effect may name. Non-empty unique subset per card. */
export type SilenceHost = "creature" | "ritual" | "face";

/**
 * Player pick for `choose-silence-host`. Exactly one arm.
 * Spec `022`.
 */
export type SilenceHostChoice =
  | { readonly host: "creature"; readonly creatureId: CreatureId }
  | { readonly host: "ritual"; readonly cardInstanceId: CardInstanceId }
  | { readonly host: "face"; readonly dieId: DieId; readonly slotIndex: number };

/** Hosts a `[Bounce]` effect may name. Non-empty unique subset per card. Spec `023`. */
export type BounceHost = "ritual" | "equipment" | "overload";

/**
 * Player pick for `choose-bounce-card`. Exactly one arm.
 * Spec `023`.
 */
export type BounceHostChoice =
  | { readonly host: "ritual"; readonly cardInstanceId: CardInstanceId }
  | { readonly host: "equipment"; readonly cardInstanceId: CardInstanceId }
  | { readonly host: "overload"; readonly cardInstanceId: CardInstanceId };

/**
 * Targets are resolved against the resolution context rather than chosen at
 * definition time. Selectors that need a player decision arrive as `choose-*`
 * and open a pending.
 */
export type TargetSelector =
  /** The creature whose ability or attack produced the effect. */
  | { readonly kind: "source-creature" }
  /** The creature named by the action that started this resolution. */
  | { readonly kind: "declared-target" }
  /**
   * A concrete creature id stamped at runtime between nested choices
   * (e.g. drain-life source while choosing the heal destination). Catalogue
   * JSON never uses this.
   */
  | { readonly kind: "fixed"; readonly creatureId: CreatureId }
  /**
   * The controller's living creature with the most damage (ties: earliest id).
   * Intentional silent pick for on-roll heals with no declared target — print
   * does not ask the player to name an ally.
   */
  | { readonly kind: "most-damaged-ally" }
  /**
   * An opposing living creature with the most Shield (ties: earliest id).
   * Intentional silent pick for on-roll shield-strip faces; print names the
   * most-shielded enemy, not a chosen one.
   */
  | { readonly kind: "most-shielded-enemy" }
  /**
   * An opposing living creature with the most damage (ties: earliest id).
   * Used by turn-start burn pulses so END_TURN stays atomic (no choose pending).
   */
  | { readonly kind: "most-damaged-enemy" }
  /** Pause for the controller to name one of their living creatures. */
  | { readonly kind: "choose-ally" }
  /** Pause for the controller to name one opposing living creature. */
  | { readonly kind: "choose-enemy" }
  /** Pause: name one opposing field ritual. Spec `011`. */
  | { readonly kind: "choose-opponent-ritual" }
  /** Pause: name one opposing attached equipment. Spec `011`. */
  | { readonly kind: "choose-opponent-equipment" }
  /** Pause: name one opposing attached overload. Spec `011`. */
  | { readonly kind: "choose-opponent-overload" }
  /** Card named by a completed choose-ritual / equipment / overload decision. */
  | { readonly kind: "declared-ritual" }
  | { readonly kind: "declared-equipment" }
  | { readonly kind: "declared-overload" }
  /**
   * Pause: name one opposing creature, field ritual, or die slot with a face,
   * according to `hosts`. Spec `022`. Always prompt when ≥1 eligible; empty
   * is a legal whiff.
   */
  | { readonly kind: "choose-opponent-silence-host"; readonly hosts: readonly SilenceHost[] }
  /**
   * Pause: name one opposing field ritual, attached equipment, or attached
   * overload according to `hosts`. Spec `023`. Always prompt when ≥1 eligible;
   * empty is a legal whiff.
   */
  | { readonly kind: "choose-opponent-bounce-card"; readonly hosts: readonly BounceHost[] }
  /**
   * Pause: name one synthetic attribute face slot on any player's die.
   * Spec `024`. Catalogue JSON. Runtime rewrites to `declared-die-slot`.
   */
  | { readonly kind: "choose-any-synthetic-slot" }
  /**
   * Die slot named by a completed `choose-silence-host` (or die-slot) decision.
   * Catalogue JSON never uses this. Spec `022` / `024`.
   */
  | { readonly kind: "declared-die-slot"; readonly dieId: DieId; readonly slotIndex: number }
  /**
   * The creature targeted by the waiting attack chain link (Prismatic Barrier).
   * Spec `009`.
   */
  | { readonly kind: "chain-attack-target" }
  /** Every living allied frontline creature. */
  | { readonly kind: "allied-frontline" }
  /** Every living enemy frontline creature. */
  | { readonly kind: "enemy-frontline" }
  /** Every living allied creature (frontline and back). */
  | { readonly kind: "ally-all" }
  /** Every living enemy creature (frontline and back). */
  | { readonly kind: "enemy-all" }
  | { readonly kind: "choose-ally-other" }
  | { readonly kind: "choose-allied-frontline" }
  | { readonly kind: "choose-allied-frontline-other" }
  | { readonly kind: "choose-ally-with-toxin" }
  | { readonly kind: "choose-enemy-with-toxin" }
  | { readonly kind: "choose-ally-damage-over-half" }
  /** Pause: living ally whose owner currently holds at least one pile token. */
  | { readonly kind: "choose-ally-with-tokens" }
  /**
   * Pause: living `creatureIds` neighbor (±1) of the source creature.
   * Spec `015` mill.
   */
  | { readonly kind: "choose-adjacent-ally" };

/** Filters for a `choose-creature` pending (specs `011` / `012`). */
export type CreatureChoiceFilter =
  | "ally"
  | "enemy"
  | "self"
  | "ally-other"
  | "allied-frontline"
  | "allied-frontline-other"
  | "ally-with-toxin"
  | "enemy-with-toxin"
  | "ally-damage-over-half"
  | "ally-with-tokens"
  | "adjacent-ally";

/** Filters for a `choose-die` pending (spec `012`). */
export type DieChoiceFilter = "owned-retainable" | "owned-rolled" | "any-synthetic-corruption";

/** Filters for a `choose-die-slot` pending (spec `013` / `024`). */
export type DieSlotChoiceFilter =
  | "opposing-synthetic"
  | "opposing-natural"
  | "opposing-corrupted"
  | "opposing-corrupted-with-other-slot"
  | "same-die-other-slot"
  | "appeared-synthetic-this-roll"
  /** Any player's die; synthetic attribute faces only. Spec `024`. */
  | "any-synthetic";

export const NATURAL_CONVERT_SYMBOLS: readonly DualKindAttribute[] = [
  "martial",
  "wild",
  "arcane",
  "luminar",
];
