import type { CardInstanceId, CreatureId, DieId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { SilenceHost, SilenceHostChoice } from "../model/targeting.js";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";
import { livingCreaturesOf, opponentOf } from "./creatures.js";

const HOST_ORDER: readonly SilenceHost[] = ["creature", "ritual", "face"];

export function uniqueSilenceHosts(hosts: readonly SilenceHost[]): readonly SilenceHost[] {
  const seen = new Set<SilenceHost>();
  const unique: SilenceHost[] = [];
  for (const host of HOST_ORDER) {
    if (!hosts.includes(host) || seen.has(host)) continue;
    seen.add(host);
    unique.push(host);
  }
  return unique;
}

/** Absolute turn when silence expires (`state.turn + 2`). OPEN_DESIGN ASSUMED. */
export function silenceExpiresOnTurn(state: Pick<GameState, "turn">): number {
  return state.turn + 2;
}

function isActive(expiresOnTurn: number | undefined, turn: number): boolean {
  return expiresOnTurn !== undefined && turn < expiresOnTurn;
}

export function isCreatureSilenced(state: GameState, creatureId: CreatureId): boolean {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return false;
  return isActive(creature.silenceExpiresOnTurn, state.turn);
}

export function isRitualSilenced(state: GameState, cardInstanceId: CardInstanceId): boolean {
  const card = state.cards[cardInstanceId];
  if (card === undefined || card.zone !== "ritual") return false;
  return isActive(card.silenceExpiresOnTurn, state.turn);
}

export function isSlotSilenced(state: GameState, dieId: DieId, slotIndex: number): boolean {
  const slot = state.dice[dieId]?.slots[slotIndex];
  if (slot === undefined) return false;
  return isActive(slot.silenceExpiresOnTurn, state.turn);
}

export type SilenceLegalHost = SilenceHostChoice;

export function collectLegalSilenceHosts(
  state: GameState,
  controllerId: PlayerId,
  hosts: readonly SilenceHost[],
): readonly SilenceLegalHost[] {
  const allowed = uniqueSilenceHosts(hosts);
  if (allowed.length === 0) return [];
  const enemyId = opponentOf(state, controllerId);
  const legal: SilenceLegalHost[] = [];

  if (allowed.includes("creature")) {
    for (const creature of livingCreaturesOf(state, enemyId)) {
      legal.push({ host: "creature", creatureId: creature.id });
    }
  }

  if (allowed.includes("ritual")) {
    const enemy = state.players[enemyId];
    for (const id of enemy?.ritual ?? []) {
      if (state.cards[id]?.zone !== "ritual") continue;
      legal.push({ host: "ritual", cardInstanceId: id });
    }
  }

  if (allowed.includes("face")) {
    const enemy = state.players[enemyId];
    for (const dieId of enemy?.dieIds ?? []) {
      const die = state.dice[dieId];
      if (die === undefined) continue;
      for (let slotIndex = 0; slotIndex < FACE_SLOTS_PER_DIE; slotIndex += 1) {
        if (die.slots[slotIndex] === undefined) continue;
        legal.push({ host: "face", dieId, slotIndex });
      }
    }
  }

  return legal;
}

export function isLegalSilenceChoice(
  legal: readonly SilenceLegalHost[],
  choice: SilenceHostChoice,
): boolean {
  return legal.some((entry) => sameSilenceHost(entry, choice));
}

function sameSilenceHost(a: SilenceLegalHost, b: SilenceHostChoice): boolean {
  if (a.host !== b.host) return false;
  if (a.host === "creature" && b.host === "creature") return a.creatureId === b.creatureId;
  if (a.host === "ritual" && b.host === "ritual") return a.cardInstanceId === b.cardInstanceId;
  if (a.host === "face" && b.host === "face") {
    return a.dieId === b.dieId && a.slotIndex === b.slotIndex;
  }
  return false;
}

/**
 * Drop creature passives / equipment when the bearer is silenced, and ritual
 * hosts when the ritual is silenced. Call from `collectHosts` (one line).
 */
export function filterSilencedHosts<
  T extends {
    readonly hostCreatureId: CreatureId | null;
    readonly hostCardInstanceId: CardInstanceId | null;
  },
>(state: GameState, hosts: readonly T[]): T[] {
  return hosts.filter((host) => {
    if (host.hostCreatureId !== null && isCreatureSilenced(state, host.hostCreatureId)) {
      return false;
    }
    if (host.hostCardInstanceId !== null && isRitualSilenced(state, host.hostCardInstanceId)) {
      return false;
    }
    return true;
  });
}
