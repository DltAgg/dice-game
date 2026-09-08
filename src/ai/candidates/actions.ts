import {
  canAffordForge,
  canAffordPlay,
  canOvercharge,
  diceOf,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  handOf,
  hasPlayableEffect,
  isAttributeSymbol,
  isEnabledHandReaction,
  isEnabledRitualReaction,
  isUnabsorbedPoolSymbol,
  legalOverchargeFaces,
  legalTargetsFor,
  livingCreaturesOf,
  opponentOf,
  preferredSlotsForForgeFaces,
  resolveFaceForForge,
  ritualsOf,
  SHIELD,
  type CreatureId,
  type GameAction,
  type GameState,
  type PlayerId,
} from "@server";

function livingIds(state: GameState): readonly CreatureId[] {
  return Object.values(state.creatures)
    .filter((creature) => !creature.defeated)
    .map((creature) => creature.id);
}

function playCardIntents(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: ReturnType<typeof handOf>[number]["id"],
  definition: NonNullable<ReturnType<typeof getCard>>,
): readonly GameAction[] {
  if (definition.equipment !== undefined) {
    const hosts = definition.equipment.mayTargetOpponent
      ? livingCreaturesOf(state, opponentOf(state, playerId))
      : livingCreaturesOf(state, playerId);
    return hosts.map((creature) => ({
      type: "PLAY_CARD" as const,
      playerId,
      cardInstanceId,
      declaredTargetCreatureId: creature.id,
    }));
  }
  if (definition.overload !== undefined) {
    const actions: GameAction[] = [];
    for (const die of diceOf(state, playerId)) {
      for (const slot of die.slots) {
        actions.push({
          type: "PLAY_CARD",
          playerId,
          cardInstanceId,
          declaredFaceCardId: slot.faceCardId,
        });
      }
    }
    return actions;
  }
  if (definition.ritual !== undefined) {
    return [{ type: "PLAY_CARD", playerId, cardInstanceId }];
  }
  const actions: GameAction[] = [{ type: "PLAY_CARD", playerId, cardInstanceId }];
  for (const creatureId of livingIds(state)) {
    actions.push({
      type: "PLAY_CARD",
      playerId,
      cardInstanceId,
      declaredTargetCreatureId: creatureId,
    });
  }
  return actions;
}

function absorbIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const actions: GameAction[] = [];
  const allies = livingCreaturesOf(state, playerId);
  for (const symbol of Object.values(state.symbols)) {
    if (symbol.ownerId !== playerId || !isUnabsorbedPoolSymbol(symbol)) continue;
    if (isAttributeSymbol(symbol.symbol)) {
      actions.push({ type: "ABSORB_SYMBOL", playerId, symbolId: symbol.id });
      continue;
    }
    if (symbol.symbol !== SHIELD) continue;
    for (const creature of allies) {
      actions.push({
        type: "ABSORB_SYMBOL",
        playerId,
        symbolId: symbol.id,
        creatureId: creature.id,
      });
    }
  }
  return actions;
}

function attackIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const actions: GameAction[] = [];
  for (const creature of livingCreaturesOf(state, playerId)) {
    const definition = getCreatureDefinition(creature.definitionId);
    if (definition === undefined) continue;
    for (const attack of definition.attacks) {
      for (const targetId of legalTargetsFor(state, creature.id, attack)) {
        actions.push({
          type: "ATTACK",
          playerId,
          attackerId: creature.id,
          attackId: attack.id,
          targetId,
        });
      }
    }
  }
  return actions;
}

function forgeIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const actions: GameAction[] = [];
  for (const card of handOf(state, playerId)) {
    const definition = getCard(card.cardId);
    if (definition === undefined || !canAffordForge(state, playerId, definition)) continue;
    const faceCardId = resolveFaceForForge(
      state,
      playerId,
      definition.forge.kind,
      definition.forge.attribute,
      definition,
    );
    if (faceCardId === null) continue;
    const ownerId =
      definition.forge.target === "opponent-die" ? opponentOf(state, playerId) : playerId;
    for (const die of diceOf(state, ownerId)) {
      const slotIndexes = preferredSlotsForForgeFaces(
        die,
        definition.forge.attribute,
        definition.forge.faces,
        state.config,
      );
      if (slotIndexes === null) continue;
      actions.push({
        type: "FORGE_CARD",
        playerId,
        cardInstanceId: card.id,
        dieId: die.id,
        slotIndexes,
        faceCardId,
      });
    }
  }
  return actions;
}

function overchargeIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const faces = legalOverchargeFaces(state, playerId);
  const actions: GameAction[] = [];
  for (const card of handOf(state, playerId)) {
    if (!canOvercharge(state, playerId, card.id)) continue;
    for (const faceCardId of faces) {
      actions.push({
        type: "OVERCHARGE_CARD",
        playerId,
        cardInstanceId: card.id,
        faceCardId,
      });
    }
  }
  return actions;
}

function playIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const actions: GameAction[] = [];
  for (const card of handOf(state, playerId)) {
    const definition = getCard(card.cardId);
    if (definition === undefined || !hasPlayableEffect(definition)) continue;
    if (!canAffordPlay(state, playerId, definition)) continue;
    actions.push(...playCardIntents(state, playerId, card.id, definition));
  }
  return actions;
}

function ritualActivateIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const actions: GameAction[] = [];
  for (const card of ritualsOf(state, playerId)) {
    if (card.ritualOrientation !== "ready") continue;
    actions.push({ type: "ACTIVATE_RITUAL", playerId, cardInstanceId: card.id });
    for (const creatureId of livingIds(state)) {
      actions.push({
        type: "ACTIVATE_RITUAL",
        playerId,
        cardInstanceId: card.id,
        declaredTargetCreatureId: creatureId,
      });
    }
  }
  return actions;
}

function faceActivateIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const actions: GameAction[] = [];
  for (const die of diceOf(state, playerId)) {
    for (const slot of die.slots) {
      const face = getFaceCard(slot.faceCardId);
      if (face?.activated === undefined) continue;
      actions.push({
        type: "ACTIVATE_FACE",
        playerId,
        dieId: die.id,
        slotIndex: slot.index,
      });
    }
  }
  return actions;
}

function reactionIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const actions: GameAction[] = [];
  for (const card of handOf(state, playerId)) {
    const definition = getCard(card.cardId);
    if (definition === undefined || !isEnabledHandReaction(state, playerId, definition)) continue;
    actions.push(...playCardIntents(state, playerId, card.id, definition));
  }
  for (const card of ritualsOf(state, playerId)) {
    if (card.ritualOrientation !== "ready") continue;
    const definition = getCard(card.cardId);
    if (definition === undefined || !isEnabledRitualReaction(state, definition)) continue;
    actions.push({ type: "ACTIVATE_RITUAL", playerId, cardInstanceId: card.id });
  }
  return actions;
}

/** Intents for the turn player when no pending decision is open. */
export function turnCandidates(state: GameState, playerId: PlayerId): readonly GameAction[] {
  if (state.activePlayerId !== playerId) return [];
  if (state.phase === "roll") {
    return [{ type: "ROLL_DICE", playerId }];
  }
  return [
    ...absorbIntents(state, playerId),
    ...attackIntents(state, playerId),
    ...playIntents(state, playerId),
    ...forgeIntents(state, playerId),
    ...overchargeIntents(state, playerId),
    ...ritualActivateIntents(state, playerId),
    ...faceActivateIntents(state, playerId),
    { type: "END_TURN", playerId },
  ];
}

export function reactionWindowCandidates(
  state: GameState,
  playerId: PlayerId,
): readonly GameAction[] {
  return [...reactionIntents(state, playerId), { type: "PASS_PRIORITY", playerId }];
}
