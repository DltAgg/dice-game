import { getCard } from "../../content/cards.js";
import { getFaceCard } from "../../content/faces.js";
import type { DieSlot, FaceKind } from "../../model/dice.js";
import { asSymbolInstanceId, type DieId, type FaceCardId, type PlayerId, type SymbolInstanceId } from "../../model/ids.js";
import { isAttributeSymbol, type SymbolType } from "../../model/symbols.js";
import { emit, nextInstanceId, type Draft } from "../draft.js";
import { createSymbol, pushEffect } from "../resolution.js";
import { fireEquipmentOnRollSymbol } from "../triggers.js";
import { isSlotSilenced } from "../../rules/silence.js";

/** Record that this face showed; does not clear earlier appearances this roll. */
export function appendFaceAppeared(
  draft: Draft,
  dieId: DieId,
  slotIndex: number,
  faceCardId: FaceCardId,
  kind: FaceKind,
): void {
  draft.facesAppearedThisRoll = [
    ...draft.facesAppearedThisRoll,
    { dieId, slotIndex, faceCardId, kind },
  ];
}

/**
 * Create a die-sourced rolled pip (`source: "roll"`). Does not auto-bank —
 * caller runs on-roll first, then `bankRolledSymbols` (same as `ROLL_DICE`).
 */
export function createRolledDieSymbol(
  draft: Draft,
  ownerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  symbol: SymbolType,
): SymbolInstanceId {
  const locked = draft.dice[dieId]?.slots[slotIndex]?.resourceLockedThisTurn === true;
  const symbolId = asSymbolInstanceId(nextInstanceId(draft, "symbol"));
  draft.symbols[symbolId] = {
    id: symbolId,
    ownerId,
    symbol,
    status: "rolled",
    sourceDieId: dieId,
    absorbedByCreatureId: null,
    ...(locked ? { usable: false } : {}),
  };
  emit(draft, {
    type: "symbol-generated",
    symbolId,
    symbol,
    ownerId,
    source: "roll",
  });
  return symbolId;
}

/**
 * One current unabsorbed result per die: Shield, locked, leftover
 * (`rolled` / `available`). Already-banked pips are not rewritten.
 */
export function findUnabsorbedDieResult(
  draft: Draft,
  dieId: DieId,
): SymbolInstanceId | undefined {
  for (const symbol of Object.values(draft.symbols)) {
    if (symbol.sourceDieId !== dieId) continue;
    if (symbol.status !== "rolled" && symbol.status !== "available") continue;
    return symbol.id;
  }
  return undefined;
}

/**
 * Replace an unabsorbed leftover with the new showing symbol, or create a
 * new rolled pip. Does not unbank a previous pile token.
 */
export function replaceOrCreateRolledResult(
  draft: Draft,
  ownerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  symbol: SymbolType,
): SymbolInstanceId {
  const existingId = findUnabsorbedDieResult(draft, dieId);
  if (existingId === undefined) {
    return createRolledDieSymbol(draft, ownerId, dieId, slotIndex, symbol);
  }
  const existing = draft.symbols[existingId];
  if (existing === undefined) {
    return createRolledDieSymbol(draft, ownerId, dieId, slotIndex, symbol);
  }
  const locked = draft.dice[dieId]?.slots[slotIndex]?.resourceLockedThisTurn === true;
  draft.symbols[existingId] = {
    id: existing.id,
    ownerId: existing.ownerId,
    symbol,
    status: existing.status,
    sourceDieId: existing.sourceDieId,
    absorbedByCreatureId: existing.absorbedByCreatureId,
    ...(locked ? { usable: false as const } : {}),
  };
  return existingId;
}

export function fireFaceOnRoll(
  draft: Draft,
  controllerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  if (slot === undefined) return;
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined || face.onRoll.length === 0) return;

  for (const effect of [...face.onRoll].reverse()) {
    pushEffect(draft, controllerId, effect, null, null, null, dieId, slotIndex);
  }
}

/**
 * Any overload sitting on this face card fires once for each die that shows
 * that face after the roll. Die faces only reference the card; overloads live
 * on the card.
 */
export function fireOverloadsForShownFace(
  draft: Draft,
  controllerId: PlayerId,
  faceCardId: FaceCardId,
  dieId: DieId,
  slotIndex: number,
): void {
  const player = draft.players[controllerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.overload) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId !== faceCardId) continue;
    const region = getCard(card.cardId)?.overload;
    if (region === undefined) continue;
    for (const effect of [...region.onRoll].reverse()) {
      pushEffect(
        draft,
        controllerId,
        effect,
        null,
        null,
        null,
        dieId,
        slotIndex,
        0,
        cardInstanceId,
      );
    }
  }
}

/**
 * Re-fire the showing face's roll hooks without changing the face or creating a
 * new rolled pip (`[Stamp]`, `reapply-die-modifiers`). Same generate + hook
 * order as `ROLL_DICE` / `[Reroll]` after the pip exists.
 */
export function refireShownFaceRollEffects(
  draft: Draft,
  controllerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  if (die === undefined || slot === undefined) return;
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined) return;

  const silenced = isSlotSilenced(draft, dieId, slotIndex);
  if (!silenced && face.convertRoll !== true) {
    applyForgeYieldGenerate(draft, controllerId, slot, face.symbol);
    applyOverchargeGenerate(draft, die.ownerId, slot.faceCardId);
  }
  fireShownFaceRollHooks(
    draft,
    controllerId,
    dieId,
    slotIndex,
    slot.faceCardId,
    face.symbol,
  );
}

/** On roll → overloads on that face → equipment on-roll-symbol (`ROLL_DICE` order). */
export function fireShownFaceRollHooks(
  draft: Draft,
  controllerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  faceCardId: FaceCardId,
  symbol: SymbolType,
  suppressInherent = false,
): void {
  const silenced = isSlotSilenced(draft, dieId, slotIndex);
  if (!silenced && !suppressInherent) {
    fireFaceOnRoll(draft, controllerId, dieId, slotIndex);
  }
  if (!silenced) {
    fireOverloadsForShownFace(draft, controllerId, faceCardId, dieId, slotIndex);
  }
  fireEquipmentOnRollSymbol(draft, controllerId, symbol);
}

/**
 * When a `forgeYield` slot shows an attribute face, generate
 * `forgeYieldGenerate` extra pips for the die owner (effect Generate path).
 */
export function applyForgeYieldGenerate(
  draft: Draft,
  dieOwnerId: PlayerId,
  slot: Pick<DieSlot, "forgeYield">,
  symbol: SymbolType,
): void {
  if (slot.forgeYield !== true) return;
  if (!isAttributeSymbol(symbol)) return;
  const count = draft.config.forgeYieldGenerate;
  if (count <= 0) return;
  for (let i = 0; i < count; i += 1) {
    createSymbol(draft, dieOwnerId, symbol, "available", "effect");
  }
}

/**
 * When a die you own shows an Overcharged face card after a roll, generate
 * 1 effect pip per stored attribute (spec `021`). Once per showing die, like
 * overloads. Looks up `die.ownerId`'s map — opponent copies of the same id
 * do not share your pips. Same Generate path as forge yield.
 */
export function applyOverchargeGenerate(
  draft: Draft,
  dieOwnerId: PlayerId,
  faceCardId: FaceCardId,
): void {
  const pips = draft.players[dieOwnerId]?.overchargeByFace[faceCardId];
  if (pips === undefined || pips.length === 0) return;
  for (const attribute of pips) {
    createSymbol(draft, dieOwnerId, attribute, "available", "effect");
  }
}
