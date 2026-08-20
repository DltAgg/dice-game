import type { MatchView } from "@/store/matchStore";

/** URL for each shell tab. Play lives at `/play`; `/` aliases it. */
export const APP_PATHS = {
  lobby: "/play",
  match: "/match",
  decks: "/decks",
  catalogue: "/catalogue",
  metrics: "/metrics",
} as const satisfies { readonly [V in MatchView]: `/${string}` };

export const APP_NAV = [
  { to: APP_PATHS.lobby, label: "Play" },
  { to: APP_PATHS.match, label: "Match" },
  { to: APP_PATHS.decks, label: "Decks" },
  { to: APP_PATHS.catalogue, label: "Catalogue" },
  { to: APP_PATHS.metrics, label: "Metrics" },
] as const;

export function pathFromView(view: MatchView): string {
  return APP_PATHS[view];
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** Unknown paths fall back to Play so a bad bookmark is not a trapped view. */
export function viewFromPath(pathname: string): MatchView {
  switch (normalizePath(pathname)) {
    case "/":
    case APP_PATHS.lobby:
      return "lobby";
    case APP_PATHS.match:
      return "match";
    case APP_PATHS.decks:
      return "decks";
    case APP_PATHS.catalogue:
      return "catalogue";
    case APP_PATHS.metrics:
      return "metrics";
    default:
      return "lobby";
  }
}
