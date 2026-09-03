import type { Attribute } from "../model/attributes.js";
import type { CardType } from "../model/cards.js";
import type { FaceKind, ForgeableFaceKind } from "../model/dice.js";
import type { BounceHost, SilenceHost, TargetSelector } from "../model/targeting.js";
import type { SymbolType } from "../model/symbols.js";

/** Closed token set for `[Mark N X]` / `[Strip N X]`. Stun is DEFERRED. */
export type TokenKind = "toxin" | "shield" | "corruption" | "pestilence";

export type ValueExpr =
  | { readonly kind: "literal"; readonly value: number }
  | { readonly kind: "min"; readonly of: readonly ValueExpr[] }
  | { readonly kind: "max"; readonly of: readonly ValueExpr[] }
  | { readonly kind: "count"; readonly query: CountQuery }
  | { readonly kind: "remaining" };

export type CountQuery =
  | { readonly of: "toxin"; readonly on: "target" }
  | { readonly of: "shield"; readonly on: "target" }
  | { readonly of: "attribute-tokens"; readonly on: "target-controller" };

export type Duration =
  | { readonly kind: "immediate" }
  | { readonly kind: "end-of-turn" }
  | { readonly kind: "until-consumed" }
  | { readonly kind: "until-owners-next-turn" }
  | { readonly kind: "while-attached" };

export type ConditionExpr =
  | { readonly kind: "all"; readonly of: readonly ConditionExpr[] }
  | { readonly kind: "any"; readonly of: readonly ConditionExpr[] }
  | { readonly kind: "not"; readonly of: ConditionExpr }
  | { readonly kind: "source-position"; readonly position: "frontline" | "back" }
  | { readonly kind: "any-enemy-has-toxin" }
  | { readonly kind: "any-ally-attacked-this-turn" }
  | { readonly kind: "has-other-symbol"; readonly symbol?: SymbolType; readonly faceKind?: FaceKind }
  | { readonly kind: "has-adjacent-ally" }
  | { readonly kind: "controller-has-frontline" }
  | { readonly kind: "source-is-frontline" };

export type ModifyStat =
  | "attack-damage"
  | "next-attack-damage"
  | "ignore-shield"
  | "attack-toxin"
  | "prevent-draw"
  | "requirement-wildcard"
  | "forge-discount"
  | "play-cost-discount"
  | "redirect-damage"
  | "next-incoming-damage"
  | "blade-rain"
  | "attack-prevent"
  | "extra-attacks"
  | "toxin-receive-cap"
  | "resolve-next-face-effect-twice";

export type EffectOp =
  | "damage"
  | "heal"
  | "mark"
  | "strip"
  | "draw"
  | "discard"
  | "search"
  | "mill"
  | "forge"
  | "reposition"
  | "swap"
  | "negate"
  | "modify"
  | "generate-symbol"
  | "convert-symbols"
  | "sequence"
  | "branch"
  | "prompt"
  | "prevent-attack-reflect"
  | "replace-synthetic-face"
  | "choose-effect-mode"
  | "retain-die"
  | "replay-graveyard-tactic"
  | "copy-pool-symbol"
  | "look-top-deck"
  | "peek-deck-optional-bottom"
  | "dark-pact"
  | "mind-control"
  | "extermination"
  | "reapply-die-modifiers"
  | "copy-other-die-face"
  | "optional-reroll-die"
  | "remove-toxin-deal-damage"
  | "lock-corrupted-face-resource"
  | "spread-corruption-marker"
  | "suppress-opposing-natural-inherent"
  | "strip-corrupted-face-unusable-symbol"
  | "arm-wildcard-from-synthetic-pool"
  | "copy-appeared-synthetic-onroll"
  | "optional-overcharge"
  | "optional-bonus-basic-attack"
  | "destroy-equipment"
  | "destroy-ritual"
  | "destroy-overload"
  | "drain-life"
  | "search-graveyard"
  | "silence"
  | "bounce"
  | "desynthesize";

export type EffectNode = {
  readonly op: EffectOp;
  readonly amount?: ValueExpr;
  readonly target?: TargetSelector;
  readonly token?: TokenKind;
  readonly player?: "controller" | "opponent";
  readonly optional?: boolean;
  readonly then?: readonly EffectNode[];
  readonly else?: readonly EffectNode[];
  readonly when?: ConditionExpr;
  readonly effects?: readonly EffectNode[];
  readonly filter?: readonly CardType[];
  readonly maxPlayCost?: number;
  readonly symbol?: SymbolType;
  readonly fromSymbol?: SymbolType;
  readonly stat?: ModifyStat;
  readonly duration?: Duration;
  readonly cardTypes?: readonly CardType[] | "any";
  readonly scope?: "card" | "ritual";
  readonly faces?: number;
  readonly kind?: ForgeableFaceKind;
  readonly attribute?: Attribute;
  readonly fromAttribute?: Attribute;
  readonly forgeTarget?: "own-die" | "opponent-die";
  readonly with?: TargetSelector;
  readonly sourceOnly?: boolean;
  readonly oncePerTurn?: boolean;
  readonly sameFaceAllyDamage?: number;
  readonly searchZone?: "deck" | "graveyard";
  readonly hosts?: readonly SilenceHost[] | readonly BounceHost[];
};

export type TriggerEvent =
  | "on-roll"
  | "on-absorb"
  | "on-deal-damage"
  | "on-toxin-damage"
  | "on-turn-start"
  | "on-roll-symbol"
  | "on-attack"
  | "on-take-damage"
  | "on-discard"
  | "on-change-position";

export interface TriggerNode {
  readonly when: {
    readonly event: TriggerEvent;
    readonly symbol?: SymbolType;
    readonly symbols?: readonly SymbolType[];
    readonly faceKinds?: readonly FaceKind[];
    readonly attackKinds?: readonly ("basic" | "special")[];
    readonly rollingPlayer?: "controller" | "opponent" | "any";
    readonly whoseTurn?: "controller" | "opponent" | "any";
    readonly damagedOwner?: "controller" | "opponent" | "any";
    readonly discardingPlayer?: "controller" | "opponent" | "any";
    readonly absorberRelation?: "self" | "ally" | "ally-other" | "any";
    readonly attackerRelation?: "self" | "ally" | "ally-other" | "any";
    readonly creatureRelation?: "self" | "ally" | "ally-other" | "any";
    readonly oncePerTurn?: boolean;
    readonly reduceBy?: number;
  };
  readonly effects?: readonly EffectNode[];
  readonly modifiers?: readonly EffectNode[];
}

export const literal = (value: number): ValueExpr => ({ kind: "literal", value });
