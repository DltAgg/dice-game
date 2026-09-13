import {
  countInstalledCopies,
  eligibleFacesForForge,
  getCard,
  getFaceCard,
  isFaceCardInPool,
  type FaceCardId,
  type ForgeableFaceKind,
  type GameState,
  type PlayerId,
  type SymbolType,
} from "@server";
import {
  BoardModal,
} from "./BoardModal";
import {
  btnClass,
} from "../styles";
import {
  CausedByLine,
  DecisionSourcePanel,
} from "../tooltips/decisionSource";
import {
  FaceInspectHover,
} from "../tooltips/inspectHovers";

export function FacePickModal({
  state,
  playerId,
  kind,
  attribute,
  forgingCard,
  sourceCard,
  eligibleIds,
  subtitle,
  onPick,
  onCancel,
  onBack,
  backLabel,
}: {
  state: GameState;
  playerId: PlayerId;
  kind: ForgeableFaceKind;
  attribute: SymbolType;
  forgingCard?: { readonly forgeTags?: readonly string[] };
  /** Tactic/ritual being forged — shown when there is no pending `Caused by` source. */
  sourceCard?: NonNullable<ReturnType<typeof getCard>>;
  /** When set, overrides forge eligibility (e.g. Reforge pool-only list). */
  eligibleIds?: readonly FaceCardId[];
  subtitle: string;
  onPick: (faceCardId: FaceCardId) => void;
  onCancel?: () => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  const eligible =
    eligibleIds ?? eligibleFacesForForge(state, playerId, kind, attribute, forgingCard);
  const pendingSource = <CausedByLine state={state} />;

  return (
    <BoardModal
      title="Choose face card"
      subtitle={subtitle}
      causedBy={
        <>
          {pendingSource}
          {sourceCard !== undefined && state.pendingDecision === null && (
            <DecisionSourcePanel cardDef={sourceCard} label="Forging" />
          )}
        </>
      }
      onDismiss={onCancel}
    >
      <ul className="mt-4 space-y-2">
          {eligible.map((faceCardId) => {
            const face = getFaceCard(faceCardId);
            const inPool = isFaceCardInPool(state, faceCardId, playerId);
            const copies = countInstalledCopies(state, faceCardId, playerId);
            return (
              <li key={faceCardId}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  onClick={() => onPick(faceCardId)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {face !== undefined ? (
                      <FaceInspectHover face={face} placement="below" />
                    ) : (
                      faceCardId
                    )}
                  </p>
                  <p className="text-xs text-stone-500">
                    {face?.kind} · {face?.symbol}
                    {inPool ? " · from face pool" : ""}
                    {copies > 0 ? ` · ${String(copies)} already installed (copy)` : ""}
                  </p>
                  {face?.rulesText !== undefined && face.rulesText !== "" && (
                    <p className="mt-1 text-[0.7rem] text-stone-400">{face.rulesText}</p>
                  )}
                </button>
              </li>
            );
          })}
          {eligible.length === 0 && (
            <li className="text-sm text-red-300">No eligible face cards in your pool.</li>
          )}
        </ul>
        {onBack !== undefined && (
          <button type="button" className={`${btnClass} mt-4`} onClick={onBack}>
            {backLabel ?? "Back"}
          </button>
        )}
        {onCancel !== undefined && (
          <button type="button" className={`${btnClass} mt-4`} onClick={onCancel}>
            Cancel
          </button>
        )}
    </BoardModal>
  );
}
