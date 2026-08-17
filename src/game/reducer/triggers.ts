import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type {
  CreatureRelation,
  PlayerRelation,
  StandingTrigger,
} from "../model/cards.js";
import type { BattlefieldPosition } from "../model/creatures.js";
import type { FaceKind } from "../model/dice.js";
import type { EffectDefinition } from "../model/effects.js";
import {
  asEffectInstanceId,
  type CardInstanceId,
  type CreatureId,
  type DieId,
  type FaceCardId,
  type PlayerId,
} from "../model/ids.js";
import type { SymbolType } from "../model/symbols.js";
import { nextInstanceId, patchCreature, type Draft } from "./draft.js";

/**
 * Shared standing-trigger hooks (`010-trigger-hooks`). Catalogue data lists
 * effects and relation filters; this module only decides *when* to queue them.
 *
 * Principle: one system event → rich context ids → filters on the ability.
 * See `.cursor/skills/implement-hooks/SKILL.md`.
 *
 * Intentionally does not import `resolution.ts` (that module calls these hooks
 * while draining the stack).
 */

type TriggerHost = {
  readonly keyPrefix: string;
  /** Player who owns the ability for effect choices / stack controller. */
  readonly effectControllerId: PlayerId;
  /** Owner used for controller/opponent/ally filters (bearer for equipment). */
  readonly filterOwnerId: PlayerId;
  readonly hostCreatureId: CreatureId | null;
  /** Ritual instance id; equipment / creature hosts leave this null. */
  readonly hostCardInstanceId: CardInstanceId | null;
  readonly abilities: readonly StandingTrigger[];
};

/**
 * Who absorbed the symbol. Shared `on-absorb` event — not a coupled ritual hook.
 * Identity is the instance id (creature or ritual card), never a definition id.
 */
export type AbsorbAbsorber =
  | { readonly kind: "creature"; readonly id: CreatureId }
  | { readonly kind: "ritual"; readonly id: CardInstanceId };

function pushEffect(
  draft: Draft,
  controllerId: PlayerId,
  effect: EffectDefinition,
  sourceCreatureId: CreatureId | null,
  declaredTargetCreatureId: CreatureId | null,
  sourceDieId: DieId | null = null,
  sourceSlotIndex: number | null = null,
): void {
  draft.resolutionStack.push({
    id: asEffectInstanceId(nextInstanceId(draft, "effect")),
    controllerId,
    effect,
    sourceCreatureId,
    declaredTargetCreatureId,
    declaredTargetCardInstanceId: null,
    sourceDieId,
    sourceSlotIndex,
    ignoreShield: 0,
  });
}

function pushAbilityEffects(
  draft: Draft,
  controllerId: PlayerId,
  sourceCreatureId: CreatureId | null,
  declaredTargetCreatureId: CreatureId | null,
  effects: readonly EffectDefinition[],
): void {
  for (const effect of [...effects].reverse()) {
    pushEffect(draft, controllerId, effect, sourceCreatureId, declaredTargetCreatureId);
  }
}

function matchesCreatureRelation(
  relation: CreatureRelation,
  hostCreatureId: CreatureId | null,
  hostOwnerId: PlayerId,
  subjectCreatureId: CreatureId,
  subjectOwnerId: PlayerId,
): boolean {
  switch (relation) {
    case "any":
      return true;
    case "self":
      return hostCreatureId !== null && subjectCreatureId === hostCreatureId;
    case "ally":
      return subjectOwnerId === hostOwnerId;
    case "ally-other":
      return subjectOwnerId === hostOwnerId && subjectCreatureId !== hostCreatureId;
  }
}

function absorberIsHost(host: TriggerHost, absorber: AbsorbAbsorber): boolean {
  if (absorber.kind === "creature") {
    return host.hostCreatureId !== null && absorber.id === host.hostCreatureId;
  }
  return host.hostCardInstanceId !== null && absorber.id === host.hostCardInstanceId;
}

