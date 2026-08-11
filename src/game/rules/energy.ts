import type { EnergyRulesConfig } from "../model/config.js";
import type { PlayerId } from "../model/ids.js";
import type { EnergyTrack } from "../model/state.js";

/**
 * The shared Energy track (bible §5 and §18), settled in the design discussion
 * of 2026-08-07 as a Digimon-style memory marker:
 *
 *   - one marker on a track running trackMax .. 0 .. trackMax;
 *   - `value` is the Energy available to `holderId`;
 *   - a spend that pushes the marker past zero ends the turn once the current
 *     action has finished, and the overshoot becomes the incoming player's
 *     Energy;
 *   - landing exactly on zero does not end the turn, because the marker has
 *     not crossed into the opponent's side.
 */

export interface EnergySpendOutcome {
  readonly track: EnergyTrack;
  readonly turnEnds: boolean;
  /** Energy handed to the opponent; zero unless the marker crossed. */
  readonly passedToOpponent: number;
}

export function spendEnergy(
  track: EnergyTrack,
  amount: number,
  opponentId: PlayerId,
  config: EnergyRulesConfig,
): EnergySpendOutcome {
  const remaining = track.value - amount;

  if (remaining >= 0) {
    return {
      track: { holderId: track.holderId, value: remaining },
      turnEnds: false,
      passedToOpponent: 0,
    };
  }

  const overshoot = Math.min(-remaining, config.trackMax);
  return {
    track: { holderId: opponentId, value: overshoot },
    turnEnds: true,
    passedToOpponent: overshoot,
  };
}

/**
 * Ending a turn without crossing the track. The chosen turn-end model leaves
 * this case uncovered, so the amount is a configured prototype assumption
 * rather than a derived rule — see docs/OPEN_DESIGN.md.
 */
export const passEnergy = (opponentId: PlayerId, config: EnergyRulesConfig): EnergyTrack => ({
  holderId: opponentId,
  value: Math.min(config.energyOnVoluntaryPass, config.trackMax),
});

export const energyAvailableTo = (track: EnergyTrack, playerId: PlayerId): number =>
  track.holderId === playerId ? track.value : 0;
