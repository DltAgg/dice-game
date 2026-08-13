import { getFaceCard } from "../content/faces.js";
import { attributeAllowsNaturalFaces, isAttribute } from "../model/attributes.js";
import type { FaceKind } from "../model/dice.js";
import type { GameRulesConfig } from "../model/config.js";
import type { FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { isAttributeSymbol, type SymbolType } from "../model/symbols.js";
import type { Draft } from "../reducer/draft.js";

/**
 * The face-card ownership ledger of bible §12. A face card is either sitting in
 * its owner's pool or backing at least one installed physical face — never
 * both, and never neither. Because one card may back several physical faces
 * (§13), installed copies are counted from the dice rather than tracked
 * separately, so the two views cannot drift apart.
 *
 * Ownership is independent of which die the face sits on: a Corruption face
 * forged onto an opponent's die still returns to its own owner when removed.
 */

export function countInstalledCopies(
  state: GameState | Draft,
  faceCardId: FaceCardId,
  ownerId: PlayerId,
): number {
  let count = 0;
  for (const die of Object.values(state.dice)) {
    for (const slot of die.slots) {
      if (slot.faceCardId === faceCardId && slot.faceCardOwnerId === ownerId) count += 1;
    }
  }
  return count;
}

export const isFaceCardInPool = (
  state: GameState | Draft,
  faceCardId: FaceCardId,
  ownerId: PlayerId,
): boolean => state.players[ownerId]?.facePool.includes(faceCardId) ?? false;

/** True when the ledger invariant holds for one card: in the pool xor installed. */
export const faceCardLocationIsConsistent = (
  state: GameState,
  faceCardId: FaceCardId,
  ownerId: PlayerId,
): boolean => {
  const installed = countInstalledCopies(state, faceCardId, ownerId) > 0;
  const pooled = isFaceCardInPool(state, faceCardId, ownerId);
  return installed !== pooled;
};

/** Every (card, owner) pair the game currently knows about. */
export const knownFaceCardOwnerships = (
  state: GameState,
): ReadonlyArray<readonly [FaceCardId, PlayerId]> => {
  const seen = new Map<string, readonly [FaceCardId, PlayerId]>();
  for (const die of Object.values(state.dice)) {
    for (const slot of die.slots) {
      seen.set(`${slot.faceCardId}::${slot.faceCardOwnerId}`, [
        slot.faceCardId,
        slot.faceCardOwnerId,
      ]);
    }
  }
  for (const player of Object.values(state.players)) {
    for (const faceCardId of player.facePool) {
      seen.set(`${faceCardId}::${player.id}`, [faceCardId, player.id]);
    }
  }
  return [...seen.values()];
};

/**
 * Face deck legality (bible §12): at most `faceDeckMaxCards` total, at most
 * `faceDeckMaxPerAttribute` sharing one attribute. Shield is not an attribute
 * and does not count toward the per-attribute cap. Unknown ids are refused.
 * Natural faces of synthetic-only attributes (Toxin / Mechanical / Corruption /
 * Darkness) are refused.
 */
export function validateFaceDeck(
  faceDeck: readonly FaceCardId[],
  config: GameRulesConfig,
): { ok: true } | { ok: false; reason: string } {
  if (faceDeck.length > config.faceDeckMaxCards) {
    return {
      ok: false,
      reason: `face deck has ${String(faceDeck.length)} cards, max ${String(config.faceDeckMaxCards)}`,
    };
  }

  const byAttribute = new Map<SymbolType, number>();
  for (const id of faceDeck) {
    const definition = getFaceCard(id);
    if (definition === undefined) {
      return { ok: false, reason: `unknown face card "${id}"` };
    }
    if (
      definition.kind === "natural" &&
      isAttributeSymbol(definition.symbol) &&
      !attributeAllowsNaturalFaces(definition.symbol)
    ) {
      return {
        ok: false,
        reason: `natural faces are not allowed for synthetic-only attribute "${definition.symbol}"`,
      };
    }
    if (!isAttributeSymbol(definition.symbol)) continue;
    byAttribute.set(definition.symbol, (byAttribute.get(definition.symbol) ?? 0) + 1);
  }

  for (const [attribute, count] of byAttribute) {
    if (count > config.faceDeckMaxPerAttribute) {
      return {
        ok: false,
        reason: `face deck has ${String(count)} ${attribute} cards, max ${String(config.faceDeckMaxPerAttribute)}`,
      };
    }
  }

  return { ok: true };
}

/** Whether a forge region's kind is legal for the named attribute. */
export function isLegalForgeKindForAttribute(kind: FaceKind, attribute: SymbolType): boolean {
  if (!isAttribute(attribute)) return false;
  if (kind === "synthetic") return true;
  return attributeAllowsNaturalFaces(attribute);
}

/** Pool entries matching a forge region's kind and attribute. */
export function matchingFacesInPool(
  state: GameState | Draft,
  playerId: PlayerId,
  kind: FaceKind,
  attribute: SymbolType,
): readonly FaceCardId[] {
  if (!isLegalForgeKindForAttribute(kind, attribute)) return [];
  const player = state.players[playerId];
  if (player === undefined) return [];
  return player.facePool.filter((id) => {
    const face = getFaceCard(id);
    return face !== undefined && face.kind === kind && face.symbol === attribute;
  });
}

/**
 * Face cards the player may name when forging: matching faces still in the
 * pool, plus already-installed copies they own (bible §13 copy rule).
 */
export function eligibleFacesForForge(
  state: GameState | Draft,
  playerId: PlayerId,
  kind: FaceKind,
  attribute: SymbolType,
  forgingCard?: { readonly forgeTags?: readonly string[] },
): readonly FaceCardId[] {
  if (!isLegalForgeKindForAttribute(kind, attribute)) return [];

  const score = (faceCardId: FaceCardId): number => {
    const face = getFaceCard(faceCardId);
    if (face === undefined) return -1;
    if (face.kind !== kind || face.symbol !== attribute) return -1;
    if (face.forgeRestriction === "echo-cards") {
      return forgingCard?.forgeTags?.includes("echo") === true ? 2 : -1;
    }
    return 1;
  };

  const seen = new Set<FaceCardId>();
  const out: FaceCardId[] = [];

  const consider = (id: FaceCardId) => {
    if (seen.has(id) || score(id) <= 0) return;
    seen.add(id);
    out.push(id);
  };

  for (const id of matchingFacesInPool(state, playerId, kind, attribute)) consider(id);

  for (const die of Object.values(state.dice)) {
    for (const slot of die.slots) {
      if (slot.faceCardOwnerId !== playerId) continue;
      consider(slot.faceCardId);
    }
  }

  return out;
}

/**
 * Bible §13: forge either copies an already-installed matching face, or takes
 * one from the owner's face pool. Prefers an installed copy so pool stock is
 * not spent twice for the same printed face. Faces with a forge restriction
 * are skipped unless the forging card satisfies it. Echo-tagged cards prefer
 * Echo-restricted faces over generic synthetics of the same attribute.
 *
 * Used by autoplay / tests when no player choice is needed. Live play names
 * `faceCardId` on FORGE_CARD via `eligibleFacesForForge`.
 */
export function resolveFaceForForge(
  state: GameState | Draft,
  playerId: PlayerId,
  kind: FaceKind,
  attribute: SymbolType,
  forgingCard?: { readonly forgeTags?: readonly string[] },
): FaceCardId | null {
  const eligible = eligibleFacesForForge(state, playerId, kind, attribute, forgingCard);
  if (eligible.length === 0) return null;

  const score = (faceCardId: FaceCardId): number => {
    const face = getFaceCard(faceCardId);
    if (face === undefined) return -1;
    if (face.forgeRestriction === "echo-cards") {
      return forgingCard?.forgeTags?.includes("echo") === true ? 2 : -1;
    }
    return 1;
  };

  // Prefer echo matches, then pool stock, then installed copies.
  let best: FaceCardId | null = null;
  let bestScore = -1;
  for (const id of eligible) {
    const inPool = isFaceCardInPool(state, id, playerId);
    const value = score(id) * 10 + (inPool ? 1 : 0);
    if (value > bestScore) {
      bestScore = value;
      best = id;
    }
  }
  return best;
}

/** Removes one occurrence of a face card from the owner's pool. */
export function takeFaceFromPool(draft: Draft, playerId: PlayerId, faceCardId: FaceCardId): boolean {
  const player = draft.players[playerId];
  if (player === undefined) return false;
  const index = player.facePool.indexOf(faceCardId);
  if (index < 0) return false;
  const facePool = [...player.facePool];
  facePool.splice(index, 1);
  draft.players[playerId] = { ...player, facePool };
  return true;
}

/**
 * Returns a face to its owner's pool when its last installed copy is gone.
 * No-op while any copy remains installed. Callers that orphan a face should
 * also `clearOverloadsOnFace` so overloads leave with the face card.
 */
export function returnFaceToPoolIfOrphaned(
  draft: Draft,
  faceCardId: FaceCardId,
  ownerId: PlayerId,
): void {
  if (countInstalledCopies(draft, faceCardId, ownerId) > 0) return;
  const player = draft.players[ownerId];
  if (player === undefined) return;
  if (player.facePool.includes(faceCardId)) return;
  draft.players[ownerId] = { ...player, facePool: [...player.facePool, faceCardId] };
}
