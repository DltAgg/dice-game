import {
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  diceOf,
  formatEffectRegion,
  formatFaceKind,
  formatTypeLine,
  getCard,
  getFaceCard,
  overloadsOnFace,
  type DieId,
  type FaceCardId,
  type GameState,
  type PlayerId,
} from "@server";
import { KeywordRemindersTooltip } from "@client/ui/keywords/KeywordReminders";
import { facePrintText } from "@client/ui/keywords/reminders";
import {
  AttributePile,
} from "./AttributePile";
import {
  activateFaceSpendCost,
  faceMarkerSummary,
  showingSlotsForFace,
  stayStatusForFace,
  overchargeStatusForFace,
} from "../intents/faceStatus";
import {
  btnPrimary,
} from "../styles";
import {
  fixedTooltipPairStyle,
  useAnchoredTooltipPair,
} from "../tooltips/anchoredTooltip";

export function uniqueInstalledFaces(
  state: GameState,
  playerId: PlayerId,
): readonly {
  readonly faceCardId: FaceCardId;
  readonly copies: number;
  readonly showing: boolean;
  readonly overloads: number;
}[] {
  const order: FaceCardId[] = [];
  const meta = new Map<FaceCardId, { copies: number; showing: boolean }>();

  for (const die of diceOf(state, playerId)) {
    for (const slot of die.slots) {
      const showing = die.rolledSlotIndex === slot.index;
      const existing = meta.get(slot.faceCardId);
      if (existing === undefined) {
        order.push(slot.faceCardId);
        meta.set(slot.faceCardId, { copies: 1, showing });
      } else {
        existing.copies += 1;
        existing.showing = existing.showing || showing;
      }
    }
  }

  return order.map((faceCardId) => {
    const entry = meta.get(faceCardId);
    return {
      faceCardId,
      copies: entry?.copies ?? 0,
      showing: entry?.showing ?? false,
      overloads: overloadsOnFace(state, playerId, faceCardId).length,
    };
  });
}

/** Shared face cards installed on this player's dice (one tile per unique face). */
export const FACE_TOOLTIP_WIDTH_PX = 224; // w-56
export const FACE_TOOLTIP_GAP_PX = 8;

