import {
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  formatAttackCost,
  formatEffectRegion,
  formatForgeLine,
  formatRequirementLine,
  formatTypeLine,
  getCard,
  ritualDurationOf,
  type CardInstance,
  type GameState,
} from "@server";
import { KeywordRemindersTooltip, KeywordRichText } from "@client/ui/keywords/KeywordReminders";
import { tacticPrintText } from "@client/ui/keywords/reminders";
import {
  formatPlayCostCompact,
  formatPlayCostHover,
} from "../intents/format";
import {
  btnClass,
  btnPrimary,
  FIXED_INSPECT_ASIDE_CLASS,
  FIXED_INSPECT_TOOLTIP_CLASS,
} from "../styles";
import {
  fixedTooltipPairStyle,
  INSPECT_TOOLTIP_GAP_PX,
  INSPECT_TOOLTIP_WIDTH_PX,
  useAnchoredTooltipPair,
} from "../tooltips/anchoredTooltip";

export function RitualTile({
  card,
  state,
  canActivate,
  onActivate,
}: {
  card: CardInstance;
  state: GameState;
  canActivate: boolean;
  onActivate: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const pairPos = useAnchoredTooltipPair(
    hovered,
    rootRef,
    INSPECT_TOOLTIP_WIDTH_PX,
    INSPECT_TOOLTIP_GAP_PX,
    "above",
  );

  const def = getCard(card.cardId);
  if (def === undefined) return null;

  const orientation = card.ritualOrientation ?? "—";
  const duration = ritualDurationOf(def);
  const durationLabel =
    duration === "continuous" ? "Continuous (stays)" : duration === "instant" ? "Leaves after activate" : null;
  const activeWhen = formatRequirementLine(def);
  const spend = def.ritual?.spend;
  const spendLine =
    spend !== undefined && formatAttackCost(spend) !== ""
      ? `Spend: ${formatAttackCost(spend)}`
      : null;
  const hasActivateEffects = (def.ritual?.effects?.length ?? 0) > 0;
  const standingOnly =
    !hasActivateEffects && (def.ritual?.standingAbilities?.length ?? 0) > 0;
  const ready = card.ritualOrientation === "ready";
  const preparing = card.ritualOrientation === "preparing";
  const exhausted = card.ritualOrientation === "exhausted";
  const pile = state.players[card.ownerId]?.attributePool ?? {};
  const gateVsPile =
    def.ritual?.activeWhen !== undefined
      ? Object.entries(def.ritual.activeWhen)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(
            ([attr, needed]) =>
              `${attr} ${String(pile[attr as keyof typeof pile] ?? 0)}/${String(needed)}`,
          )
          .join(" · ")
      : null;

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        ready
          ? "w-44 rounded border border-[var(--accent)]/50 bg-stone-900 p-2.5"
          : preparing
            ? "w-44 rounded border border-amber-800/50 bg-stone-950 p-2.5"
            : "w-44 rounded border border-stone-700 bg-stone-950 p-2.5 opacity-80"
      }
    >
      {pairPos !== null &&
        createPortal(
          <>
            <div
              className={FIXED_INSPECT_TOOLTIP_CLASS}
              style={fixedTooltipPairStyle(pairPos, "primary")}
              role="tooltip"
            >
              <p className="text-sm font-medium text-stone-100">{def.name}</p>
              <p className="mt-1 text-xs text-stone-400">
                {formatPlayCostHover(def)}
              </p>
              <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
                {orientation}
                {durationLabel !== null ? ` · ${durationLabel}` : ""}
              </p>
              {gateVsPile !== null && gateVsPile !== "" && (
                <p className="mt-1 text-xs text-amber-200/80">Active-when vs pile: {gateVsPile}</p>
              )}
              {spendLine !== null && (
                <p className="mt-0.5 text-xs text-amber-200/70">{spendLine} (from pile on activate)</p>
              )}
              <div className="mt-2 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                <p>
                  <KeywordRichText text={formatTypeLine(def)} />
                </p>
                <p className="mt-1 text-stone-500">
                  <KeywordRichText text={formatForgeLine(def.forge)} />
                </p>
                <div
                  className="my-2 -mx-3 h-px bg-gradient-to-r from-transparent via-[#b4a79c]/70 to-transparent"
                  role="separator"
                  aria-hidden
                />
                {formatEffectRegion(def).map((line) => (
                  <p key={line}>
                    <KeywordRichText text={line} />
                  </p>
                ))}
                {(def.ritual?.standingAbilities?.length ?? 0) > 0 && (
                  <p className="text-stone-500">
                    Standing: {String(def.ritual?.standingAbilities?.length)} trigger
                    {(def.ritual?.standingAbilities?.length ?? 0) === 1 ? "" : "s"} while ready
                  </p>
                )}
              </div>
            </div>
            <div
              className={FIXED_INSPECT_ASIDE_CLASS}
              style={fixedTooltipPairStyle(pairPos, "secondary")}
              role="tooltip"
            >
              <KeywordRemindersTooltip print={tacticPrintText(def)} />
            </div>
          </>,
          document.body,
        )}

      <div className="w-full text-left">
        <p className="truncate text-sm font-medium text-stone-100">{def.name}</p>
        <p className="mt-0.5 text-[0.65rem] capitalize text-stone-500">
          {formatPlayCostCompact(def)} · {def.subtypes.join("/") || "ritual"}
        </p>
        <p
          className={
            ready
              ? "mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent)]"
              : preparing
                ? "mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-200/80"
                : exhausted
                  ? "mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-stone-500"
                  : "mt-1 text-[0.65rem] uppercase tracking-wider text-stone-500"
          }
        >
          {orientation}
        </p>
        {activeWhen !== null && (
          <p className="mt-1 truncate text-[0.65rem] text-stone-400">{activeWhen}</p>
        )}
        {gateVsPile !== null && gateVsPile !== "" && (
          <p className="mt-0.5 truncate text-[0.6rem] text-amber-200/70">Pile {gateVsPile}</p>
        )}
        {spendLine !== null && (
          <p className="mt-0.5 truncate text-[0.6rem] text-stone-500">{spendLine}</p>
        )}
        {durationLabel !== null && (
          <p className="mt-0.5 text-[0.6rem] text-stone-600">{durationLabel}</p>
        )}
      </div>
      {hasActivateEffects ? (
        <button
          type="button"
          className={`mt-2 w-full ${canActivate ? btnPrimary : `${btnClass} opacity-40`}`}
          disabled={!canActivate}
          onClick={onActivate}
        >
          Activate
        </button>
      ) : standingOnly ? (
        <p className="mt-2 text-[0.6rem] leading-snug text-stone-500">
          Passive while ready — does not spend pile gate / Spend
        </p>
      ) : null}
    </div>
  );
}
