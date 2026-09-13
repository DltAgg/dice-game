import {
  getCard,
  getFaceCard,
  overloadsOnFace,
  type CardInstanceId,
  type FaceCardId,
  type GameState,
  type PlayerId,
} from "@server";
import {
  uniqueInstalledFaces,
} from "../board/FaceCardsInPlay";
import {
  BoardModal,
} from "./BoardModal";
import {
  btnClass,
} from "../styles";
import {
  DecisionSourcePanel,
} from "../tooltips/decisionSource";
import {
  FaceInspectHover,
} from "../tooltips/inspectHovers";

export function OverloadFacePickModal({
  state,
  playerId,
  cardInstanceId,
  onPick,
  onCancel,
}: {
  state: GameState;
  playerId: PlayerId;
  cardInstanceId: CardInstanceId;
  onPick: (faceCardId: FaceCardId) => void;
  onCancel: () => void;
}) {
  const instance = state.cards[cardInstanceId];
  const def = instance !== undefined ? getCard(instance.cardId) : undefined;
  const region = def?.overload;
  if (region === undefined) return null;

  const eligible = uniqueInstalledFaces(state, playerId).filter(({ faceCardId }) => {
    const face = getFaceCard(faceCardId);
    if (face === undefined) return false;
    if (region.faceSymbols !== undefined && !region.faceSymbols.includes(face.symbol)) {
      return false;
    }
    if (region.faceKinds !== undefined && !region.faceKinds.includes(face.kind)) {
      return false;
    }
    return overloadsOnFace(state, playerId, faceCardId).length < face.maxOverloads;
  });

  return (
    <BoardModal
      title="Overload a face card"
      subtitle="Attaches to a shared face card. Every die showing that face will fire the overload when rolled."
      causedBy={
        <DecisionSourcePanel
          state={state}
          cardInstanceId={cardInstanceId}
          label="Overload"
        />
      }
      onDismiss={onCancel}
    >
      <ul className="mt-4 space-y-2">
        {eligible.map(({ faceCardId, copies, overloads }) => {
          const face = getFaceCard(faceCardId);
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
                <p className="text-xs capitalize text-stone-500">
                  {face?.kind} · {face?.symbol}
                  {copies > 1 ? ` · ×${String(copies)} die faces` : ""}
                  {overloads > 0 ? ` · ${String(overloads)} overload` : ""}
                </p>
              </button>
            </li>
          );
        })}
        {eligible.length === 0 && (
          <li className="text-sm text-red-300">No eligible installed face cards.</li>
        )}
      </ul>
      <button type="button" className={`${btnClass} mt-4`} onClick={onCancel}>
        Cancel
      </button>
    </BoardModal>
  );
}
