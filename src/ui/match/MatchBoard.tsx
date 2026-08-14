import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  countInstalledCopies,
  currentLife,
  diceOf,
  eligibleFacesForForge,
  energyAvailableTo,
  formatAttackCost,
  formatAttackLine,
  formatEffectRegion,
  formatEnergyCost,
  formatForgeLine,
  formatRequirementLine,
  formatTypeLine,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  graveyardOf,
  handOf,
  hasPlayableEffect,
  isFaceCardInPool,
  legalTargetsFor,
  livingCreaturesOf,
  opponentOf,
  ritualDurationOf,
  ritualsOf,
  rolledSymbols,
  searchableInDeck,
  searchableInGraveyard,
  usableSymbols,
  holdsTokens,
  isReactionCard,
  overloadsOnFace,
  SHIELD,
  type AttackDefinition,
  type AttackId,
  type CardInstance,
  type CardInstanceId,
  type CreatureId,
  type CreatureState,
  type DieId,
  type FaceCardId,
  type FaceKind,
  type GameState,
  type ChainLink,
  type PlayerId,
  type SymbolInstanceId,
  type SymbolType,
  type TurnPhase,
  TURN_PHASE_ORDER,
} from "@/game";
import { MATCH_P1, MATCH_P2, useMatchStore } from "@/store/matchStore";
import { useDeckStore } from "@/store/deckStore";
import { PROTOTYPE_SAVED_DECK_ID, validateSavedDeck } from "@/decks";

