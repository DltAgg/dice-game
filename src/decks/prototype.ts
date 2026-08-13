import {
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
} from "@/game";
import { DECK_SCHEMA_VERSION, type SavedDeck } from "./types.js";

export const PROTOTYPE_SAVED_DECK_ID = "deck-prototype";

export function buildPrototypeSavedDeck(): SavedDeck {
  return {
    schemaVersion: DECK_SCHEMA_VERSION,
    id: PROTOTYPE_SAVED_DECK_ID,
    name: "Aggro",
    squad: PROTOTYPE_SQUAD,
    deck: PROTOTYPE_DECK,
    faceDeck: PROTOTYPE_FACE_DECK,
    updatedAt: "1970-01-01T00:00:00.000Z",
    builtin: true,
  };
}