function matchesAbsorberRelation(
  relation: CreatureRelation,
  host: TriggerHost,
  absorber: AbsorbAbsorber,
  absorberOwnerId: PlayerId,
): boolean {
  switch (relation) {
    case "any":
      return true;
    case "self":
      return absorberIsHost(host, absorber);
    case "ally":
      return absorberOwnerId === host.filterOwnerId;
    case "ally-other":
      return absorberOwnerId === host.filterOwnerId && !absorberIsHost(host, absorber);
  }
}

function matchesPlayerRelation(
  relation: PlayerRelation,
  hostControllerId: PlayerId,
  subjectPlayerId: PlayerId,
): boolean {
  switch (relation) {
    case "any":
      return true;
    case "controller":
      return subjectPlayerId === hostControllerId;
    case "opponent":
      return subjectPlayerId !== hostControllerId;
  }
}

function onceKey(prefix: string, triggerType: string): string {
  return `${prefix}:${triggerType}`;
}

function isSpent(draft: Draft, creatureId: CreatureId | null, key: string): boolean {
  if (creatureId === null) return false;
  return draft.creatures[creatureId]?.spentOncePerTurnTriggers.includes(key) ?? false;
}

function markSpent(draft: Draft, creatureId: CreatureId | null, key: string): void {
  if (creatureId === null) return;
  const creature = draft.creatures[creatureId];
  if (creature === undefined) return;
  if (creature.spentOncePerTurnTriggers.includes(key)) return;
  patchCreature(draft, creatureId, {
    spentOncePerTurnTriggers: [...creature.spentOncePerTurnTriggers, key],
  });
}

/** Collect equipment + creature passives + ready continuous rituals. */
function collectHosts(draft: Draft): TriggerHost[] {
  const hosts: TriggerHost[] = [];

  for (const creature of Object.values(draft.creatures)) {
    if (creature.defeated) continue;

    const definition = getCreatureDefinition(creature.definitionId);
    const standing = definition?.standingAbilities ?? [];
    if (standing.length > 0) {
      hosts.push({
        keyPrefix: `creature:${creature.id}`,
        effectControllerId: creature.ownerId,
        filterOwnerId: creature.ownerId,
        hostCreatureId: creature.id,
        hostCardInstanceId: null,
        abilities: standing,
      });
    }

    for (const cardInstanceId of creature.equipmentIds) {
      const instance = draft.cards[cardInstanceId];
      if (instance === undefined) continue;
      const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
      if (abilities.length === 0) continue;
      hosts.push({
        keyPrefix: `equip:${cardInstanceId}`,
        effectControllerId: instance.ownerId,
        // Bearer's owner — Black Plague on an opposing host keys off that
        // creature's controller rolling, not the card owner's roll.
        filterOwnerId: creature.ownerId,
        hostCreatureId: creature.id,
        hostCardInstanceId: null,
        abilities,
      });
    }
  }

  for (const card of Object.values(draft.cards)) {
    if (card.zone !== "ritual" || card.ritualOrientation !== "ready") continue;
    const definition = getCard(card.cardId);
    if (definition?.type !== "ritual") continue;
    if (!definition.subtypes.includes("continuous")) continue;
    const abilities = definition.ritual?.standingAbilities ?? [];
    if (abilities.length === 0) continue;
    hosts.push({
      keyPrefix: `ritual:${card.id}`,
      effectControllerId: card.ownerId,
      filterOwnerId: card.ownerId,
      hostCreatureId: null,
      hostCardInstanceId: card.id,
      abilities,
    });
  }

  return hosts;
}

/** After the bearer deals HP damage to `damagedCreatureId`. */
export function fireOnDealDamage(
  draft: Draft,
  sourceCreatureId: CreatureId,
  damagedCreatureId: CreatureId,
): void {
  const creature = draft.creatures[sourceCreatureId];
  if (creature === undefined || creature.defeated) return;

  for (const cardInstanceId of creature.equipmentIds) {
    const instance = draft.cards[cardInstanceId];
    if (instance === undefined) continue;
    const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
    for (const ability of abilities) {
      if (ability.type !== "on-deal-damage") continue;
      pushAbilityEffects(
        draft,
        instance.ownerId,
        sourceCreatureId,
        damagedCreatureId,
        ability.effects,
      );
    }
  }
}

