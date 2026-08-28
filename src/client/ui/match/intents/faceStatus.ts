import {
  diceOf,
  getFaceCard,
  slotCannotBeReplacedByForge,
  type DieId,
  type DieSlot,
  type FaceCardId,
  type GameState,
  type PlayerId,
} from "@server";

export function pestilenceStatusLabel(count: number, faceCardId: FaceCardId): string | null {
  if (count <= 0) return null;
  const denom = getFaceCard(faceCardId)?.pestilenceSpreadAt;
  return denom !== undefined
    ? `Pestilence ${String(count)}/${String(denom)}`
    : `Pestilence ${String(count)}`;
}

export function forgeLockStatusLabel(remaining: number | undefined): string | null {
  if ((remaining ?? 0) <= 0) return null;
  return `Forge-lock ${String(remaining)}`;
}

export function slotStatusLine(slot: DieSlot): string | null {
  const parts: string[] = [];
  if ((slot.corruptionMarkers ?? 0) > 0) {
    parts.push(`Corruption ×${String(slot.corruptionMarkers)}`);
  }
  const pestilence = pestilenceStatusLabel(slot.pestilenceCounters ?? 0, slot.faceCardId);
  if (pestilence !== null) parts.push(pestilence);
  const forgeLock = forgeLockStatusLabel(slot.forgeLockRemaining);
  if (forgeLock !== null) parts.push(forgeLock);
  if (slotCannotBeReplacedByForge(slot)) parts.push("Cannot replace");
  if (slot.suppressInherentNextRoll === true) parts.push("Suppress next roll");
  if (slot.resourceLockedThisTurn === true) parts.push("Resource locked");
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Aggregated stay-on-slot cues for a unique installed face card. */
export function stayStatusForFace(
  state: GameState,
  playerId: PlayerId,
  faceCardId: FaceCardId,
): string | null {
  let pestilence = 0;
  let forgeLock = 0;
  let cannotReplace = false;
  for (const die of diceOf(state, playerId)) {
    for (const slot of die.slots) {
      if (slot.faceCardId !== faceCardId) continue;
      pestilence = Math.max(pestilence, slot.pestilenceCounters ?? 0);
      forgeLock = Math.max(forgeLock, slot.forgeLockRemaining ?? 0);
      if (slotCannotBeReplacedByForge(slot)) cannotReplace = true;
    }
  }
  const parts: string[] = [];
  const pestilenceLine = pestilenceStatusLabel(pestilence, faceCardId);
  if (pestilenceLine !== null) parts.push(pestilenceLine);
  const lockLine = forgeLockStatusLabel(forgeLock);
  if (lockLine !== null) parts.push(lockLine);
  if (cannotReplace) parts.push("Cannot replace");
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function activateFaceSpendCost(
  state: GameState,
  dieId: DieId,
  spendBase: number,
  spendPerCorruptionOnDie: number,
): number {
  const die = state.dice[dieId];
  if (die === undefined) return spendBase;
  let corruptionFaces = 0;
  for (const slot of die.slots) {
    const face = getFaceCard(slot.faceCardId);
    if (face?.kind === "synthetic" && face.symbol === "corruption") {
      corruptionFaces += 1;
    }
  }
  return spendBase + spendPerCorruptionOnDie * corruptionFaces;
}

export function showingSlotsForFace(
  state: GameState,
  playerId: PlayerId,
  faceCardId: FaceCardId,
): readonly { readonly dieId: DieId; readonly slotIndex: number; readonly pestilenceCounters: number }[] {
  const result: { dieId: DieId; slotIndex: number; pestilenceCounters: number }[] = [];
  for (const die of diceOf(state, playerId)) {
    if (die.rolledSlotIndex === null) continue;
    const slot = die.slots[die.rolledSlotIndex];
    if (slot === undefined || slot.faceCardId !== faceCardId) continue;
    result.push({
      dieId: die.id,
      slotIndex: slot.index,
      pestilenceCounters: slot.pestilenceCounters ?? 0,
    });
  }
  return result;
}

export function faceMarkerSummary(
  state: GameState,
  playerId: PlayerId,
  faceCardId: FaceCardId,
): string | null {
  let corruption = 0;
  let suppress = false;
  let locked = false;
  for (const die of diceOf(state, playerId)) {
    for (const slot of die.slots) {
      if (slot.faceCardId !== faceCardId) continue;
      corruption = Math.max(corruption, slot.corruptionMarkers ?? 0);
      if (slot.suppressInherentNextRoll === true) suppress = true;
      if (slot.resourceLockedThisTurn === true) locked = true;
    }
  }
  const parts: string[] = [];
  if (corruption > 0) parts.push(`Corruption ×${String(corruption)}`);
  if (suppress) parts.push("Suppress");
  if (locked) parts.push("Locked");
  return parts.length > 0 ? parts.join(" · ") : null;
}
