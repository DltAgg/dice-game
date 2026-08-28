import { customAlphabet } from "nanoid";

/** Short room codes (not matchId). PeerJS host peer id equals this string. */
const roomAlphabet = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);
const clientAlphabet = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 12);

export function generateRoomCode(): string {
  return roomAlphabet();
}

/** Tab-stable client identity for seat rebinding (not a PeerJS id). */
export function generateClientId(): string {
  return clientAlphabet();
}

export type {
  ClientToHost,
  HostToClient,
  PersistedRoom,
  PersistedSeat,
  ProtocolError,
  RoomMember,
  RoomSeat,
  RoomSnapshot,
  SeatId,
  WireLoadout,
  WireMessage,
} from "./protocol.js";
export { isRoomSnapshot, isSeatId, parseWireMessage, PROTOCOL_VERSION } from "./protocol.js";
export type { NetTransport } from "./transport.js";
export { openFakeLink, attachFakeGuest } from "./memoryTransport.js";
export { PeerTransport } from "./peerTransport.js";
export { HostSession } from "./hostSession.js";
export { ClientSession } from "./clientSession.js";
