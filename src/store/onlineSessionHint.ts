import type { GameState } from "@/game";
import type { SavedDeckId } from "@/decks";

const STORAGE_KEY = "dice-skirmish.online-session.v1";

/**
 * Tab-scoped reconnect hint (sessionStorage). Not durable match persistence:
 * a new tab, another device, or an expired PeerJS id cannot recover the match.
 */
export interface OnlineSessionHint {
  readonly v: 1;
  readonly role: "host" | "guest";
  readonly roomCode: string;
  readonly deckId: SavedDeckId;
  readonly seed?: number;
  /** Host-only snapshot of the last authoritative state (JSON clone). */
  readonly state?: GameState;
}

function sessionStore(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function readOnlineSessionHint(): OnlineSessionHint | null {
  const storage = sessionStore();
  if (storage === null) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("v" in parsed) ||
      parsed.v !== 1 ||
      !("role" in parsed) ||
      (parsed.role !== "host" && parsed.role !== "guest") ||
      !("roomCode" in parsed) ||
      typeof parsed.roomCode !== "string" ||
      !("deckId" in parsed) ||
      typeof parsed.deckId !== "string"
    ) {
      return null;
    }
    const hint = parsed as OnlineSessionHint;
    return hint;
  } catch {
    return null;
  }
}

export function writeOnlineSessionHint(hint: OnlineSessionHint): void {
  const storage = sessionStore();
  if (storage === null) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(hint));
  } catch {
    // Quota or private-mode — reconnect just won't auto-resume.
  }
}

export function clearOnlineSessionHint(): void {
  const storage = sessionStore();
  if (storage === null) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
