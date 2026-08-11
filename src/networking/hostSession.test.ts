import { describe, expect, it } from "vitest";
import {
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  asPlayerId,
  type GameState,
} from "@/game";
import { ClientSession } from "./clientSession.js";
import { HostSession } from "./hostSession.js";
import { openFakeLink } from "./memoryTransport.js";
import { parseWireMessage, type WireLoadout } from "./protocol.js";

const loadout: WireLoadout = {
  squad: PROTOTYPE_SQUAD,
  deck: PROTOTYPE_DECK,
  faceDeck: PROTOTYPE_FACE_DECK,
};

describe("parseWireMessage", () => {
  it("accepts a hello with loadout", () => {
    const message = parseWireMessage({
      v: 1,
      type: "hello",
      roomCode: "ABC123",
      loadout,
    });
    expect(message?.type).toBe("hello");
  });

  it("rejects malformed payloads", () => {
    expect(parseWireMessage(null)).toBeNull();
    expect(parseWireMessage({ v: 1, type: "hello" })).toBeNull();
    expect(parseWireMessage({ v: 2, type: "resync-request" })).toBeNull();
  });
});

describe("host/client over fake transport", () => {
  it("binds seats, advances on host, and syncs state to guest", () => {
    const roomCode = "ROOM01";
    const { host, guest } = openFakeLink(roomCode, "guest-1");

    const hostBox: { state: GameState | null } = { state: null };
    const guestBox: { state: GameState | null } = { state: null };
    let guestSeat: string | null = null;

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostLoadout: loadout,
      seed: 42,
      onState: (state) => {
        hostBox.state = state;
      },
    });

    const clientSession = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      loadout,
      onState: (state) => {
        guestBox.state = state;
      },
      onWelcome: (playerId) => {
        guestSeat = playerId;
      },
    });

    clientSession.greet();

    expect(guestSeat).toBe(asPlayerId("p2"));
    expect(hostBox.state).not.toBeNull();
    expect(guestBox.state).not.toBeNull();
    expect(guestBox.state).toEqual(hostBox.state);
    expect(hostSession.localPlayerId).toBe(asPlayerId("p1"));

    const ok = hostSession.submitLocalAction({
      type: "ROLL_DICE",
      playerId: asPlayerId("p1"),
    });
    expect(ok).toBe(true);
    expect(hostBox.state?.phase).toBe("absorption");
    expect(guestBox.state?.phase).toBe("absorption");
    expect(guestBox.state).toEqual(hostBox.state);

    hostSession.destroy();
    clientSession.destroy();
  });

  it("rejects an illegal guest action and returns authoritative state", () => {
    const roomCode = "ROOM02";
    const { host, guest } = openFakeLink(roomCode, "guest-2");

    let lastError: string | null = null;
    let guestStatePhase: string | null = null;

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostLoadout: loadout,
      seed: 7,
      onState: () => undefined,
    });

    const clientSession = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      loadout,
      onState: (state) => {
        guestStatePhase = state.phase;
      },
      onWelcome: () => undefined,
      onError: (error) => {
        lastError = error;
      },
    });

    clientSession.greet();
    expect(guestStatePhase).toBe("roll");

    clientSession.submitAction({
      type: "ROLL_DICE",
      playerId: asPlayerId("p2"),
    });

    expect(lastError).toBe("NOT_ACTIVE_PLAYER");
    expect(guestStatePhase).toBe("roll");

    hostSession.destroy();
    clientSession.destroy();
  });

  it("resyncs current host state on request", () => {
    const roomCode = "ROOM03";
    const { host, guest } = openFakeLink(roomCode, "guest-3");

    const guestBox: { state: GameState | null } = { state: null };

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostLoadout: loadout,
      seed: 9,
      onState: () => undefined,
    });

    const clientSession = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      loadout,
      onState: (state) => {
        guestBox.state = state;
      },
      onWelcome: () => undefined,
    });

    clientSession.greet();
    hostSession.submitLocalAction({ type: "ROLL_DICE", playerId: asPlayerId("p1") });
    const afterRoll = guestBox.state;

    guestBox.state = null;
    clientSession.requestResync();
    expect(guestBox.state).toEqual(afterRoll);
    expect(afterRoll?.phase).toBe("absorption");

    hostSession.destroy();
    clientSession.destroy();
  });
});
