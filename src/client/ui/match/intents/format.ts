import {
  formatMeterPlayCost,
  getCard,
  ritualDurationOf,
} from "@server";

export type CardDef = NonNullable<ReturnType<typeof getCard>>;

/** Meter required to play the card. Empty when the play is free. */
export function formatPlayCostCompact(def: CardDef): string {
  return formatMeterPlayCost(def) ?? "";
}

export function formatPlayCostHover(def: CardDef): string {
  return formatMeterPlayCost(def) ?? "No play cost";
}

/** Play cost, then the rest of a meta line. A free card omits the cost. */
export function formatCostDetail(def: CardDef, rest: string): string {
  const cost = formatPlayCostCompact(def);
  if (cost.length === 0) return rest;
  if (rest.length === 0) return cost;
  return `${cost} · ${rest}`;
}

/**
 * Field-tile stay copy. Queries `ritualDurationOf` plus subtypes / activate
 * body — does not copy legality. Instant leftover GY is retired catalogue.
 */
export function ritualStayLabel(def: CardDef): string | null {
  const duration = ritualDurationOf(def);
  if (duration === "instant") return "Leaves after activate";
  if (duration !== "continuous") return null;

  const reactionStay = def.subtypes.includes("reaction");
  const hasActivateBody = (def.ritual?.effects?.length ?? 0) > 0;
  if (reactionStay || hasActivateBody) return "Once per turn (stays)";
  return "Continuous (stays)";
}
