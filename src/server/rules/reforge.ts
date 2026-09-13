import type { Attribute } from "../model/attributes.js";
import type { CardDefinition } from "../model/cards.js";
import type { DieSlot } from "../model/dice.js";
import type { EffectDefinition } from "../model/effects.js";
import type { GameError } from "../model/errors.js";
import type { FaceCardId, DieId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { Draft } from "../reducer/draft.js";
import { getFaceCard } from "../content/faces.js";
import { forgeExceedsAttributeLimit } from "./cards.js";
import {
  matchingFacesInPool,
  slotCannotBeReplacedByForge,
} from "./faces.js";

type ChooseEffectModeEffect = Extract<EffectDefinition, { readonly type: "choose-effect-mode" }>;
type ReplaceSyntheticFaceEffect = Extract<
  EffectDefinition,
  { readonly type: "replace-synthetic-face" }
>;
type ReforgePlayError = Extract<
  GameError,
  "ATTRIBUTE_LIMIT_REACHED" | "FACE_NOT_AVAILABLE" | "INVALID_TARGET"
>;

export type ChooseEffectModeResolution =
  | { readonly kind: "whiff" }
  | { readonly kind: "auto"; readonly mode: readonly EffectDefinition[] }
  | {
      readonly kind: "choose";
      readonly modes: readonly (readonly EffectDefinition[])[];
      readonly modeLabels: readonly string[];
    };

export interface ReforgeSpec {
  readonly faces: number;
  readonly attribute: Attribute;
  readonly fromAttribute?: Attribute;
}

function combinations(values: readonly number[], n: number): readonly (readonly number[])[] {
  const out: number[][] = [];
  const walk = (start: number, acc: number[]): void => {
    if (acc.length === n) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < values.length; i++) {
      const next = values[i];
      if (next === undefined) continue;
      acc.push(next);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return out;
}

/** Synthetic faces of the destination attribute still in the controller's pool. */
export function eligiblePoolFacesForReforge(
  state: GameState | Draft,
  playerId: PlayerId,
  attribute: Attribute,
): readonly FaceCardId[] {
  return matchingFacesInPool(state, playerId, "synthetic", attribute);
}

export function slotMatchesReforgeFilter(
  slot: DieSlot,
  fromAttribute: Attribute | undefined,
): boolean {
  if (slotCannotBeReplacedByForge(slot)) return false;
  if (fromAttribute === undefined) return true;
  const face = getFaceCard(slot.faceCardId);
  return face !== undefined && face.symbol === fromAttribute;
}

/**
 * Replaceable slots on one owned die. Reforge (`fromAttribute` omitted) accepts
 * any face. Cross forge requires the showing symbol to be `fromAttribute`.
 */
export function legalSlotsForReplaceSyntheticFace(
  state: GameState | Draft,
  controllerId: PlayerId,
  spec: ReforgeSpec,
): ReadonlyArray<{ readonly dieId: DieId; readonly slotIndex: number }> {
  const player = state.players[controllerId];
  if (player === undefined) return [];
  if (eligiblePoolFacesForReforge(state, controllerId, spec.attribute).length < spec.faces) {
    return [];
  }

  const results: Array<{ readonly dieId: DieId; readonly slotIndex: number }> = [];
  for (const dieId of player.dieIds) {
    const die = state.dice[dieId];
    if (die === undefined) continue;
    const candidates = die.slots
      .filter((slot) => slotMatchesReforgeFilter(slot, spec.fromAttribute))
      .map((slot) => slot.index);
    if (candidates.length < spec.faces) continue;
    const legalCombo = combinations(candidates, spec.faces).some(
      (pick) =>
        !forgeExceedsAttributeLimit(die, pick, spec.attribute, spec.faces, state.config),
    );
    if (!legalCombo) continue;
    for (const slotIndex of candidates) {
      results.push({ dieId, slotIndex });
    }
  }
  return results;
}

export function hasLegalReplaceSyntheticFaceChoice(
  state: GameState | Draft,
  controllerId: PlayerId,
  spec: ReforgeSpec,
): boolean {
  return legalSlotsForReplaceSyntheticFace(state, controllerId, spec).length > 0;
}

export function isLegalReforgeAssignment(
  state: GameState | Draft,
  controllerId: PlayerId,
  spec: ReforgeSpec,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardIds: readonly FaceCardId[],
): boolean {
  if (slotIndexes.length !== spec.faces || faceCardIds.length !== spec.faces) return false;
  if (new Set(slotIndexes).size !== spec.faces) return false;
  if (new Set(faceCardIds).size !== spec.faces) return false;

  const die = state.dice[dieId];
  if (die === undefined || die.ownerId !== controllerId) return false;

  const pool = new Set(eligiblePoolFacesForReforge(state, controllerId, spec.attribute));
  for (const id of faceCardIds) {
    if (!pool.has(id)) return false;
  }

  for (const slotIndex of slotIndexes) {
    const slot = die.slots[slotIndex];
    if (slot === undefined || !slotMatchesReforgeFilter(slot, spec.fromAttribute)) return false;
  }

  return !forgeExceedsAttributeLimit(die, slotIndexes, spec.attribute, spec.faces, state.config);
}

function reforgeSpec(effect: ReplaceSyntheticFaceEffect): ReforgeSpec {
  return {
    faces: effect.faces,
    attribute: effect.attribute,
    ...(effect.fromAttribute !== undefined ? { fromAttribute: effect.fromAttribute } : {}),
  };
}

function isReforgeFamilyEffect(effect: EffectDefinition): boolean {
  return effect.type === "replace-synthetic-face" || effect.type === "choose-effect-mode";
}

/**
 * A Choose-one mode is legal iff every `replace-synthetic-face` in it has a
 * legal assignment. Empty modes and other effect types stay legal (convert
 * bank vs payoff must still offer both).
 */
export function isEffectModeLegal(
  state: GameState | Draft,
  controllerId: PlayerId,
  mode: readonly EffectDefinition[],
): boolean {
  for (const effect of mode) {
    if (effect.type !== "replace-synthetic-face") continue;
    if (!hasLegalReplaceSyntheticFaceChoice(state, controllerId, reforgeSpec(effect))) {
      return false;
    }
  }
  return true;
}

function defaultModeLabel(index: number): string {
  return `Mode ${String(index + 1)}`;
}

/**
 * Drop illegal Reforge / Cross forge modes. Keep original labels aligned with
 * the surviving modes. Empty modes are never dropped.
 */
export function legalChooseEffectModes(
  state: GameState | Draft,
  controllerId: PlayerId,
  modes: readonly (readonly EffectDefinition[])[],
  modeLabels?: readonly string[],
): {
  readonly modes: readonly (readonly EffectDefinition[])[];
  readonly modeLabels: readonly string[];
} {
  const keptModes: (readonly EffectDefinition[])[] = [];
  const keptLabels: string[] = [];
  for (let index = 0; index < modes.length; index += 1) {
    const mode = modes[index];
    if (mode === undefined || !isEffectModeLegal(state, controllerId, mode)) continue;
    keptModes.push(mode);
    keptLabels.push(modeLabels?.[index] ?? defaultModeLabel(index));
  }
  return { modes: keptModes, modeLabels: keptLabels };
}

/**
 * Filter Choose one for resolution: 0 legal → whiff; 1 → auto-pick; 2+ → picker.
 */
export function chooseEffectModeResolution(
  state: GameState | Draft,
  controllerId: PlayerId,
  effect: ChooseEffectModeEffect,
): ChooseEffectModeResolution {
  if (effect.modes.length === 0) return { kind: "whiff" };
  const legal = legalChooseEffectModes(state, controllerId, effect.modes, effect.modeLabels);
  if (legal.modes.length === 0) return { kind: "whiff" };
  if (legal.modes.length === 1) {
    return { kind: "auto", mode: legal.modes[0]! };
  }
  return { kind: "choose", modes: legal.modes, modeLabels: legal.modeLabels };
}

function replaceSyntheticFaceBlockReason(
  state: GameState | Draft,
  controllerId: PlayerId,
  spec: ReforgeSpec,
): ReforgePlayError | null {
  if (hasLegalReplaceSyntheticFaceChoice(state, controllerId, spec)) return null;
  if (eligiblePoolFacesForReforge(state, controllerId, spec.attribute).length < spec.faces) {
    return "FACE_NOT_AVAILABLE";
  }
  const player = state.players[controllerId];
  if (player === undefined) return "INVALID_TARGET";
  for (const dieId of player.dieIds) {
    const die = state.dice[dieId];
    if (die === undefined) continue;
    const candidates = die.slots
      .filter((slot) => slotMatchesReforgeFilter(slot, spec.fromAttribute))
      .map((slot) => slot.index);
    if (candidates.length < spec.faces) continue;
    return "ATTRIBUTE_LIMIT_REACHED";
  }
  return "INVALID_TARGET";
}

function combinedReforgePlayError(errors: readonly ReforgePlayError[]): ReforgePlayError {
  const first = errors[0];
  if (first !== undefined && errors.every((error) => error === first)) return first;
  return "ATTRIBUTE_LIMIT_REACHED";
}

function collectModeReforgeErrors(
  state: GameState | Draft,
  playerId: PlayerId,
  mode: readonly EffectDefinition[],
): ReforgePlayError[] {
  const errors: ReforgePlayError[] = [];
  for (const effect of mode) {
    if (effect.type !== "replace-synthetic-face") continue;
    const reason = replaceSyntheticFaceBlockReason(state, playerId, reforgeSpec(effect));
    if (reason !== null) errors.push(reason);
  }
  return errors;
}

/**
 * Error if a play region's effects are only Reforge / Cross forge (or a
 * Choose one of those) and none can legally resolve. Mixed effects (damage +
 * reforge, …) return null so play still proceeds. Same helper as
 * `canResolvePlayEffects`.
 */
export function playEffectsRefusal(
  state: GameState | Draft,
  playerId: PlayerId,
  definition: CardDefinition,
): GameError | null {
  const effects = definition.effect?.effects;
  if (effects === undefined || effects.length === 0) return null;
  if (effects.some((effect) => !isReforgeFamilyEffect(effect))) return null;

  const errors: ReforgePlayError[] = [];
  for (const effect of effects) {
    if (effect.type === "replace-synthetic-face") {
      const reason = replaceSyntheticFaceBlockReason(state, playerId, reforgeSpec(effect));
      if (reason === null) return null;
      errors.push(reason);
      continue;
    }
    if (effect.type !== "choose-effect-mode") continue;
    if (effect.modes.some((mode) => isEffectModeLegal(state, playerId, mode))) {
      return null;
    }
    for (const mode of effect.modes) {
      errors.push(...collectModeReforgeErrors(state, playerId, mode));
    }
  }
  return combinedReforgePlayError(errors);
}

/**
 * True when `PLAY_CARD` would not refuse this definition for an unresolvable
 * Reforge / Cross forge. Hand / AI `canPlay` should AND this query.
 */
export function canResolvePlayEffects(
  state: GameState | Draft,
  playerId: PlayerId,
  definition: CardDefinition,
): boolean {
  return playEffectsRefusal(state, playerId, definition) === null;
}
