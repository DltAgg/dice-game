import type { GameError } from "../model/errors.js";
import type { PlayerId } from "../model/ids.js";
import { emit, patchPlayer, type Draft } from "./draft.js";

export function grantMeter(draft: Draft, playerId: PlayerId, amount: number): void {
  if (amount <= 0) return;
  const player = draft.players[playerId];
  if (player === undefined) return;
  const meter = Math.min(draft.config.meterCap, player.meter + amount);
  if (meter === player.meter) return;
  patchPlayer(draft, playerId, { meter });
  emit(draft, {
    type: "meter-changed",
    playerId,
    delta: meter - player.meter,
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
  const meter = player.meter - amount;
  patchPlayer(draft, playerId, { meter });
  emit(draft, { type: "meter-changed", playerId, delta: -amount, meter });
  return null;
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
  grantMeter(draft, dealer, hpLost * draft.config.meterPerDamageDealt);
}

export function setComboCount(draft: Draft, playerId: PlayerId, comboCount: number): void {
  const player = draft.players[playerId];
  if (player === undefined || player.comboCount === comboCount) return;
  patchPlayer(draft, playerId, { comboCount });
  emit(draft, { type: "combo-changed", playerId, comboCount });
}
