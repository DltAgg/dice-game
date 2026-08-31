import {
  formatAttackCost,
  formatPlayCostLine,
  getCard,
  ritualDurationOf,
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
