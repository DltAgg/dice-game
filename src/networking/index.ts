import { customAlphabet } from "nanoid";

/** Short room codes (not matchId). PeerJS host peer id equals this string. */
const roomAlphabet = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateRoomCode(): string {
  return roomAlphabet();
}

export type { ClientToHost, HostToClient, WireLoadout, WireMessage } from "./protocol.js";
export { parseWireMessage, PROTOCOL_VERSION } from "./protocol.js";
export type { NetTransport } from "./transport.js";
export { openFakeLink } from "./memoryTransport.js";
export { PeerTransport } from "./peerTransport.js";
export { HostSession } from "./hostSession.js";
export { ClientSession } from "./clientSession.js";
