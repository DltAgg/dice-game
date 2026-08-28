/**
 * Bidirectional messaging used by host/client sessions. PeerJS implements this;
 * tests use an in-memory pair so CI never needs a live broker.
 *
 * The host transport accepts many concurrent peers (two seats plus spectators).
 * Sessions address each peer by id; `disconnectPeer` drops one without tearing
 * down the room.
 */
export interface NetTransport {
  readonly localId: string;
  /** Send JSON-serializable payload to one peer. */
  send(peerId: string, data: unknown): void;
  onMessage(handler: (peerId: string, data: unknown) => void): void;
  onConnect(handler: (peerId: string) => void): void;
  onDisconnect(handler: (peerId: string) => void): void;
  /** Drop one peer without destroying the local transport (guest seat replace). */
  disconnectPeer(peerId: string): void;
  destroy(): void;
}

export type MessageHandler = (peerId: string, data: unknown) => void;
export type PeerHandler = (peerId: string) => void;
