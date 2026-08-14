import { Peer, type DataConnection } from "peerjs";
import type { MessageHandler, NetTransport, PeerHandler } from "./transport.js";

/**
 * PeerJS-backed transport. The host should pass a fixed `localId` (the room
 * code). Guests omit it so PeerJS assigns an ephemeral id, then `connect` to
 * the host room code.
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
    const peer = localId !== undefined ? new Peer(localId) : new Peer();
    const ready = new Promise<void>((resolve, reject) => {
      peer.on("open", () => resolve());
      peer.on("error", (error) => reject(error));
    });
    await ready;
    return new PeerTransport(peer, peer.id, ready);
  }

  /** Guest: open a data connection to the host's room code. */
  async connect(hostRoomCode: string): Promise<void> {
    await this.ready;
    if (this.connections.has(hostRoomCode)) return;
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
      this.connections.delete(peerId);
      this.disconnectHandler?.(peerId);
    });
    conn.on("error", () => {
      this.connections.delete(peerId);
      this.disconnectHandler?.(peerId);
    });
  }
}
