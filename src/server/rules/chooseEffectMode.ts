import type { EffectDefinition } from "../model/effects.js";

type ChooseEffectModeEffect = Extract<EffectDefinition, { readonly type: "choose-effect-mode" }>;

export type ChooseEffectModeResolution =
  | { readonly kind: "whiff" }
  | { readonly kind: "auto"; readonly mode: readonly EffectDefinition[] }
  | {
      readonly kind: "choose";
      readonly modes: readonly (readonly EffectDefinition[])[];
      readonly modeLabels: readonly string[];
    };

function defaultModeLabel(index: number): string {
  return `Mode ${String(index + 1)}`;
}

function labelsFor(
  modes: readonly (readonly EffectDefinition[])[],
  modeLabels: readonly string[] | undefined,
): readonly string[] {
  return modes.map((_, index) => modeLabels?.[index] ?? defaultModeLabel(index));
}

/**
 * Choose one: 0 modes → whiff; 1 → auto-pick; 2+ → picker.
 */
export function chooseEffectModeResolution(
  effect: ChooseEffectModeEffect,
): ChooseEffectModeResolution {
  if (effect.modes.length === 0) return { kind: "whiff" };
  if (effect.modes.length === 1) {
    return { kind: "auto", mode: effect.modes[0]! };
  }
  return {
    kind: "choose",
    modes: effect.modes,
    modeLabels: labelsFor(effect.modes, effect.modeLabels),
  };
}
