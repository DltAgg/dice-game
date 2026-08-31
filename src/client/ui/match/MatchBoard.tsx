import { useEffect, useMemo, useRef, useState } from "react";
import {
  attackIsFuelled,
  basicAttackOf,
  canAbsorbSymbol,
  formatForgeLine,
  getCard,
  getCreatureDefinition,
  hasPlayableEffect,
  isAttributeSymbol,
  isEnabledHandReaction,
  isUnabsorbedPoolSymbol,
  hasLegalReactionOffer,
  legalCreaturesForFilter,
  legalTargetsFor,
  slotCannotBeReplacedByForge,
  TURN_PHASE_ORDER,
  type CardInstance,
  type CardInstanceId,
  type CreatureState,
  type DieId,
  type FaceCardId,
  type TurnPhase,
} from "@server";
import { MATCH_P1, MATCH_P2, useMatchStore } from "@client/store/matchStore";
import { autoPassPriorityAction } from "@client/store/autoPassPriority";
import { useDeckStore } from "@client/store/deckStore";
import { PROTOTYPE_SAVED_DECK_ID, validateSavedDeck } from "@client/decks";
import { actingPlayerIdOf, localSeatCanAct, localSeatIsPendingChooser, seatedAction } from "./seatGate";
import { AttackArrowOverlay } from "./board/AttackArrowOverlay";
import { Battlefield } from "./board/Battlefield";
import { ErrorSnackbar } from "./board/ErrorSnackbar";
import { FaceCardsInPlay } from "./board/FaceCardsInPlay";
import { HandStrip } from "./board/HandStrip";
import { PhaseBar } from "./board/PhaseBar";
import { SpectatorSeatDock } from "./board/SpectatorSeatDock";
import { SymbolPool } from "./board/SymbolPool";
import { ZoneDocks } from "./board/ZoneDocks";
import { collectAttackArrows, creatureHasArmedAttack } from "./intents/attack";
import { hintFor } from "./intents/hintFor";
import { selectedHandCardId, type Intent } from "./intents/types";
import { ChooseAttributeTokensModal } from "./modals/ChooseAttributeTokensModal";
import { ChooseCreatureModal } from "./modals/ChooseCreatureModal";
import { ChooseDieModal } from "./modals/ChooseDieModal";
import { ChooseDieSlotModal } from "./modals/ChooseDieSlotModal";
import { ChooseEquipmentModal } from "./modals/ChooseEquipmentModal";
import { ChoosePoolSymbolModal } from "./modals/ChoosePoolSymbolModal";
import { ChooseRitualModal } from "./modals/ChooseRitualModal";
import { ConvertSymbolsModal } from "./modals/ConvertSymbolsModal";
import { CopyPoolSymbolModal } from "./modals/CopyPoolSymbolModal";
import { DarkPactModal } from "./modals/DarkPactModal";
import { DiscardModal } from "./modals/DiscardModal";
import { FacePickModal } from "./modals/FacePickModal";
import { ForgeFacesPrompt } from "./modals/ForgeFacesPrompt";
import { ForgeSlotPick } from "./modals/ForgeSlotPick";
import { LookTopDeckModal } from "./modals/LookTopDeckModal";
import { MindControlModal } from "./modals/MindControlModal";
import { OptionalBonusAttackModal } from "./modals/OptionalBonusAttackModal";
import { OptionalOverchargeModal } from "./modals/OptionalOverchargeModal";
import { OptionalRerollModal } from "./modals/OptionalRerollModal";
import { OverchargeFacePick } from "./modals/OverchargeFacePick";
import { OverloadFacePickModal } from "./modals/OverloadFacePickModal";
import { PeekDeckModal } from "./modals/PeekDeckModal";
import { ReplaceSyntheticFacePrompt } from "./modals/ReplaceSyntheticFacePrompt";
import { ReplayGraveyardModal } from "./modals/ReplayGraveyardModal";
import { SearchPanel } from "./modals/SearchPanel";
import { SplitDamageModal } from "./modals/SplitDamageModal";
import { WaitingBanner } from "./modals/WaitingBanner";
import { btnClass } from "./styles";
import { ChainLinkHover } from "./tooltips/decisionSource";

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
  const [replaceSyntheticSlot, setReplaceSyntheticSlot] = useState<
    { readonly dieId: DieId; readonly slotIndex: number } | undefined
  >();
  const [handCollapsed, setHandCollapsed] = useState(false);
  const [autoPassHint, setAutoPassHint] = useState<string | null>(null);

  const activeId = state.activePlayerId;
  const finished = state.status === "finished";
  const pending = state.pendingDecision;
  const phase = state.phase;
  const isOnline = mode !== "local";
  const isSpectator = isOnline && localPlayerId === null;
  const actingId = actingPlayerIdOf(state);
  const canAct = localSeatCanAct(isOnline, localPlayerId, state);
  const isPendingChooser = localSeatIsPendingChooser(isOnline, localPlayerId, state);
  /** Hide priority chrome while the seat has nothing to Respond with (auto-pass). */
  const reactionPriorityLive =
    pending?.type === "reaction-priority" &&
    hasLegalReactionOffer(state, pending.priorityPlayerId);
  /** Bottom dock shows this seat's hand/pool — local seat online, priority/active in hotseat. Spectators see both. */
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
    setReplaceSyntheticSlot(undefined);
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
    const ok = dispatch(seatedAction(isOnline, localPlayerId, action));
    if (ok) clearIntent();
    return ok;
  };

  /** Auto-roll once per turn when the active seat enters the roll phase. */
  const autoRolledKey = useRef<string | null>(null);
  useEffect(() => {
    if (finished || pending !== null || phase !== "roll" || !canAct) return;
    if (isOnline && !onlineReady) return;
    if (isOnline && localPlayerId !== activeId) return;
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

  /** Auto-pass empty reaction windows for the local acting seat. */
  const autoPassedKey = useRef<string | null>(null);
  useEffect(() => {
    if (finished) return;
    if (isOnline && !onlineReady) return;
    if (pending?.type !== "reaction-priority") return;
    const action = autoPassPriorityAction({
      state,
      mode,
      localPlayerId,
      canAct,
    });
    if (action === null) return;
    const key = `${state.matchId}:${action.playerId}:${state.chainStack.map((link) => link.id).join(",")}:${String(pending.consecutivePasses)}`;
    if (autoPassedKey.current === key) return;
    autoPassedKey.current = key;
    dispatch(action);
    setAutoPassHint("No legal response — passed");
  }, [
    finished,
    isOnline,
    onlineReady,
    pending,
    state,
    mode,
    localPlayerId,
    canAct,
    dispatch,
  ]);

  useEffect(() => {
    if (autoPassHint === null) return;
    const id = window.setTimeout(() => setAutoPassHint(null), 2500);
    return () => window.clearTimeout(id);
  }, [autoPassHint]);

  useEffect(() => {
    if (intent.kind !== "absorb") return;
    const symbol = state.symbols[intent.symbolId];
    if (symbol === undefined || !isUnabsorbedPoolSymbol(symbol)) {
      setIntent({ kind: "idle" });
    }
  }, [intent, state.symbols]);

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
      if (isOnline && localPlayerId !== pending.controllerId) return;
      const legal = legalCreaturesForFilter(
        state,
        pending.controllerId,
        pending.filter,
        pending.deferred.sourceCreatureId,
      );
      if (!legal.includes(creature.id)) return;
      tryDispatch({
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: pending.controllerId,
        creatureId: creature.id,
      });
      return;
    }

    if (pending?.type === "optional-bonus-attack") {
      if (isOnline && localPlayerId !== pending.controllerId) return;
      const attacker = state.creatures[pending.creatureId];
      if (attacker === undefined) return;
      const def = getCreatureDefinition(attacker.definitionId);
      const basic = def !== undefined ? basicAttackOf(def) : undefined;
      if (basic === undefined) return;
      if (!attackIsFuelled(state.players[pending.controllerId]?.attributePool ?? {}, basic)) return;
      if (!legalTargetsFor(state, pending.creatureId, basic).includes(creature.id)) return;
      tryDispatch({
        type: "RESOLVE_OPTIONAL_BONUS_ATTACK",
        playerId: pending.controllerId,
        accept: true,
        attackId: basic.id,
        targetId: creature.id,
      });
      return;
    }

    if (pending !== null) return;
    if (!canAct) return;

    if (intent.kind === "absorb" && phase === "actions" && creature.ownerId === activeId) {
      const pip = state.symbols[intent.symbolId];
      // Attribute pips bank on select; only Shield still needs a creature target.
      if (pip === undefined || isAttributeSymbol(pip.symbol)) return;
      if (!canAbsorbSymbol(state, activeId, intent.symbolId, creature.id)) return;
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
      if (isOnline && localPlayerId !== pending.priorityPlayerId) return;
      const def = getCard(card.cardId);
      if (def === undefined || !isEnabledHandReaction(state, actingId, def)) return;
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
    if (finished || pending?.type !== "reaction-priority") return;
    if (!canAct) return;
    tryDispatch({ type: "PASS_PRIORITY", playerId: actingId });
  };

  const beginForgeOrOvercharge = (kind: "forge" | "overcharge", card: CardInstance) => {
    if (!canAct) return;
    if (card.ownerId !== activeId || finished || pending !== null || phase !== "actions") return;
    setIntent({ kind, cardInstanceId: card.id });
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
      ? `${state.winner} wins — opposing legendary defeated`
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
        <div className="fixed inset-x-0 top-14 z-40 border-b border-stone-800/80 bg-[var(--felt-deep)]/95 shadow-lg shadow-black/30 backdrop-blur" data-match-top-bar>
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
              ? "Share the room code from Play. Claim seats there — hosting does not put you in P1. The board opens when the room owner starts the match."
              : "Connecting to the host. You join as a spectator; claim P1 or P2 from Play if a seat is open."}
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
    <div className={`relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-28 sm:px-6 ${isSpectator ? "pb-[28rem] sm:pb-[32rem]" : "pb-96 sm:pb-[18rem]"}`}>
      <ErrorSnackbar error={lastError} onDismiss={clearError} />

      <div className="fixed inset-x-0 top-14 z-40 border-b border-stone-800/80 bg-[var(--felt-deep)]/95 shadow-lg shadow-black/30 backdrop-blur" data-match-top-bar>
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--ink)] sm:text-3xl">
              {isOnline
                ? isSpectator
                  ? mode === "host"
                    ? "Observing (host)"
                    : "Observing"
                  : mode === "host"
                    ? "Host match"
                    : "Online match"
                : "Local match"}
            </h1>
            <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
              {isOnline ? (
                <>
                  Room <span className="font-mono text-[var(--accent)]">{roomCode}</span>
                  {" · "}
                  {connectionStatus}
                  {" · you "}
                  <span className="text-[var(--accent)]">
                    {isSpectator ? "spectator" : localPlayerId}
                  </span>
                </>
              ) : (
                <>Hotseat</>
              )}
              {" · seed "}
              {seed} · turn {state.turn} · phase{" "}
              <span className="text-[var(--accent)]">{phase}</span> · active{" "}
              <span className="text-[var(--accent)]">{activeId}</span>
              {reactionPriorityLive ? (
                <>
                  {" · priority "}
                  <span className="text-[var(--accent)]">{pending.priorityPlayerId}</span>
                </>
              ) : null}
              {isSpectator ? " · observing" : !canAct && isOnline ? " · waiting for opponent" : null}
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
      {autoPassHint !== null && (
        <p className="text-xs text-amber-200/80">{autoPassHint}</p>
      )}

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
          sourceCreatureId={pending.deferred.sourceCreatureId}
          optional={pending.optional === true}
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

      {pending?.type === "choose-ritual" && isPendingChooser && (
        <ChooseRitualModal
          state={state}
          filter={pending.filter}
          controllerId={pending.controllerId}
          onPick={(cardInstanceId) =>
            tryDispatch({
              type: "RESOLVE_CHOOSE_RITUAL",
              playerId: pending.controllerId,
              cardInstanceId,
            })
          }
        />
      )}
      {pending?.type === "choose-ritual" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing a ritual.</WaitingBanner>
      )}

      {pending?.type === "choose-equipment" && isPendingChooser && (
        <ChooseEquipmentModal
          state={state}
          creatureId={pending.creatureId}
          onPick={(cardInstanceId) =>
            tryDispatch({
              type: "RESOLVE_CHOOSE_EQUIPMENT",
              playerId: pending.controllerId,
              cardInstanceId,
            })
          }
        />
      )}
      {pending?.type === "choose-equipment" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing equipment to destroy.</WaitingBanner>
      )}

      {pending?.type === "choose-attribute-tokens" && isPendingChooser && (
        <ChooseAttributeTokensModal
          state={state}
          pending={pending}
          onConfirm={(discarded) =>
            tryDispatch({
              type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS",
              playerId: pending.controllerId,
              discarded,
            })
          }
        />
      )}
      {pending?.type === "choose-attribute-tokens" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing pips from an attribute pile.</WaitingBanner>
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
            const slot = state.dice[forgeFacesDieId]?.slots[slotIndex];
            if (slot !== undefined && slotCannotBeReplacedByForge(slot)) return;
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
          onPickSingleSlot={(dieId, slotIndex) => {
            if (forgeFacesFaceId === undefined) return;
            tryDispatch({
              type: "RESOLVE_FORGE_FACES",
              playerId: pending.controllerId,
              dieId,
              slotIndexes: [slotIndex],
              faceCardId: forgeFacesFaceId,
            });
          }}
        />
      )}
      {pending?.type === "forge-faces" && !isPendingChooser && (
        <WaitingBanner>
          Opponent is choosing a face from their pool to install on your die.
        </WaitingBanner>
      )}

      {pending?.type === "replace-synthetic-face" && isPendingChooser && (
        <ReplaceSyntheticFacePrompt
          state={state}
          pending={pending}
          selectedSlot={replaceSyntheticSlot}
          onPickSlot={setReplaceSyntheticSlot}
          onClearSlot={() => setReplaceSyntheticSlot(undefined)}
          onPickFace={(faceCardId) => {
            if (replaceSyntheticSlot === undefined) return;
            tryDispatch({
              type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
              playerId: pending.controllerId,
              dieId: replaceSyntheticSlot.dieId,
              slotIndex: replaceSyntheticSlot.slotIndex,
              faceCardId,
            });
          }}
        />
      )}
      {pending?.type === "replace-synthetic-face" && !isPendingChooser && (
        <WaitingBanner>
          Opponent is replacing a Synthetic face on their die.
        </WaitingBanner>
      )}

      {pending?.type === "choose-die" && isPendingChooser && (
        <ChooseDieModal
          state={state}
          filter={pending.filter}
          controllerId={pending.controllerId}
          optional={pending.optional === true}
          onPick={(dieId) =>
            tryDispatch({
              type: "RESOLVE_CHOOSE_DIE",
              playerId: pending.controllerId,
              dieId,
            })
          }
        />
      )}
      {pending?.type === "choose-die" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing a die.</WaitingBanner>
      )}

      {pending?.type === "convert-symbols" && isPendingChooser && (
        <ConvertSymbolsModal
          state={state}
          amount={pending.amount}
          eligibleSymbolIds={pending.eligibleSymbolIds}
          onConfirm={(replacements) =>
            tryDispatch({
              type: "RESOLVE_CONVERT_SYMBOLS",
              playerId: pending.controllerId,
              replacements,
            })
          }
        />
      )}
      {pending?.type === "convert-symbols" && !isPendingChooser && (
        <WaitingBanner>Opponent is converting symbols.</WaitingBanner>
      )}

      {pending?.type === "copy-pool-symbol" && isPendingChooser && (
        <CopyPoolSymbolModal
          state={state}
          controllerId={pending.controllerId}
          onPick={(symbol) =>
            tryDispatch({
              type: "RESOLVE_COPY_POOL_SYMBOL",
              playerId: pending.controllerId,
              symbol,
            })
          }
        />
      )}
      {pending?.type === "copy-pool-symbol" && !isPendingChooser && (
        <WaitingBanner>Opponent is copying a pool symbol.</WaitingBanner>
      )}

      {pending?.type === "replay-graveyard-tactic" && isPendingChooser && (
        <ReplayGraveyardModal
          state={state}
          controllerId={pending.controllerId}
          onPick={(cardInstanceId) =>
            tryDispatch({
              type: "RESOLVE_REPLAY_GRAVEYARD",
              playerId: pending.controllerId,
              cardInstanceId,
            })
          }
        />
      )}
      {pending?.type === "replay-graveyard-tactic" && !isPendingChooser && (
        <WaitingBanner>Opponent is replaying a graveyard tactic.</WaitingBanner>
      )}

      {pending?.type === "look-top-deck" && isPendingChooser && (
        <LookTopDeckModal
          state={state}
          cardInstanceIds={pending.cardInstanceIds}
          onKeep={(keepId) =>
            tryDispatch({
              type: "RESOLVE_LOOK_TOP_DECK",
              playerId: pending.controllerId,
              keepId,
            })
          }
        />
      )}
      {pending?.type === "look-top-deck" && !isPendingChooser && (
        <WaitingBanner>Opponent is looking at the top of their deck.</WaitingBanner>
      )}

      {pending?.type === "peek-deck" && isPendingChooser && (
        <PeekDeckModal
          state={state}
          cardInstanceId={pending.cardInstanceId}
          onResolve={(putOnBottom) =>
            tryDispatch({
              type: "RESOLVE_PEEK_DECK",
              playerId: pending.controllerId,
              putOnBottom,
            })
          }
        />
      )}
      {pending?.type === "peek-deck" && !isPendingChooser && (
        <WaitingBanner>Opponent is peeking at their deck.</WaitingBanner>
      )}

      {pending?.type === "dark-pact" && isPendingChooser && (
        <DarkPactModal
          state={state}
          controllerId={pending.controllerId}
          onConfirm={(cardInstanceIds) =>
            tryDispatch({
              type: "RESOLVE_DARK_PACT",
              playerId: pending.controllerId,
              cardInstanceIds,
            })
          }
        />
      )}
      {pending?.type === "dark-pact" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing rituals for Dark Pact.</WaitingBanner>
      )}

      {pending?.type === "mind-control" && isPendingChooser && (
        <MindControlModal
          state={state}
          controllerId={pending.controllerId}
          onConfirm={(mode, faceCardIds, overloadInstanceIds) =>
            tryDispatch({
              type: "RESOLVE_MIND_CONTROL",
              playerId: pending.controllerId,
              mode,
              faceCardIds,
              ...(overloadInstanceIds !== undefined ? { overloadInstanceIds } : {}),
            })
          }
        />
      )}
      {pending?.type === "mind-control" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing faces for Mind Control.</WaitingBanner>
      )}

      {pending?.type === "split-damage" && isPendingChooser && (
        <SplitDamageModal
          state={state}
          pending={pending}
          onConfirm={(assignments) =>
            tryDispatch({
              type: "RESOLVE_SPLIT_DAMAGE",
              playerId: pending.controllerId,
              assignments,
            })
          }
        />
      )}
      {pending?.type === "split-damage" && !isPendingChooser && (
        <WaitingBanner>Opponent is assigning split damage.</WaitingBanner>
      )}

      {pending?.type === "optional-reroll" && isPendingChooser && (
        <OptionalRerollModal
          state={state}
          dieId={pending.dieId}
          faceCardId={pending.faceCardId}
          onResolve={(accept) =>
            tryDispatch({
              type: "RESOLVE_OPTIONAL_REROLL",
              playerId: pending.controllerId,
              accept,
            })
          }
        />
      )}
      {pending?.type === "optional-reroll" && !isPendingChooser && (
        <WaitingBanner>Opponent is deciding whether to reroll.</WaitingBanner>
      )}

      {pending?.type === "choose-die-slot" && isPendingChooser && (
        <ChooseDieSlotModal
          state={state}
          filter={pending.filter}
          controllerId={pending.controllerId}
          optional={pending.optional === true}
          {...(pending.contextDieId !== undefined
            ? { contextDieId: pending.contextDieId }
            : {})}
          {...(pending.excludedSlotIndex !== undefined
            ? { excludedSlotIndex: pending.excludedSlotIndex }
            : {})}
          onPick={(dieId, slotIndex) =>
            tryDispatch({
              type: "RESOLVE_CHOOSE_DIE_SLOT",
              playerId: pending.controllerId,
              dieId,
              slotIndex,
            })
          }
        />
      )}
      {pending?.type === "choose-die-slot" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing a die face.</WaitingBanner>
      )}

      {pending?.type === "choose-pool-symbol" && isPendingChooser && (
        <ChoosePoolSymbolModal
          state={state}
          eligibleSymbolIds={pending.eligibleSymbolIds}
          onPick={(symbolId) =>
            tryDispatch({
              type: "RESOLVE_CHOOSE_POOL_SYMBOL",
              playerId: pending.controllerId,
              symbolId,
            })
          }
        />
      )}
      {pending?.type === "choose-pool-symbol" && !isPendingChooser && (
        <WaitingBanner>Opponent is choosing a pool symbol.</WaitingBanner>
      )}

      {pending?.type === "optional-overcharge" && isPendingChooser && (
        <OptionalOverchargeModal
          state={state}
          amount={pending.amount}
          dieId={pending.dieId}
          slotIndex={pending.slotIndex}
          onResolve={(accept) =>
            tryDispatch({
              type: "RESOLVE_OPTIONAL_OVERCHARGE",
              playerId: pending.controllerId,
              accept,
            })
          }
        />
      )}
      {pending?.type === "optional-overcharge" && !isPendingChooser && (
        <WaitingBanner>Opponent is deciding whether to accept an extra symbol.</WaitingBanner>
      )}

      {pending?.type === "optional-bonus-attack" && isPendingChooser && (
        <OptionalBonusAttackModal
          state={state}
          creatureId={pending.creatureId}
          onDecline={() =>
            tryDispatch({
              type: "RESOLVE_OPTIONAL_BONUS_ATTACK",
              playerId: pending.controllerId,
              accept: false,
            })
          }
          onAttack={(attackId, targetId) =>
            tryDispatch({
              type: "RESOLVE_OPTIONAL_BONUS_ATTACK",
              playerId: pending.controllerId,
              accept: true,
              attackId,
              targetId,
            })
          }
        />
      )}
      {pending?.type === "optional-bonus-attack" && !isPendingChooser && (
        <WaitingBanner>Opponent may declare a bonus basic attack.</WaitingBanner>
      )}

      {reactionPriorityLive && !isPendingChooser && (
        <WaitingBanner>
          {`${pending.priorityPlayerId} holds reaction priority — they may respond or Pass.`}
        </WaitingBanner>
      )}

      {intent.kind === "forge" && (
        <ForgeSlotPick
          state={state}
          activeId={activeId}
          intent={intent}
          onUpdate={setIntent}
          onCancel={clearIntent}
        />
      )}
      {intent.kind === "overcharge" && (
        <OverchargeFacePick
          state={state}
          playerId={activeId}
          cardInstanceId={intent.cardInstanceId}
          onPick={(faceCardId) =>
            tryDispatch({
              type: "OVERCHARGE_CARD",
              playerId: activeId,
              cardInstanceId: intent.cardInstanceId,
              faceCardId,
            })
          }
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
          sourceCard={forgeDef}
          subtitle={`${forgeDef.name} forges ${formatForgeLine(forgeDef.forge)}. Pick a face from your face pool (or an already-installed copy) to represent it.`}
          onPick={confirmForgeFace}
          onCancel={clearIntent}
        />
      )}

      {/* Field (≥70%) + faces (≤30%). Phase bar spans full width between seats. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,30%)] items-stretch gap-x-3 gap-y-4">
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
          actingPlayerId={actingId}
          canAct={canAct}
          onRitualActivate={(id) =>
            tryDispatch({ type: "ACTIVATE_RITUAL", playerId: actingId, cardInstanceId: id })
          }
        />
        <FaceCardsInPlay
          state={state}
          playerId={MATCH_P2}
          label="P2 face cards"
          facing="down"
          actingPlayerId={actingId}
          canAct={canAct}
          onActivateFace={(dieId, slotIndex) =>
            tryDispatch({
              type: "ACTIVATE_FACE",
              playerId: actingId,
              dieId,
              slotIndex,
            })
          }
        />

        <div className="col-span-2 min-w-0">
          <PhaseBar
            state={state}
            canAct={canAct}
            onGoToPhase={goToPhase}
            onEndTurn={endTurn}
          />
        </div>

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
          actingPlayerId={actingId}
          canAct={canAct}
          onRitualActivate={(id) =>
            tryDispatch({ type: "ACTIVATE_RITUAL", playerId: actingId, cardInstanceId: id })
          }
        />
        <FaceCardsInPlay
          state={state}
          playerId={MATCH_P1}
          label="P1 face cards"
          facing="up"
          actingPlayerId={actingId}
          canAct={canAct}
          onActivateFace={(dieId, slotIndex) =>
            tryDispatch({
              type: "ACTIVATE_FACE",
              playerId: actingId,
              dieId,
              slotIndex,
            })
          }
        />
      </div>
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
          {isSpectator ? (
            <>
              {reactionPriorityLive && (
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
                  <span className="text-xs text-amber-200/70">Observing — cannot pass</span>
                </div>
              )}
              <div
                id="match-hand-dock"
                className={handCollapsed ? "hidden" : "flex flex-col gap-3"}
              >
                <SpectatorSeatDock
                  state={state}
                  playerId={MATCH_P2}
                  phase={phase}
                  pendingReaction={reactionPriorityLive}
                />
                <SpectatorSeatDock
                  state={state}
                  playerId={MATCH_P1}
                  phase={phase}
                  pendingReaction={reactionPriorityLive}
                />
              </div>
            </>
          ) : (
            <>
          <SymbolPool
            state={state}
            playerId={dockPlayerId}
            phase={phase}
            selected={intent.kind === "absorb" ? intent.symbolId : null}
            onSelect={(symbolId) => {
              if (!canAct || phase !== "actions") return;
              const pip = state.symbols[symbolId];
              if (pip === undefined) return;
              if (isAttributeSymbol(pip.symbol)) {
                if (!canAbsorbSymbol(state, activeId, symbolId)) return;
                tryDispatch({
                  type: "ABSORB_SYMBOL",
                  playerId: activeId,
                  symbolId,
                });
                return;
              }
              // Shield: arm absorb, then click a living owned creature.
              setIntent({ kind: "absorb", symbolId });
            }}
          />

          {reactionPriorityLive && (
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
                reactionWindow={reactionPriorityLive}
                selected={selectedHandCardId(intent)}
                onPlay={beginPlay}
                onForge={(card) => beginForgeOrOvercharge("forge", card)}
                onOvercharge={(card) => beginForgeOrOvercharge("overcharge", card)}
                onCancel={clearIntent}
              />
            </div>
            <ZoneDocks state={state} playerId={dockPlayerId} />
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
