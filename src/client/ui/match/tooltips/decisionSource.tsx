import {
  formatAttackLine,
  formatEffectRegion,
  formatFaceKind,
  formatTypeLine,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  type CardInstanceId,
  type ChainLink,
  type DieId,
  type FaceCardId,
  type GameState,
} from "@server";
import { KeywordRichText } from "@client/ui/keywords/KeywordReminders";
import {
  formatPlayCostCompact,
} from "../intents/format";
import {
  FaceInspectHover,
  NameInspectHover,
  TacticInspectHover,
} from "./inspectHovers";

export function DecisionSourceHover({
  state,
  cardInstanceId,
  faceCardId,
  placement = "below",
}: {
  state: GameState;
  cardInstanceId: CardInstanceId | null;
  faceCardId: FaceCardId | null;
  placement?: "above" | "below";
}) {
  if (cardInstanceId !== null) {
    const card = state.cards[cardInstanceId];
    const def = card !== undefined ? getCard(card.cardId) : undefined;
    if (def !== undefined) return <TacticInspectHover def={def} placement={placement} />;
  }
  if (faceCardId !== null) {
    const face = getFaceCard(faceCardId);
    if (face !== undefined) return <FaceInspectHover face={face} placement={placement} />;
  }
  return null;
}

export function faceIdFromDieSlot(
  state: GameState,
  dieId: DieId | null,
  slotIndex: number | null,
): FaceCardId | null {
  if (dieId === null || slotIndex === null) return null;
  return state.dice[dieId]?.slots[slotIndex]?.faceCardId ?? null;
}

export function pendingSourceOf(
  state: GameState,
  pending: NonNullable<GameState["pendingDecision"]>,
): { readonly cardInstanceId: CardInstanceId | null; readonly faceCardId: FaceCardId | null } | null {
  switch (pending.type) {
    case "search-deck":
    case "search-graveyard":
    case "discard-cards":
    case "forge-faces":
    case "replace-synthetic-face":
    case "replay-graveyard-tactic":
    case "look-top-deck":
    case "peek-deck":
    case "dark-pact":
    case "mind-control":
    case "copy-pool-symbol":
    case "choose-attribute-tokens":
      return {
        cardInstanceId: pending.sourceCardInstanceId,
        faceCardId: pending.sourceFaceCardId,
      };
    case "choose-equipment":
      if (pending.filter === "opponent" && pending.deferred !== undefined) {
        return {
          cardInstanceId: pending.deferred.sourceCardInstanceId,
          faceCardId:
            pending.deferred.sourceCardInstanceId !== null
              ? null
              : faceIdFromDieSlot(
                  state,
                  pending.deferred.sourceDieId,
                  pending.deferred.sourceSlotIndex,
                ),
        };
      }
      return {
        cardInstanceId: pending.sourceCardInstanceId,
        faceCardId: pending.sourceFaceCardId,
      };
    case "choose-creature":
    case "choose-ritual":
    case "choose-overload":
    case "choose-die":
    case "choose-die-slot":
    case "choose-silence-host":
    case "choose-bounce-card":
    case "choose-pool-symbol":
      return {
        cardInstanceId: pending.deferred.sourceCardInstanceId,
        faceCardId:
          pending.deferred.sourceCardInstanceId !== null
            ? null
            : faceIdFromDieSlot(
                state,
                pending.deferred.sourceDieId,
                pending.deferred.sourceSlotIndex,
              ),
      };
    case "optional-reroll":
      return { cardInstanceId: null, faceCardId: pending.faceCardId };
    case "optional-overcharge":
      return {
        cardInstanceId: null,
        faceCardId: faceIdFromDieSlot(state, pending.dieId, pending.slotIndex),
      };
    default:
      return null;
  }
}