const PHASE_LABELS: Record<TurnPhase, string> = {
  roll: "Roll",
  absorption: "Absorb",
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
  const onlineReady = useMatchStore((s) => s.onlineReady);
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
  const [forgeFacesDieId, setForgeFacesDieId] = useState<DieId | undefined>();
  const [forgeFacesSlots, setForgeFacesSlots] = useState<readonly number[]>([]);
  const [forgeFacesFaceId, setForgeFacesFaceId] = useState<FaceCardId | undefined>();
  const [handCollapsed, setHandCollapsed] = useState(false);

  const activeId = state.activePlayerId;
  const finished = state.status === "finished";
  const pending = state.pendingDecision;
  const phase = state.phase;
  const isOnline = mode !== "local";
  const reactionPriority =
    pending?.type === "reaction-priority" ? pending.priorityPlayerId : null;
  const actingId = reactionPriority ?? activeId;
  const canAct = !isOnline || localPlayerId === actingId;
  const pendingControllerId =
    pending !== null && "controllerId" in pending ? pending.controllerId : null;
  const isPendingChooser =
    !isOnline || pendingControllerId === null || localPlayerId === pendingControllerId;
  /** Bottom dock shows this seat's hand/pool — local seat online, priority/active in hotseat. */
  const dockPlayerId =
    isOnline && localPlayerId !== null ? localPlayerId : actingId;

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
    setForgeFacesDieId(undefined);
    setForgeFacesSlots([]);
    setForgeFacesFaceId(undefined);
  }, [pending?.type]);

  useEffect(() => {
    if (lastError === null) return;
    const id = window.setTimeout(() => clearError(), 5000);
    return () => window.clearTimeout(id);
  }, [lastError, clearError]);

  const hint = useMemo(
    () => hintFor(intent, state, isPendingChooser),
    [intent, state, isPendingChooser],
  );
  const attackArrows = useMemo(() => collectAttackArrows(state, intent), [state, intent]);
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
    if (isOnline && !onlineReady) return;
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
    onlineReady,
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

    if (intent.kind === "attack" && phase === "actions") {
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

    if (phase === "actions" && creature.ownerId === activeId) {
      if (!creatureHasArmedAttack(state, creature)) return;
      setIntent({ kind: "attack", attackerId: creature.id });
    }
  };

  const beginPlay = (card: CardInstance) => {
    if (!canAct) return;
    if (finished) return;

    // Respond during a reaction chain with a hand Reaction.
    if (pending?.type === "reaction-priority") {
      if (card.ownerId !== actingId) return;
      const def = getCard(card.cardId);
      if (def === undefined || !isReactionCard(def) || def.effect === undefined) {
        return;
      }
      tryDispatch({ type: "PLAY_CARD", playerId: actingId, cardInstanceId: card.id });
      return;
    }

    if (card.ownerId !== activeId || pending !== null || phase !== "actions") return;
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
          typeof effect.target === "object" &&
          effect.target.kind === "declared-target",
      );
      if (needsTarget) {
        setIntent({ kind: "play", cardInstanceId: card.id });
        return;
      }
      tryDispatch({ type: "PLAY_CARD", playerId: activeId, cardInstanceId: card.id });
    }
  };

  const passPriority = () => {
    if (!canAct || finished || pending?.type !== "reaction-priority") return;
    tryDispatch({ type: "PASS_PRIORITY", playerId: actingId });
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

  const localDeckId = mode === "host" ? p1DeckId : mode === "client" ? p2DeckId : null;
  const localDeckName =
    localDeckId !== null
      ? (decks.find((deck) => deck.id === localDeckId)?.name ?? localDeckId)
      : null;

  if (isOnline && !onlineReady) {
    return (
      <div className="relative mx-auto flex max-w-lg flex-col gap-4 px-4 pb-16 pt-28 sm:px-6">
        <div className="fixed inset-x-0 top-14 z-40 border-b border-stone-800/80 bg-[var(--felt-deep)]/95 shadow-lg shadow-black/30 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--ink)] sm:text-3xl">
                {mode === "host" ? "Hosting…" : "Joining…"}
              </h1>
              <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
                Room <span className="font-mono text-[var(--accent)]">{roomCode}</span>
                {" · "}
                {connectionStatus}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <button type="button" className={btnClass} onClick={() => setView("lobby")}>
                Lobby
              </button>
              <button type="button" className={btnClass} onClick={() => leaveOnline()}>
                Leave
              </button>
            </div>
          </div>
        </div>

        <div className="rounded border border-stone-700 bg-stone-950/60 p-6">
          <p className="text-sm text-stone-300">
            {mode === "host"
              ? "Share the room code with your opponent. The match board opens when they join — your selected loadout is locked in as P1."
              : "Connecting to the host. The match board opens when the room accepts your loadout."}
          </p>
          {localDeckName !== null && (
            <p className="mt-4 text-sm text-stone-100">
              Your deck: <span className="text-[var(--accent)]">{localDeckName}</span>
            </p>
          )}
          {mode === "host" && roomCode !== null && (
            <p className="mt-2 font-mono text-2xl tracking-[0.2em] text-[var(--accent)]">
              {roomCode}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-96 pt-28 sm:px-6 sm:pb-[28rem]">
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

      {pending?.type === "search-deck" && isPendingChooser && (
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
      {pending?.type === "search-deck" && !isPendingChooser && (
        <WaitingBanner>Opponent is searching their deck.</WaitingBanner>
      )}

      {pending?.type === "search-graveyard" && isPendingChooser && (
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
      {pending?.type === "search-graveyard" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing cards from their graveyard.</WaitingBanner>
      )}

      {pending?.type === "discard-cards" && isPendingChooser && (
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
      {pending?.type === "discard-cards" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing cards to discard.</WaitingBanner>
      )}

      {pending?.type === "choose-creature" && isPendingChooser && (
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
      {pending?.type === "choose-creature" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing a creature.</WaitingBanner>
      )}

      {pending?.type === "forge-faces" && isPendingChooser && (
        <ForgeFacesPrompt
          state={state}
          pending={pending}
          selectedFaceCardId={forgeFacesFaceId}
          selectedDieId={forgeFacesDieId}
          selectedSlots={forgeFacesSlots}
          onPickFace={setForgeFacesFaceId}
          onClearFace={() => {
            setForgeFacesFaceId(undefined);
            setForgeFacesDieId(undefined);
            setForgeFacesSlots([]);
          }}
          onSelectDie={(dieId) => {
            setForgeFacesDieId(dieId);
            setForgeFacesSlots([]);
          }}
          onClearDie={() => {
            setForgeFacesDieId(undefined);
            setForgeFacesSlots([]);
          }}
          onToggleSlot={(slotIndex) => {
            if (forgeFacesFaceId === undefined || forgeFacesDieId === undefined) return;
            const next = forgeFacesSlots.includes(slotIndex)
              ? forgeFacesSlots.filter((index) => index !== slotIndex)
              : forgeFacesSlots.length < pending.faces
                ? [...forgeFacesSlots, slotIndex]
                : forgeFacesSlots;
            setForgeFacesSlots(next);
            if (next.length === pending.faces) {
              tryDispatch({
                type: "RESOLVE_FORGE_FACES",
                playerId: pending.controllerId,
                dieId: forgeFacesDieId,
                slotIndexes: next,
                faceCardId: forgeFacesFaceId,
              });
            }
          }}
        />
      )}
      {pending?.type === "forge-faces" && !isPendingChooser && (
        <WaitingBanner>
          Opponent is choosing a face from their pool to install on your die.
        </WaitingBanner>
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

      <AttackArrowOverlay pairs={attackArrows} />

      {forgeFacePrompt !== null && forgeDef !== undefined && (
        <FacePickModal
          state={state}
          playerId={activeId}
          kind={forgeDef.forge.kind}
          attribute={forgeDef.forge.attribute}
          forgingCard={forgeDef}
          subtitle={`${forgeDef.name} forges ${formatForgeLine(forgeDef.forge)}. Pick a face from your face pool (or an already-installed copy) to represent it.`}
          onPick={confirmForgeFace}
          onCancel={clearIntent}
        />
      )}

      {/* Opponent (top): shared face cards, then back, then frontline */}
      <FaceCardsInPlay
        state={state}
        playerId={MATCH_P2}
        label="P2 face cards"
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
          tryDispatch({ type: "ACTIVATE_RITUAL", playerId: actingId, cardInstanceId: id })
        }
        onRitualAbsorb={(id) => {
          if (intent.kind !== "absorb") return;
          tryDispatch({
            type: "ABSORB_SYMBOL_TO_RITUAL",
            playerId: activeId,
            cardInstanceId: id,
            symbolId: intent.symbolId,
          });
        }}
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
          tryDispatch({ type: "ACTIVATE_RITUAL", playerId: actingId, cardInstanceId: id })
        }
        onRitualAbsorb={(id) => {
          if (intent.kind !== "absorb") return;
          tryDispatch({
            type: "ABSORB_SYMBOL_TO_RITUAL",
            playerId: activeId,
            cardInstanceId: id,
            symbolId: intent.symbolId,
          });
        }}
      />

      <FaceCardsInPlay
        state={state}
        playerId={MATCH_P1}
        label="P1 face cards"
      />

      <div className="fixed inset-x-0 bottom-0 z-30 overflow-visible border-t border-stone-800/80 bg-[var(--felt-deep)]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 overflow-visible px-4 py-2 sm:px-6">
          <button
            type="button"
            className="-mb-1 flex w-full items-center justify-center py-1 text-stone-500 hover:text-[var(--accent)]"
            aria-expanded={!handCollapsed}
            aria-controls="match-hand-dock"
            aria-label={handCollapsed ? "Show hand" : "Hide hand"}
            onClick={() => setHandCollapsed((collapsed) => !collapsed)}
          >
            <svg
              viewBox="0 0 24 24"
              className={
                handCollapsed
                  ? "size-5 rotate-180 transition-transform"
                  : "size-5 transition-transform"
              }
              aria-hidden="true"
            >
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
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

          {pending?.type === "reaction-priority" && (
            <div className="flex flex-wrap items-center gap-3 rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
              <span className="flex min-w-0 flex-wrap items-center gap-x-1">
                Chain ({String(state.chainStack.length)} link
                {state.chainStack.length === 1 ? "" : "s"}) — priority:{" "}
                <strong>{pending.priorityPlayerId}</strong>
                {state.chainStack.length > 0 && (
                  <>
                    {" · "}
                    <ChainLinkHover state={state} link={state.chainStack.at(-1)} />
                  </>
                )}
              </span>
              <button
                type="button"
                className="rounded border border-amber-600 bg-amber-900/50 px-2.5 py-1 text-xs font-medium hover:border-amber-400 disabled:opacity-40"
                disabled={!canAct}
                onClick={passPriority}
              >
                Pass priority
              </button>
            </div>
          )}

          <div
            id="match-hand-dock"
            className={handCollapsed ? "hidden" : "flex items-end gap-3"}
          >
            <div className="min-w-0 flex-1 overflow-hidden">
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
            <ZoneDocks state={state} playerId={dockPlayerId} />
          </div>
        </div>
      </div>
    </div>
  );
}

const btnClass =
  "rounded border border-stone-600 bg-stone-900/80 px-3 py-1.5 text-sm text-stone-100 hover:border-[var(--accent)] hover:text-[var(--accent)]";
const btnPrimary =
  "rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25";

function ChainLinkHover({
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
    return (
      <span className="group relative inline-block">
        <span
          className={
            link.negated
              ? "cursor-help font-medium text-amber-100/70 underline decoration-dotted line-through"
              : "cursor-help font-medium text-amber-50 underline decoration-dotted"
          }
        >
          {def.name}
        </span>
        <div
          className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-50 hidden w-64 rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl group-hover:block"
          role="tooltip"
        >
          <p className="text-sm font-medium text-stone-100">{def.name}</p>
          <p className="mt-1 text-xs text-stone-400">
            {def.variableEnergy === true ? "? (1+)" : def.energyCost} Energy
            {link.negated ? " · negated" : ""}
          </p>
          <div className="mt-2 space-y-1 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
            <p>{formatTypeLine(def)}</p>
            <p className="text-stone-500">{formatForgeLine(def.forge)}</p>
            {formatEffectRegion(def).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </span>
    );
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
      <span className="group relative inline-block">
        <span
          className={
            link.negated
              ? "cursor-help font-medium text-amber-100/70 underline decoration-dotted line-through"
              : "cursor-help font-medium text-amber-50 underline decoration-dotted"
          }
        >
          {title}
        </span>
        <div
          className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-50 hidden w-64 rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl group-hover:block"
          role="tooltip"
        >
          <p className="text-sm font-medium text-stone-100">{title}</p>
          {attack !== undefined && (
            <p className="mt-1 text-xs text-stone-400">{formatAttackLine(attack)}</p>
          )}
          {attack?.rulesText !== undefined && attack.rulesText !== "" && (
            <p className="mt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
              {attack.rulesText}
            </p>
          )}
        </div>
      </span>
    );
  }

  return <span className="font-medium text-amber-50">{link.kind}</span>;
}

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

function hintFor(intent: Intent, state: GameState, isPendingChooser: boolean): string {
  if (state.pendingDecision?.type === "search-deck") {
    return isPendingChooser
      ? "Choose cards from the deck search, then confirm."
      : "Waiting for the opponent to search their deck.";
  }
  if (state.pendingDecision?.type === "search-graveyard") {
    return isPendingChooser
      ? `Choose up to ${String(state.pendingDecision.amount)} card(s) from your graveyard to return to hand.`
      : "Waiting for the opponent to choose from their graveyard.";
  }
  if (state.pendingDecision?.type === "discard-cards") {
    return isPendingChooser
      ? `Choose ${String(state.pendingDecision.amount)} card(s) from your hand to discard.`
      : "Waiting for the opponent to discard.";
  }
  if (state.pendingDecision?.type === "choose-creature") {
    if (!isPendingChooser) return "Waiting for the opponent to choose a creature.";
    return state.pendingDecision.filter === "ally"
      ? "Choose one of your creatures (overload / effect target)."
      : "Choose an enemy creature (overload / effect target).";
  }
  if (state.pendingDecision?.type === "forge-faces") {
    if (!isPendingChooser) {
      return "Waiting for the opponent to choose a face from their pool to install on your die.";
    }
    const pending = state.pendingDecision;
    const kind = pending.kind === "natural" ? "Natural" : "Synthetic";
    const where = pending.target === "own-die" ? "one of your dice" : "one of the opponent's dice";
    return `Choose a ${kind} ${pending.attribute} face from your face pool, then install it on ${where} (${String(pending.faces)} ${pending.faces === 1 ? "copy" : "copies"}).`;
  }
  if (state.pendingDecision?.type === "reaction-priority") {
    return "Reaction chain: Pass priority, or play a Reaction / activate a ready ritual-reaction.";
  }
  if (state.status === "finished") return "Start a new match to play again.";

  switch (intent.kind) {
    case "absorb":
      return "Click one of your creatures or rituals to absorb that symbol.";
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
      return "Dice roll automatically. Overloads on showing faces fire immediately, once per die that shows them. Rituals cannot activate during roll.";
    case "absorption":
      return "Select a rolled symbol to absorb onto a creature or ritual, or leave it for the available pool. Ready rituals may activate. Use the phase bar to skip ahead or end turn.";
    case "actions":
      return "Attack, play tactics, forge, and activate ready rituals in any order. Hover a card for its text. End turn from the phase bar when finished.";
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
  onRitualAbsorb,
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
  onRitualAbsorb: (cardInstanceId: CardInstanceId) => void;
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
        />
      ))}
    </div>
  );

  const ritualStrip =
    rituals.length > 0 ? (
      <div
        className={
          facing === "down"
            ? "mb-3 border-b border-stone-800/80 pb-3"
            : "mt-3 border-t border-stone-800/80 pt-3"
        }
      >
        <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Rituals
        </h3>
        <div className="flex flex-wrap gap-2">
          {rituals.map((card) => (
            <RitualTile
              key={card.id}
              card={card}
              absorbArmed={absorbArmed && isActive}
              canActivate={
                isActive &&
                state.phase !== "roll" &&
                card.ritualOrientation === "ready" &&
                !absorbArmed
              }
              onActivate={() => onRitualActivate(card.id)}
              onAbsorb={() => onRitualAbsorb(card.id)}
            />
          ))}
        </div>
      </div>
    ) : null;

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
      {facing === "down" ? ritualStrip : null}
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
      {facing === "up" ? ritualStrip : null}
    </section>
  );
}

function RitualTile({
  card,
  absorbArmed,
  canActivate,
  onActivate,
  onAbsorb,
}: {
  card: CardInstance;
  absorbArmed: boolean;
  canActivate: boolean;
  onActivate: () => void;
  onAbsorb: () => void;
}) {
  const def = getCard(card.cardId);
  if (def === undefined) return null;

  const orientation = card.ritualOrientation ?? "—";
  const duration = ritualDurationOf(def);
  const durationLabel =
    duration === "continuous" ? "Continuous (stays)" : duration === "instant" ? "Leaves after activate" : null;
  const activeWhen = formatRequirementLine(def);
  const activateCost =
    def.ritual?.additionalEnergy !== undefined && def.ritual.additionalEnergy > 0
      ? `+${String(def.ritual.additionalEnergy)}E to activate`
      : null;
  const ready = card.ritualOrientation === "ready";
  const preparing = card.ritualOrientation === "preparing";
  const exhausted = card.ritualOrientation === "exhausted";
  const canReceive = absorbArmed && !exhausted && def.ritual?.activeWhen !== undefined;
  const progress = card.ritualProgress ?? {};
  const progressLine =
    def.ritual?.activeWhen !== undefined
      ? Object.entries(def.ritual.activeWhen)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(([attr, needed]) => `${attr} ${String(progress[attr as keyof typeof progress] ?? 0)}/${String(needed)}`)
          .join(" · ")
      : null;

  return (
    <div
      className={
        canReceive
          ? "group relative w-44 rounded border border-[var(--accent)] bg-stone-900 p-2.5"
          : ready
            ? "group relative w-44 rounded border border-[var(--accent)]/50 bg-stone-900 p-2.5"
            : preparing
              ? "group relative w-44 rounded border border-amber-800/50 bg-stone-950 p-2.5"
              : "group relative w-44 rounded border border-stone-700 bg-stone-950 p-2.5 opacity-80"
      }
    >
      <div
        className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-40 hidden w-64 -translate-x-1/2 rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl group-hover:block"
        role="tooltip"
      >
        <p className="text-sm font-medium text-stone-100">{def.name}</p>
        <p className="mt-1 text-xs text-stone-400">
          {formatEnergyCost(def)} Energy
          {activateCost !== null ? ` · ${activateCost}` : ""}
        </p>
        <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
          {orientation}
          {durationLabel !== null ? ` · ${durationLabel}` : ""}
        </p>
        {progressLine !== null && progressLine !== "" && (
          <p className="mt-1 text-xs text-amber-200/80">Progress: {progressLine}</p>
        )}
        <div className="mt-2 space-y-1 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
          <p>{formatTypeLine(def)}</p>
          <p className="text-stone-500">{formatForgeLine(def.forge)}</p>
          {formatEffectRegion(def).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {(def.ritual?.standingAbilities?.length ?? 0) > 0 && (
            <p className="text-stone-500">
              Standing: {String(def.ritual?.standingAbilities?.length)} trigger
              {(def.ritual?.standingAbilities?.length ?? 0) === 1 ? "" : "s"} while ready
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        className="w-full text-left"
        disabled={!canReceive}
        onClick={onAbsorb}
      >
        <p className="truncate text-sm font-medium text-stone-100">{def.name}</p>
        <p className="mt-0.5 text-[0.65rem] capitalize text-stone-500">
          {formatEnergyCost(def)}E · {def.subtypes.join("/") || "ritual"}
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
        {progressLine !== null && progressLine !== "" && (
          <p className="mt-0.5 truncate text-[0.6rem] text-amber-200/70">{progressLine}</p>
        )}
        {durationLabel !== null && (
          <p className="mt-0.5 text-[0.6rem] text-stone-600">{durationLabel}</p>
        )}
        {canReceive && (
          <p className="mt-1 text-[0.65rem] text-[var(--accent)]">Assign symbol</p>
        )}
      </button>
      <button
        type="button"
        className={`mt-2 w-full ${canActivate ? btnPrimary : `${btnClass} opacity-40`}`}
        disabled={!canActivate}
        onClick={onActivate}
      >
        Activate
      </button>
    </div>
  );
}

function attackDefinitionOf(
  state: GameState,
  attackerId: CreatureId,
  attackId: AttackId,
): AttackDefinition | undefined {
  const creature = state.creatures[attackerId];
  if (creature === undefined) return undefined;
  return getCreatureDefinition(creature.definitionId)?.attacks.find(
    (attack) => attack.id === attackId,
  );
}

function collectAttackArrows(
  state: GameState,
  intent: Intent,
): readonly { readonly from: CreatureId; readonly to: CreatureId }[] {
  const pairs: { from: CreatureId; to: CreatureId }[] = [];
  const seen = new Set<string>();
  const add = (from: CreatureId, to: CreatureId) => {
    const key = `${from}->${to}`;
    if (seen.has(key) || from === to) return;
    seen.add(key);
    pairs.push({ from, to });
  };

  for (const link of state.chainStack) {
    if (link.kind === "attack" && link.attackerId !== null && link.attackTargetId !== null) {
      add(link.attackerId, link.attackTargetId);
    }
  }

  if (intent.kind === "attack" && intent.attackId !== undefined) {
    const attack = attackDefinitionOf(state, intent.attackerId, intent.attackId);
    if (attack !== undefined) {
      for (const targetId of legalTargetsFor(state, intent.attackerId, attack)) {
        add(intent.attackerId, targetId);
      }
    }
  }

  return pairs;
}

type AttackArrowPair = { readonly from: CreatureId; readonly to: CreatureId };
type AttackArrowLine = { x1: number; y1: number; x2: number; y2: number };

function rectCenter(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function rectExit(rect: DOMRect, towardX: number, towardY: number): { x: number; y: number } {
  const center = rectCenter(rect);
  const dx = towardX - center.x;
  const dy = towardY - center.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return center;
  const nx = dx / length;
  const ny = dy / length;
  const tx = nx === 0 ? Number.POSITIVE_INFINITY : rect.width / 2 / Math.abs(nx);
  const ty = ny === 0 ? Number.POSITIVE_INFINITY : rect.height / 2 / Math.abs(ny);
  const t = Math.min(tx, ty);
  return { x: center.x + nx * t, y: center.y + ny * t };
}

function measureAttackArrows(pairs: readonly AttackArrowPair[]): AttackArrowLine[] {
  const lines: AttackArrowLine[] = [];
  for (const pair of pairs) {
    const fromEl = document.querySelector(`[data-creature-id="${CSS.escape(pair.from)}"]`);
    const toEl = document.querySelector(`[data-creature-id="${CSS.escape(pair.to)}"]`);
    if (!(fromEl instanceof HTMLElement) || !(toEl instanceof HTMLElement)) continue;
    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();
    const start = rectExit(from, rectCenter(to).x, rectCenter(to).y);
    const end = rectExit(to, rectCenter(from).x, rectCenter(from).y);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 12) continue;
    const pull = 6;
    lines.push({
      x1: Math.round(start.x),
      y1: Math.round(start.y),
      x2: Math.round(end.x - (dx / length) * pull),
      y2: Math.round(end.y - (dy / length) * pull),
    });
  }
  return lines;
}

function attackArrowLinesEqual(
  left: readonly AttackArrowLine[],
  right: readonly AttackArrowLine[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((line, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      line.x1 === other.x1 &&
      line.y1 === other.y1 &&
      line.x2 === other.x2 &&
      line.y2 === other.y2
    );
  });
}

function AttackArrowOverlay({ pairs }: { pairs: readonly AttackArrowPair[] }) {
  const markerId = useId().replaceAll(":", "");
  const [lines, setLines] = useState<readonly AttackArrowLine[]>([]);

  useLayoutEffect(() => {
    if (pairs.length === 0) {
      setLines([]);
      return;
    }
    let frame = 0;
    const tick = () => {
      const next = measureAttackArrows(pairs);
      setLines((prev) => (attackArrowLinesEqual(prev, next) ? prev : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pairs]);

  if (pairs.length === 0 || lines.length === 0) return null;

  return createPortal(
    <svg
      className="pointer-events-none fixed inset-0 z-[25] h-dvh w-dvw"
      aria-hidden="true"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0 0 L10 4 L0 8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {lines.map((line) => (
        <g key={`${String(line.x1)},${String(line.y1)}-${String(line.x2)},${String(line.y2)}`}>
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(15,13,11,0.7)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />
        </g>
      ))}
    </svg>,
    document.body,
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

const CREATURE_TOOLTIP_WIDTH_PX = 256; // w-64
const CREATURE_TOOLTIP_GAP_PX = 8;
const TOOLTIP_VIEW_MARGIN_PX = 8;

function clampTooltipLeft(left: number, width: number): number {
  const max = window.innerWidth - TOOLTIP_VIEW_MARGIN_PX - width;
  return Math.min(Math.max(left, TOOLTIP_VIEW_MARGIN_PX), Math.max(TOOLTIP_VIEW_MARGIN_PX, max));
}

/** Places a primary + aside tooltip pair above `anchor`, flipped/clamped so neither spills the viewport. */
function placeTooltipPair(
  anchor: DOMRect,
  tooltipWidth: number,
  gap: number,
): { readonly primaryLeft: number; readonly secondaryLeft: number; readonly bottom: number } {
  const primaryPreferred = anchor.left;
  const secondaryPreferred = primaryPreferred + tooltipWidth + gap;
  const fitsRight =
    secondaryPreferred + tooltipWidth <= window.innerWidth - TOOLTIP_VIEW_MARGIN_PX;

  const primaryLeft = clampTooltipLeft(
    fitsRight ? primaryPreferred : anchor.right - tooltipWidth,
    tooltipWidth,
  );
  const secondaryLeft = clampTooltipLeft(
    fitsRight ? secondaryPreferred : primaryLeft - gap - tooltipWidth,
    tooltipWidth,
  );

  return {
    primaryLeft,
    secondaryLeft,
    bottom: window.innerHeight - anchor.top + gap,
  };
}

function useAnchoredTooltipPair(
  hovered: boolean,
  rootRef: RefObject<HTMLElement | null>,
  tooltipWidth: number,
  gap: number,
) {
  const [pos, setPos] = useState<{
    readonly primaryLeft: number;
    readonly secondaryLeft: number;
    readonly bottom: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!hovered) {
      setPos(null);
      return;
    }
    const update = () => {
      const node = rootRef.current;
      if (node === null) return;
      setPos(placeTooltipPair(node.getBoundingClientRect(), tooltipWidth, gap));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [hovered, rootRef, tooltipWidth, gap]);

  return pos;
}

function CreatureTile({
  state,
  creature,
  intent,
  absorbArmed,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
}: {
  state: GameState;
  creature: CreatureState;
  intent: Intent;
  absorbArmed: boolean;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const pairPos = useAnchoredTooltipPair(
    hovered,
    rootRef,
    CREATURE_TOOLTIP_WIDTH_PX,
    CREATURE_TOOLTIP_GAP_PX,
  );

  const def = getCreatureDefinition(creature.definitionId);
  if (def === undefined) return null;
  const life = currentLife(creature);
  const selectedAttacker = intent.kind === "attack" && intent.attackerId === creature.id;
  const equipment = creature.equipmentIds.flatMap((id) => {
    const instance = state.cards[id];
    if (instance === undefined) return [];
    const cardDef = getCard(instance.cardId);
    if (cardDef === undefined) return [];
    return [{ instanceId: id, def: cardDef }];
  });

  return (
    <div
      ref={rootRef}
      data-creature-id={creature.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        selectedAttacker || absorbArmed
          ? "relative w-52 rounded border border-[var(--accent)] bg-stone-900 p-3"
          : "relative w-52 rounded border border-stone-700 bg-stone-950 p-3"
      }
    >
      {pairPos !== null &&
        createPortal(
          <>
            <div
              className="pointer-events-none fixed z-[60] w-64 rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl"
              style={{ left: pairPos.primaryLeft, bottom: pairPos.bottom }}
              role="tooltip"
            >
              <p className="text-sm font-medium text-stone-100">{def.name}</p>
              <p className="mt-1 text-xs text-stone-400">
                HP {life}/{def.life} · Shield {creature.shields}
                {creature.damagePreventBuffer > 0
                  ? ` · Prevent ${creature.damagePreventBuffer}`
                  : ""}
                {creature.nextAttackBonus > 0 ? ` · Next ATK +${creature.nextAttackBonus}` : ""} ·
                Toxin {creature.toxinMarkers}
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
              <div className="mt-2 space-y-2 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                {def.passiveRulesText !== "" && (
                  <p>
                    <span className="text-stone-500">Passive:</span> {def.passiveRulesText}
                  </p>
                )}
                {def.attacks.map((attack) => (
                  <p key={attack.id}>
                    <span className="text-stone-500">
                      {attack.kind === "basic" ? "Basic" : "Special"}:
                    </span>{" "}
                    {formatAttackLine(attack)}
                    {attack.range ? " (Range)" : ""}
                    {" · "}
                    <span className="text-[var(--accent)]">
                      [{formatAttackCost(attack.requires) || "—"}
                      {attack.discards !== undefined
                        ? `; discard ${formatAttackCost(attack.discards)}`
                        : ""}
                      ]
                    </span>
                  </p>
                ))}
              </div>
            </div>
            <div
              className="pointer-events-none fixed z-[60] w-64 rounded border border-amber-700/50 bg-stone-950 p-3 text-left shadow-xl"
              style={{ left: pairPos.secondaryLeft, bottom: pairPos.bottom }}
              role="tooltip"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                Equipment
              </p>
              {equipment.length === 0 ? (
                <p className="mt-2 text-[0.7rem] text-stone-500">None attached</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {equipment.map(({ instanceId, def: equipDef }) => (
                    <li
                      key={instanceId}
                      className="border-t border-stone-800 pt-2 first:border-0 first:pt-0"
                    >
                      <p className="text-sm font-medium text-stone-100">{equipDef.name}</p>
                      <p className="mt-0.5 text-[0.65rem] text-stone-500">
                        {formatEnergyCost(equipDef)}E · {formatTypeLine(equipDef)}
                      </p>
                      <pre className="mt-1 whitespace-pre-wrap font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                        {formatEffectRegion(equipDef).join("\n")}
                      </pre>
                      {(equipDef.equipment?.abilities.length ?? 0) > 0 && (
                        <p className="mt-1 text-[0.65rem] text-stone-500">
                          Standing: {String(equipDef.equipment?.abilities.length)} abilit
                          {(equipDef.equipment?.abilities.length ?? 0) === 1 ? "y" : "ies"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>,
          document.body,
        )}

      <button type="button" className="w-full text-left" onClick={() => onCreatureClick(creature)}>
        <p className="font-medium text-stone-100">{def.name}</p>
        <p className="mt-1 text-xs text-stone-400">
          HP {life}/{def.life} · Shield {creature.shields}
          {creature.damagePreventBuffer > 0
            ? ` · Prevent ${creature.damagePreventBuffer}`
            : ""}{" "}
          · Toxin {creature.toxinMarkers}
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
        {equipment.length > 0 && (
          <p className="mt-1 text-[0.65rem] text-amber-200/80">
            +{equipment.length} equipment
          </p>
        )}
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
const FACE_TOOLTIP_WIDTH_PX = 224; // w-56
const FACE_TOOLTIP_GAP_PX = 8;

function FaceCardTile({
  state,
  playerId,
  entry,
  hasRolled,
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
  const attached = overloadsOnFace(state, playerId, entry.faceCardId);

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        entry.showing
          ? "relative w-40 rounded border border-[var(--accent)] bg-[var(--accent)]/15 p-3"
          : hasRolled
            ? "relative w-40 rounded border border-stone-800 bg-stone-950/70 p-3 opacity-55"
            : "relative w-40 rounded border border-stone-700 bg-stone-950 p-3"
      }
    >
      {pairPos !== null &&
        createPortal(
          <>
            <div
              className="pointer-events-none fixed z-[60] w-56 rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl"
              style={{ left: pairPos.primaryLeft, bottom: pairPos.bottom }}
              role="tooltip"
            >
              <p className="text-sm font-medium text-stone-100">{face?.name ?? entry.faceCardId}</p>
              <pre className="mt-2 whitespace-pre-wrap font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                {tooltip}
              </pre>
            </div>
            <div
              className="pointer-events-none fixed z-[60] w-56 rounded border border-amber-700/50 bg-stone-950 p-3 text-left shadow-xl"
              style={{ left: pairPos.secondaryLeft, bottom: pairPos.bottom }}
              role="tooltip"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                Overloads
              </p>
              {attached.length === 0 ? (
                <p className="mt-2 text-[0.7rem] text-stone-500">None attached</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {attached.map((card) => {
                    const def = getCard(card.cardId);
                    const effects = def !== undefined ? formatEffectRegion(def) : ["(unknown card)"];
                    return (
                      <li
                        key={card.id}
                        className="border-t border-stone-800 pt-2 first:border-0 first:pt-0"
                      >
                        <p className="text-sm font-medium text-stone-100">{def?.name ?? card.cardId}</p>
                        {def !== undefined && (
                          <p className="mt-0.5 text-[0.65rem] text-stone-500">{formatTypeLine(def)}</p>
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
      {entry.overloads > 0 && (
        <p className="mt-1 text-[0.65rem] text-amber-200/80">
          +{entry.overloads} overload
        </p>
      )}
    </div>
  );
}

/** Shared face cards installed on this player's dice (one tile per unique face). */
function FaceCardsInPlay({
  state,
  playerId,
  label,
}: {
  state: GameState;
  playerId: PlayerId;
  label: string;
}) {
  const dice = diceOf(state, playerId);
  const faces = uniqueInstalledFaces(state, playerId);
  const hasRolled = dice.some((die) => die.rolledSlotIndex !== null);

  return (
    <section className="rounded-lg border border-stone-800 bg-black/25 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
        {hasRolled ? " · showing after roll" : " · shared across dice"}
      </h2>
      <div className="flex flex-wrap gap-3">
        {faces.map((entry) => (
          <FaceCardTile
            key={entry.faceCardId}
            state={state}
            playerId={playerId}
            entry={entry}
            hasRolled={hasRolled}
          />
        ))}
        {faces.length === 0 && <p className="text-sm text-stone-600">No faces installed</p>}
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
  onBack,
  backLabel,
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
  onCancel?: () => void;
  onBack?: () => void;
  backLabel?: string;
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
  const label = phase === "absorption" ? "Rolled (absorb)" : "Available pool (card requires)";

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

function BoardModal({
  title,
  subtitle,
  children,
  onDismiss,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (onDismiss === undefined) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id={titleId}
          className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]"
        >
          {title}
        </h2>
        {subtitle !== undefined && (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{subtitle}</p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

function TacticChoiceContent({
  def,
  fallbackId,
}: {
  def: ReturnType<typeof getCard>;
  fallbackId: string;
}) {
  if (def === undefined) {
    return <p className="text-sm font-medium text-stone-100">{fallbackId}</p>;
  }

  return (
    <>
      <p className="text-sm font-medium text-stone-100">{def.name}</p>
      <p className="text-xs text-stone-500">
        {def.variableEnergy === true ? "?" : def.energyCost}E · {def.subtypes.join("/")}
      </p>
      <p className="mt-1 text-[0.7rem] text-stone-400">{formatTypeLine(def)}</p>
      {formatEffectRegion(def).length > 0 && (
        <p className="mt-1 text-[0.7rem] leading-relaxed text-stone-400">
          {formatEffectRegion(def).join(" ")}
        </p>
      )}
    </>
  );
}

function FaceChoiceContent({ faceCardId }: { faceCardId: FaceCardId }) {
  const face = getFaceCard(faceCardId);
  if (face === undefined) {
    return <p className="text-sm font-medium text-stone-100">{faceCardId}</p>;
  }

  const kindLabel = face.kind === "natural" ? "Natural" : "Synthetic";

  return (
    <>
      <p className="text-sm font-medium text-stone-100">{face.name}</p>
      <p className="text-xs capitalize text-stone-500">
        {kindLabel} · {face.symbol}
        {face.maxOverloads > 0 ? ` · +${String(face.maxOverloads)} overload` : ""}
      </p>
      {face.rulesText !== "" && (
        <p className="mt-1 text-[0.7rem] leading-relaxed text-stone-400">{face.rulesText}</p>
      )}
    </>
  );
}

function DockPeekButton({
  label,
  count,
  open,
  ariaLabel,
  onOpen,
}: {
  label: string;
  count: number;
  open: boolean;
  ariaLabel: string;
  onOpen: () => void;
}) {
  return (
    <section
      className={
        open
          ? "flex min-h-[4.25rem] flex-1 flex-col rounded-lg border border-[var(--accent)] bg-black/30 p-2"
          : "flex min-h-[4.25rem] flex-1 flex-col rounded-lg border border-stone-800/80 bg-black/30 p-2"
      }
    >
      <button
        type="button"
        className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={onOpen}
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
          {label}
        </span>
        <span className="text-lg font-medium leading-none tabular-nums text-stone-100">
          {count}
        </span>
        <span className="text-[0.6rem] uppercase tracking-wide text-stone-500">View</span>
      </button>
    </section>
  );
}

function ZoneDocks({
  state,
  playerId,
}: {
  state: GameState;
  playerId: PlayerId;
}) {
  const [open, setOpen] = useState<"graveyard" | "faces" | null>(null);
  const gy = graveyardOf(state, playerId);
  const facePool = state.players[playerId]?.facePool ?? [];

  useEffect(() => {
    setOpen(null);
  }, [playerId]);

  return (
    <>
      <div className="flex w-[4.5rem] shrink-0 flex-col gap-2 self-stretch">
        <DockPeekButton
          label="GY"
          count={gy.length}
          open={open === "graveyard"}
          ariaLabel={`View graveyard (${String(gy.length)})`}
          onOpen={() => setOpen("graveyard")}
        />
        <DockPeekButton
          label="Faces"
          count={facePool.length}
          open={open === "faces"}
          ariaLabel={`View face deck (${String(facePool.length)})`}
          onOpen={() => setOpen("faces")}
        />
      </div>
      {open === "graveyard" && (
        <BoardModal
          title="Graveyard"
          subtitle={`${String(gy.length)} card${gy.length === 1 ? "" : "s"} in your graveyard.`}
          onDismiss={() => setOpen(null)}
        >
          <ul className="mt-4 space-y-2">
            {gy.map((card) => (
              <li
                key={card.id}
                className="rounded border border-stone-700 bg-stone-900 px-3 py-2"
              >
                <TacticChoiceContent def={getCard(card.cardId)} fallbackId={card.cardId} />
              </li>
            ))}
            {gy.length === 0 && (
              <li className="text-sm text-stone-500">Empty graveyard</li>
            )}
          </ul>
          <button type="button" className={`${btnClass} mt-4`} onClick={() => setOpen(null)}>
            Close
          </button>
        </BoardModal>
      )}
      {open === "faces" && (
        <BoardModal
          title="Face deck"
          subtitle={`${String(facePool.length)} card${facePool.length === 1 ? "" : "s"} left to forge onto a die.`}
          onDismiss={() => setOpen(null)}
        >
          <ul className="mt-4 space-y-2">
            {facePool.map((faceCardId, index) => (
              <li
                key={`${faceCardId}-${String(index)}`}
                className="rounded border border-stone-700 bg-stone-900 px-3 py-2"
              >
                <FaceChoiceContent faceCardId={faceCardId} />
              </li>
            ))}
            {facePool.length === 0 && (
              <li className="text-sm text-stone-500">No face cards left in your pool.</li>
            )}
          </ul>
          <button type="button" className={`${btnClass} mt-4`} onClick={() => setOpen(null)}>
            Close
          </button>
        </BoardModal>
      )}
    </>
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
  const scrollerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const placeTooltip = () => {
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
      const scroller = scrollerRef.current;
      if (scroller !== null) {
        const box = scroller.getBoundingClientRect();
        if (rect.bottom < box.top || rect.top > box.bottom) {
          setTooltipPos(null);
          return;
        }
      }
      setTooltipPos({
        left: Math.min(rect.left, window.innerWidth - 272),
        bottom: window.innerHeight - rect.top + 8,
      });
    };

    placeTooltip();
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    scroller.addEventListener("scroll", placeTooltip, { passive: true });
    return () => scroller.removeEventListener("scroll", placeTooltip);
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
      <div
        ref={scrollerRef}
        className="flex max-h-[7.25rem] flex-wrap gap-3 overflow-x-hidden overflow-y-auto overscroll-y-contain snap-y snap-mandatory"
      >
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
                  ? "h-[7.25rem] w-48 shrink-0 snap-start snap-always rounded border border-[var(--accent)] bg-stone-900 p-3"
                  : "h-[7.25rem] w-48 shrink-0 snap-start snap-always rounded border border-stone-700 bg-stone-950 p-3"
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
          An on-roll overload needs a target (this fired when the face was rolled). Pick a creature below or on the board.
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

function WaitingBanner({ children }: { children: string }) {
  return (
    <p className="rounded border border-stone-700 bg-stone-950/70 px-4 py-3 text-sm text-stone-300">
      {children}
    </p>
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
          Choose {amount} card{amount === 1 ? "" : "s"} from your hand to discard.
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
  kind,
  attribute,
  forgingCard,
  subtitle,
  onPick,
  onCancel,
}: {
  state: GameState;
  playerId: PlayerId;
  kind: FaceKind;
  attribute: SymbolType;
  forgingCard?: { readonly forgeTags?: readonly string[] };
  subtitle: string;
  onPick: (faceCardId: FaceCardId) => void;
  onCancel?: () => void;
}) {
  const eligible = eligibleFacesForForge(state, playerId, kind, attribute, forgingCard);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose face card
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{subtitle}</p>
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
        {onCancel !== undefined && (
          <button type="button" className={`${btnClass} mt-4`} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function ForgeFacesPrompt({
  state,
  pending,
  selectedFaceCardId,
  selectedDieId,
  selectedSlots,
  onPickFace,
  onClearFace,
  onSelectDie,
  onClearDie,
  onToggleSlot,
}: {
  state: GameState;
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "forge-faces" }>;
  selectedFaceCardId: FaceCardId | undefined;
  selectedDieId: DieId | undefined;
  selectedSlots: readonly number[];
  onPickFace: (faceCardId: FaceCardId) => void;
  onClearFace: () => void;
  onSelectDie: (dieId: DieId) => void;
  onClearDie: () => void;
  onToggleSlot: (slotIndex: number) => void;
}) {
  const dieOwnerId =
    pending.target === "own-die"
      ? pending.controllerId
      : opponentOf(state, pending.controllerId);
  const kindLabel = pending.kind === "natural" ? "Natural" : "Synthetic";
  const where =
    pending.target === "own-die" ? "one of your dice" : "one of the opponent's dice";
  const chosenFace = selectedFaceCardId !== undefined ? getFaceCard(selectedFaceCardId) : undefined;

  if (selectedFaceCardId === undefined) {
    return (
      <FacePickModal
        state={state}
        playerId={pending.controllerId}
        kind={pending.kind}
        attribute={pending.attribute}
        subtitle={`Choose a ${kindLabel} ${pending.attribute} face from your face pool. You will install it on ${where}; the card stays yours.`}
        onPick={onPickFace}
      />
    );
  }

  return (
    <DieSlotPickModal
      state={state}
      title={pending.target === "own-die" ? "Install on your die" : "Install on their die"}
      subtitle={`Install ${chosenFace?.name ?? selectedFaceCardId} from your pool (${String(pending.faces)} ${pending.faces === 1 ? "copy" : "copies"}) onto ${where}. Choose which of their faces to replace.`}
      dieOwnerId={dieOwnerId}
      facesNeeded={pending.faces}
      selectedDieId={selectedDieId}
      selectedSlots={selectedSlots}
      onSelectDie={onSelectDie}
      onClearDie={onClearDie}
      onToggleSlot={onToggleSlot}
      onBack={onClearFace}
      backLabel="Change face"
    />
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
  if (pending.type !== "search-deck" && pending.type !== "search-graveyard") return null;

  const options =
    pending.type === "search-deck"
      ? searchableInDeck(state, pending.controllerId, pending.filter)
      : searchableInGraveyard(state, pending.controllerId);

  const exact = mode === "deck";
  const canConfirm = exact
    ? pick.length === Math.min(amount, options.length)
    : pick.length <= amount;

  return (
    <BoardModal
      title={mode === "deck" ? "Search deck" : "Search graveyard"}
      subtitle={
        mode === "deck"
          ? `Pick ${String(amount)} card${amount === 1 ? "" : "s"} from your deck.`
          : `Pick up to ${String(amount)} card${amount === 1 ? "" : "s"} from your graveyard to return to hand.`
      }
    >
      <ul className="mt-4 space-y-2">
        {options.map((instanceId) => {
          const instance = state.cards[instanceId];
          const def = instance !== undefined ? getCard(instance.cardId) : undefined;
          const checked = pick.includes(instanceId);
          return (
            <li key={instanceId}>
              <button
                type="button"
                className={
                  checked
                    ? "w-full rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left"
                    : "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-stone-500"
                }
                disabled={!checked && pick.length >= amount}
                onClick={() => onToggle(instanceId)}
              >
                <TacticChoiceContent def={def} fallbackId={instanceId} />
              </button>
            </li>
          );
        })}
        {options.length === 0 && (
          <li className="text-sm text-red-300">No eligible cards.</li>
        )}
      </ul>
      <button
        type="button"
        className={`${btnPrimary} mt-4`}
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        Confirm ({String(pick.length)}/{String(amount)})
      </button>
    </BoardModal>
  );
}
