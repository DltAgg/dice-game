import type { CardDuration, CardType } from "../model/cards.js";
import type { EffectDefinition } from "../model/effects.js";
import type {
  AttackId,
  CardInstanceId,
  CreatureId,
  FaceCardId,
  PlayerId,
} from "../model/ids.js";
import { asEffectInstanceId } from "../model/ids.js";
import type { ChainLink, ChainLinkKind } from "../model/state.js";
import { getCard } from "../content/cards.js";
import { opponentOf } from "../rules/creatures.js";
import { emit, nextInstanceId, type Draft } from "./draft.js";

/** Card-sourced chain kinds may be negated; attacks use prevent (`009`). */
export const isNegatableLinkKind = (kind: ChainLinkKind): boolean => kind !== "attack";

/**
 * Whether `negate-card` may target this link: not attack, not already negated,
 * and the source card's main type is allowed (`"any"` = any card link).
 * Forge never opens a chain link, so it is out of scope here.
 */
export function linkMatchesNegateCard(
  draft: Draft,
  link: ChainLink,
  cardTypes: readonly CardType[] | "any",
): boolean {
  if (link.negated || !isNegatableLinkKind(link.kind)) return false;
  if (cardTypes === "any") return true;
  if (link.cardInstanceId === null) return false;
  const instance = draft.cards[link.cardInstanceId];
  if (instance === undefined) return false;
  const definition = getCard(instance.cardId);
  if (definition === undefined) return false;
  return cardTypes.includes(definition.type);
}
export function topChainLink(draft: Draft): ChainLink | undefined {
  return draft.chainStack[draft.chainStack.length - 1];
}

export function cardCommittedToChain(draft: Draft, cardInstanceId: CardInstanceId): boolean {
  return draft.chainStack.some((link) => link.cardInstanceId === cardInstanceId);
}

export function openReactionWindow(draft: Draft, afterControllerId: PlayerId): void {
  const priorityPlayerId = opponentOf(draft, afterControllerId);
  draft.pendingDecision = {
    type: "reaction-priority",
    priorityPlayerId,
    consecutivePasses: 0,
  };
  emit(draft, {
    type: "reaction-priority-opened",
    priorityPlayerId,
  });
}

export function pushChainLink(
  draft: Draft,
  link: Omit<ChainLink, "id" | "negated"> & { readonly negated?: boolean },
): ChainLink {
  const full: ChainLink = {
    ...link,
    id: asEffectInstanceId(nextInstanceId(draft, "chain")),
    negated: link.negated ?? false,
  };
  draft.chainStack.push(full);
  emit(draft, {
    type: "chain-link-added",
    linkId: full.id,
    kind: full.kind,
    controllerId: full.controllerId,
  });
  return full;
}

export function noteDeferredTurnEnd(draft: Draft, playerId: PlayerId, turnEnds: boolean): void {
  if (turnEnds) {
    draft.deferredTurnEndPlayerId = playerId;
  }
}

export function buildEffectLink(args: {
  readonly kind: "tactic-effect" | "ritual-activate";
  readonly controllerId: PlayerId;
  readonly cardInstanceId: CardInstanceId | null;
  readonly effects: readonly EffectDefinition[];
  readonly sourceCreatureId: CreatureId | null;
  readonly declaredTargetCreatureId: CreatureId | null;
  readonly ritualDuration?: CardDuration | null;
}): Omit<ChainLink, "id" | "negated"> {
  return {
    kind: args.kind,
    controllerId: args.controllerId,
    cardInstanceId: args.cardInstanceId,
    effects: args.effects,
    sourceCreatureId: args.sourceCreatureId,
    declaredTargetCreatureId: args.declaredTargetCreatureId,
    equipTargetCreatureId: null,
    overloadFaceCardId: null,
    attackerId: null,
    attackId: null,
    attackTargetId: null,
    attackEffect: null,
    ritualDuration: args.ritualDuration ?? null,
  };
}

export function buildRitualPlaceLink(args: {
  readonly controllerId: PlayerId;
  readonly cardInstanceId: CardInstanceId;
}): Omit<ChainLink, "id" | "negated"> {
  return {
    kind: "ritual-place",
    controllerId: args.controllerId,
    cardInstanceId: args.cardInstanceId,
    effects: [],
    sourceCreatureId: null,
    declaredTargetCreatureId: null,
    equipTargetCreatureId: null,
    overloadFaceCardId: null,
    attackerId: null,
    attackId: null,
    attackTargetId: null,
    attackEffect: null,
    ritualDuration: null,
  };
}

export function buildEquipLink(args: {
  readonly controllerId: PlayerId;
  readonly cardInstanceId: CardInstanceId;
  readonly targetCreatureId: CreatureId;
}): Omit<ChainLink, "id" | "negated"> {
  return {
    kind: "equip-attach",
    controllerId: args.controllerId,
    cardInstanceId: args.cardInstanceId,
    effects: [],
    sourceCreatureId: null,
    declaredTargetCreatureId: null,
    equipTargetCreatureId: args.targetCreatureId,
    overloadFaceCardId: null,
    attackerId: null,
    attackId: null,
    attackTargetId: null,
    attackEffect: null,
    ritualDuration: null,
  };
}

export function buildOverloadLink(args: {
  readonly controllerId: PlayerId;
  readonly cardInstanceId: CardInstanceId;
  readonly faceCardId: FaceCardId;
}): Omit<ChainLink, "id" | "negated"> {
  return {
    kind: "overload-attach",
    controllerId: args.controllerId,
    cardInstanceId: args.cardInstanceId,
    effects: [],
    sourceCreatureId: null,
    declaredTargetCreatureId: null,
    equipTargetCreatureId: null,
    overloadFaceCardId: args.faceCardId,
    attackerId: null,
    attackId: null,
    attackTargetId: null,
    attackEffect: null,
    ritualDuration: null,
  };
}

export function buildAttackLink(args: {
  readonly controllerId: PlayerId;
  readonly attackerId: CreatureId;
  readonly attackId: AttackId;
  readonly targetId: CreatureId;
  readonly attackEffect: EffectDefinition;
}): Omit<ChainLink, "id" | "negated"> {
  return {
    kind: "attack",
    controllerId: args.controllerId,
    cardInstanceId: null,
    effects: [],
    sourceCreatureId: args.attackerId,
    declaredTargetCreatureId: args.targetId,
    equipTargetCreatureId: null,
    overloadFaceCardId: null,
    attackerId: args.attackerId,
    attackId: args.attackId,
    attackTargetId: args.targetId,
    attackEffect: args.attackEffect,
    ritualDuration: null,
  };
}
