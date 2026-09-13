import { Peer, type DataConnection } from "peerjs";
import type { MessageHandler, NetTransport, PeerHandler } from "./transport.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isUnavailableId(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type: unknown }).type === "unavailable-id"
  );
}

/**
 * PeerJS-backed transport. The host should pass a fixed `localId` (the room
 * code). Guests omit it so PeerJS assigns an ephemeral id, then `connect` to
 * the host room code.
 *
 * Host refresh reuses the same room-code id; PeerJS may still hold it briefly,
 * so `create` retries `unavailable-id`.
 */
export class PeerTransport implements NetTransport {
  readonly localId: string;
  private readonly peer: Peer;
  private readonly connections = new Map<string, DataConnection>();
  private messageHandler: MessageHandler | null = null;
  private connectHandler: PeerHandler | null = null;
  private disconnectHandler: PeerHandler | null = null;
  /** Hellos can arrive before HostSession registers onMessage — buffer until then. */
  private readonly pendingMessages: Array<{ readonly peerId: string; readonly data: unknown }> =
    [];
  private readonly ready: Promise<void>;

  private constructor(peer: Peer, localId: string, ready: Promise<void>) {
    this.peer = peer;
    this.localId = localId;
    this.ready = ready;

    peer.on("connection", (conn) => {
      this.attach(conn);
    });
  }

  static async create(localId?: string): Promise<PeerTransport> {
    const attempts = localId === undefined ? 1 : 6;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await PeerTransport.createOnce(localId);
      } catch (error) {
        lastError = error;
        const retry =
          localId !== undefined && isUnavailableId(error) && attempt < attempts - 1;
        if (!retry) throw error;
        await sleep(350 * (attempt + 1));
      }
    }
    throw lastError;
  }

  private static async createOnce(localId: string | undefined): Promise<PeerTransport> {
    const peer = localId !== undefined ? new Peer(localId) : new Peer();
    const ready = new Promise<void>((resolve, reject) => {
      let settled = false;
      peer.on("open", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      peer.on("error", (error) => {
        if (settled) return;
        settled = true;
        try {
          peer.destroy();
        } catch {
          // ignore
        }
        reject(error);
      });
    });
    await ready;
    return new PeerTransport(peer, peer.id, ready);
  }

  /** Guest: open a data connection to the host's room code. */
  async connect(hostRoomCode: string): Promise<void> {
    await this.ready;
    const existing = this.connections.get(hostRoomCode);
    if (existing?.open === true) return;
    if (existing !== undefined) {
      this.connections.delete(hostRoomCode);
      try {
        existing.close();
      } catch {
        // ignore
      }
    }
    const conn = this.peer.connect(hostRoomCode, { reliable: true });
    await new Promise<void>((resolve, reject) => {
      conn.on("open", () => resolve());
      conn.on("error", (error) => reject(error));
    });
    this.attach(conn);
  }

  send(peerId: string, data: unknown): void {
    const conn = this.connections.get(peerId);
    if (conn === undefined || !conn.open) return;
    conn.send(data);
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
    if (this.pendingMessages.length === 0) return;
    const queued = this.pendingMessages.splice(0, this.pendingMessages.length);
    for (const item of queued) {
      handler(item.peerId, item.data);
    }
  }

  onConnect(handler: PeerHandler): void {
    this.connectHandler = handler;
  }

  onDisconnect(handler: PeerHandler): void {
    this.disconnectHandler = handler;
  }

  disconnectPeer(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (conn === undefined) return;
    this.connections.delete(peerId);
    try {
      conn.close();
    } catch {
      // ignore
    }
    this.disconnectHandler?.(peerId);
  }

  destroy(): void {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.peer.destroy();
    this.messageHandler = null;
    this.connectHandler = null;
    this.disconnectHandler = null;
  }

  private attach(conn: DataConnection): void {
    const peerId = conn.peer;
    this.connections.set(peerId, conn);
    conn.on("open", () => {
      this.connectHandler?.(peerId);
    });
    if (conn.open) {
      this.connectHandler?.(peerId);
    }
    conn.on("data", (data) => {
      if (this.messageHandler !== null) {
        this.messageHandler(peerId, data);
        return;
      }
      this.pendingMessages.push({ peerId, data });
    });
    conn.on("close", () => {
      if (!this.connections.has(peerId)) return;
      this.connections.delete(peerId);
      this.disconnectHandler?.(peerId);
    });
    conn.on("error", () => {
      if (!this.connections.has(peerId)) return;
      this.connections.delete(peerId);
      this.disconnectHandler?.(peerId);
    });
  }
}