/** Inline source card / face print for selection modals (searches, targets, overload/face triggers). */
export function DecisionSourcePanel({
  state,
  cardInstanceId = null,
  faceCardId = null,
  cardDef,
  faceDef,
  label = "Caused by",
}: {
  state?: GameState;
  cardInstanceId?: CardInstanceId | null;
  faceCardId?: FaceCardId | null;
  cardDef?: NonNullable<ReturnType<typeof getCard>>;
  faceDef?: NonNullable<ReturnType<typeof getFaceCard>>;
  label?: string;
}) {
  const resolvedCard =
    cardDef ??
    (state !== undefined && cardInstanceId !== null
      ? (() => {
          const card = state.cards[cardInstanceId];
          return card !== undefined ? getCard(card.cardId) : undefined;
        })()
      : undefined);
  const resolvedFace =
    faceDef ??
    (faceCardId !== null ? getFaceCard(faceCardId) : undefined);

  if (resolvedCard === undefined && resolvedFace === undefined) return null;

  const nameHover =
    resolvedCard !== undefined ? (
      state !== undefined && cardInstanceId !== null ? (
        <DecisionSourceHover
          state={state}
          cardInstanceId={cardInstanceId}
          faceCardId={null}
          placement="below"
        />
      ) : (
        <TacticInspectHover def={resolvedCard} placement="below" />
      )
    ) : resolvedFace !== undefined ? (
      state !== undefined ? (
        <DecisionSourceHover
          state={state}
          cardInstanceId={null}
          faceCardId={faceCardId ?? resolvedFace.id}
          placement="below"
        />
      ) : (
        <FaceInspectHover face={resolvedFace} placement="below" />
      )
    ) : null;

  return (
    <div className="mt-3 rounded border border-amber-800/40 bg-amber-950/20 p-3 text-left">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-200/70">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-stone-100">
        {nameHover ?? resolvedCard?.name ?? resolvedFace?.name}
      </p>
      {resolvedCard !== undefined && (
        <>
          <p className="mt-0.5 text-xs text-stone-500">
            {formatPlayCostCompact(resolvedCard)} · {formatTypeLine(resolvedCard)}
          </p>
          {formatEffectRegion(resolvedCard).length > 0 && (
            <div className="mt-2 space-y-1 border-t border-amber-900/40 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
              {formatEffectRegion(resolvedCard).map((line) => (
                <p key={line}>
                  <KeywordRichText text={line} />
                </p>
              ))}
            </div>
          )}
        </>
      )}
      {resolvedCard === undefined && resolvedFace !== undefined && (
        <>
          <p className="mt-0.5 text-xs capitalize text-stone-500">
            {formatFaceKind(resolvedFace.kind)} · {resolvedFace.symbol}
          </p>
          {resolvedFace.rulesText !== "" && (
            <p className="mt-2 border-t border-amber-900/40 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
              <KeywordRichText text={resolvedFace.rulesText} />
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function CausedByLine({ state }: { state: GameState }) {
  const pending = state.pendingDecision;
  if (pending === null) return null;
  const source = pendingSourceOf(state, pending);
  if (source === null) return null;

  return (
    <DecisionSourcePanel
      state={state}
      cardInstanceId={source.cardInstanceId}
      faceCardId={source.faceCardId}
    />
  );
}

export function ChainLinkHover({
  state,
  link,
}: {
  state: GameState;
  link: ChainLink | undefined;
}) {
  if (link === undefined) return null;

  const card =
    link.cardInstanceId !== null ? state.cards[link.cardInstanceId] : undefined;
  const def = card !== undefined ? getCard(card.cardId) : undefined;

  if (def !== undefined) {
    return <TacticInspectHover def={def} negated={link.negated} />;
  }

  if (link.kind === "attack" && link.attackerId !== null && link.attackId !== null) {
    const creature = state.creatures[link.attackerId];
    const creatureDef =
      creature !== undefined ? getCreatureDefinition(creature.definitionId) : undefined;
    const attack = creatureDef?.attacks.find((entry) => entry.id === link.attackId);
    const title =
      attack !== undefined && creatureDef !== undefined
        ? `${creatureDef.name} — ${attack.name}`
        : (creatureDef?.name ?? "Attack");

    return (
      <NameInspectHover name={title} negated={link.negated}>
        <p className="text-sm font-medium text-stone-100">{title}</p>
        {attack !== undefined && (
          <p className="mt-1 text-xs text-stone-400">{formatAttackLine(attack)}</p>
        )}
        {attack?.rulesText !== undefined && attack.rulesText !== "" && (
          <p className="mt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
            {attack.rulesText}
          </p>
        )}
      </NameInspectHover>
    );
  }

  return <span className="font-medium text-amber-50">{link.kind}</span>;
}
