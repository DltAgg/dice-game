import type { GameError } from "../model/errors.js";
import type { HitStrength } from "../model/hitClass.js";
import type { PlayerId } from "../model/ids.js";
import type { ChainLink } from "../model/state.js";
import { clampMeter } from "../rules/meter.js";
import { emit, patchPlayer, type Draft } from "./draft.js";

/** Aggressor Meter when a sequence hit conducts. Cap stays `meterCap`. */
const SEQUENCE_HIT_AGGRESSOR_METER: Record<HitStrength, number> = {
  light: 2,
  medium: 3,
  heavy: 4,
};

/** Owner of the fighter the hit was declared against. */
const SEQUENCE_HIT_DEFENDER_METER = 1;

export function grantMeter(draft: Draft, playerId: PlayerId, amount: number): void {
  if (amount <= 0) return;
  const player = draft.players[playerId];
  if (player === undefined) return;
  const meter = clampMeter(player.meter + amount, draft.config.meterCap);
  if (meter === player.meter) return;
  const delta = meter - player.meter;
  patchPlayer(draft, playerId, { meter });
  emit(draft, {
    type: "meter-changed",
    playerId,
    delta,
    meter,
  });
}

export function spendMeter(
  draft: Draft,
  playerId: PlayerId,
  amount: number,
): GameError | null {
  if (amount <= 0) return null;
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (player.meter < amount) return "INSUFFICIENT_METER";
  const meter = clampMeter(player.meter - amount, draft.config.meterCap);
  patchPlayer(draft, playerId, { meter });
  emit(draft, { type: "meter-changed", playerId, delta: -amount, meter });
  return null;
}

/** Set Meter absolutely (clamped). Emits only when the value changes. */
export function setMeter(draft: Draft, playerId: PlayerId, amount: number): void {
  const player = draft.players[playerId];
  if (player === undefined) return;
  const meter = clampMeter(amount, draft.config.meterCap);
  if (meter === player.meter) return;
  const delta = meter - player.meter;
  patchPlayer(draft, playerId, { meter });
  emit(draft, { type: "meter-changed", playerId, delta, meter });
}

/**
 * Meter for a sequence hit that conducts. A negated link grants nothing.
 * Printed `meterGain` still applies. This does not grant
 * `meterPerDamageDealt` per HP, and it does not change combo count.
 */
export function grantSequenceHitMeter(draft: Draft, link: ChainLink): void {
  if (link.negated) return;
  grantMeter(draft, link.controllerId, link.meterGain ?? 0);
  const strength = link.hitStrength;
  if (strength === undefined) return;
  grantMeter(draft, link.controllerId, SEQUENCE_HIT_AGGRESSOR_METER[strength]);
  const targetId = link.declaredTargetCreatureId;
  if (targetId === null) return;
  const ownerId = draft.creatures[targetId]?.ownerId;
  if (ownerId === undefined) return;
  grantMeter(draft, ownerId, SEQUENCE_HIT_DEFENDER_METER);
}

export function grantMeterFromStrike(
  draft: Draft,
  damagedCreatureId: import("../model/ids.js").CreatureId,
  hpLost: number,
  fromAttack: boolean,
  dealerId?: PlayerId | null,
): void {
  if (!fromAttack || hpLost <= 0) return;
  const damaged = draft.creatures[damagedCreatureId];
  if (damaged === undefined) return;
  const dealer = dealerId ?? null;
  if (dealer === null || dealer === damaged.ownerId) return;
  const amount = hpLost * draft.config.meterPerDamageDealt;
  grantMeter(draft, dealer, amount);
  grantMeter(draft, damaged.ownerId, amount);
}

export function setComboCount(draft: Draft, playerId: PlayerId, comboCount: number): void {
  const player = draft.players[playerId];
  if (player === undefined || player.comboCount === comboCount) return;
  patchPlayer(draft, playerId, { comboCount });
  emit(draft, { type: "combo-changed", playerId, comboCount });
}
