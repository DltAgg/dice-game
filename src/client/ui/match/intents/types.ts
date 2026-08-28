import {
  type AttackId,
  type CardInstanceId,
  type CreatureId,
  type DieId,
  type SymbolInstanceId,
} from "@server";

export type Intent =
  | { readonly kind: "idle" }
  | { readonly kind: "absorb"; readonly symbolId: SymbolInstanceId }
  | {
      readonly kind: "attack";
      readonly attackerId: CreatureId;
      readonly attackId?: AttackId;
    }
  | {
      readonly kind: "play";
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly kind: "forge";
      readonly cardInstanceId: CardInstanceId;
      /** Which physical die will receive the forge. */
      readonly dieId?: DieId;
      /** Slots on that die to overwrite (length must match forge.faces). */
      readonly slotIndexes?: readonly number[];
    };
