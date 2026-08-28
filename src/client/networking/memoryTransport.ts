import type { MessageHandler, NetTransport, PeerHandler } from "./transport.js";

/**
 * In-memory duplex link for unit tests. `openFakeLink()` returns host and guest
 * transports that deliver messages synchronously.
 */
class MemoryTransport implements NetTransport {
  readonly localId: string;
  private readonly peers = new Map<string, MemoryTransport>();
  private messageHandler: MessageHandler | null = null;
  private connectHandler: PeerHandler | null = null;
  private disconnectHandler: PeerHandler | null = null;
  private destroyed = false;

  constructor(localId: string) {
    this.localId = localId;
  }

  link(peer: MemoryTransport): void {
    this.peers.set(peer.localId, peer);
    peer.peers.set(this.localId, this);
    this.connectHandler?.(peer.localId);
    peer.connectHandler?.(this.localId);
  }

  send(peerId: string, data: unknown): void {
    if (this.destroyed) return;
    const peer = this.peers.get(peerId);
    peer?.messageHandler?.(this.localId, structuredClone(data));
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onConnect(handler: PeerHandler): void {
    this.connectHandler = handler;
  }

  onDisconnect(handler: PeerHandler): void {
    this.disconnectHandler = handler;
  }

  disconnectPeer(peerId: string): void {
    this.drop(peerId);
  }

  /** Test helper: simulate the remote peer dropping. */
  drop(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer === undefined && !this.peers.has(peerId)) {
      return;
    }
    this.peers.delete(peerId);
    if (peer !== undefined) {
      peer.peers.delete(this.localId);
      peer.disconnectHandler?.(this.localId);
    }
    this.disconnectHandler?.(peerId);
  }

  destroy(): void {
    this.destroyed = true;
    for (const peerId of [...this.peers.keys()]) {
      this.drop(peerId);
    }
    this.messageHandler = null;
    this.connectHandler = null;
    this.disconnectHandler = null;
  }
}

export function openFakeLink(
  hostId = "host-room",
  guestId = "guest-peer",
): { readonly host: MemoryTransport; readonly guest: MemoryTransport } {
  const host = new MemoryTransport(hostId);
  const guest = new MemoryTransport(guestId);
  host.link(guest);
  return { host, guest };
}

/** Attach an extra guest to an existing host transport (reconnect / replace tests). */
export function attachFakeGuest(host: MemoryTransport, guestId: string): MemoryTransport {
  const guest = new MemoryTransport(guestId);
  host.link(guest);
  return guest;
}

export type { MemoryTransport };
