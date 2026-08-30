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
    }
  | {
      readonly kind: "overcharge";
      readonly cardInstanceId: CardInstanceId;
    };

export function selectedHandCardId(intent: Intent): CardInstanceId | null {
  switch (intent.kind) {
    case "play":
    case "forge":
    case "overcharge":
      return intent.cardInstanceId;
    default:
      return null;
  }
}