/**
 * After a toxin tick deals HP damage to `damagedCreatureId`. Fires gear on
 * creatures owned by that creature's controller.
 */
export function fireOnToxinDamage(draft: Draft, damagedCreatureId: CreatureId): void {
  const damaged = draft.creatures[damagedCreatureId];
  if (damaged === undefined) return;
  const owner = draft.players[damaged.ownerId];
  if (owner === undefined) return;

  for (const creatureId of owner.creatureIds) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    for (const cardInstanceId of creature.equipmentIds) {
      const instance = draft.cards[cardInstanceId];
      if (instance === undefined) continue;
      const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
      for (const ability of abilities) {
        if (ability.type !== "on-toxin-damage") continue;
        pushAbilityEffects(draft, instance.ownerId, creatureId, null, ability.effects);
      }
    }
  }
}

/** During roll: equipment / passives keyed to the showing symbol. */
export function fireOnRollSymbol(
  draft: Draft,
  rollingPlayerId: PlayerId,
  symbol: SymbolType,
): void {
  for (const host of collectHosts(draft)) {
    for (const ability of host.abilities) {
      if (ability.type !== "on-roll-symbol") continue;
      if (ability.symbol !== symbol) continue;
      const relation = ability.rollingPlayer ?? "controller";
      if (!matchesPlayerRelation(relation, host.filterOwnerId, rollingPlayerId)) continue;
      pushAbilityEffects(
        draft,
        host.effectControllerId,
        host.hostCreatureId,
        host.hostCreatureId,
        ability.effects,
      );
    }
  }
}

/** @deprecated Prefer `fireOnRollSymbol` — kept name for older call sites. */
export const fireEquipmentOnRollSymbol = fireOnRollSymbol;

/** Queue absorb triggers (caller must `drainResolution`). */
export function queueAbsorbTriggers(
  draft: Draft,
  absorbingPlayerId: PlayerId,
  absorber: AbsorbAbsorber,
  symbol: SymbolType,
  sourceDieId: DieId | null,
): void {
  let faceKind: FaceKind | null = null;
  let faceCardId: FaceCardId | undefined;

  if (sourceDieId !== null) {
    const die = draft.dice[sourceDieId];
    const slotIndex = die?.rolledSlotIndex;
    if (die !== undefined && slotIndex !== null && slotIndex !== undefined) {
      faceCardId = die.slots[slotIndex]?.faceCardId;
      if (faceCardId !== undefined) {
        faceKind = getFaceCard(faceCardId)?.kind ?? null;
      }
    }
  }

  fireOnAbsorb(draft, absorber, absorbingPlayerId, symbol, faceKind);

  // Face/overload onAbsorb are bible §7 die-on-creature absorb. Ritual Active-when
  // assignment shares standing `on-absorb` only — no absorbing creature, no die marker.
  if (absorber.kind !== "creature") return;
  if (faceCardId === undefined) return;
  const die = sourceDieId === null ? undefined : draft.dice[sourceDieId];
  const slotIndex = die?.rolledSlotIndex ?? null;
  // Absorbing creature is the face/overload source so `source-creature` targets
  // (e.g. Vital Spark prevent) resolve against the absorber.
  fireFaceOnAbsorb(draft, absorbingPlayerId, faceCardId, absorber.id, sourceDieId, slotIndex);
  fireOverloadsOnAbsorb(draft, absorbingPlayerId, faceCardId, absorber.id, sourceDieId, slotIndex);
}

function fireOnAbsorb(
  draft: Draft,
  absorber: AbsorbAbsorber,
  absorberOwnerId: PlayerId,
  symbol: SymbolType,
  faceKind: FaceKind | null,
): void {
  for (const host of collectHosts(draft)) {
    for (const ability of host.abilities) {
      if (ability.type !== "on-absorb") continue;
      if (ability.symbols !== undefined && !ability.symbols.includes(symbol)) continue;
      if (
        ability.faceKinds !== undefined &&
        (faceKind === null || !ability.faceKinds.includes(faceKind))
      ) {
        continue;
      }
      const relation = ability.absorberRelation ?? "self";
      if (!matchesAbsorberRelation(relation, host, absorber, absorberOwnerId)) {
        continue;
      }
      const declaredTarget =
        absorber.kind === "creature" ? absorber.id : null;
      pushAbilityEffects(
        draft,
        host.effectControllerId,
        host.hostCreatureId ?? declaredTarget,
        declaredTarget,
        ability.effects,
      );
    }
  }
}

