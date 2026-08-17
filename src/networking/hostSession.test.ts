import { describe, expect, it } from "vitest";
import {
  CONTROL_SQUAD,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  advance,
  asPlayerId,
  type GameState,
} from "@/game";
import { buildControlSavedDeck } from "@/decks";
import { ARCANE_SILENCE, ECLIPSE } from "@/game/content/cards.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  withEnergy,
  withHand,
  withPhase,
} from "@/game/testing/scenario.js";
import { ClientSession } from "./clientSession.js";
import { HostSession } from "./hostSession.js";
import { attachFakeGuest, openFakeLink } from "./memoryTransport.js";
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
    expect(hostBox.state?.phase).toBe("actions");
    expect(guestBox.state?.phase).toBe("actions");
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
    expect(afterRoll?.phase).toBe("actions");

    hostSession.destroy();
    clientSession.destroy();
  });
});

const controlDeck = buildControlSavedDeck();
const otherLoadout: WireLoadout = {
  squad: controlDeck.squad,
  deck: controlDeck.deck,
  faceDeck: controlDeck.faceDeck,
};

describe("guest reconnection over fake transport", () => {
  it("rebinds p2 and resyncs state after disconnected guest is replaced by a new peer", () => {
    const roomCode = "RECON1";
    const { host, guest } = openFakeLink(roomCode, "guest-old");

    const hostBox: { state: GameState | null } = { state: null };
    let reboundSeat: string | null = null;
    const onboardBox: { state: GameState | null } = { state: null };

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostLoadout: loadout,
      seed: 11,
      onState: (state) => {
        hostBox.state = state;
      },
    });

    const firstClient = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      loadout,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    firstClient.greet();

    const rolled = hostSession.submitLocalAction({
      type: "ROLL_DICE",
      playerId: asPlayerId("p1"),
    });
    expect(rolled).toBe(true);
    expect(hostBox.state?.phase).toBe("actions");
    const matchId = hostBox.state?.matchId;

    host.drop("guest-old");
    expect(hostSession.boundGuestPeerId).toBeNull();
    firstClient.destroy();

    const guest2 = attachFakeGuest(host, "guest-new");
    const secondClient = new ClientSession({
      roomCode,
      transport: guest2,
      hostPeerId: roomCode,
      loadout: otherLoadout,
      onState: (state) => {
        onboardBox.state = state;
      },
      onWelcome: (playerId) => {
        reboundSeat = playerId;
      },
    });
    secondClient.greet();

    expect(reboundSeat).toBe(asPlayerId("p2"));
    expect(hostSession.boundGuestPeerId).toBe("guest-new");
    expect(onboardBox.state?.phase).toBe("actions");
    expect(onboardBox.state?.matchId).toBe(matchId);
    expect(onboardBox.state).toEqual(hostBox.state);
    const p2 = onboardBox.state!.players[asPlayerId("p2")]!;
    expect(onboardBox.state!.creatures[p2.creatureIds[0]!]!.definitionId).toBe(PROTOTYPE_SQUAD[0]);
    expect(onboardBox.state!.creatures[p2.creatureIds[0]!]!.definitionId).not.toBe(CONTROL_SQUAD[0]);

    hostSession.destroy();
    secondClient.destroy();
  });

  it("replaces a still-connected guest instead of ignoring the new hello as a duplicate", () => {
    const roomCode = "RECON2";
    const { host, guest } = openFakeLink(roomCode, "guest-live");

    const staleBox: { state: GameState | null; welcomes: number } = { state: null, welcomes: 0 };
    const freshBox: { state: GameState | null; seat: string | null } = { state: null, seat: null };

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostLoadout: loadout,
      seed: 13,
      onState: () => undefined,
    });

    const staleClient = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      loadout,
      onState: (state) => {
        staleBox.state = state;
      },
      onWelcome: () => {
        staleBox.welcomes += 1;
      },
    });
    staleClient.greet();
    expect(staleBox.welcomes).toBe(1);

    hostSession.submitLocalAction({ type: "ROLL_DICE", playerId: asPlayerId("p1") });
    expect(staleBox.state?.phase).toBe("actions");

    const replacement = attachFakeGuest(host, "guest-reload");
    const freshClient = new ClientSession({
      roomCode,
      transport: replacement,
      hostPeerId: roomCode,
      loadout: otherLoadout,
      onState: (state) => {
        freshBox.state = state;
      },
      onWelcome: (playerId) => {
        freshBox.seat = playerId;
      },
    });
    freshClient.greet();

    expect(freshBox.seat).toBe(asPlayerId("p2"));
    expect(hostSession.boundGuestPeerId).toBe("guest-reload");
    expect(freshBox.state?.phase).toBe("actions");

    staleBox.state = null;
    const ended = hostSession.submitLocalAction({
      type: "END_TURN",
      playerId: asPlayerId("p1"),
    });
    expect(ended).toBe(true);
    expect(freshBox.state?.activePlayerId).toBe(asPlayerId("p2"));
    expect(staleBox.state).toBeNull();

    hostSession.destroy();
    staleClient.destroy();
    freshClient.destroy();
  });

  it("restored host state welcomes a new guest without recreating the match", () => {
    const roomCode = "RECON3";
    const { host, guest } = openFakeLink(roomCode, "guest-a");

    const snapshotBox: { state: GameState | null } = { state: null };
    const firstHost = new HostSession({
      roomCode,
      transport: host,
      hostLoadout: loadout,
      seed: 17,
      onState: (state) => {
        snapshotBox.state = state;
      },
    });
    new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      loadout,
      onState: () => undefined,
      onWelcome: () => undefined,
    }).greet();
    firstHost.submitLocalAction({ type: "ROLL_DICE", playerId: asPlayerId("p1") });
    expect(snapshotBox.state?.phase).toBe("actions");
    const frozen = snapshotBox.state!;
    firstHost.destroy(false);

    const resumedLink = openFakeLink(roomCode, "guest-b");
    const resumedBox: { state: GameState | null; seat: string | null } = {
      state: null,
      seat: null,
    };
    const resumedHost = new HostSession({
      roomCode,
      transport: resumedLink.host,
      hostLoadout: otherLoadout,
      restoredState: frozen,
      onState: () => undefined,
    });
    const resumedClient = new ClientSession({
      roomCode,
      transport: resumedLink.guest,
      hostPeerId: roomCode,
      loadout: otherLoadout,
      onState: (state) => {
        resumedBox.state = state;
      },
      onWelcome: (playerId) => {
        resumedBox.seat = playerId;
      },
    });
    resumedClient.greet();

    expect(resumedBox.seat).toBe(asPlayerId("p2"));
    expect(resumedBox.state?.matchId).toBe(frozen.matchId);
    expect(resumedBox.state?.phase).toBe("actions");
    expect(resumedHost.currentState?.rng.cursor).toBe(frozen.rng.cursor);

    resumedHost.destroy();
    resumedClient.destroy();
  });
});

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("host/client reaction-priority (P2 guest)", () => {
  const P1 = asPlayerId("p1");
  const P2 = asPlayerId("p2");

  function openP1TacticWindow(): GameState {
    const ready = withEnergy(
      withHand(
        withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]),
        P2,
        [ARCANE_SILENCE],
      ),
      P1,
      10,
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    return jsonClone(opened);
  }

  function connectWithChain(roomCode: string, guestId: string) {
    const opened = openP1TacticWindow();
    const { host, guest } = openFakeLink(roomCode, guestId);
    const hostBox: { state: GameState | null } = { state: null };
    const guestBox: { state: GameState | null } = { state: null };
    let lastError: string | null = null;

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostLoadout: loadout,
      seed: 1,
      initialState: opened,
      onState: (state) => {
        hostBox.state = state;
      },
      onError: (error) => {
        lastError = error;
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
      onWelcome: () => undefined,
      onError: (error) => {
        lastError = error;
      },
    });

    clientSession.greet();
    return { hostSession, clientSession, hostBox, guestBox, lastError: () => lastError, opened };
  }

  it("broadcasts a JSON-safe reaction window with P2 holding priority", () => {
    const { hostSession, clientSession, hostBox, guestBox } = connectWithChain("CHAIN1", "g-chain-1");

    expect(hostBox.state?.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });
    expect(guestBox.state?.pendingDecision).toEqual(hostBox.state?.pendingDecision);
    expect(guestBox.state?.chainStack).toHaveLength(1);
    expect(guestBox.state?.activePlayerId).toBe(P1);

    hostSession.destroy();
    clientSession.destroy();
  });

  it("lets the guest Pass even if the intent claims the turn player (host seat override)", () => {
    const { hostSession, clientSession, hostBox, guestBox, lastError } = connectWithChain(
      "CHAIN2",
      "g-chain-2",
    );

    const ok = clientSession.submitAction({
      type: "PASS_PRIORITY",
      playerId: P1,
    });
    expect(ok).toBe(true);
    expect(lastError()).toBeNull();
    expect(hostBox.state?.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
      consecutivePasses: 1,
    });
    expect(guestBox.state?.pendingDecision).toEqual(hostBox.state?.pendingDecision);
    expect(guestBox.state?.chainStack).toHaveLength(1);

    hostSession.destroy();
    clientSession.destroy();
  });

  it("lets the guest respond with Arcane Silence and rebroadcasts the new link", () => {
    const { hostSession, clientSession, hostBox, guestBox, lastError, opened } = connectWithChain(
      "CHAIN3",
      "g-chain-3",
    );
    const silenceId = handCardIdAt(opened, P2, 0);

    const ok = clientSession.submitAction({
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: silenceId,
    });
    expect(ok).toBe(true);
    expect(lastError()).toBeNull();
    expect(hostBox.state?.chainStack).toHaveLength(2);
    expect(hostBox.state?.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
      consecutivePasses: 0,
    });
    expect(guestBox.state).toEqual(hostBox.state);

    hostSession.destroy();
    clientSession.destroy();
  });

  it("rejects a host Pass while P2 holds priority and does not strand the guest", () => {
    const { hostSession, clientSession, hostBox, guestBox, lastError } = connectWithChain(
      "CHAIN4",
      "g-chain-4",
    );
    const before = guestBox.state;

    const ok = hostSession.submitLocalAction({
      type: "PASS_PRIORITY",
      playerId: P1,
    });
    expect(ok).toBe(false);
    expect(lastError()).toBe("NOT_PRIORITY_PLAYER");
    expect(hostBox.state?.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });
    expect(guestBox.state).toEqual(before);
    expect(guestBox.state?.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });

    hostSession.destroy();
    clientSession.destroy();
  });
});
