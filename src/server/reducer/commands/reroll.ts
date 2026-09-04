import { getFaceCard } from "../../content/faces.js";
import { FACE_SLOTS_PER_DIE } from "../../model/dice.js";
import type { GameError } from "../../model/errors.js";
import type { PlayerId } from "../../model/ids.js";
import type { RNG } from "../../rng/rng.js";
import { livingCreaturesOf } from "../../rules/creatures.js";
import { isSlotSilenced } from "../../rules/silence.js";
import { emit, patchDie, type Draft } from "../draft.js";
import { dealDamage, drainResolution } from "../resolution.js";
import { bankRolledSymbols } from "../rollBank.js";
import { resumeAfterEffectPause } from "./priority.js";
import {
  appendFaceAppeared,
  applyForgeYieldGenerate,
  applyOverchargeGenerate,
  fireShownFaceRollHooks,
} from "./shownFace.js";
import {
  bankableShownFaceIds,
  forfeitRolledPips,
  isConvertingShownFace,
  replaceShowingFacePips,
  skipRollYieldAndOvercharge,
} from "./rollPips.js";

/**
 * Optional `[Reroll]` accept/decline (Rethrow, Adrenaline). Stay in actions.
 * Accept rolls that one die again: new face, On roll + auto-bank, then
 * Adrenaline same-face ally damage if printed. Convert applies to this new
 * roll only (spec `025`).
 */
export function resolveOptionalReroll(
  draft: Draft,
  playerId: PlayerId,
  accept: boolean,
  rng: RNG,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "optional-reroll") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const dieId = pending.dieId;
  const originalFace = pending.faceCardId;
  const sameFaceAllyDamage = pending.sameFaceAllyDamage;
  draft.pendingDecision = null;

  if (!accept) return resumeAfterEffectPause(draft);

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  const slotIndex = rng.integer(0, FACE_SLOTS_PER_DIE - 1);
  patchDie(draft, dieId, { rolledSlotIndex: slotIndex });
  const slot = draft.dice[dieId]?.slots[slotIndex];
  const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
  if (face !== undefined && slot !== undefined) {
    emit(draft, { type: "die-rolled", dieId, slotIndex, symbol: face.symbol });
    const symbolIds = replaceShowingFacePips(draft, playerId, dieId, slotIndex, face);
    appendFaceAppeared(draft, dieId, slotIndex, slot.faceCardId, face.kind);
    const silenced = isSlotSilenced(draft, dieId, slotIndex);
    const converting = isConvertingShownFace(face, silenced);
    if (!skipRollYieldAndOvercharge(face, silenced)) {
      applyForgeYieldGenerate(draft, playerId, slot, face.symbol);
      applyOverchargeGenerate(draft, die.ownerId, slot.faceCardId);
    }
    fireShownFaceRollHooks(
      draft,
      playerId,
      dieId,
      slotIndex,
      slot.faceCardId,
      face.symbol,
    );
    drainResolution(draft);
    if (converting) forfeitRolledPips(draft, symbolIds);
    const deferAbsorb =
      draft.pendingDecision !== null || draft.resolutionStack.length > 0;
    bankRolledSymbols(
      draft,
      playerId,
      bankableShownFaceIds([
        {
          dieId,
          slotIndex,
          faceCardId: slot.faceCardId,
          symbol: face.symbol,
          suppressInherent: false,
          symbolIds,
          converting,
        },
      ]),
      deferAbsorb,
    );
    if (!deferAbsorb) {
      drainResolution(draft);
    }
  }

  if (slot?.faceCardId === originalFace && sameFaceAllyDamage !== undefined) {
    const allies = livingCreaturesOf(draft, playerId);
    for (const ally of allies.slice(0, 2)) {
      dealDamage(draft, ally.id, sameFaceAllyDamage);
    }
  }

  return resumeAfterEffectPause(draft);
}
