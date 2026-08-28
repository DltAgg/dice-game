import {
  formatAttackCost,
  formatPlayCostLine,
  getCard,
} from "@server";

export type CardDef = NonNullable<ReturnType<typeof getCard>>;

export function formatPlayCostCompact(def: CardDef): string {
  if (def.playCost === undefined) return "—";
  const formatted = formatAttackCost(def.playCost);
  return formatted.length > 0 ? formatted : "—";
}

export function formatPlayCostHover(def: CardDef): string {
  const line = formatPlayCostLine(def);
  return line ?? "No play cost";
}
