import type { Attribute } from "./attributes.js";
import type { CardType } from "./cards.js";
import type { ForgeableFaceKind } from "./dice.js";
import type {
  BounceHost,
  CreatureChoiceFilter,
  DieChoiceFilter,
  DieSlotChoiceFilter,
  SilenceHost,
} from "./targeting.js";
import type {
  CardInstanceId,
  CreatureId,
  DieId,
  FaceCardId,
  PlayerId,
  SymbolInstanceId,
} from "./ids.js";
import type { EffectDefinition } from "./effects.js";
import type { PendingEffect } from "./state.js";
import type { SymbolType } from "./symbols.js";

/**
 * A player decision that pauses resolution. While a non-reaction pending is
 * set, only the matching resolve action from `controllerId` may advance —
 * even if that player is not `activePlayerId`. Everyone else, including the
 * turn player, is refused with `PENDING_DECISION`. Reaction windows use
 * `priorityPlayerId` / `NOT_PRIORITY_PLAYER` instead (`008`).
 */
export type PendingDecision =
  | {
      readonly type: "search-deck";
      readonly controllerId: PlayerId;
      /** How many cards must be chosen (already capped to eligible count). */
      readonly amount: number;
      readonly filter: readonly CardType[];
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "search-graveyard";
      readonly controllerId: PlayerId;
      /** Maximum cards that may be returned (already capped to GY size). */
      readonly amount: number;
      readonly maxPlayCost?: number;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "discard-cards";
      readonly controllerId: PlayerId;
      /** How many hand cards must be chosen (capped to current hand size). */
      readonly amount: number;
      readonly optional?: boolean;
      readonly thenEffects?: readonly EffectDefinition[];
      readonly sourceCreatureId?: CreatureId | null;
      readonly declaredTargetCreatureId?: CreatureId | null;
      readonly sourceDieId?: DieId | null;
      readonly sourceSlotIndex?: number | null;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "choose-creature";
      readonly controllerId: PlayerId;
      readonly filter: CreatureChoiceFilter;
      readonly optional?: boolean;
      /**
       * Effect waiting for a target. `effect.target` / `effect.with` is rewritten
       * to `declared-target` so applying it after the choice does not re-open
       * this decision.
       */
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-ritual";
      readonly controllerId: PlayerId;
      /** Only opposing field rituals are legal today (`011`). */
      readonly filter: "opponent";
      /**
       * Effect waiting for a ritual. `effect.target` is rewritten to
       * `declared-ritual` so applying it after the choice does not re-open
       * this decision.
       */
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-equipment";
      readonly controllerId: PlayerId;
      /** Host creature, or null for field-wide `choose-opponent-equipment`. */
      readonly creatureId: CreatureId | null;
      readonly filter?: "opponent";
      readonly deferred?: PendingEffect;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "choose-overload";
      readonly controllerId: PlayerId;
      readonly filter: "opponent";
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-attribute-tokens";
      readonly controllerId: PlayerId;
      readonly creatureId: CreatureId;
      /** How many token pips must be named from the pile owner's attribute pile. */
      readonly amount: number;
      /** `drain` moves the named pips into the controller's pile (default). */
      readonly mode?: "drain";
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "reaction-priority";
      readonly priorityPlayerId: PlayerId;
      /** Consecutive Passes; chain drains when this reaches 2. */
      readonly consecutivePasses: number;
    }
  | {
      readonly type: "forge-faces";
      readonly controllerId: PlayerId;
      readonly faces: number;
      readonly kind: ForgeableFaceKind;
      readonly attribute: Attribute;
      readonly target: "own-die" | "opponent-die";
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "replace-synthetic-face";
      readonly controllerId: PlayerId;
      readonly faces: number;
      readonly attribute: Attribute;
      readonly fromAttribute?: Attribute;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "choose-effect-mode";
      readonly controllerId: PlayerId;
      readonly modes: readonly (readonly EffectDefinition[])[];
      readonly modeLabels: readonly string[];
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "choose-die";
      readonly controllerId: PlayerId;
      readonly filter: DieChoiceFilter;
      readonly optional?: boolean;
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "convert-symbols";
      readonly controllerId: PlayerId;
      readonly amount: number;
      readonly eligibleSymbolIds: readonly SymbolInstanceId[];
    }
  | {
      readonly type: "copy-pool-symbol";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "replay-graveyard-tactic";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "look-top-deck";
      readonly controllerId: PlayerId;
      readonly cardInstanceIds: readonly CardInstanceId[];
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "peek-deck";
      readonly controllerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "dark-pact";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "mind-control";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "split-damage";
      readonly controllerId: PlayerId;
      readonly amount: number;
      readonly maxTargets: number;
      /** When set, targets must be legal attack targets for this attacker. */
      readonly attackerId: CreatureId | null;
      readonly range: boolean;
      readonly sourceCreatureId: CreatureId | null;
      readonly ignoreShield?: number;
      /** Blade Rain of an attack Strike; Extermination leaves this unset. */
      readonly fromAttack?: boolean;
      readonly thenEffects?: readonly EffectDefinition[];
    }
  | {
      readonly type: "optional-reroll";
      readonly controllerId: PlayerId;
      readonly dieId: DieId;
      readonly faceCardId: FaceCardId;
      /** Adrenaline: deal this much to up to 2 allies if the reroll shows the same face. */
      readonly sameFaceAllyDamage?: number;
    }
  | {
      readonly type: "choose-die-slot";
      readonly controllerId: PlayerId;
      readonly filter: DieSlotChoiceFilter;
      readonly optional?: boolean;
      /** For `same-die-other-slot`: die already chosen. */
      readonly contextDieId?: DieId;
      /** For `same-die-other-slot`: slot that must not be chosen again. */
      readonly excludedSlotIndex?: number;
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-pool-symbol";
      readonly controllerId: PlayerId;
      /** Eligible symbol instance ids (synthetic-in-pool). */
      readonly eligibleSymbolIds: readonly SymbolInstanceId[];
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "optional-overcharge";
      readonly controllerId: PlayerId;
      readonly symbol: SymbolType;
      readonly amount: number;
      readonly dieId: DieId;
      readonly slotIndex: number;
    }
  | {
      readonly type: "optional-bonus-attack";
      readonly controllerId: PlayerId;
      readonly creatureId: CreatureId;
    }
  | {
      readonly type: "choose-silence-host";
      readonly controllerId: PlayerId;
      readonly hosts: readonly SilenceHost[];
      /**
       * Effect waiting for a host. `effect.target` is rewritten to
       * `declared-target` / `declared-ritual` / `declared-die-slot` so applying
       * it after the choice does not re-open this decision. Spec `022`.
       */
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-bounce-card";
      readonly controllerId: PlayerId;
      readonly hosts: readonly BounceHost[];
      /**
       * Effect waiting for a card. `effect.target` is rewritten to
       * `declared-ritual` / `declared-equipment` / `declared-overload` so
       * applying it after the choice does not re-open this decision. Spec `023`.
       */
      readonly deferred: PendingEffect;
    };