export function FaceCardTile({
  state,
  playerId,
  entry,
  hasRolled,
  canActivateShowing,
  onActivateFace,
}: {
  state: GameState;
  playerId: PlayerId;
  entry: {
    readonly faceCardId: FaceCardId;
    readonly copies: number;
    readonly showing: boolean;
    readonly overloads: number;
  };
  hasRolled: boolean;
  canActivateShowing: boolean;
  onActivateFace: (dieId: DieId, slotIndex: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const pairPos = useAnchoredTooltipPair(
    hovered,
    rootRef,
    FACE_TOOLTIP_WIDTH_PX,
    FACE_TOOLTIP_GAP_PX,
  );

  const face = getFaceCard(entry.faceCardId);
  const activated = face?.activated;
  const kindLabel = face === undefined ? "?" : formatFaceKind(face.kind);
  const stayBits = stayStatusForFace(state, playerId, entry.faceCardId);
  const overchargeBits = overchargeStatusForFace(state, playerId, entry.faceCardId);
  const showingSlots = showingSlotsForFace(state, playerId, entry.faceCardId);
  const markerBits = faceMarkerSummary(state, playerId, entry.faceCardId);
  const tooltip = [
    kindLabel,
    face?.symbol ?? "",
    entry.copies > 1 ? `Installed on ${String(entry.copies)} faces` : "Installed on dice",
    face?.rulesText !== undefined && face.rulesText !== "" ? face.rulesText : null,
    stayBits,
    markerBits,
    overchargeBits,
  ]
    .filter((line): line is string => line !== null && line !== "")
    .join("\n");
  const attached = overloadsOnFace(state, playerId, entry.faceCardId);

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        entry.showing
          ? "relative w-full min-w-0 rounded border border-[var(--accent)] bg-[var(--accent)]/15 p-2"
          : hasRolled
            ? "relative w-full min-w-0 rounded border border-stone-800 bg-stone-950/70 p-2 opacity-55"
            : "relative w-full min-w-0 rounded border border-stone-700 bg-stone-950 p-2"
      }
    >
      {pairPos !== null &&
        createPortal(
          <>
            <div
              className="pointer-events-none fixed z-[70] w-56 overflow-y-auto rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl"
              style={fixedTooltipPairStyle(pairPos, "primary")}
              role="tooltip"
            >
              <p className="text-sm font-medium text-stone-100">{face?.name ?? entry.faceCardId}</p>
              <pre className="mt-2 whitespace-pre-wrap font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                {tooltip}
              </pre>
            </div>
            <div
              className="pointer-events-none fixed z-[70] w-56 overflow-y-auto rounded border border-amber-700/50 bg-stone-950 p-3 text-left shadow-xl"
              style={fixedTooltipPairStyle(pairPos, "secondary")}
              role="tooltip"
            >
              <KeywordRemindersTooltip
                print={face !== undefined ? facePrintText(face) : ""}
                extra={
                  <div className="mt-3 border-t border-stone-800 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                      Overloads
                    </p>
                    {attached.length === 0 ? (
                      <p className="mt-2 text-[0.7rem] text-stone-500">None attached</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {attached.map((card) => {
                          const def = getCard(card.cardId);
                          const effects =
                            def !== undefined ? formatEffectRegion(def) : ["(unknown card)"];
                          return (
                            <li
                              key={card.id}
                              className="border-t border-stone-800 pt-2 first:border-0 first:pt-0"
                            >
                              <p className="text-sm font-medium text-stone-100">
                                {def?.name ?? card.cardId}
                              </p>
                              {def !== undefined && (
                                <p className="mt-0.5 text-[0.65rem] text-stone-500">
                                  {formatTypeLine(def)}
                                </p>
                              )}
                              <pre className="mt-1 whitespace-pre-wrap font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                                {effects.join("\n")}
                              </pre>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                }
              />
            </div>
          </>,
          document.body,
        )}
      <p
        className={
          entry.showing
            ? "truncate text-sm font-medium text-[var(--accent)]"
            : "truncate text-sm font-medium text-stone-100"
        }
      >
        {face?.name ?? "?"}
      </p>
      <p className="mt-1 text-xs capitalize text-stone-500">
        {kindLabel} · {face?.symbol ?? "—"}
        {entry.copies > 1 ? ` · ×${String(entry.copies)}` : ""}
      </p>
      {entry.showing && (
        <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Showing
        </p>
      )}
      {stayBits !== null && (
        <p className="mt-1 text-[0.65rem] text-rose-300/90">{stayBits}</p>
      )}
      {markerBits !== null && (
        <p className="mt-1 text-[0.65rem] text-violet-300/90">{markerBits}</p>
      )}
      {overchargeBits !== null && (
        <p className="mt-1 text-[0.65rem] text-sky-300/90">{overchargeBits}</p>
      )}
      {entry.overloads > 0 && (
        <p className="mt-1 text-[0.65rem] text-amber-200/80">
          +{entry.overloads} overload
        </p>
      )}
      {canActivateShowing &&
        activated !== undefined &&
        showingSlots.map((slot) => {
          const cost = activateFaceSpendCost(
            state,
            slot.dieId,
            activated.spendBase,
            activated.spendPerCorruptionOnDie,
          );
          return (
            <button
              key={`${slot.dieId}:${String(slot.slotIndex)}`}
              type="button"
              className={`${btnPrimary} mt-2 w-full text-xs`}
              onClick={() => onActivateFace(slot.dieId, slot.slotIndex)}
            >
              Activate ({String(cost)} from pile)
            </button>
          );
        })}
    </div>
  );
}

/** Shared face cards installed on this player's dice (one tile per unique face). */
export function FaceCardsInPlay({
  state,
  playerId,
  label,
  facing,
  actingPlayerId,
  canAct,
  onActivateFace,
}: {
  state: GameState;
  playerId: PlayerId;
  label: string;
  /** Same as Battlefield: P1 `up`, P2 `down` — flips faces vs pile toward the phase bar. */
  facing: "up" | "down";
  actingPlayerId: PlayerId;
  canAct: boolean;
  onActivateFace: (dieId: DieId, slotIndex: number) => void;
}) {
  const dice = diceOf(state, playerId);
  const faces = uniqueInstalledFaces(state, playerId);
  const hasRolled = dice.some((die) => die.rolledSlotIndex !== null);
  const canActivateShowing =
    canAct &&
    state.status === "in-progress" &&
    state.pendingDecision === null &&
    state.phase === "actions" &&
    playerId === actingPlayerId;

  const facesPane = (
    <div className="min-h-0 flex-1 basis-1/2 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2">
        {faces.map((entry) => (
          <FaceCardTile
            key={entry.faceCardId}
            state={state}
            playerId={playerId}
            entry={entry}
            hasRolled={hasRolled}
            canActivateShowing={canActivateShowing}
            onActivateFace={onActivateFace}
          />
        ))}
      </div>
      {faces.length === 0 && (
        <p className="text-sm text-stone-600">No faces installed</p>
      )}
    </div>
  );

  const pilePane = (
    <div
      className={
        facing === "down"
          ? "flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden border-b border-stone-800/80 pb-2"
          : "flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden border-t border-stone-800/80 pt-2"
      }
    >
      <AttributePile state={state} playerId={playerId} dense />
    </div>
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-800 bg-black/25 p-3">
      <h2 className="mb-2 shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
        {hasRolled ? " · showing after roll" : " · shared across dice"}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {facing === "down" ? (
          <>
            {pilePane}
            {facesPane}
          </>
        ) : (
          <>
            {facesPane}
            {pilePane}
          </>
        )}
      </div>
    </section>
  );
}
