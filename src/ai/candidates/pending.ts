import {
  collectLegalBounceCards,
  collectLegalSilenceHosts,
  diceOf,
  discardTokensInAttributeOrder,
  eligiblePoolFacesForReforge,
  equipmentOf,
  getCard,
  isLegalReforgeAssignment,
  legalCreaturesForFilter,
  legalDiceForFilter,
  legalDieSlotsForFilter,
  legalSlotsForReplaceSyntheticFace,
  livingCreaturesOf,
  opponentOf,
  overloadsOf,
  preferredSlotsForForgeFaces,
  replayableGraveyardTactics,
  resolveFaceForForge,
  ritualsOf,
  searchableInDeck,
  searchableInGraveyard,
  type DieId,
  type GameAction,
  type GameState,
  type PlayerId,
} from "@server";

function prefix<T>(items: readonly T[], amount: number): readonly T[] {
  return items.slice(0, Math.max(0, amount));
}

/**
 * One or a few resolve intents for the current pending decision. Probe later;
 * this only names plausible choices from public queries.
 */
export function pendingCandidates(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const pending = state.pendingDecision;
  if (pending === null) return [];

  if (pending.type === "reaction-priority") {
    if (pending.priorityPlayerId !== playerId) return [];
    return [{ type: "PASS_PRIORITY", playerId }];
  }

  if (pending.controllerId !== playerId) return [];

  switch (pending.type) {
    case "search-deck":
      return [
        {
          type: "RESOLVE_SEARCH",
          playerId,
          cardInstanceIds: prefix(
            searchableInDeck(state, playerId, pending.filter),
            pending.amount,
          ),
        },
      ];
    case "search-graveyard":
      return [
        {
          type: "RESOLVE_SEARCH",
          playerId,
          cardInstanceIds: prefix(
            searchableInGraveyard(state, playerId, pending.maxPlayCost),
            pending.amount,
          ),
        },
      ];
    case "discard-cards": {
      const hand = state.players[playerId]?.hand ?? [];
      const actions: GameAction[] = [
        { type: "RESOLVE_DISCARD", playerId, cardInstanceIds: prefix(hand, pending.amount) },
      ];
      if (pending.optional === true) {
        actions.push({ type: "RESOLVE_DISCARD", playerId, cardInstanceIds: [] });
      }
      return actions;
    }
    case "choose-creature": {
      const legal = legalCreaturesForFilter(
        state,
        playerId,
        pending.filter,
        pending.deferred.sourceCreatureId,
      );
      const actions: GameAction[] = [];
      const first = legal[0];
      if (first !== undefined) {
        actions.push({ type: "RESOLVE_CHOOSE_CREATURE", playerId, creatureId: first });
      }
      if (pending.optional === true) {
        actions.push({ type: "RESOLVE_CHOOSE_CREATURE", playerId, creatureId: null });
      }
      return actions;
    }
    case "choose-ritual": {
      const ownerId = opponentOf(state, playerId);
      return ritualsOf(state, ownerId).map((card) => ({
        type: "RESOLVE_CHOOSE_RITUAL" as const,
        playerId,
        cardInstanceId: card.id,
      }));
    }
    case "choose-equipment": {
      const ids =
        pending.filter === "opponent"
          ? equipmentOf(state, opponentOf(state, playerId)).map((card) => card.id)
          : pending.creatureId !== null
            ? (state.creatures[pending.creatureId]?.equipmentIds ?? [])
            : [];
      return ids.map((cardInstanceId) => ({
        type: "RESOLVE_CHOOSE_EQUIPMENT" as const,
        playerId,
        cardInstanceId,
      }));
    }
    case "choose-overload":
      return overloadsOf(state, opponentOf(state, playerId)).map((card) => ({
        type: "RESOLVE_CHOOSE_OVERLOAD" as const,
        playerId,
        cardInstanceId: card.id,
      }));
    case "choose-attribute-tokens": {
      const ownerId = state.creatures[pending.creatureId]?.ownerId;
      const tokens = (ownerId === undefined ? {} : state.players[ownerId]?.attributePool) ?? {};
      const { discarded } = discardTokensInAttributeOrder(tokens, pending.amount);
      return [{ type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS", playerId, discarded }];
    }
    case "forge-faces": {
      const ownerId =
        pending.target === "own-die" ? playerId : opponentOf(state, playerId);
      const faceCardId = resolveFaceForForge(
        state,
        playerId,
        pending.kind,
        pending.attribute,
      );
      if (faceCardId === null) return [];
      const actions: GameAction[] = [];
      for (const die of diceOf(state, ownerId)) {
        const slotIndexes = preferredSlotsForForgeFaces(
          die,
          pending.attribute,
          pending.faces,
          state.config,
        );
        if (slotIndexes === null) continue;
        actions.push({
          type: "RESOLVE_FORGE_FACES",
          playerId,
          dieId: die.id,
          slotIndexes,
          faceCardId,
        });
      }
      return actions;
    }
    case "replace-synthetic-face": {
      const spec = {
        faces: pending.faces,
        attribute: pending.attribute,
        ...(pending.fromAttribute === undefined ? {} : { fromAttribute: pending.fromAttribute }),
      };
      const pool = prefix(
        eligiblePoolFacesForReforge(state, playerId, pending.attribute),
        pending.faces,
      );
      if (pool.length < pending.faces) return [];
      const slots = legalSlotsForReplaceSyntheticFace(state, playerId, spec);
      const byDie = new Map<DieId, number[]>();
      for (const slot of slots) {
        const indexes = byDie.get(slot.dieId) ?? [];
        indexes.push(slot.slotIndex);
        byDie.set(slot.dieId, indexes);
      }
      const actions: GameAction[] = [];
      for (const [dieId, indexes] of byDie) {
        if (indexes.length < pending.faces) continue;
        const slotIndexes = indexes.slice(0, pending.faces);
        if (!isLegalReforgeAssignment(state, playerId, spec, dieId, slotIndexes, pool)) {
          continue;
        }
        actions.push({
          type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
          playerId,
          dieId,
          slotIndexes,
          faceCardIds: pool,
        });
      }
      return actions;
    }
    case "choose-effect-mode":
      return pending.modes.map((_, modeIndex) => ({
        type: "RESOLVE_CHOOSE_EFFECT_MODE" as const,
        playerId,
        modeIndex,
      }));
    case "choose-die": {
      const legal = legalDiceForFilter(state, playerId, pending.filter);
      const actions: GameAction[] = legal.map((dieId) => ({
        type: "RESOLVE_CHOOSE_DIE" as const,
        playerId,
        dieId,
      }));
      if (pending.optional === true) {
        actions.push({ type: "RESOLVE_CHOOSE_DIE", playerId, dieId: null });
      }
      return actions;
    }
    case "convert-symbols":
      return [{ type: "RESOLVE_CONVERT_SYMBOLS", playerId, replacements: [] }];
    case "copy-pool-symbol": {
      const symbol = Object.values(state.symbols).find(
        (candidate) =>
          candidate.ownerId === playerId &&
          (candidate.status === "rolled" || candidate.status === "available"),
      )?.symbol;
      return symbol === undefined
        ? []
        : [{ type: "RESOLVE_COPY_POOL_SYMBOL", playerId, symbol }];
    }
    case "replay-graveyard-tactic":
      return replayableGraveyardTactics(state, playerId, pending.sourceCardInstanceId).map(
        (cardInstanceId) => ({
          type: "RESOLVE_REPLAY_GRAVEYARD" as const,
          playerId,
          cardInstanceId,
        }),
      );
    case "look-top-deck": {
      const keepId = pending.cardInstanceIds[0];
      return keepId === undefined
        ? []
        : [{ type: "RESOLVE_LOOK_TOP_DECK", playerId, keepId }];
    }
    case "peek-deck":
      return [
        { type: "RESOLVE_PEEK_DECK", playerId, putOnBottom: false },
        { type: "RESOLVE_PEEK_DECK", playerId, putOnBottom: true },
      ];
    case "dark-pact": {
      const deck = state.players[playerId]?.deck ?? [];
      const rituals = deck.flatMap((id) => {
        const card = state.cards[id];
        const definition = card === undefined ? undefined : getCard(card.cardId);
        return definition?.type === "ritual" ? [{ id, attribute: definition.attribute }] : [];
      });
      const first = rituals[0];
      const second = rituals.find((candidate) => candidate.attribute !== first?.attribute);
      if (first === undefined || second === undefined) return [];
      return [
        {
          type: "RESOLVE_DARK_PACT",
          playerId,
          cardInstanceIds: [first.id, second.id],
        },
      ];
    }
    case "mind-control": {
      const opponentId = opponentOf(state, playerId);
      const faceCardIds: GameAction[] = [];
      for (const die of diceOf(state, opponentId)) {
        for (const slot of die.slots) {
          const has = Object.values(state.cards).some(
            (card) => card.zone === "overload" && card.attachedToFaceCardId === slot.faceCardId,
          );
          if (!has) continue;
          faceCardIds.push({
            type: "RESOLVE_MIND_CONTROL",
            playerId,
            mode: "strip-one-face",
            faceCardIds: [slot.faceCardId],
          });
        }
      }
      return faceCardIds;
    }
    case "split-damage": {
      const opponentId = opponentOf(state, playerId);
      const targetId = livingCreaturesOf(state, opponentId)[0]?.id;
      return targetId === undefined
        ? []
        : [
            {
              type: "RESOLVE_SPLIT_DAMAGE",
              playerId,
              assignments: [{ creatureId: targetId, amount: pending.amount }],
            },
          ];
    }
    case "optional-reroll":
      return [
        { type: "RESOLVE_OPTIONAL_REROLL", playerId, accept: false },
        { type: "RESOLVE_OPTIONAL_REROLL", playerId, accept: true },
      ];
    case "choose-die-slot": {
      const legal = legalDieSlotsForFilter(state, playerId, pending.filter, {
        ...(pending.contextDieId === undefined ? {} : { contextDieId: pending.contextDieId }),
        ...(pending.excludedSlotIndex === undefined
          ? {}
          : { excludedSlotIndex: pending.excludedSlotIndex }),
      });
      const actions: GameAction[] = legal.map((slot) => ({
        type: "RESOLVE_CHOOSE_DIE_SLOT" as const,
        playerId,
        dieId: slot.dieId,
        slotIndex: slot.slotIndex,
      }));
      if (pending.optional === true) {
        actions.push({
          type: "RESOLVE_CHOOSE_DIE_SLOT",
          playerId,
          dieId: null,
          slotIndex: null,
        });
      }
      return actions;
    }
    case "choose-pool-symbol":
      return pending.eligibleSymbolIds.map((symbolId) => ({
        type: "RESOLVE_CHOOSE_POOL_SYMBOL" as const,
        playerId,
        symbolId,
      }));
    case "optional-overcharge":
      return [
        { type: "RESOLVE_OPTIONAL_OVERCHARGE", playerId, accept: false },
        { type: "RESOLVE_OPTIONAL_OVERCHARGE", playerId, accept: true },
      ];
    case "optional-bonus-attack":
      return [{ type: "RESOLVE_OPTIONAL_BONUS_ATTACK", playerId, accept: false }];
    case "choose-silence-host":
      return collectLegalSilenceHosts(state, playerId, pending.hosts).map((choice) => ({
        type: "RESOLVE_CHOOSE_SILENCE_HOST" as const,
        playerId,
        choice,
      }));
    case "choose-bounce-card":
      return collectLegalBounceCards(state, playerId, pending.hosts).map((choice) => ({
        type: "RESOLVE_CHOOSE_BOUNCE_CARD" as const,
        playerId,
        choice,
      }));
    default: {
      const _never: never = pending;
      return _never;
    }
  }
}
