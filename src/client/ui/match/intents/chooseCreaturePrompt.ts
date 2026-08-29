import type { EffectDefinition } from "@server";
import type { CreatureChoiceFilter, GameState, PendingEffect } from "@server";

function selectorNeedsChoice(
  selector: { readonly kind: string } | null | undefined,
): boolean {
  return selector?.kind.startsWith("choose-") === true;
}

function effectNeedsCreatureChoice(effect: EffectDefinition): boolean {
  if (effect.type === "drain-life") {
    return selectorNeedsChoice(effect.target);
  }
  if (effect.type === "swap-positions") {
    return selectorNeedsChoice(effect.with);
  }
  if ("target" in effect && typeof effect.target === "object") {
    return selectorNeedsChoice(effect.target);
  }
  return false;
}

function queuedCreatureChoices(stack: readonly PendingEffect[]): number {
  return stack.filter((pending) => effectNeedsCreatureChoice(pending.effect)).length;
}

export function pendingChoiceQueue(state: GameState): {
  readonly step: number;
  readonly total: number;
} {
  const queued = queuedCreatureChoices(state.resolutionStack);
  const absorbPending = state.rollBankQueue.length;
  const current = state.pendingDecision?.type === "choose-creature" ? 1 : 0;
  const total = Math.max(1, queued + current + absorbPending);
  const step = Math.max(1, total - queued);
  return { step, total };
}

export function chooseCreaturePrompt(
  state: GameState,
  filter: CreatureChoiceFilter,
): { readonly title: string; readonly detail: string } {
  const pending = state.pendingDecision;
  const effect =
    pending?.type === "choose-creature" ? pending.deferred?.effect : undefined;
  const queue = pendingChoiceQueue(state);
  const stepLabel =
    queue.total > 1 ? ` (${String(queue.step)} of ${String(queue.total)})` : "";

  if (effect?.type === "drain-life") {
    if (filter === "enemy" || effect.target.kind === "choose-enemy") {
      return {
        title: `Drain — choose enemy${stepLabel}`,
        detail: "Deal damage to this creature; your most-damaged ally is healed for HP lost.",
      };
    }
    if (filter === "ally") {
      return {
        title: `Drain — choose ally to heal${stepLabel}`,
        detail: "Heal this creature for the HP lost from the drain target.",
      };
    }
  }
  if (effect?.type === "heal") {
    return {
      title: `Heal — choose ally${stepLabel}`,
      detail: "This creature is healed.",
    };
  }
  if (effect?.type === "grant-shield") {
    return {
      title: `Shield — choose ally${stepLabel}`,
      detail: "Grant Shield to this creature.",
    };
  }
  if (effect?.type === "grant-attack-prevent") {
    return {
      title: `Prevent — choose ally${stepLabel}`,
      detail: "Grant attack-prevent to this creature (reaction window only).",
    };
  }
  if (effect?.type === "destroy-equipment") {
    return {
      title: `Destroy equipment${stepLabel}`,
      detail: "Choose an enemy creature with equipment to destroy.",
    };
  }

  return {
    title: `Choose creature${stepLabel}`,
    detail: filter === "enemy" ? "Pick an enemy creature." : "Pick one of your creatures.",
  };
}

export function deferredEffectType(
  state: GameState,
): EffectDefinition["type"] | undefined {
  const pending = state.pendingDecision;
  if (pending?.type !== "choose-creature") return undefined;
  return pending.deferred?.effect.type;
}
