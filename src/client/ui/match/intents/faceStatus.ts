import {
  attributeLabel,
  diceOf,
  getFaceCard,
  isSlotSilenced,
  slotCannotBeReplacedByForge,
  whileShowingTotals,
  type Attribute,
  type DieId,
  type DieSlot,
  type FaceCardId,
  type GameState,
  type PlayerId,
  type WhileShowingTotals,
} from "@server";

export type WhileShowingCue = {
  readonly key: "pierce" | "empower" | "play-discount" | "forge-discount" | "reduce";
  readonly label: string;
};

const CONVERT_ROLL_CUE = "Convert roll · pips not banked";

/** Player-facing chips for `whileShowingTotals` — do not recompute stance in React. */
export function whileShowingCues(totals: WhileShowingTotals): readonly WhileShowingCue[] {
  const cues: WhileShowingCue[] = [];
  if (totals.pierce > 0) {
    cues.push({ key: "pierce", label: `Pierce ${String(totals.pierce)}` });
  }
  if (totals.empower > 0) {
    cues.push({ key: "empower", label: `Empower ${String(totals.empower)}` });
  }
  if (totals.playDiscount > 0) {
    cues.push({ key: "play-discount", label: `Discount ${String(totals.playDiscount)}` });
  }
  if (totals.forgeDiscount > 0) {
    cues.push({ key: "forge-discount", label: `Discount ${String(totals.forgeDiscount)} forge` });
  }
  if (totals.reduce > 0) {
    cues.push({ key: "reduce", label: `Reduce ${String(totals.reduce)}` });
  }
  return cues;
}

export function whileShowingStatusLine(totals: WhileShowingTotals): string | null {
  const cues = whileShowingCues(totals);
  return cues.length === 0 ? null : `While showing · ${cues.map((cue) => cue.label).join(" · ")}`;
}

export function whileShowingStatusForPlayer(
  state: GameState,
  playerId: PlayerId,
): string | null {
  return whileShowingStatusLine(whileShowingTotals(state, playerId));
}

/**
 * Cue on a showing `[Convert roll]` face: that die's pips this roll do not bank.
 * Hidden when every showing copy is silenced (convert does not fire; pips still generate).
 */
export function convertRollCueForFace(
  state: GameState,
  playerId: PlayerId,
  faceCardId: FaceCardId,
): string | null {
  if (getFaceCard(faceCardId)?.convertRoll !== true) return null;
  const showing = showingSlotsForFace(state, playerId, faceCardId);
  if (showing.length === 0) return null;
  const live = showing.some((slot) => !isSlotSilenced(state, slot.dieId, slot.slotIndex));
  return live ? CONVERT_ROLL_CUE : null;
}

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

/** Attribute counts on a face card's Overcharge pips (spec `021`). */
export function overchargePipLabel(
  pips: readonly Attribute[] | undefined,
): string | null {
  if (pips === undefined || pips.length === 0) return null;
  const counts = new Map<Attribute, number>();
  for (const attribute of pips) {
    counts.set(attribute, (counts.get(attribute) ?? 0) + 1);
  }
  const bits: string[] = [];
  for (const [attribute, count] of counts) {
    const name = attributeLabel(attribute);
    bits.push(count === 1 ? name : `${name} ×${String(count)}`);
  }
  return `Overcharge ${bits.join(" · ")}`;
}

export function slotStatusLine(
  slot: DieSlot,
  ctx?: { readonly state: GameState; readonly dieId: DieId },
): string | null {
  const parts: string[] = [];
  if (slot.forgeYield === true) parts.push("Forge yield");
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
  if (ctx !== undefined && isSlotSilenced(ctx.state, ctx.dieId, slot.index)) {
    parts.push("Silenced");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Overcharge pips on the unique installed face card (shared across copies). */
export function overchargeStatusForFace(
  state: GameState,
  playerId: PlayerId,
  faceCardId: FaceCardId,
): string | null {
  return overchargePipLabel(state.players[playerId]?.overchargeByFace[faceCardId]);
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
  let silenced = false;
  for (const die of diceOf(state, playerId)) {
    for (const slot of die.slots) {
      if (slot.faceCardId !== faceCardId) continue;
      corruption = Math.max(corruption, slot.corruptionMarkers ?? 0);
      if (slot.suppressInherentNextRoll === true) suppress = true;
      if (slot.resourceLockedThisTurn === true) locked = true;
      if (isSlotSilenced(state, die.id, slot.index)) silenced = true;
    }
  }
  const parts: string[] = [];
  if (corruption > 0) parts.push(`Corruption ×${String(corruption)}`);
  if (suppress) parts.push("Suppress");
  if (locked) parts.push("Locked");
  if (silenced) parts.push("Silenced");
  return parts.length > 0 ? parts.join(" · ") : null;
}
