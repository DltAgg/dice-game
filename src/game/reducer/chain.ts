import type { CardDuration } from "../model/cards.js";
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
import { opponentOf } from "../rules/creatures.js";
import { emit, nextInstanceId, type Draft } from "./draft.js";

export const isNegatableLinkKind = (kind: ChainLinkKind): boolean => kind !== "attack";

/** Seal the Rite / `negate-ritual` — ritual place or activate only. Spec `008`. */
export const isRitualNegatableLinkKind = (kind: ChainLinkKind): boolean =>
  kind === "ritual-place" || kind === "ritual-activate";

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
