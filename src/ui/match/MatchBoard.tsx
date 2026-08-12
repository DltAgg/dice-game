import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  countInstalledCopies,
  currentLife,
  diceOf,
  eligibleFacesForForge,
  energyAvailableTo,
  formatAttackCost,
  formatEffectRegion,
  formatForgeLine,
  formatTypeLine,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  handOf,
  hasPlayableEffect,
  isFaceCardInPool,
  legalTargetsFor,
  livingCreaturesOf,
  ritualsOf,
  rolledSymbols,
  searchableInDeck,
  searchableInGraveyard,
  usableSymbols,
  holdsTokens,
  canPay,
  overloadsOnFace,
  SHIELD,
  type AbilityId,
  type AttackDefinition,
  type AttackId,
  type CardInstance,
  type CardInstanceId,
  type CreatureId,
  type CreatureState,
  type DieId,
  type FaceCardId,
  type GameState,
  type PlayerId,
  type SymbolInstanceId,
  type TurnPhase,
  TURN_PHASE_ORDER,
} from "@/game";
import { MATCH_P1, MATCH_P2, useMatchStore } from "@/store/matchStore";
import { useDeckStore } from "@/store/deckStore";
import { PROTOTYPE_SAVED_DECK_ID, validateSavedDeck } from "@/decks";

const PHASE_LABELS: Record<TurnPhase, string> = {
  roll: "Roll",
  absorption: "Absorb",
  engine: "Engine",
  combat: "Combat",
  actions: "Actions",
};

type Intent =
  | { readonly kind: "idle" }
  | { readonly kind: "absorb"; readonly symbolId: SymbolInstanceId }
  | {
      readonly kind: "attack";
      readonly attackerId: CreatureId;
      readonly attackId?: AttackId;
    }
  | {
      readonly kind: "play";
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly kind: "forge";
      readonly cardInstanceId: CardInstanceId;
      /** Which physical die will receive the forge. */
      readonly dieId?: DieId;
      /** Slots on that die to overwrite (length must match forge.faces). */
      readonly slotIndexes?: readonly number[];
    };

