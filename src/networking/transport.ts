/**
 * Bidirectional messaging used by host/client sessions. PeerJS implements this;
 * tests use an in-memory pair so CI never needs a live broker.
 */
export interface NetTransport {
  readonly localId: string;
  /** Send JSON-serializable payload to one peer. */
  send(peerId: string, data: unknown): void;
  onMessage(handler: (peerId: string, data: unknown) => void): void;
  onConnect(handler: (peerId: string) => void): void;
  onDisconnect(handler: (peerId: string) => void): void;
  destroy(): void;
}

export type MessageHandler = (peerId: string, data: unknown) => void;
export type PeerHandler = (peerId: string) => void;
