import { getCreatureDefinition } from "../../content/creatures.js";
import type { GameError } from "../../model/errors.js";
import type { AttackId, CreatureId, PlayerId } from "../../model/ids.js";
import { attackDamageBonus } from "../../rules/cards.js";
import { isCreatureSilenced } from "../../rules/silence.js";
import { targetingError } from "../../rules/targeting.js";
import {
  attackIsFuelled,
  isNonEmptyRequirement,
  pileRequirementShortfall,
} from "../../rules/tokens.js";
import { buildAttackLink, openReactionWindow, pushChainLink } from "../chain.js";
import { emit, patchCreature, type Draft } from "../draft.js";
import { consumeRequirementWildcards, payPileSpend } from "../payments.js";
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

  // Paid from the owner's attribute pile (spec `016`). `requires` is a
  // gate (not spent); `discards` (`[Spend]`) is checked and burned. Both
  // may apply. Resonance wildcards cover shortfall on either. Same-turn
  // bank → attack is legal.
  const pile = draft.players[playerId]?.attributePool ?? {};
  const wildcards = draft.requirementWildcardsThisTurn[playerId] ?? [];
  if (!attackIsFuelled(pile, attackDefinition, wildcards.length)) {
    return "ATTACK_NOT_FUELLED";
  }
  const requires = isNonEmptyRequirement(attackDefinition.requires)
    ? attackDefinition.requires
    : undefined;
  const discards = isNonEmptyRequirement(attackDefinition.discards)
    ? attackDefinition.discards
    : undefined;

  emit(draft, { type: "attack-declared", attackerId, attackId: attackDefinition.id, targetId });
  patchCreature(draft, attackerId, {
    attacksUsedThisCombat: attacker.attacksUsedThisCombat + 1,
  });
  if (requires !== undefined) {
    const short = pileRequirementShortfall(pile, requires);
    if (short > 0) consumeRequirementWildcards(draft, playerId, short);
  }
  if (discards !== undefined) {
    const spendError = payPileSpend(draft, playerId, discards, attackerId);
    if (spendError !== null) return spendError;
  }

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