export function MatchBoard() {
  const state = useMatchStore((s) => s.state);
  const lastError = useMatchStore((s) => s.lastError);
  const seed = useMatchStore((s) => s.seed);
  const dispatch = useMatchStore((s) => s.dispatch);
  const clearError = useMatchStore((s) => s.clearError);
  const newMatch = useMatchStore((s) => s.newMatch);
  const p1DeckId = useMatchStore((s) => s.p1DeckId);
  const p2DeckId = useMatchStore((s) => s.p2DeckId);
  const setMatchDecks = useMatchStore((s) => s.setMatchDecks);
  const mode = useMatchStore((s) => s.mode);
  const localPlayerId = useMatchStore((s) => s.localPlayerId);
  const roomCode = useMatchStore((s) => s.roomCode);
  const connectionStatus = useMatchStore((s) => s.connectionStatus);
  const leaveOnline = useMatchStore((s) => s.leaveOnline);
  const requestResync = useMatchStore((s) => s.requestResync);
  const setView = useMatchStore((s) => s.setView);
  const playBlockReason = useMatchStore((s) => s.playBlockReason);
  const decks = useDeckStore((s) => s.decks);
  const refreshDecks = useDeckStore((s) => s.refresh);

  useEffect(() => {
    refreshDecks();
  }, [refreshDecks]);

  const [intent, setIntent] = useState<Intent>({ kind: "idle" });
  const [searchPick, setSearchPick] = useState<readonly CardInstanceId[]>([]);

  const activeId = state.activePlayerId;
  const finished = state.status === "finished";
  const pending = state.pendingDecision;
  const phase = state.phase;
  const isOnline = mode !== "local";
  const canAct = !isOnline || localPlayerId === activeId;
  /** Bottom dock shows this seat's hand/pool — local seat online, active seat in hotseat. */
  const dockPlayerId =
    isOnline && localPlayerId !== null ? localPlayerId : activeId;

  const canStartNewMatch = useMemo(() => {
    const p1 = decks.find((deck) => deck.id === p1DeckId);
    const p2 = decks.find((deck) => deck.id === p2DeckId);
    if (p1 === undefined || p2 === undefined) return false;
    return validateSavedDeck(p1).ok && validateSavedDeck(p2).ok;
  }, [decks, p1DeckId, p2DeckId]);

  useEffect(() => {
    setIntent({ kind: "idle" });
    setSearchPick([]);
  }, [activeId, phase, state.turn, state.matchId]);

  useEffect(() => {
    setSearchPick([]);
  }, [pending?.type]);

  useEffect(() => {
    if (lastError === null) return;
    const id = window.setTimeout(() => clearError(), 5000);
    return () => window.clearTimeout(id);
  }, [lastError, clearError]);

  const hint = useMemo(() => hintFor(intent, state), [intent, state]);
  const clearIntent = () => setIntent({ kind: "idle" });

  const tryDispatch = (action: Parameters<typeof dispatch>[0]): boolean => {
    if (isOnline && localPlayerId !== null && action.playerId !== localPlayerId) {
      return false;
    }
    const ok = dispatch(action);
    if (ok) clearIntent();
    return ok;
  };

  /** Auto-roll once per turn when the active seat enters the roll phase. */
  const autoRolledKey = useRef<string | null>(null);
  useEffect(() => {
    if (finished || pending !== null || phase !== "roll" || !canAct) return;
    if (isOnline && localPlayerId !== null && activeId !== localPlayerId) return;
    const key = `${state.matchId}:${String(state.turn)}`;
    if (autoRolledKey.current === key) return;
    autoRolledKey.current = key;
    dispatch({ type: "ROLL_DICE", playerId: activeId });
  }, [
    finished,
    pending,
    phase,
    canAct,
    isOnline,
    localPlayerId,
    state.matchId,
    state.turn,
    activeId,
    dispatch,
  ]);

  const goToPhase = (target: TurnPhase) => {
    if (!canAct || finished || pending !== null || phase === "roll") return;
    const from = TURN_PHASE_ORDER.indexOf(phase);
    const to = TURN_PHASE_ORDER.indexOf(target);
    if (to <= from) return;
    for (let step = from; step < to; step += 1) {
      if (!tryDispatch({ type: "ADVANCE_PHASE", playerId: activeId })) break;
    }
  };

  const endTurn = () => {
    if (!canAct || finished || pending !== null) return;
    tryDispatch({ type: "END_TURN", playerId: activeId });
  };

  const onCreatureClick = (creature: CreatureState) => {
    if (finished) return;

    if (pending?.type === "choose-creature") {
      if (isOnline && localPlayerId !== null && pending.controllerId !== localPlayerId) return;
      if (pending.controllerId !== activeId) return;
      if (pending.filter === "ally" && creature.ownerId !== activeId) return;
      if (pending.filter === "enemy" && creature.ownerId === activeId) return;
      tryDispatch({
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: activeId,
        creatureId: creature.id,
      });
      return;
    }

    if (pending !== null) return;
    if (!canAct) return;

    if (intent.kind === "absorb" && phase === "absorption" && creature.ownerId === activeId) {
      tryDispatch({
        type: "ABSORB_SYMBOL",
        playerId: activeId,
        creatureId: creature.id,
        symbolId: intent.symbolId,
      });
      return;
    }

    if (intent.kind === "attack" && phase === "combat") {
      if (intent.attackId === undefined) {
        if (creature.ownerId !== activeId) return;
        if (!creatureHasArmedAttack(state, creature)) return;
        setIntent({ kind: "attack", attackerId: creature.id });
        return;
      }
      tryDispatch({
        type: "ATTACK",
        playerId: activeId,
        attackerId: intent.attackerId,
        attackId: intent.attackId,
        targetId: creature.id,
      });
      return;
    }

    if (intent.kind === "play" && phase === "actions") {
      const instance = state.cards[intent.cardInstanceId];
      const def = instance !== undefined ? getCard(instance.cardId) : undefined;
      if (def?.equipment !== undefined || def?.effect !== undefined) {
        tryDispatch({
          type: "PLAY_CARD",
          playerId: activeId,
          cardInstanceId: intent.cardInstanceId,
          declaredTargetCreatureId: creature.id,
        });
      }
      return;
    }

    if (phase === "combat" && creature.ownerId === activeId) {
      if (!creatureHasArmedAttack(state, creature)) return;
      setIntent({ kind: "attack", attackerId: creature.id });
    }
  };

  const beginPlay = (card: CardInstance) => {
    if (!canAct) return;
    if (card.ownerId !== activeId || finished || pending !== null || phase !== "actions") return;
    const def = getCard(card.cardId);
    if (def === undefined || !hasPlayableEffect(def)) return;

    if (def.ritual !== undefined) {
      tryDispatch({ type: "PLAY_CARD", playerId: activeId, cardInstanceId: card.id });
      return;
    }

    if (def.overload !== undefined || def.equipment !== undefined) {
      setIntent({ kind: "play", cardInstanceId: card.id });
      return;
    }

    if (def.effect !== undefined) {
      const needsTarget = def.effect.effects.some(
        (effect) =>
          "target" in effect &&
          effect.target !== undefined &&
          effect.target.kind === "declared-target",
      );
      if (needsTarget) {
        setIntent({ kind: "play", cardInstanceId: card.id });
        return;
      }
      tryDispatch({ type: "PLAY_CARD", playerId: activeId, cardInstanceId: card.id });
    }
  };

  const beginForge = (card: CardInstance) => {
    if (!canAct) return;
    if (card.ownerId !== activeId || finished || pending !== null || phase !== "actions") return;
    setIntent({ kind: "forge", cardInstanceId: card.id });
  };

  const confirmForgeFace = (faceCardId: FaceCardId) => {
    if (
      intent.kind !== "forge" ||
      intent.dieId === undefined ||
      intent.slotIndexes === undefined ||
      intent.slotIndexes.length === 0
    ) {
      return;
    }
    tryDispatch({
      type: "FORGE_CARD",
      playerId: activeId,
      cardInstanceId: intent.cardInstanceId,
      dieId: intent.dieId,
      slotIndexes: intent.slotIndexes,
      faceCardId,
    });
  };

  const forgeDef =
    intent.kind === "forge"
      ? (() => {
          const instance = state.cards[intent.cardInstanceId];
          return instance !== undefined ? getCard(instance.cardId) : undefined;
        })()
      : undefined;

  const forgeFacesNeeded = forgeDef?.forge.faces ?? 1;
  const forgeTarget = forgeDef?.forge.target ?? null;

  const forgeNeedsDieOrSlots =
    intent.kind === "forge" &&
    (intent.dieId === undefined || (intent.slotIndexes?.length ?? 0) < forgeFacesNeeded);

  const forgeFacePrompt =
    intent.kind === "forge" &&
    intent.dieId !== undefined &&
    (intent.slotIndexes?.length ?? 0) === forgeFacesNeeded
      ? intent
      : null;

  const playDef =
    intent.kind === "play"
      ? (() => {
          const instance = state.cards[intent.cardInstanceId];
          return instance !== undefined ? getCard(instance.cardId) : undefined;
        })()
      : undefined;

  const overloadNeedsFace = intent.kind === "play" && playDef?.overload !== undefined;

  const winnerLabel =
    finished && state.winner !== null
      ? `Winner: ${state.winner}`
      : finished
        ? "Match finished"
        : null;

  return (
    <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-80 pt-28 sm:px-6 sm:pb-96">
      <ErrorSnackbar error={lastError} onDismiss={clearError} />

      <div className="fixed inset-x-0 top-14 z-40 border-b border-stone-800/80 bg-[var(--felt-deep)]/95 shadow-lg shadow-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--ink)] sm:text-3xl">
              {isOnline ? (mode === "host" ? "Host match" : "Online match") : "Local match"}
            </h1>
            <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
              {isOnline ? (
                <>
                  Room <span className="font-mono text-[var(--accent)]">{roomCode}</span>
                  {" · "}
                  {connectionStatus}
                  {" · you "}
                  <span className="text-[var(--accent)]">{localPlayerId ?? "?"}</span>
                </>
              ) : (
                <>Hotseat</>
              )}
              {" · seed "}
              {seed} · turn {state.turn} · phase{" "}
              <span className="text-[var(--accent)]">{phase}</span> · active{" "}
              <span className="text-[var(--accent)]">{activeId}</span>
              {!canAct && isOnline ? " · waiting for opponent" : null}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {!isOnline && (
              <>
                <label className="flex flex-col gap-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
                  P1 deck
                  <select
                    className="rounded border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm normal-case tracking-normal text-stone-200"
                    value={p1DeckId}
                    onChange={(event) => setMatchDecks(event.target.value, p2DeckId)}
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                        {validateSavedDeck(deck).ok ? "" : " (illegal)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
                  P2 deck
                  <select
                    className="rounded border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm normal-case tracking-normal text-stone-200"
                    value={p2DeckId}
                    onChange={(event) => setMatchDecks(p1DeckId, event.target.value)}
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                        {validateSavedDeck(deck).ok ? "" : " (illegal)"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={btnClass}
                  disabled={!canStartNewMatch}
                  title={
                    canStartNewMatch
                      ? "Start a new local match"
                      : (playBlockReason ?? "Both decks must be legal")
                  }
                  onClick={() =>
                    newMatch(
                      undefined,
                      p1DeckId || PROTOTYPE_SAVED_DECK_ID,
                      p2DeckId || PROTOTYPE_SAVED_DECK_ID,
                    )
                  }
                >
                  New match
                </button>
                {playBlockReason !== null && (
                  <p className="basis-full text-xs text-red-300">{playBlockReason}</p>
                )}
              </>
            )}
            {isOnline && (
              <>
                <button type="button" className={btnClass} onClick={() => setView("lobby")}>
                  Lobby
                </button>
                <button type="button" className={btnClass} onClick={() => leaveOnline()}>
                  Leave
                </button>
                {mode === "client" && (
                  <button type="button" className={btnClass} onClick={() => requestResync()}>
                    Resync
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {winnerLabel !== null && (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
          {winnerLabel}
        </p>
      )}

      <p className="text-sm text-[var(--ink-muted)]">{hint}</p>

      {pending?.type === "search-deck" && (
        <SearchPanel
          state={state}
          amount={pending.amount}
          pick={searchPick}
          mode="deck"
          onToggle={(id) =>
            setSearchPick((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }
          onConfirm={() => {
            if (pending === null || pending.type !== "search-deck") return;
            tryDispatch({
              type: "RESOLVE_SEARCH",
              playerId: pending.controllerId,
              cardInstanceIds: searchPick.slice(0, pending.amount),
            });
            setSearchPick([]);
          }}
        />
      )}

      {pending?.type === "search-graveyard" && (
        <SearchPanel
          state={state}
          amount={pending.amount}
          pick={searchPick}
          mode="graveyard"
          onToggle={(id) =>
            setSearchPick((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }
          onConfirm={() => {
            if (pending === null || pending.type !== "search-graveyard") return;
            tryDispatch({
              type: "RESOLVE_SEARCH",
              playerId: pending.controllerId,
              cardInstanceIds: searchPick.slice(0, pending.amount),
            });
            setSearchPick([]);
          }}
        />
      )}

      {pending?.type === "discard-cards" && (
        <DiscardModal
          state={state}
          amount={pending.amount}
          pick={searchPick}
          onToggle={(id) =>
            setSearchPick((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }
          onConfirm={() => {
            if (pending === null || pending.type !== "discard-cards") return;
            tryDispatch({
              type: "RESOLVE_DISCARD",
              playerId: pending.controllerId,
              cardInstanceIds: searchPick.slice(0, pending.amount),
            });
            setSearchPick([]);
          }}
        />
      )}

      {pending?.type === "choose-creature" && (
        <ChooseCreatureModal
          state={state}
          filter={pending.filter}
          controllerId={pending.controllerId}
          onPick={(creatureId) =>
            tryDispatch({
              type: "RESOLVE_CHOOSE_CREATURE",
              playerId: pending.controllerId,
              creatureId,
            })
          }
        />
      )}

      {forgeNeedsDieOrSlots && intent.kind === "forge" && forgeTarget !== null && (
        <DieSlotPickModal
          state={state}
          title="Forge — choose die face"
          subtitle={`${forgeDef?.name ?? "Card"} replaces ${String(forgeFacesNeeded)} face(s) on one die. Shared face cards stay as one card; pick the physical die and which of its faces to overwrite.`}
          dieOwnerId={forgeTarget === "own-die" ? activeId : activeId === MATCH_P1 ? MATCH_P2 : MATCH_P1}
          facesNeeded={forgeFacesNeeded}
          selectedDieId={intent.dieId}
          selectedSlots={intent.slotIndexes ?? []}
          onSelectDie={(dieId) =>
            setIntent({
              kind: "forge",
              cardInstanceId: intent.cardInstanceId,
              dieId,
              slotIndexes: [],
            })
          }
          onClearDie={() =>
            setIntent({ kind: "forge", cardInstanceId: intent.cardInstanceId })
          }
          onToggleSlot={(slotIndex) => {
            if (intent.dieId === undefined) return;
            const current = intent.slotIndexes ?? [];
            const next = current.includes(slotIndex)
              ? current.filter((index) => index !== slotIndex)
              : current.length < forgeFacesNeeded
                ? [...current, slotIndex]
                : current;
            setIntent({
              kind: "forge",
              cardInstanceId: intent.cardInstanceId,
              dieId: intent.dieId,
              slotIndexes: next,
            });
          }}
          onCancel={clearIntent}
        />
      )}

      {overloadNeedsFace && intent.kind === "play" && (
        <OverloadFacePickModal
          state={state}
          playerId={activeId}
          cardInstanceId={intent.cardInstanceId}
          onPick={(faceCardId) =>
            tryDispatch({
              type: "PLAY_CARD",
              playerId: activeId,
              cardInstanceId: intent.cardInstanceId,
              declaredFaceCardId: faceCardId,
            })
          }
          onCancel={clearIntent}
        />
      )}

      {forgeFacePrompt !== null && (
        <FacePickModal
          state={state}
          playerId={activeId}
          cardInstanceId={forgeFacePrompt.cardInstanceId}
          onPick={confirmForgeFace}
          onCancel={clearIntent}
        />
      )}

      {/* Opponent (top): shared face cards, then back, then frontline */}
      <FaceCardsInPlay
        state={state}
        playerId={MATCH_P2}
        label="P2 face cards"
        onRetain={(dieId, retain) =>
          tryDispatch({ type: "RETAIN_DIE", playerId: activeId, dieId, retain })
        }
      />

      <Battlefield
        state={state}
        playerId={MATCH_P2}
        label="Player 2"
        facing="down"
        intent={intent}
        absorbArmed={intent.kind === "absorb"}
        onCreatureClick={onCreatureClick}
        onAttackChoose={(attackerId, attackId) =>
          setIntent({ kind: "attack", attackerId, attackId })
        }
        onCancelAttack={clearIntent}
        onRitualActivate={(id) =>
          tryDispatch({ type: "ACTIVATE_RITUAL", playerId: activeId, cardInstanceId: id })
        }
        onEngineAbility={(creatureId, abilityId) =>
          tryDispatch({
            type: "RESOLVE_ENGINE_ABILITY",
            playerId: activeId,
            creatureId,
            abilityId,
          })
        }
      />

      <EnergyBar
        state={state}
        canAct={canAct}
        onGoToPhase={goToPhase}
        onEndTurn={endTurn}
      />

      <Battlefield
        state={state}
        playerId={MATCH_P1}
        label="Player 1"
        facing="up"
        intent={intent}
        absorbArmed={intent.kind === "absorb"}
        onCreatureClick={onCreatureClick}
        onAttackChoose={(attackerId, attackId) =>
          setIntent({ kind: "attack", attackerId, attackId })
        }
        onCancelAttack={clearIntent}
        onRitualActivate={(id) =>
          tryDispatch({ type: "ACTIVATE_RITUAL", playerId: activeId, cardInstanceId: id })
        }
        onEngineAbility={(creatureId, abilityId) =>
          tryDispatch({
            type: "RESOLVE_ENGINE_ABILITY",
            playerId: activeId,
            creatureId,
            abilityId,
          })
        }
      />

      <FaceCardsInPlay
        state={state}
        playerId={MATCH_P1}
        label="P1 face cards"
        onRetain={(dieId, retain) =>
          tryDispatch({ type: "RETAIN_DIE", playerId: activeId, dieId, retain })
        }
      />

      <div className="fixed inset-x-0 bottom-0 z-30 overflow-visible border-t border-stone-800/80 bg-[var(--felt-deep)]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 overflow-visible px-4 py-3 sm:px-6">
          <SymbolPool
            state={state}
            playerId={dockPlayerId}
            phase={phase}
            selected={intent.kind === "absorb" ? intent.symbolId : null}
            onSelect={(symbolId) => {
              if (!canAct || phase !== "absorption") return;
              setIntent({ kind: "absorb", symbolId });
            }}
          />

          <HandStrip
            state={state}
            playerId={dockPlayerId}
            phase={phase}
            canAct={canAct}
            selected={
              intent.kind === "play" || intent.kind === "forge" ? intent.cardInstanceId : null
            }
            onPlay={beginPlay}
            onForge={beginForge}
            onCancel={clearIntent}
          />
        </div>
      </div>
    </div>
  );
}

const btnClass =
  "rounded border border-stone-600 bg-stone-900/80 px-3 py-1.5 text-sm text-stone-100 hover:border-[var(--accent)] hover:text-[var(--accent)]";
const btnPrimary =
  "rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25";

function ErrorSnackbar({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss: () => void;
}) {
  if (error === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-72 z-50 flex justify-center px-4 sm:bottom-80">
      <div className="pointer-events-auto flex max-w-lg items-start gap-3 rounded-lg border border-red-500/50 bg-red-950/95 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur">
        <p className="font-mono text-sm text-red-100">Rejected: {error}</p>
        <button
          type="button"
          className="shrink-0 text-xs uppercase tracking-wide text-red-300 hover:text-white"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function playDefHasOverload(state: GameState, cardInstanceId: CardInstanceId): boolean {
  const instance = state.cards[cardInstanceId];
  if (instance === undefined) return false;
  return getCard(instance.cardId)?.overload !== undefined;
}

function forgeFacesNeededFor(state: GameState, cardInstanceId: CardInstanceId): number {
  const instance = state.cards[cardInstanceId];
  if (instance === undefined) return 1;
  return getCard(instance.cardId)?.forge.faces ?? 1;
}

function hintFor(intent: Intent, state: GameState): string {
  if (state.pendingDecision?.type === "search-deck") {
    return "Choose cards from the deck search, then confirm.";
  }
  if (state.pendingDecision?.type === "search-graveyard") {
    return `Choose up to ${String(state.pendingDecision.amount)} card(s) from your graveyard to return to hand.`;
  }
  if (state.pendingDecision?.type === "discard-cards") {
    return `Choose ${String(state.pendingDecision.amount)} card(s) from your hand to discard (Eclipse drew first).`;
  }
  if (state.pendingDecision?.type === "choose-creature") {
    return state.pendingDecision.filter === "ally"
      ? "Choose one of your creatures (overload / effect target)."
      : "Choose an enemy creature (overload / effect target).";
  }
  if (state.status === "finished") return "Start a new match to play again.";

  switch (intent.kind) {
    case "absorb":
      return "Click one of your creatures to absorb that symbol.";
    case "attack":
      return intent.attackId === undefined
        ? "Choose an attack on the selected creature."
        : "Click an enemy creature to attack.";
    case "play":
      if (playDefHasOverload(state, intent.cardInstanceId)) {
        return "Overload: choose which face card to attach to (shared across all dice showing it).";
      }
      return "Click a legal creature (equipment / targeted effect).";
    case "forge":
      if (intent.dieId === undefined) {
        return "Forge: choose which die to modify.";
      }
      if ((intent.slotIndexes?.length ?? 0) < forgeFacesNeededFor(state, intent.cardInstanceId)) {
        return "Forge: choose which face(s) on that die to replace.";
      }
      return "Choose which face card from your pool represents the forged face.";
    default:
      break;
  }

  switch (state.phase) {
    case "roll":
      return "Dice roll automatically. Overloads on showing faces fire immediately (not in engine), once per die that shows them.";
    case "absorption":
      return "Overloads already resolved on the roll. Select a rolled symbol to absorb, or leave it for the engine pool. Use the phase bar to skip ahead or end turn.";
    case "engine":
      return "Spend available pool symbols on engine abilities (not absorbed tokens). Disabled abilities lack the matching pool symbol. Skip phases or end turn from the bar.";
    case "combat":
      return "Click your creature → attack → enemy. Skip phases or end turn from the bar.";
    case "actions":
      return "Play or Forge from hand in this phase. Hover a card for its text. End turn from the phase bar when finished.";
    default:
      return "";
  }
}

function EnergyBar({
  state,
  canAct,
  onGoToPhase,
  onEndTurn,
}: {
  state: GameState;
  canAct: boolean;
  onGoToPhase: (phase: TurnPhase) => void;
  onEndTurn: () => void;
}) {
  const p1 = energyAvailableTo(state.energy, MATCH_P1);
  const p2 = energyAvailableTo(state.energy, MATCH_P2);
  const currentIndex = TURN_PHASE_ORDER.indexOf(state.phase);
  const controlsLocked =
    !canAct || state.status === "finished" || state.pendingDecision !== null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--accent)]/30 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 px-4 py-3 text-sm">
      <span>
        P1 energy: <strong className="text-[var(--accent)]">{p1}</strong>
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {TURN_PHASE_ORDER.map((phase, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const canJump = !controlsLocked && !isPast && !isCurrent && state.phase !== "roll";
          return (
            <button
              key={phase}
              type="button"
              disabled={controlsLocked || !canJump}
              aria-current={isCurrent ? "step" : undefined}
              title={
                isCurrent
                  ? `Current phase: ${PHASE_LABELS[phase]}`
                  : canJump
                    ? `Skip to ${PHASE_LABELS[phase]}`
                    : PHASE_LABELS[phase]
              }
              className={
                isCurrent
                  ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-2.5 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-100"
                  : canJump
                    ? "rounded border border-stone-600 bg-stone-900/80 px-2.5 py-1 text-xs text-stone-200 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    : "rounded border border-stone-800 bg-stone-950/50 px-2.5 py-1 text-xs text-stone-600"
              }
              onClick={() => {
                if (canJump) onGoToPhase(phase);
              }}
            >
              {PHASE_LABELS[phase]}
            </button>
          );
        })}
        <button
          type="button"
          disabled={controlsLocked}
          title="End turn"
          className={
            controlsLocked
              ? "rounded border border-stone-800 bg-stone-950/50 px-2.5 py-1 text-xs text-stone-600"
              : "rounded border border-amber-700/60 bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-200 hover:border-amber-500 hover:text-amber-100"
          }
          onClick={onEndTurn}
        >
          End turn
        </button>
      </div>
      <span>
        P2 energy: <strong className="text-[var(--accent)]">{p2}</strong>
      </span>
    </div>
  );
}

function Battlefield({
  state,
  playerId,
  label,
  facing,
  intent,
  absorbArmed,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
  onRitualActivate,
  onEngineAbility,
}: {
  state: GameState;
  playerId: PlayerId;
  label: string;
  facing: "up" | "down";
  intent: Intent;
  absorbArmed: boolean;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
  onRitualActivate: (cardInstanceId: CardInstanceId) => void;
  onEngineAbility: (creatureId: CreatureId, abilityId: AbilityId) => void;
}) {
  const living = livingCreaturesOf(state, playerId);
  const front = living.filter((c) => c.position === "frontline");
  const back = living.filter((c) => c.position === "back");
  const isActive = state.activePlayerId === playerId;
  const rituals = ritualsOf(state, playerId);

  const backRow = (
    <div className="flex justify-center gap-3">
      {back.map((creature) => (
        <CreatureTile
          key={creature.id}
          state={state}
          creature={creature}
          intent={intent}
          absorbArmed={absorbArmed && isActive}
          onCreatureClick={onCreatureClick}
          onAttackChoose={onAttackChoose}
          onCancelAttack={onCancelAttack}
          onEngineAbility={onEngineAbility}
        />
      ))}
    </div>
  );

  const frontRow = (
    <div className="flex justify-center gap-3">
      {front.map((creature) => (
        <CreatureTile
          key={creature.id}
          state={state}
          creature={creature}
          intent={intent}
          absorbArmed={absorbArmed && isActive}
          onCreatureClick={onCreatureClick}
          onAttackChoose={onAttackChoose}
          onCancelAttack={onCancelAttack}
          onEngineAbility={onEngineAbility}
        />
      ))}
    </div>
  );

  return (
    <section
      className={
        isActive
          ? "rounded-lg border border-[var(--accent)]/35 bg-black/30 p-4"
          : "rounded-lg border border-stone-800 bg-black/20 p-4"
      }
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
        {label}
        {isActive ? " · acting" : ""} · frontline / back
      </h2>
      <div className="flex flex-col gap-3">
        {facing === "down" ? (
          <>
            {backRow}
            {frontRow}
          </>
        ) : (
          <>
            {frontRow}
            {backRow}
          </>
        )}
      </div>
      {rituals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {rituals.map((card) => {
            const def = getCard(card.cardId);
            return (
              <button
                key={card.id}
                type="button"
                className={btnClass}
                disabled={!isActive || card.ritualOrientation !== "ready"}
                onClick={() => onRitualActivate(card.id)}
              >
                {def?.name ?? card.cardId} ({card.ritualOrientation})
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function attackIsArmed(
  state: GameState,
  creature: CreatureState,
  attack: AttackDefinition,
): boolean {
  if (attack.effect === undefined) return false;
  if (creature.attacksUsedThisCombat >= state.config.attacksPerCreaturePerCombat) return false;
  if (!holdsTokens(creature, attack.requires)) return false;
  if (attack.discards !== undefined && !holdsTokens(creature, attack.discards)) return false;
  return legalTargetsFor(state, creature.id, attack).length > 0;
}

function creatureHasArmedAttack(state: GameState, creature: CreatureState): boolean {
  const def = getCreatureDefinition(creature.definitionId);
  if (def === undefined) return false;
  return def.attacks.some((attack) => attackIsArmed(state, creature, attack));
}

function CreatureTile({
  state,
  creature,
  intent,
  absorbArmed,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
  onEngineAbility,
}: {
  state: GameState;
  creature: CreatureState;
  intent: Intent;
  absorbArmed: boolean;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
  onEngineAbility: (creatureId: CreatureId, abilityId: AbilityId) => void;
}) {
  const def = getCreatureDefinition(creature.definitionId);
  if (def === undefined) return null;
  const life = currentLife(creature);
  const selectedAttacker = intent.kind === "attack" && intent.attackerId === creature.id;
  const isActive = state.activePlayerId === creature.ownerId;

  return (
    <div
      className={
        selectedAttacker || absorbArmed
          ? "w-52 rounded border border-[var(--accent)] bg-stone-900 p-3"
          : "w-52 rounded border border-stone-700 bg-stone-950 p-3"
      }
    >
      <button type="button" className="w-full text-left" onClick={() => onCreatureClick(creature)}>
        <p className="font-medium text-stone-100">{def.name}</p>
        <p className="mt-1 text-xs text-stone-400">
          HP {life}/{def.life} · Shield {creature.shields} · Toxin {creature.toxinMarkers}
        </p>
        <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
          {creature.position} · {def.attributes.join(", ")}
        </p>
        <p className="mt-1 text-xs capitalize text-stone-400">
          tokens:{" "}
          {Object.entries(creature.attributeTokens)
            .filter(([, n]) => (n ?? 0) > 0)
            .map(([k, n]) => `${k} ${String(n)}`)
            .join(", ") || "none"}
        </p>
        <PendingAbsorbLine state={state} creatureId={creature.id} />
      </button>

      <ul className="mt-2 space-y-1 border-t border-stone-800 pt-2">
        {def.attacks.map((attack) => (
          <li key={attack.id} className="text-[0.7rem] leading-snug text-stone-300">
            <span className="text-stone-500">{attack.kind === "basic" ? "B" : "S"}:</span>{" "}
            {attack.name}{" "}
            <span className="text-[var(--accent)]">
              [{formatAttackCost(attack.requires) || "—"}
              {attack.discards !== undefined
                ? `; discard ${formatAttackCost(attack.discards)}`
                : ""}
              ]
            </span>
          </li>
        ))}
      </ul>

      {selectedAttacker && intent.attackId === undefined && (
        <div className="mt-2 flex flex-col gap-1">
          {def.attacks.map((attack) => {
            const armed = attackIsArmed(state, creature, attack);
            const fuelled =
              holdsTokens(creature, attack.requires) &&
              (attack.discards === undefined || holdsTokens(creature, attack.discards));
            return (
              <button
                key={attack.id}
                type="button"
                disabled={!armed}
                className={armed ? btnPrimary : `${btnClass} opacity-40`}
                onClick={() => onAttackChoose(creature.id, attack.id)}
              >
                {attack.name}
                {!fuelled ? " · not fuelled" : ""}
              </button>
            );
          })}
          <button type="button" className={btnClass} onClick={onCancelAttack}>
            Cancel
          </button>
        </div>
      )}

      {isActive && state.phase === "engine" && def.engineAbilities.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {def.engineAbilities.map((ability) => {
            const affordable = canPay(state, creature.ownerId, ability.consumes);
            const cost = formatAttackCost(ability.consumes) || "—";
            return (
              <button
                key={ability.id}
                type="button"
                disabled={!affordable}
                className={affordable ? btnPrimary : `${btnClass} opacity-40`}
                onClick={() => onEngineAbility(creature.id, ability.id)}
              >
                {ability.name}{" "}
                <span className="font-normal text-stone-400">[{cost}]</span>
                {!affordable ? " · need pool" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PendingAbsorbLine({
  state,
  creatureId,
}: {
  state: GameState;
  creatureId: CreatureId;
}) {
  const pending = Object.values(state.symbols).filter(
    (symbol) =>
      symbol.status === "absorbed" &&
      symbol.absorbedByCreatureId === creatureId &&
      symbol.symbol !== SHIELD,
  );
  if (pending.length === 0) return null;
  return (
    <p className="mt-1 text-[0.65rem] text-amber-200/80">
      pending tokens: {pending.map((symbol) => symbol.symbol).join(", ")} (at end of turn)
    </p>
  );
}

function uniqueInstalledFaces(
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
function FaceCardsInPlay({
  state,
  playerId,
  label,
  onRetain,
}: {
  state: GameState;
  playerId: PlayerId;
  label: string;
  onRetain: (dieId: DieId, retain: boolean) => void;
}) {
  const dice = diceOf(state, playerId);
  const faces = uniqueInstalledFaces(state, playerId);
  const isActive = state.activePlayerId === playerId;
  const hasRolled = dice.some((die) => die.rolledSlotIndex !== null);

  return (
    <section className="rounded-lg border border-stone-800 bg-black/25 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
        {hasRolled ? " · showing after roll" : " · shared across dice"}
      </h2>
      <div className="flex flex-wrap gap-3">
        {faces.map((entry) => {
          const face = getFaceCard(entry.faceCardId);
          const kindLabel =
            face === undefined ? "?" : face.kind === "natural" ? "Natural" : "Synthetic";
          const tooltip = [
            kindLabel,
            face?.symbol ?? "",
            entry.copies > 1 ? `Installed on ${String(entry.copies)} faces` : "Installed on dice",
            face?.rulesText !== undefined && face.rulesText !== "" ? face.rulesText : null,
          ]
            .filter((line): line is string => line !== null && line !== "")
            .join("\n");

          return (
            <div
              key={entry.faceCardId}
              className={
                entry.showing
                  ? "group relative w-40 rounded border border-[var(--accent)] bg-[var(--accent)]/15 p-3"
                  : hasRolled
                    ? "group relative w-40 rounded border border-stone-800 bg-stone-950/70 p-3 opacity-55"
                    : "group relative w-40 rounded border border-stone-700 bg-stone-950 p-3"
              }
            >
              <div
                className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-20 hidden w-56 rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl group-hover:block"
                role="tooltip"
              >
                <p className="text-sm font-medium text-stone-100">{face?.name ?? entry.faceCardId}</p>
                <pre className="mt-2 whitespace-pre-wrap font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                  {tooltip}
                </pre>
              </div>
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
              {entry.overloads > 0 && (
                <p className="mt-1 text-[0.65rem] text-amber-200/80">
                  +{entry.overloads} overload
                </p>
              )}
            </div>
          );
        })}
        {faces.length === 0 && <p className="text-sm text-stone-600">No faces installed</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 border-t border-stone-800/80 pt-3">
        {dice.map((die) => {
          const rolledSlot =
            die.rolledSlotIndex !== null ? die.slots[die.rolledSlotIndex] : undefined;
          const rolledName =
            rolledSlot !== undefined
              ? (getFaceCard(rolledSlot.faceCardId)?.name ?? "face")
              : null;
          return (
            <div key={die.id} className="flex items-center gap-2 text-xs text-stone-500">
              <span className="uppercase tracking-wider">
                Die · {die.id}
                {die.retained ? " · retained" : ""}
                {die.stunMarkers > 0 ? ` · stun ${String(die.stunMarkers)}` : ""}
                {rolledName !== null ? ` · rolled ${rolledName}` : ""}
              </span>
              {isActive && die.rolledSlotIndex !== null && (
                <button
                  type="button"
                  className={btnClass}
                  onClick={() => onRetain(die.id, !die.retained)}
                >
                  {die.retained ? "Release" : "Retain"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DieSlotPickModal({
  state,
  title,
  subtitle,
  dieOwnerId,
  facesNeeded,
  selectedDieId,
  selectedSlots,
  onSelectDie,
  onClearDie,
  onToggleSlot,
  onCancel,
}: {
  state: GameState;
  title: string;
  subtitle: string;
  dieOwnerId: PlayerId;
  facesNeeded: number;
  selectedDieId: DieId | undefined;
  selectedSlots: readonly number[];
  onSelectDie: (dieId: DieId) => void;
  onClearDie: () => void;
  onToggleSlot: (slotIndex: number) => void;
  onCancel: () => void;
}) {
  const dice = diceOf(state, dieOwnerId);
  const selectedDie = selectedDieId !== undefined ? state.dice[selectedDieId] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{subtitle}</p>

        {selectedDieId === undefined && (
          <ul className="mt-4 space-y-2">
            {dice.map((die, index) => (
              <li key={die.id}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-3 text-left hover:border-[var(--accent)]"
                  onClick={() => onSelectDie(die.id)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    Die {index + 1}
                    <span className="ml-2 text-xs font-normal text-stone-500">{die.id}</span>
                  </p>
                  <p className="mt-1 text-xs capitalize text-stone-500">
                    {die.slots
                      .map((slot) => getFaceCard(slot.faceCardId)?.name ?? "?")
                      .join(" · ")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedDie !== undefined && (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-stone-500">
              Faces on this die · pick {facesNeeded}
              {selectedSlots.length > 0
                ? ` (${String(selectedSlots.length)}/${String(facesNeeded)})`
                : ""}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selectedDie.slots.map((slot) => {
                const face = getFaceCard(slot.faceCardId);
                const picked = selectedSlots.includes(slot.index);
                return (
                  <button
                    key={slot.index}
                    type="button"
                    className={
                      picked
                        ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-3 text-left"
                        : "rounded border border-stone-700 bg-stone-900 px-3 py-3 text-left hover:border-stone-500"
                    }
                    onClick={() => onToggleSlot(slot.index)}
                  >
                    <p className="text-sm font-medium text-stone-100">{face?.name ?? "?"}</p>
                    <p className="mt-1 text-[0.65rem] capitalize text-stone-500">
                      Slot {slot.index + 1} · {face?.kind ?? "?"} · {face?.symbol ?? "—"}
                    </p>
                  </button>
                );
              })}
            </div>
            <button type="button" className={`${btnClass} mt-3`} onClick={onClearDie}>
              Change die
            </button>
          </div>
        )}

        <button type="button" className={`${btnClass} mt-4`} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function SymbolPool({
  state,
  playerId,
  phase,
  selected,
  onSelect,
}: {
  state: GameState;
  playerId: PlayerId;
  phase: GameState["phase"];
  selected: SymbolInstanceId | null;
  onSelect: (id: SymbolInstanceId) => void;
}) {
  const symbols =
    phase === "absorption" ? rolledSymbols(state, playerId) : usableSymbols(state, playerId);
  const canPick = phase === "absorption";
  const label = phase === "absorption" ? "Rolled (absorb)" : "Available pool (engine / cards)";

  if (symbols.length === 0) {
    return (
      <p className="text-center text-xs uppercase tracking-[0.18em] text-stone-600">
        No {phase === "absorption" ? "rolled" : "available"} symbols
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="mr-2 text-xs uppercase tracking-[0.18em] text-stone-500">{label}</span>
      {symbols.map((symbol) => (
        <button
          key={symbol.id}
          type="button"
          disabled={!canPick}
          className={
            selected === symbol.id
              ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-2 py-1 text-sm capitalize text-[var(--accent)]"
              : canPick
                ? "rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm capitalize text-stone-200 hover:border-stone-500"
                : "rounded border border-stone-800 bg-stone-950 px-2 py-1 text-sm capitalize text-stone-500"
          }
          onClick={() => onSelect(symbol.id)}
        >
          {symbol.symbol}
        </button>
      ))}
    </div>
  );
}

function HandStrip({
  state,
  playerId,
  phase,
  canAct,
  selected,
  onPlay,
  onForge,
  onCancel,
}: {
  state: GameState;
  playerId: PlayerId;
  phase: GameState["phase"];
  canAct: boolean;
  selected: CardInstanceId | null;
  onPlay: (card: CardInstance) => void;
  onForge: (card: CardInstance) => void;
  onCancel: () => void;
}) {
  const hand = handOf(state, playerId);
  const actionsPhase = phase === "actions";
  const actionsLive = actionsPhase && canAct;
  const [hoveredId, setHoveredId] = useState<CardInstanceId | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; bottom: number } | null>(null);
  const cardRefs = useRef<Map<CardInstanceId, HTMLDivElement>>(new Map());

  useLayoutEffect(() => {
    if (hoveredId === null) {
      setTooltipPos(null);
      return;
    }
    const node = cardRefs.current.get(hoveredId);
    if (node === undefined) {
      setTooltipPos(null);
      return;
    }
    const rect = node.getBoundingClientRect();
    setTooltipPos({
      left: Math.min(rect.left, window.innerWidth - 272),
      bottom: window.innerHeight - rect.top + 8,
    });
  }, [hoveredId, hand.length]);

  const hoveredCard = hoveredId !== null ? hand.find((card) => card.id === hoveredId) : undefined;
  const hoveredDef =
    hoveredCard !== undefined ? getCard(hoveredCard.cardId) : undefined;

  const statusHint = !canAct
    ? " · opponent's turn"
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
      <div className="flex flex-wrap gap-3">
        {hand.map((card) => {
          const def = getCard(card.cardId);
          if (def === undefined) return null;
          const isSelected = selected === card.id;
          const canPlay = actionsLive && hasPlayableEffect(def);

          return (
            <div
              key={card.id}
              ref={(node) => {
                if (node === null) cardRefs.current.delete(card.id);
                else cardRefs.current.set(card.id, node);
              }}
              className={
                isSelected
                  ? "w-48 rounded border border-[var(--accent)] bg-stone-900 p-3"
                  : "w-48 rounded border border-stone-700 bg-stone-950 p-3"
              }
              onMouseEnter={() => setHoveredId(card.id)}
              onMouseLeave={() => setHoveredId((current) => (current === card.id ? null : current))}
            >
              <p className="truncate text-sm font-medium text-stone-100">{def.name}</p>
              <p className="mt-1 text-xs text-stone-500">
                {def.variableEnergy === true ? "?" : def.energyCost}E · {def.subtypes.join("/")}
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
                    <button type="button" className={btnClass} onClick={() => onForge(card)}>
                      Forge
                    </button>
                  </>
                )}
                {!actionsLive && (
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
        tooltipPos !== null &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] w-64 rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl"
            style={{ left: tooltipPos.left, bottom: tooltipPos.bottom }}
            role="tooltip"
          >
            <p className="text-sm font-medium text-stone-100">{hoveredDef.name}</p>
            <p className="mt-1 text-xs text-stone-400">
              {hoveredDef.variableEnergy === true ? "? (1+)" : hoveredDef.energyCost} Energy
            </p>
            <pre className="mt-2 whitespace-pre-wrap font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
              {[
                formatTypeLine(hoveredDef),
                formatForgeLine(hoveredDef.forge),
                "or",
                ...formatEffectRegion(hoveredDef),
              ].join("\n")}
            </pre>
          </div>,
          document.body,
        )}
    </section>
  );
}

function ChooseCreatureModal({
  state,
  filter,
  controllerId,
  onPick,
}: {
  state: GameState;
  filter: "ally" | "enemy";
  controllerId: PlayerId;
  onPick: (creatureId: CreatureId) => void;
}) {
  const ownerId =
    filter === "ally"
      ? controllerId
      : controllerId === MATCH_P1
        ? MATCH_P2
        : MATCH_P1;
  const creatures = livingCreaturesOf(state, ownerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose {filter === "ally" ? "your creature" : "an enemy"}
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          An on-roll overload needs a target (this fired when the face was rolled, not in engine). Pick a creature below or on the board.
        </p>
        <ul className="mt-4 space-y-2">
          {creatures.map((creature) => {
            const def = getCreatureDefinition(creature.definitionId);
            return (
              <li key={creature.id}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  onClick={() => onPick(creature.id)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {def?.name ?? creature.definitionId}
                  </p>
                  <p className="text-xs text-stone-500">
                    HP {currentLife(creature)}/{def?.life ?? "?"} · Shield {creature.shields} ·
                    damage {creature.damage}
                  </p>
                </button>
              </li>
            );
          })}
          {creatures.length === 0 && (
            <li className="text-sm text-red-300">No legal creatures to choose.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function DiscardModal({
  state,
  amount,
  pick,
  onToggle,
  onConfirm,
}: {
  state: GameState;
  amount: number;
  pick: readonly CardInstanceId[];
  onToggle: (id: CardInstanceId) => void;
  onConfirm: () => void;
}) {
  const pending = state.pendingDecision;
  if (pending === null || pending.type !== "discard-cards") return null;
  const hand = handOf(state, pending.controllerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Discard from hand
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          You drew first; now choose {amount} card{amount === 1 ? "" : "s"} to discard.
        </p>
        <ul className="mt-4 space-y-2">
          {hand.map((card) => {
            const def = getCard(card.cardId);
            const checked = pick.includes(card.id);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={
                    checked
                      ? "w-full rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left"
                      : "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-stone-500"
                  }
                  disabled={!checked && pick.length >= amount}
                  onClick={() => onToggle(card.id)}
                >
                  <p className="text-sm font-medium text-stone-100">{def?.name ?? card.cardId}</p>
                  <p className="text-xs text-stone-500">
                    {def !== undefined
                      ? `${def.variableEnergy === true ? "?" : def.energyCost}E · ${def.subtypes.join("/")}`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
          {hand.length === 0 && (
            <li className="text-sm text-red-300">Hand is empty — nothing to discard.</li>
          )}
        </ul>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={pick.length !== amount}
          onClick={onConfirm}
        >
          Confirm discard ({String(pick.length)}/{String(amount)})
        </button>
      </div>
    </div>
  );
}

function OverloadFacePickModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Overload a face card
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {def?.name ?? "Card"} attaches to a shared face card. Every die showing that face will
          fire the overload when rolled.
        </p>
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
                  <p className="text-sm font-medium text-stone-100">{face?.name ?? faceCardId}</p>
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
      </div>
    </div>
  );
}

function FacePickModal({
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
  if (def === undefined) return null;

  const eligible = eligibleFacesForForge(
    state,
    playerId,
    def.forge.kind,
    def.forge.attribute,
    def,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose face card
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {def.name} forges {formatForgeLine(def.forge)}. Pick a face from your face pool (or an
          already-installed copy) to represent it.
        </p>
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
                  <p className="text-sm font-medium text-stone-100">{face?.name ?? faceCardId}</p>
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
        <button type="button" className={`${btnClass} mt-4`} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function SearchPanel({
  state,
  amount,
  pick,
  mode,
  onToggle,
  onConfirm,
}: {
  state: GameState;
  amount: number;
  pick: readonly CardInstanceId[];
  mode: "deck" | "graveyard";
  onToggle: (id: CardInstanceId) => void;
  onConfirm: () => void;
}) {
  const pending = state.pendingDecision;
  if (pending === null) return null;
  if (mode === "deck" && pending.type !== "search-deck") return null;
  if (mode === "graveyard" && pending.type !== "search-graveyard") return null;

  const options =
    mode === "deck" && pending.type === "search-deck"
      ? searchableInDeck(state, pending.controllerId, pending.filter)
      : searchableInGraveyard(state, pending.controllerId);

  const exact = mode === "deck";
  const canConfirm = exact
    ? pick.length === Math.min(amount, options.length)
    : pick.length <= amount;

  return (
    <section className="rounded border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
      <h2 className="text-sm font-medium text-[var(--accent)]">
        {mode === "deck"
          ? `Search deck — pick ${String(amount)}`
          : `Graveyard — pick up to ${String(amount)}`}
      </h2>
      <ul className="mt-3 space-y-2">
        {options.map((instanceId) => {
          const instance = state.cards[instanceId];
          const def = instance !== undefined ? getCard(instance.cardId) : undefined;
          const checked = pick.includes(instanceId);
          return (
            <li key={instanceId}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && pick.length >= amount}
                  onChange={() => onToggle(instanceId)}
                />
                {def?.name ?? instanceId}
              </label>
            </li>
          );
        })}
        {options.length === 0 && (
          <li className="text-sm text-stone-400">No eligible cards.</li>
        )}
      </ul>
      <button
        type="button"
        className={`${btnPrimary} mt-3`}
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        Confirm
      </button>
    </section>
  );
}
