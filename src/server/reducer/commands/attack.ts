import { getCreatureDefinition } from "../../content/creatures.js";
import type { GameError } from "../../model/errors.js";
import type { AttackId, CreatureId, PlayerId } from "../../model/ids.js";
import { attackDamageBonus } from "../../rules/cards.js";
import { attackIsUnlocked } from "../../rules/attackUnlock.js";
import { isCreatureSilenced } from "../../rules/silence.js";
import { targetingError } from "../../rules/targeting.js";
import { buildAttackLink, openReactionWindow, pushChainLink } from "../chain.js";
import { emit, patchCreature, type Draft } from "../draft.js";
import { drainResolution } from "../resolution.js";
import { fireOnAttack } from "../triggers.js";

/* ------------------------------------------------------------ combat --- */

export function attack(
  draft: Draft,
  playerId: PlayerId,
  attackerId: CreatureId,
  attackId: AttackId,
  targetId: CreatureId,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";

  const attacker = draft.creatures[attackerId];
  if (attacker === undefined) return "UNKNOWN_ENTITY";
  if (attacker.ownerId !== playerId) return "INVALID_TARGET";
  if (attacker.defeated) return "CREATURE_DEFEATED";
  if (
    attacker.attacksUsedThisCombat >=
    draft.config.attacksPerCreaturePerCombat + attacker.extraAttacksThisTurn
  ) {
    return "ATTACK_ALREADY_USED";
  }

  const definition = getCreatureDefinition(attacker.definitionId);
  const attackDefinition = definition?.attacks.find((candidate) => candidate.id === attackId);
  if (attackDefinition === undefined) return "CARD_NOT_AVAILABLE";
  if (attackDefinition.effect === undefined) return "CARD_HAS_NO_EFFECT";

  const targeting = targetingError(draft, attackerId, attackDefinition, targetId);
  if (targeting !== null) return targeting;

  // Unlock is the owner's currently showing faces (spec `028`). No pile
  // check, no Spend burn, no Resonance wildcards.
  if (!attackIsUnlocked(draft, playerId, attackDefinition)) {
    return "ATTACK_NOT_UNLOCKED";
  }

  emit(draft, { type: "attack-declared", attackerId, attackId: attackDefinition.id, targetId });
  patchCreature(draft, attackerId, {
    attacksUsedThisCombat: attacker.attacksUsedThisCombat + 1,
  });

  const baseEffect = attackDefinition.effect;
  const turnBonus = draft.attackBonusThisTurn[playerId] ?? 0;
  const creatureBonus = attacker.nextAttackBonus;
  const effect =
    baseEffect.type === "damage"
      ? {
          ...baseEffect,
          amount:
            baseEffect.amount +
            attackDamageBonus(draft, attackerId, attackDefinition.kind) +
            turnBonus +
            creatureBonus,
        }
      : baseEffect;

  if (turnBonus > 0) {
    const nextBonus = { ...draft.attackBonusThisTurn };
    delete nextBonus[playerId];
    draft.attackBonusThisTurn = nextBonus;
  }
  if (creatureBonus > 0) {
    patchCreature(draft, attackerId, { nextAttackBonus: 0 });
  }

  const silenced = isCreatureSilenced(draft, attackerId);
  pushChainLink(
    draft,
    buildAttackLink({
      controllerId: playerId,
      attackerId,
      attackId: attackDefinition.id,
      targetId,
      attackEffect: effect,
      attackFollowUpEffects: silenced ? [] : (attackDefinition.followUpEffects ?? []),
    }),
  );
  fireOnAttack(draft, attackerId, attackDefinition.kind, targetId);
  drainResolution(draft);
  openReactionWindow(draft, playerId);
  return null;
}
