import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  formatEffectRegion,
  formatForgeLine,
  formatTypeLine,
  canAffordForge,
  canAffordPlay,
  getCard,
  handOf,
  hasPlayableEffect,
  isEnabledHandReaction,
  type CardInstance,
  type CardInstanceId,
  type GameState,
  type PlayerId,
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
} from "../styles";
import {
  fixedTooltipPairStyle,
  INSPECT_TOOLTIP_GAP_PX,
  INSPECT_TOOLTIP_WIDTH_PX,
  placeTooltipPair,
  type AnchoredTooltipPairPos,
} from "../tooltips/anchoredTooltip";

export function HandStrip({
  state,
  playerId,
  phase,
  canAct,
  reactionWindow,
  selected,
  onPlay,
  onForge,
  onCancel,
  idleLabel,
}: {
  state: GameState;
  playerId: PlayerId;
  phase: GameState["phase"];
  canAct: boolean;
  reactionWindow: boolean;
  selected: CardInstanceId | null;
  onPlay: (card: CardInstance) => void;
  onForge: (card: CardInstance) => void;
  onCancel: () => void;
  idleLabel?: string;
}) {
  const hand = handOf(state, playerId);
  const actionsPhase = phase === "actions";
  const actionsLive = actionsPhase && canAct && !reactionWindow;
  const reactionsLive = reactionWindow && canAct;
  const [hoveredId, setHoveredId] = useState<CardInstanceId | null>(null);
  const [pairPos, setPairPos] = useState<AnchoredTooltipPairPos | null>(null);
  const cardRefs = useRef<Map<CardInstanceId, HTMLDivElement>>(new Map());
  const scrollerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const placePair = () => {
      if (hoveredId === null) {
        setPairPos(null);
        return;
      }
      const node = cardRefs.current.get(hoveredId);
      if (node === undefined) {
        setPairPos(null);
        return;
      }
      const rect = node.getBoundingClientRect();
      const scroller = scrollerRef.current;
      if (scroller !== null) {
        const box = scroller.getBoundingClientRect();
        if (rect.bottom < box.top || rect.top > box.bottom) {
          setPairPos(null);
          return;
        }
      }
      setPairPos(placeTooltipPair(rect, INSPECT_TOOLTIP_WIDTH_PX, INSPECT_TOOLTIP_GAP_PX, "above"));
    };

    placePair();
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    scroller.addEventListener("scroll", placePair, { passive: true });
    return () => scroller.removeEventListener("scroll", placePair);
  }, [hoveredId, hand.length]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node === null) return;
    const onWheel = (event: WheelEvent) => {
      if (node.scrollHeight <= node.clientHeight + 1) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      event.stopPropagation();
      const step = node.clientHeight + 12;
      const dir = event.deltaY > 0 ? 1 : -1;
      node.scrollTo({
        top: Math.max(0, Math.round(node.scrollTop / step) * step + dir * step),
      });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [hand.length]);

  const hoveredCard = hoveredId !== null ? hand.find((card) => card.id === hoveredId) : undefined;
  const hoveredDef =
    hoveredCard !== undefined ? getCard(hoveredCard.cardId) : undefined;

  const statusHint = !canAct
    ? ` · ${idleLabel ?? "opponent's turn"}`
    : reactionWindow
      ? " · respond or pass"
      : !actionsPhase
        ? " · wait for actions"
        : " · play or forge";

  return (
    <section className="rounded-lg border border-stone-800/80 bg-black/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
          Hand ({hand.length}) · {playerId}
          {statusHint}
        </h2>
        {selected !== null && (
          <button type="button" className={btnClass} onClick={onCancel}>
            Cancel selection
          </button>
        )}
      </div>
      <div
        ref={scrollerRef}
        className="flex max-h-[7.25rem] flex-wrap gap-3 overflow-x-hidden overflow-y-auto overscroll-y-contain snap-y snap-mandatory"
      >
        {hand.map((card) => {
          const def = getCard(card.cardId);
          if (def === undefined) return null;
          const isSelected = selected === card.id;
          const canPlay =
            actionsLive &&
            hasPlayableEffect(def) &&
            canAffordPlay(state, playerId, def);
          const canForge = actionsLive && canAffordForge(state, playerId, def);
          const canRespond =
            reactionsLive &&
            isEnabledHandReaction(state, playerId, def) &&
            canAffordPlay(state, playerId, def);

          return (
            <div
              key={card.id}
              ref={(node) => {
                if (node === null) cardRefs.current.delete(card.id);
                else cardRefs.current.set(card.id, node);
              }}
              className={
                isSelected
                  ? "h-[7.25rem] w-48 shrink-0 snap-start snap-always rounded border border-[var(--accent)] bg-stone-900 p-3"
                  : "h-[7.25rem] w-48 shrink-0 snap-start snap-always rounded border border-stone-700 bg-stone-950 p-3"
              }
              onMouseEnter={() => setHoveredId(card.id)}
              onMouseLeave={() => setHoveredId((current) => (current === card.id ? null : current))}
            >
              <p className="truncate text-sm font-medium text-stone-100">{def.name}</p>
              <p className="mt-1 text-xs text-stone-500">
                {formatPlayCostCompact(def)} · {def.subtypes.join("/")}
              </p>
              <div className="mt-3 flex gap-2">
                {actionsLive && (
                  <>
                    <button
                      type="button"
                      className={canPlay ? btnPrimary : `${btnClass} opacity-40`}
                      disabled={!canPlay}
                      onClick={() => onPlay(card)}
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      className={canForge ? btnClass : `${btnClass} opacity-40`}
                      disabled={!canForge}
                      onClick={() => onForge(card)}
                    >
                      Forge
                    </button>
                  </>
                )}
                {reactionsLive && (
                  <button
                    type="button"
                    className={canRespond ? btnPrimary : `${btnClass} opacity-40`}
                    disabled={!canRespond}
                    onClick={() => onPlay(card)}
                  >
                    Respond
                  </button>
                )}
                {!actionsLive && !reactionsLive && (
                  <p className="text-[0.65rem] text-stone-600">
                    {!canAct ? "Waiting" : "Not this phase"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {hand.length === 0 && <p className="text-sm text-stone-600">Empty hand</p>}
      </div>

      {hoveredDef !== undefined &&
        pairPos !== null &&
        createPortal(
          <>
            <div
              className="pointer-events-none fixed z-[70] w-64 overflow-y-auto rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl"
              style={fixedTooltipPairStyle(pairPos, "primary")}
              role="tooltip"
            >
              <p className="text-sm font-medium text-stone-100">{hoveredDef.name}</p>
              <p className="mt-1 text-xs text-stone-400">
                {formatPlayCostHover(hoveredDef)}
              </p>
              <div className="mt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                <p>
                  <KeywordRichText text={formatTypeLine(hoveredDef)} />
                </p>
                <p className="mt-0.5">
                  <KeywordRichText text={formatForgeLine(hoveredDef.forge)} />
                </p>
                <div
                  className="my-2 -mx-3 h-px bg-gradient-to-r from-transparent via-[#b4a79c]/70 to-transparent"
                  role="separator"
                  aria-hidden
                />
                {formatEffectRegion(hoveredDef).map((line) => (
                  <p key={line}>
                    <KeywordRichText text={line} />
                  </p>
                ))}
              </div>
            </div>
            <div
              className="pointer-events-none fixed z-[70] w-64 overflow-y-auto rounded border border-amber-700/50 bg-stone-950 p-3 text-left shadow-xl"
              style={fixedTooltipPairStyle(pairPos, "secondary")}
              role="tooltip"
            >
              <KeywordRemindersTooltip print={tacticPrintText(hoveredDef)} />
            </div>
          </>,
          document.body,
        )}
    </section>
  );
}
