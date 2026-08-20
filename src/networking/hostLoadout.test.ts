import { describe, expect, it } from "vitest";
import {
  CONTROL_SQUAD,
  PROTOTYPE_SQUAD,
  asPlayerId,
  type GameState,
} from "@/game";
import { buildAggroSavedDeck, buildControlSavedDeck, validateSavedDeck } from "@/decks";
import { ClientSession } from "./clientSession.js";
import { HostSession } from "./hostSession.js";
import { openFakeLink } from "./memoryTransport.js";

describe("online host uses selected loadout", () => {
  it("Control host + Aggro guest create the matching squads", () => {
    const hostDeck = buildControlSavedDeck();
    const guestDeck = buildAggroSavedDeck();
    expect(validateSavedDeck(hostDeck)).toEqual({ ok: true });
    expect(validateSavedDeck(guestDeck)).toEqual({ ok: true });

    const roomCode = "CTRL01";
    const { host, guest } = openFakeLink(roomCode, "g1");
    let hostState: GameState | null = null;

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: "host-client",
      seed: 1,
      onState: (state) => {
        hostState = state;
      },
    });
    hostSession.claimLocalSeat("p1", {
      squad: hostDeck.squad,
      deck: hostDeck.deck,
      faceDeck: hostDeck.faceDeck,
      startingDice: hostDeck.startingDice,
    });

    const guestSession = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: "p2-client",
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    guestSession.greet();
    guestSession.claimSeat("p2", {
      squad: guestDeck.squad,
      deck: guestDeck.deck,
      faceDeck: guestDeck.faceDeck,
      startingDice: guestDeck.startingDice,
    });
    hostSession.startMatch();

    expect(hostState).not.toBeNull();
    const p1 = hostState!.players[asPlayerId("p1")]!;
    const p2 = hostState!.players[asPlayerId("p2")]!;
    expect(hostState!.creatures[p1.creatureIds[0]!]!.definitionId).toBe(CONTROL_SQUAD[0]);
    expect(hostState!.creatures[p2.creatureIds[0]!]!.definitionId).toBe(PROTOTYPE_SQUAD[0]);
  });
});
