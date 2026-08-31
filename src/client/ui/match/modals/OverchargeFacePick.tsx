import {
  attributeLabel,
  getCard,
  getFaceCard,
  legalOverchargeFaces,
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

export function OverchargeFacePick({
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
  const definition = instance !== undefined ? getCard(instance.cardId) : undefined;
  const copiesByFace = new Map(
    uniqueInstalledFaces(state, playerId).map((entry) => [entry.faceCardId, entry.copies]),
  );
  const eligible = legalOverchargeFaces(state, playerId);
  const attribute =
    definition !== undefined ? attributeLabel(definition.forge.attribute) : "attribute";

  return (
    <BoardModal
      title="Overcharge a face card"
      subtitle={
        definition !== undefined
          ? `${definition.name}: attaches to a shared face card. Every die showing it Generates +1 ${attribute} on roll.`
          : "Attaches to a shared face card. Every die showing it Generates +1 attribute on roll."
      }
      causedBy={
        <DecisionSourcePanel
          state={state}
          cardInstanceId={cardInstanceId}
          label="Overcharge"
        />
      }
      onDismiss={onCancel}
    >
      <ul className="mt-4 space-y-2">
        {eligible.map((faceCardId) => {
          const face = getFaceCard(faceCardId);
          const copies = copiesByFace.get(faceCardId) ?? 0;
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
