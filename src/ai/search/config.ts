export type AiStrength = "fast" | "standard" | "strong";

export interface SearchConfig {
  readonly strength: AiStrength;
  /** 1-ply only; no tree search. */
  readonly lookaheadOnly: boolean;
  readonly minimaxDepth: number;
  readonly minimaxIfAtMost: number;
  readonly branchLimit: number;
  readonly mctsIterations: number;
  readonly rolloutPlies: number;
}

const PRESETS: Readonly<Record<AiStrength, SearchConfig>> = {
  fast: {
    strength: "fast",
    lookaheadOnly: true,
    minimaxDepth: 1,
    minimaxIfAtMost: 0,
    branchLimit: 16,
    mctsIterations: 0,
    rolloutPlies: 0,
  },
  standard: {
    strength: "standard",
    lookaheadOnly: false,
    minimaxDepth: 2,
    minimaxIfAtMost: 10,
    branchLimit: 12,
    mctsIterations: 48,
    rolloutPlies: 6,
  },
  strong: {
    strength: "strong",
    lookaheadOnly: false,
    minimaxDepth: 3,
    minimaxIfAtMost: 14,
    branchLimit: 16,
    mctsIterations: 120,
    rolloutPlies: 8,
  },
};

export function searchConfig(strength: AiStrength = "standard"): SearchConfig {
  return PRESETS[strength];
}

export function parseStrength(raw: string | undefined): AiStrength {
  if (raw === "fast" || raw === "standard" || raw === "strong") return raw;
  return "standard";
}