function fireFaceOnAbsorb(
  draft: Draft,
  controllerId: PlayerId,
  faceCardId: FaceCardId,
  absorbingCreatureId: CreatureId,
  sourceDieId: DieId | null,
  sourceSlotIndex: number | null,
): void {
  const face = getFaceCard(faceCardId);
  if (face === undefined || face.onAbsorb.length === 0) return;
  for (const effect of [...face.onAbsorb].reverse()) {
    pushEffect(
      draft,
      controllerId,
      effect,
      absorbingCreatureId,
      null,
      sourceDieId,
      sourceSlotIndex,
    );
  }
}

function fireOverloadsOnAbsorb(
  draft: Draft,
  controllerId: PlayerId,
  faceCardId: FaceCardId,
  absorbingCreatureId: CreatureId,
  sourceDieId: DieId | null,
  sourceSlotIndex: number | null,
): void {
  const player = draft.players[controllerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.overload) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId !== faceCardId) continue;
    const effects = getCard(card.cardId)?.overload?.onAbsorb ?? [];
    for (const effect of [...effects].reverse()) {
      pushEffect(
        draft,
        controllerId,
        effect,
        absorbingCreatureId,
        null,
        sourceDieId,
        sourceSlotIndex,
      );
    }
  }
}

/** After an attack is declared (costs paid, chain link pushed). */
export function fireOnAttack(
  draft: Draft,
  attackerId: CreatureId,
  attackKind: "basic" | "special",
  targetId: CreatureId,
): void {
  const attacker = draft.creatures[attackerId];
  if (attacker === undefined) return;

  for (const host of collectHosts(draft)) {
    for (const ability of host.abilities) {
      if (ability.type !== "on-attack") continue;
      if (ability.attackKinds !== undefined && !ability.attackKinds.includes(attackKind)) {
        continue;
      }
      const relation = ability.attackerRelation ?? "self";
      if (
        !matchesCreatureRelation(
          relation,
          host.hostCreatureId,
          host.filterOwnerId,
          attackerId,
          attacker.ownerId,
        )
      ) {
        continue;
      }
      const key = onceKey(host.keyPrefix, "on-attack");
      if (ability.oncePerTurn && isSpent(draft, host.hostCreatureId, key)) continue;
      if (ability.oncePerTurn) markSpent(draft, host.hostCreatureId, key);
      pushAbilityEffects(
        draft,
        host.effectControllerId,
        host.hostCreatureId,
        targetId,
        ability.effects,
      );
    }
  }

  // Turn-armed toxin (Toxic Blessing): all of this player's attacks apply toxin.
  const toxinAmount = draft.attackToxinThisTurn[attacker.ownerId] ?? 0;
  if (toxinAmount > 0) {
    pushEffect(
      draft,
      attacker.ownerId,
      { type: "apply-toxin", amount: toxinAmount, target: { kind: "declared-target" } },
      attackerId,
      targetId,
    );
  }
}

/**
 * Reduce incoming damage for `on-take-damage` abilities with `reduceBy`.
 * Returns the amount after reductions (never below 0). Marks once-per-turn.
 */
