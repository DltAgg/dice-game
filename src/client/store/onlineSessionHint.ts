import type { GameState } from "@server";
import type { SavedDeckId } from "@client/decks";
import {
  generateClientId,
  isSeatId,
  type PersistedRoom,
  type SeatId,
} from "@client/networking";

const STORAGE_KEY = "dice-skirmish.online-session.v1";
const CLIENT_ID_KEY = "dice-skirmish.client-id";

/**
 * Tab-scoped reconnect hint (sessionStorage). Not durable match persistence:
 * a new tab, another device, or an expired PeerJS id cannot recover the match.
 */
export interface OnlineSessionHint {
  readonly v: 1;
  readonly role: "host" | "client";
  readonly roomCode: string;
  readonly clientId: string;
  readonly seat: SeatId | null;
  readonly deckId?: SavedDeckId;
  readonly seed?: number;
  /** Host-only snapshot of the last authoritative state (JSON clone). */
  readonly state?: GameState;
  /** Host-only seat map so reconnect rebinds by clientId. */
  readonly room?: PersistedRoom;
}

function sessionStore(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

let memoryClientId: string | null = null;

/** Stable per-tab identity for seat rebinding after a PeerJS id change. */
export function getOrCreateClientId(): string {
  if (memoryClientId !== null) return memoryClientId;
  const storage = sessionStore();
  if (storage !== null) {
    const existing = storage.getItem(CLIENT_ID_KEY);
    if (existing !== null && existing.length > 0) {
      memoryClientId = existing;
      return existing;
    }
  }
  const created = generateClientId();
  memoryClientId = created;
  if (storage !== null) {
    try {
      storage.setItem(CLIENT_ID_KEY, created);
    } catch {
      // ignore
    }
  }
  return created;
}

export function readOnlineSessionHint(): OnlineSessionHint | null {
  const storage = sessionStore();
  if (storage === null) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("v" in parsed) || parsed.v !== 1) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const roleRaw = record.role;
    const role = roleRaw === "host" ? "host" : roleRaw === "guest" || roleRaw === "client" ? "client" : null;
    if (role === null || typeof record.roomCode !== "string") return null;

    const clientId = typeof record.clientId === "string" ? record.clientId : getOrCreateClientId();
    const seat =
      record.seat === null || isSeatId(record.seat)
        ? (record.seat as SeatId | null)
        : role === "host"
          ? "p1"
          : "p2";
    const deckId = typeof record.deckId === "string" ? record.deckId : undefined;

    return {
      v: 1,
      role,
      roomCode: record.roomCode,
      clientId,
      seat,
      ...(deckId !== undefined ? { deckId } : {}),
      ...(typeof record.seed === "number" ? { seed: record.seed } : {}),
      ...("state" in record && record.state !== undefined ? { state: record.state as GameState } : {}),
      ...("room" in record && record.room !== undefined ? { room: record.room as PersistedRoom } : {}),
    };
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
