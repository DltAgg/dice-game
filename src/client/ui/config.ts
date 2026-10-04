/**
 * Front-end knobs that are safe to flip without touching game rules.
 * Prefer editing this file over scattering magic booleans in components.
 */
export const UI_CONFIG = {
  /**
   * When true, the deck-builder preview shows the illustrated card frame on
   * the left of the inspect pane. Set to false to hide art and use the full
   * width for the scrollable text dossier.
   */
  showDeckBuilderCardArt: false,
  /**
   * Opening-dice editor on the Decks tab. Set false to hide that section.
   * Saved loadouts still keep their dice; only the editor is hidden.
   */
  showDeckBuilderOpeningDice: false,
  /**
   * Cost-curve chart on the Decks tab. Set false to hide that section.
   */
  showDeckBuilderCostCurve: false,
  /**
   * Soft Web Audio cues: end-turn thunk + reaction-priority alert.
   * Set false to mute without a chrome toggle.
   */
  matchSfxEnabled: true,
} as const;

export type UiConfig = typeof UI_CONFIG;
