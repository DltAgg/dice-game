import type { MatchMode } from "./types.js";

/** Store `mode` plus vs-AI seat → metrics `recordedAs`. */
export function recordedAsFor(
  mode: "local" | "host" | "client",
  aiPlayerId: string | null,
): MatchMode {
  if (mode === "local" && aiPlayerId !== null) return "local-ai";
  return mode;
}

export function recordedAsLabel(mode: MatchMode): string {
  switch (mode) {
    case "local":
      return "hotseat";
    case "local-ai":
      return "vs AI";
    case "host":
      return "host";
    case "client":
      return "guest";
  }
}

export function recordedAsMix(
  recordings: readonly { readonly recordedAs: MatchMode }[],
): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const recording of recordings) {
    const key = recordedAsLabel(recording.recordedAs);
    mix[key] = (mix[key] ?? 0) + 1;
  }
  return mix;
}
