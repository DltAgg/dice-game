import { getFaceCard } from "../content/faces.js";
import type { DieSlot, DieState } from "../model/dice.js";
import type { GameRulesConfig } from "../model/config.js";
import type { FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { Draft } from "../reducer/draft.js";
import { opponentOf } from "./creatures.js";

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
 * Face deck legality: at most `faceDeckMaxCards` total. Unknown catalogue ids
 * are refused. A face is not an attribute, so there is no per-attribute cap.
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

  for (const id of faceDeck) {
    const definition = getFaceCard(id);
    if (definition === undefined) {
      return { ok: false, reason: `unknown face card "${id}"` };
    }
  }

  return { ok: true };
}

/** Pool faces the player can still install. */
export function matchingFacesInPool(
  state: GameState | Draft,
  playerId: PlayerId,
): readonly FaceCardId[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  return player.facePool.filter((id) => getFaceCard(id) !== undefined);
}

/**
 * Face cards the player may name when forging: matching faces still in the
 * pool, plus already-installed copies they own (bible §13 copy rule).
 */
export function eligibleFacesForForge(
  state: GameState | Draft,
  playerId: PlayerId,
  forgingCard?: { readonly forgeTags?: readonly string[] },
): readonly FaceCardId[] {
  const score = (faceCardId: FaceCardId): number => {
    const face = getFaceCard(faceCardId);
    if (face === undefined) return -1;
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

  for (const id of matchingFacesInPool(state, playerId)) consider(id);

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
 * Echo-restricted faces (`forgeRestriction: "echo-cards"`) over other named
 * specials of the same attribute.
 *
 * Used by autoplay / tests when no player choice is needed. Live play names
 * `faceCardId` on FORGE_CARD via `eligibleFacesForForge`.
 */
export function resolveFaceForForge(
  state: GameState | Draft,
  playerId: PlayerId,
  forgingCard?: { readonly forgeTags?: readonly string[] },
): FaceCardId | null {
  const eligible = eligibleFacesForForge(state, playerId, forgingCard);
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
 * also `clearOverloadsOnFace` / `clearOverchargeOnFace` so overloads and
 * Overcharge pips leave with the face card.
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

/**
 * True when a forge / forge-faces / replace-synthetic-face / pestilence-spread
 * install may not overwrite this physical slot. Peel (`ACTIVATE_FACE`),
 * consume, and strip-to-Shield are not this check.
 */
export function slotCannotBeReplacedByForge(slot: DieSlot): boolean {
  const face = getFaceCard(slot.faceCardId);
  const policy = face?.stayPolicy;
  if (policy === undefined) return false;
  if (policy.kind === "cannot-replace-by-forge") return true;
  return (slot.forgeLockRemaining ?? 0) > 0;
}

/**
 * After installing `installedFaceCardId`, reset remaining forge-lock on every
 * slot of this die that currently shows that same face (including new copies).
 * No-op when the incoming face is not a forge-lock stay policy.
 */
export function withForgeLockResetOnInstall(
  slots: readonly DieSlot[],
  installedFaceCardId: FaceCardId,
): readonly DieSlot[] {
  const face = getFaceCard(installedFaceCardId);
  if (face?.stayPolicy?.kind !== "forge-lock") return slots;
  const turns = face.stayPolicy.turns;
  return slots.map((slot) =>
    slot.faceCardId === installedFaceCardId ? { ...slot, forgeLockRemaining: turns } : slot,
  );
}

/**
 * Overwrite a slot with a new face, clearing slot-local pestilence /
 * forge-lock / forge yield. Callers that install onto the owner's die
 * re-set `forgeYield` after this (see `installFacesOnDie`). Overcharge
 * pips live on the player, not the slot — callers orphan-clear separately.
 */
export function overwrittenSlot(
  slot: DieSlot,
  faceCardId: FaceCardId,
  faceCardOwnerId: PlayerId,
): DieSlot {
  return {
    ...slot,
    faceCardId,
    faceCardOwnerId,
    pestilenceCounters: 0,
    forgeLockRemaining: 0,
    forgeYield: false,
  };
}

/**
 * Physical slot at match start. Forge-lock stay faces get catalogue turns as
 * if just installed (OPEN_DESIGN ASSUMED). Heritage/Plague are refused on
 * `startingDice`; this is for future-legal stay faces and tests.
 */
export function openingSlotFromFace(
  index: number,
  faceCardId: FaceCardId,
  ownerId: PlayerId,
): DieSlot {
  const face = getFaceCard(faceCardId);
  const slot: DieSlot = {
    index,
    faceCardId,
    faceCardOwnerId: ownerId,
  };
  if (face?.stayPolicy?.kind === "forge-lock") {
    return { ...slot, forgeLockRemaining: face.stayPolicy.turns };
  }
  return slot;
}

/**
 * Slot indexes a forge can replace. Slots that cannot be replaced by forging
 * are skipped.
 */
export function preferredSlotsForForgeFaces(
  die: DieState,
  faces: number,
): readonly number[] | null {
  if (faces <= 0 || die.slots.length < faces) return null;

  const pick: number[] = [];
  for (const slot of die.slots) {
    if (slotCannotBeReplacedByForge(slot)) continue;
    pick.push(slot.index);
    if (pick.length === faces) return pick;
  }
  return null;
}

/** Whether the controller can name a legal die, slots, and face for this effect. */
export function hasLegalForgeFacesChoice(
  state: GameState | Draft,
  controllerId: PlayerId,
  faces: number,
  target: "own-die" | "opponent-die",
): boolean {
  if (eligibleFacesForForge(state, controllerId).length === 0) return false;
  const ownerId = target === "own-die" ? controllerId : opponentOf(state, controllerId);
  const player = state.players[ownerId];
  if (player === undefined) return false;
  for (const dieId of player.dieIds) {
    const die = state.dice[dieId];
    if (die === undefined) continue;
    if (preferredSlotsForForgeFaces(die, faces) !== null) return true;
  }
  return false;
}

