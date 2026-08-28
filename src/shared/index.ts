/**
 * Types owned by the engine and consumed by both the future host process and
 * the browser client. Wire DTOs that are not rules live in
 * `@client/networking/protocol` and are re-exported here for a single import
 * surface.
 */
export type {
  GameAction,
  GameError,
  GameState,
  PlayerId,
  StartingDiceLayout,
  CardId,
  CreatureDefinitionId,
  FaceCardId,
} from "@server";
export type { WireLoadout, SeatId, RoomSnapshot } from "@client/networking/protocol";
