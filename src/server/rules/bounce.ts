import type { CardInstanceId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { BounceHost, BounceHostChoice } from "../model/targeting.js";
import {
  opposingEquipmentIds,
  opposingOverloadIds,
  opposingRitualIds,
} from "../reducer/cardChoice.js";

const HOST_ORDER: readonly BounceHost[] = ["ritual", "equipment", "overload"];

export function uniqueBounceHosts(hosts: readonly BounceHost[]): readonly BounceHost[] {
  const seen = new Set<BounceHost>();
  const unique: BounceHost[] = [];
  for (const host of HOST_ORDER) {
    if (!hosts.includes(host) || seen.has(host)) continue;
    seen.add(host);
    unique.push(host);
  }
  return unique;
}

export type BounceLegalHost = BounceHostChoice;

export function collectLegalBounceCards(
  state: GameState,
  controllerId: PlayerId,
  hosts: readonly BounceHost[],
): readonly BounceLegalHost[] {
  const allowed = uniqueBounceHosts(hosts);
  if (allowed.length === 0) return [];
  const legal: BounceLegalHost[] = [];

  if (allowed.includes("ritual")) {
    for (const cardInstanceId of opposingRitualIds(state, controllerId)) {
      legal.push({ host: "ritual", cardInstanceId });
    }
  }
  if (allowed.includes("equipment")) {
    for (const cardInstanceId of opposingEquipmentIds(state, controllerId)) {
      legal.push({ host: "equipment", cardInstanceId });
    }
  }
  if (allowed.includes("overload")) {
    for (const cardInstanceId of opposingOverloadIds(state, controllerId)) {
      legal.push({ host: "overload", cardInstanceId });
    }
  }
  return legal;
}

export function isLegalBounceChoice(
  legal: readonly BounceLegalHost[],
  choice: BounceHostChoice,
): boolean {
  return legal.some((entry) => sameBounceHost(entry, choice));
}

function sameBounceHost(a: BounceLegalHost, b: BounceHostChoice): boolean {
  return a.host === b.host && a.cardInstanceId === b.cardInstanceId;
}

export function bounceCardInstanceId(choice: BounceHostChoice): CardInstanceId {
  return choice.cardInstanceId;
}