export function applyOnTakeDamageReduce(
  draft: Draft,
  damagedCreatureId: CreatureId,
  amount: number,
): number {
  let remaining = amount;
  const creature = draft.creatures[damagedCreatureId];
  if (creature === undefined || remaining <= 0) return remaining;

  for (const cardInstanceId of creature.equipmentIds) {
    const instance = draft.cards[cardInstanceId];
    if (instance === undefined) continue;
    const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
    for (const ability of abilities) {
      if (ability.type !== "on-take-damage") continue;
      if (ability.reduceBy === undefined || ability.reduceBy <= 0) continue;
      const key = onceKey(`equip:${cardInstanceId}`, "on-take-damage");
      if (ability.oncePerTurn && isSpent(draft, damagedCreatureId, key)) continue;
      const cut = Math.min(ability.reduceBy, remaining);
      if (cut <= 0) continue;
      remaining -= cut;
      if (ability.oncePerTurn) markSpent(draft, damagedCreatureId, key);
    }
  }

  const standing = getCreatureDefinition(creature.definitionId)?.standingAbilities ?? [];
  for (const ability of standing) {
    if (ability.type !== "on-take-damage") continue;
    if (ability.reduceBy === undefined || ability.reduceBy <= 0) continue;
    const key = onceKey(`creature:${damagedCreatureId}`, "on-take-damage");
    if (ability.oncePerTurn && isSpent(draft, damagedCreatureId, key)) continue;
    const cut = Math.min(ability.reduceBy, remaining);
    if (cut <= 0) continue;
    remaining -= cut;
    if (ability.oncePerTurn) markSpent(draft, damagedCreatureId, key);
  }

  return remaining;
}

/** After HP damage is dealt, queue optional on-take-damage effects. */
export function fireOnTakeDamageEffects(
  draft: Draft,
  damagedCreatureId: CreatureId,
): void {
  const creature = draft.creatures[damagedCreatureId];
  if (creature === undefined) return;

  for (const cardInstanceId of creature.equipmentIds) {
    const instance = draft.cards[cardInstanceId];
    if (instance === undefined) continue;
    const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
    for (const ability of abilities) {
      if (ability.type !== "on-take-damage") continue;
      if (ability.effects === undefined || ability.effects.length === 0) continue;
      pushAbilityEffects(
        draft,
        instance.ownerId,
        damagedCreatureId,
        damagedCreatureId,
        ability.effects,
      );
    }
  }
}

/** After cards are discarded from hand. */
export function fireOnDiscard(draft: Draft, discardingPlayerId: PlayerId): void {
  for (const host of collectHosts(draft)) {
    for (const ability of host.abilities) {
      if (ability.type !== "on-discard") continue;
      const relation = ability.discardingPlayer ?? "controller";
      if (!matchesPlayerRelation(relation, host.filterOwnerId, discardingPlayerId)) continue;
      pushAbilityEffects(
        draft,
        host.effectControllerId,
        host.hostCreatureId,
        null,
        ability.effects,
      );
    }
  }
}

/** After a creature changes battlefield position (ally swap / reposition). */
export function fireOnChangePosition(
  draft: Draft,
  creatureId: CreatureId,
  _from: BattlefieldPosition,
  _to: BattlefieldPosition,
): void {
  void _from;
  void _to;
  const moved = draft.creatures[creatureId];
  if (moved === undefined) return;

  for (const host of collectHosts(draft)) {
    for (const ability of host.abilities) {
      if (ability.type !== "on-change-position") continue;
      const relation = ability.creatureRelation ?? "self";
      if (
        !matchesCreatureRelation(
          relation,
          host.hostCreatureId,
          host.filterOwnerId,
          creatureId,
          moved.ownerId,
        )
      ) {
        continue;
      }
      pushAbilityEffects(
        draft,
        host.effectControllerId,
        host.hostCreatureId,
        creatureId,
        ability.effects,
      );
    }
  }
}

/** Clear once-per-turn trigger spend and creature next-attack bonuses. */
export function clearTurnTriggerState(draft: Draft): void {
  for (const creature of Object.values(draft.creatures)) {
    if (
      creature.spentOncePerTurnTriggers.length === 0 &&
      creature.nextAttackBonus === 0 &&
      creature.redirectDamageThisTurn === 0 &&
      creature.nextIncomingDamageBonus === 0
    ) {
      continue;
    }
    patchCreature(draft, creature.id, {
      spentOncePerTurnTriggers: [],
      nextAttackBonus: 0,
      redirectDamageThisTurn: 0,
      nextIncomingDamageBonus: 0,
    });
  }
  for (const player of Object.values(draft.players)) {
    if (player.spentOncePerTurnKeys.length === 0) continue;
    draft.players[player.id] = { ...player, spentOncePerTurnKeys: [] };
  }
}
