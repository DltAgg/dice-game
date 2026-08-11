import type { CardId, CreatureDefinitionId, FaceCardId } from "@/game";

/** Bump when the stored shape changes; unknown versions are refused. */
export const DECK_SCHEMA_VERSION = 1;

export type SavedDeckId = string;

export interface SavedDeck {
  readonly schemaVersion: typeof DECK_SCHEMA_VERSION;
  readonly id: SavedDeckId;
  readonly name: string;
  readonly squad: readonly CreatureDefinitionId[];
  readonly deck: readonly CardId[];
  readonly faceDeck: readonly FaceCardId[];
  /** ISO timestamp; set by the repository, never by the engine. */
  readonly updatedAt: string;
  /** Built-in prototype cannot be deleted. */
  readonly builtin?: boolean;
}

export interface DeckDraft {
  readonly name: string;
  readonly squad: readonly CreatureDefinitionId[];
  readonly deck: readonly CardId[];
  readonly faceDeck: readonly FaceCardId[];
}
