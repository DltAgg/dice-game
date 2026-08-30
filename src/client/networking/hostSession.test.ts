import { describe, expect, it } from "vitest";
import {
  CONTROL_SQUAD,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  PROTOTYPE_STARTING_DICE,
  advance,
  asAttackId,
  asPlayerId,
  type GameState,
} from "@server";
import { buildControlSavedDeck } from "@client/decks";
import { COG_DRAFT, GLINT_VEIL } from "@server/content/cards.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  withPile,
  withHand,
  withPhase,
  withTokens,
} from "@server/testing/scenario.js";
import { ClientSession } from "./clientSession.js";
import { HostSession } from "./hostSession.js";
import { attachFakeGuest, openFakeLink } from "./memoryTransport.js";
import { parseWireMessage, type PersistedRoom, type WireLoadout } from "./protocol.js";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");
const HOST_CLIENT = "host-client";
const P1_CLIENT = "p1-client";
const P2_CLIENT = "p2-client";
const SPEC_CLIENT = "spec-client";

const loadout: WireLoadout = {
  squad: PROTOTYPE_SQUAD,
  deck: PROTOTYPE_DECK,
  faceDeck: PROTOTYPE_FACE_DECK,
  startingDice: PROTOTYPE_STARTING_DICE,
};

const controlDeck = buildControlSavedDeck();
const otherLoadout: WireLoadout = {
  squad: controlDeck.squad,
  deck: controlDeck.deck,
  faceDeck: controlDeck.faceDeck,
  startingDice: controlDeck.startingDice,
};

function persistedSeats(p1ClientId: string, p2ClientId: string): PersistedRoom {
  return {
    hostClientId: HOST_CLIENT,
    p1: { clientId: p1ClientId, loadout },
    p2: { clientId: p2ClientId, loadout },
    started: true,
  };
}

describe("parseWireMessage", () => {
  it("accepts a hello with clientId", () => {
    const message = parseWireMessage({
      v: 1,
      type: "hello",
      roomCode: "ABC123",
      clientId: "client-1",
    });
    expect(message?.type).toBe("hello");
  });

  it("accepts claim-seat and release-seat", () => {
    expect(
      parseWireMessage({
        v: 1,
        type: "claim-seat",
        seat: "p2",
        loadout,
      })?.type,
    ).toBe("claim-seat");
    expect(parseWireMessage({ v: 1, type: "release-seat" })?.type).toBe("release-seat");
  });

  it("rejects malformed payloads", () => {
    expect(parseWireMessage(null)).toBeNull();
    expect(parseWireMessage({ v: 1, type: "hello" })).toBeNull();
    expect(parseWireMessage({ v: 2, type: "resync-request" })).toBeNull();
    expect(
      parseWireMessage({
        v: 1,
        type: "hello",
        roomCode: "ABC123",
        loadout: { squad: [], deck: [], faceDeck: [] },
      }),
    ).toBeNull();
    expect(
      parseWireMessage({
        v: 1,
        type: "claim-seat",
        seat: "p2",
        loadout: { squad: [], deck: [], faceDeck: [] },
      }),
    ).toBeNull();
  });
});

describe("host/client over fake transport", () => {
  it("binds seats, advances on host, and syncs state to guest", () => {
    const roomCode = "ROOM01";
    const { host, guest } = openFakeLink(roomCode, "guest-1");

    const hostBox: { state: GameState | null } = { state: null };
    const guestBox: { state: GameState | null } = { state: null };
    let guestSeat: string | null | undefined;

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 42,
      onState: (state) => {
        hostBox.state = state;
      },
    });

    const clientSession = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: (state) => {
        guestBox.state = state;
      },
      onWelcome: (playerId) => {
        guestSeat = playerId;
      },
    });

    expect(hostSession.claimLocalSeat("p1", loadout)).toBe(true);
    clientSession.greet();
    expect(guestSeat).toBeNull();
    clientSession.claimSeat("p2", loadout);
    expect(guestSeat).toBe(P2);
    expect(hostSession.startMatch()).toBe(true);

    expect(hostBox.state).not.toBeNull();
    expect(guestBox.state).not.toBeNull();
    expect(guestBox.state).toEqual(hostBox.state);
    expect(hostSession.localPlayerId).toBe(P1);

    const ok = hostSession.submitLocalAction({
      type: "ROLL_DICE",
      playerId: P1,
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
      hostClientId: HOST_CLIENT,
      seed: 7,
      onState: () => undefined,
    });

    const clientSession = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: (state) => {
        guestStatePhase = state.phase;
      },
      onWelcome: () => undefined,
      onError: (error) => {
        lastError = error;
      },
    });

    hostSession.claimLocalSeat("p1", loadout);
    clientSession.greet();
    clientSession.claimSeat("p2", loadout);
    hostSession.startMatch();
    expect(guestStatePhase).toBe("roll");

    clientSession.submitAction({
      type: "ROLL_DICE",
      playerId: P2,
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
      hostClientId: HOST_CLIENT,
      seed: 9,
      onState: () => undefined,
    });

    const clientSession = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: (state) => {
        guestBox.state = state;
      },
      onWelcome: () => undefined,
    });

    hostSession.claimLocalSeat("p1", loadout);
    clientSession.greet();
    clientSession.claimSeat("p2", loadout);
    hostSession.startMatch();
    hostSession.submitLocalAction({ type: "ROLL_DICE", playerId: P1 });
    const afterRoll = guestBox.state;

    guestBox.state = null;
    clientSession.requestResync();
    expect(guestBox.state).toEqual(afterRoll);
    expect(afterRoll?.phase).toBe("actions");

    hostSession.destroy();
    clientSession.destroy();
  });
});

describe("room seats and spectators over fake transport", () => {
  it("lets three peers share a room: two seats plus a spectator", () => {
    const roomCode = "SEAT01";
    const { host, guest } = openFakeLink(roomCode, "p1-peer");
    const p2Transport = attachFakeGuest(host, "p2-peer");
    const specTransport = attachFakeGuest(host, "spec-peer");

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 3,
      onState: () => undefined,
    });

    const p1Client = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P1_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    const p2Client = new ClientSession({
      roomCode,
      transport: p2Transport,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    let specSeat: string | null | undefined = "unset";
    const specClient = new ClientSession({
      roomCode,
      transport: specTransport,
      hostPeerId: roomCode,
      clientId: SPEC_CLIENT,
      onState: () => undefined,
      onWelcome: (playerId) => {
        specSeat = playerId;
      },
    });

    p1Client.greet();
    p2Client.greet();
    specClient.greet();

    expect(specSeat).toBeNull();
    expect(hostSession.room.spectators.map((row) => row.clientId)).toEqual(
      expect.arrayContaining([HOST_CLIENT, P1_CLIENT, P2_CLIENT, SPEC_CLIENT]),
    );

    p1Client.claimSeat("p1", loadout);
    p2Client.claimSeat("p2", otherLoadout);
    expect(hostSession.room.seats.p1?.clientId).toBe(P1_CLIENT);
    expect(hostSession.room.seats.p2?.clientId).toBe(P2_CLIENT);
    expect(hostSession.room.spectators.map((row) => row.clientId)).toEqual(
      expect.arrayContaining([HOST_CLIENT, SPEC_CLIENT]),
    );
    expect(specClient.localPlayerId).toBeNull();
    expect(hostSession.startMatch()).toBe(true);
    expect(hostSession.room.started).toBe(true);

    hostSession.destroy();
    p1Client.destroy();
    p2Client.destroy();
    specClient.destroy();
  });

  it("claims and releases seats so another spectator can take them", () => {
    const roomCode = "SEAT02";
    const { host, guest } = openFakeLink(roomCode, "first-peer");
    const second = attachFakeGuest(host, "second-peer");

    let rejected: string | null = null;
    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 4,
      onState: () => undefined,
    });

    const first = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P1_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    const other = new ClientSession({
      roomCode,
      transport: second,
      hostPeerId: roomCode,
      clientId: SPEC_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
      onSeatRejected: (reason) => {
        rejected = reason;
      },
    });

    first.greet();
    other.greet();
    first.claimSeat("p1", loadout);
    expect(hostSession.room.seats.p1?.clientId).toBe(P1_CLIENT);

    other.claimSeat("p1", loadout);
    expect(rejected).toMatch(/already taken/i);
    expect(hostSession.room.seats.p1?.clientId).toBe(P1_CLIENT);

    first.releaseSeat();
    expect(hostSession.room.seats.p1).toBeNull();
    expect(first.localPlayerId).toBeNull();

    other.claimSeat("p1", otherLoadout);
    expect(hostSession.room.seats.p1?.clientId).toBe(SPEC_CLIENT);
    expect(other.localPlayerId).toBe(P1);

    hostSession.destroy();
    first.destroy();
    other.destroy();
  });

  it("rejects a spectator GameAction without calling advance", () => {
    const roomCode = "SEAT03";
    const { host, guest } = openFakeLink(roomCode, "p2-peer");
    const specTransport = attachFakeGuest(host, "spec-peer");

    const hostBox: { state: GameState | null } = { state: null };
    let specError: string | null = null;
    let advanced = 0;

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 5,
      onState: (state) => {
        hostBox.state = state;
      },
      onAdvance: () => {
        advanced += 1;
      },
    });

    const p2Client = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    const specClient = new ClientSession({
      roomCode,
      transport: specTransport,
      hostPeerId: roomCode,
      clientId: SPEC_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
      onError: (error) => {
        specError = error;
      },
    });

    hostSession.claimLocalSeat("p1", loadout);
    p2Client.greet();
    p2Client.claimSeat("p2", loadout);
    specClient.greet();
    hostSession.startMatch();
    const before = hostBox.state;
    expect(before?.phase).toBe("roll");

    expect(specClient.submitAction({ type: "ROLL_DICE", playerId: P1 })).toBe(false);
    expect(specError).toBe("NOT_SEATED");

    specTransport.send(roomCode, {
      v: 1,
      type: "submit-action",
      action: { type: "ROLL_DICE", playerId: P1 },
      clientSeq: 99,
    });
    expect(specError).toBe("NOT_SEATED");
    expect(hostBox.state).toBe(before);
    expect(hostBox.state?.phase).toBe("roll");
    expect(advanced).toBe(0);

    hostSession.destroy();
    p2Client.destroy();
    specClient.destroy();
  });

  it("lets a spectating host advance when a seated player's intent arrives", () => {
    const roomCode = "SEAT04";
    const { host, guest } = openFakeLink(roomCode, "p1-peer");
    const p2Transport = attachFakeGuest(host, "p2-peer");

    const hostBox: { state: GameState | null } = { state: null };
    const advances: string[] = [];

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 6,
      onState: (state) => {
        hostBox.state = state;
      },
      onAdvance: ({ action, ok }) => {
        advances.push(`${action.type}:${ok ? "ok" : "no"}`);
      },
    });

    const p1Client = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P1_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    const p2Client = new ClientSession({
      roomCode,
      transport: p2Transport,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });

    p1Client.greet();
    p2Client.greet();
    p1Client.claimSeat("p1", loadout);
    p2Client.claimSeat("p2", loadout);
    expect(hostSession.localPlayerId).toBeNull();
    expect(hostSession.startMatch()).toBe(true);

    expect(hostSession.submitLocalAction({ type: "ROLL_DICE", playerId: P1 })).toBe(false);
    expect(hostBox.state?.phase).toBe("roll");

    const ok = p1Client.submitAction({ type: "ROLL_DICE", playerId: P2 });
    expect(ok).toBe(true);
    expect(hostBox.state?.phase).toBe("actions");
    expect(advances).toContain("ROLL_DICE:ok");
    expect(hostSession.localPlayerId).toBeNull();

    hostSession.destroy();
    p1Client.destroy();
    p2Client.destroy();
  });
});

describe("guest reconnection over fake transport", () => {
  it("rebinds p2 by clientId after the old peer disconnects", () => {
    const roomCode = "RECON1";
    const { host, guest } = openFakeLink(roomCode, "guest-old");

    const hostBox: { state: GameState | null } = { state: null };
    let reboundSeat: string | null = null;
    const onboardBox: { state: GameState | null } = { state: null };

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 11,
      onState: (state) => {
        hostBox.state = state;
      },
    });

    const firstClient = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    hostSession.claimLocalSeat("p1", loadout);
    firstClient.greet();
    firstClient.claimSeat("p2", loadout);
    hostSession.startMatch();

    const rolled = hostSession.submitLocalAction({
      type: "ROLL_DICE",
      playerId: P1,
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
      clientId: P2_CLIENT,
      onState: (state) => {
        onboardBox.state = state;
      },
      onWelcome: (playerId) => {
        reboundSeat = playerId;
      },
    });
    secondClient.greet();

    expect(reboundSeat).toBe(P2);
    expect(hostSession.boundGuestPeerId).toBe("guest-new");
    expect(onboardBox.state?.phase).toBe("actions");
    expect(onboardBox.state?.matchId).toBe(matchId);
    expect(onboardBox.state).toEqual(hostBox.state);
    const p2 = onboardBox.state!.players[P2]!;
    expect(onboardBox.state!.creatures[p2.creatureIds[0]!]!.definitionId).toBe(PROTOTYPE_SQUAD[0]);
    expect(PROTOTYPE_SQUAD[0]).toBe(CONTROL_SQUAD[0]);

    hostSession.destroy();
    secondClient.destroy();
  });

  it("does not steal p2 when a different clientId hellos while the seated guest is still linked", () => {
    const roomCode = "RECON2";
    const { host, guest } = openFakeLink(roomCode, "guest-live");

    const staleBox: { state: GameState | null; welcomes: number } = { state: null, welcomes: 0 };
    const freshBox: { state: GameState | null; seat: string | null } = { state: null, seat: null };

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 13,
      onState: () => undefined,
    });

    const staleClient = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: (state) => {
        staleBox.state = state;
      },
      onWelcome: () => {
        staleBox.welcomes += 1;
      },
    });
    hostSession.claimLocalSeat("p1", loadout);
    staleClient.greet();
    staleClient.claimSeat("p2", loadout);
    hostSession.startMatch();
    expect(staleBox.welcomes).toBeGreaterThanOrEqual(1);

    hostSession.submitLocalAction({ type: "ROLL_DICE", playerId: P1 });
    expect(staleBox.state?.phase).toBe("actions");

    const replacement = attachFakeGuest(host, "guest-reload");
    const freshClient = new ClientSession({
      roomCode,
      transport: replacement,
      hostPeerId: roomCode,
      clientId: SPEC_CLIENT,
      onState: (state) => {
        freshBox.state = state;
      },
      onWelcome: (playerId) => {
        freshBox.seat = playerId;
      },
    });
    freshClient.greet();

    expect(freshBox.seat).toBeNull();
    expect(hostSession.boundGuestPeerId).toBe("guest-live");
    expect(freshBox.state?.phase).toBe("actions");
    expect(staleClient.localPlayerId).toBe(P2);

    const ended = hostSession.submitLocalAction({
      type: "END_TURN",
      playerId: P1,
    });
    expect(ended).toBe(true);
    expect(freshBox.state?.activePlayerId).toBe(P2);
    expect(staleBox.state?.activePlayerId).toBe(P2);

    hostSession.destroy();
    staleClient.destroy();
    freshClient.destroy();
  });

  it("replaces a still-connected peer when the same clientId hellos from a new peer id", () => {
    const roomCode = "RECON2B";
    const { host, guest } = openFakeLink(roomCode, "guest-live");

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 14,
      onState: () => undefined,
    });

    const staleClient = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    hostSession.claimLocalSeat("p1", loadout);
    staleClient.greet();
    staleClient.claimSeat("p2", loadout);
    hostSession.startMatch();

    const replacement = attachFakeGuest(host, "guest-reload");
    let rebound: string | null = null;
    const freshClient = new ClientSession({
      roomCode,
      transport: replacement,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: () => undefined,
      onWelcome: (playerId) => {
        rebound = playerId;
      },
    });
    freshClient.greet();

    expect(rebound).toBe(P2);
    expect(hostSession.boundGuestPeerId).toBe("guest-reload");

    hostSession.destroy();
    staleClient.destroy();
    freshClient.destroy();
  });

  it("restored host state welcomes a known clientId without recreating the match", () => {
    const roomCode = "RECON3";
    const { host, guest } = openFakeLink(roomCode, "guest-a");

    const snapshotBox: { state: GameState | null } = { state: null };
    const firstHost = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 17,
      onState: (state) => {
        snapshotBox.state = state;
      },
    });
    const firstClient = new ClientSession({
      roomCode,
      transport: guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: () => undefined,
      onWelcome: () => undefined,
    });
    firstHost.claimLocalSeat("p1", loadout);
    firstClient.greet();
    firstClient.claimSeat("p2", loadout);
    firstHost.startMatch();
    firstHost.submitLocalAction({ type: "ROLL_DICE", playerId: P1 });
    expect(snapshotBox.state?.phase).toBe("actions");
    const frozen = snapshotBox.state!;
    const frozenRoom = firstHost.persistedRoom();
    firstHost.destroy(false);

    const resumedLink = openFakeLink(roomCode, "guest-b");
    const resumedBox: { state: GameState | null; seat: string | null } = {
      state: null,
      seat: null,
    };
    const resumedHost = new HostSession({
      roomCode,
      transport: resumedLink.host,
      hostClientId: HOST_CLIENT,
      restoredState: frozen,
      restoredRoom: frozenRoom,
      onState: () => undefined,
    });
    const resumedClient = new ClientSession({
      roomCode,
      transport: resumedLink.guest,
      hostPeerId: roomCode,
      clientId: P2_CLIENT,
      onState: (state) => {
        resumedBox.state = state;
      },
      onWelcome: (playerId) => {
        resumedBox.seat = playerId;
      },
    });
    resumedClient.greet();

    expect(resumedBox.seat).toBe(P2);
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
  function openP1InstantWindow(): GameState {
    let ready = withHand(
      withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]),
      P2,
      [GLINT_VEIL],
    );
    ready = withPile(ready, P1, 10);
    ready = withPile(ready, P2, 10);
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    return jsonClone(opened);
  }

  function openP1AttackWindow(): GameState {
    let ready = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(ready, P1, 2);
    const target = creatureIdAt(ready, P2, 0);
    ready = withHand(withPile(withTokens(ready, attacker, { mechanical: 1 }), P2, 10), P2, [
      GLINT_VEIL,
    ]);
    const opened = expectOk(
      advance(ready, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: asAttackId("attack-lodestar-artificer-drive-shaft"),
        targetId: target,
      }),
    );
    return jsonClone(opened);
  }

  function connectWithChain(roomCode: string, guestId: string, opened = openP1InstantWindow()) {
    const { host, guest } = openFakeLink(roomCode, guestId);
    const hostBox: { state: GameState | null } = { state: null };
    const guestBox: { state: GameState | null } = { state: null };
    let lastError: string | null = null;

    const hostSession = new HostSession({
      roomCode,
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 1,
      initialState: opened,
      restoredRoom: persistedSeats(HOST_CLIENT, P2_CLIENT),
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
      clientId: P2_CLIENT,
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
    // P1 has no Respond offer after Eclipse — host drains their empty seat and
    // resolves the chain instead of broadcasting a no-offer priority box.
    expect(hostBox.state?.pendingDecision?.type).not.toBe("reaction-priority");
    expect(guestBox.state?.pendingDecision).toEqual(hostBox.state?.pendingDecision);
    expect(guestBox.state?.chainStack).toEqual(hostBox.state?.chainStack);

    hostSession.destroy();
    clientSession.destroy();
  });

  it("lets the guest respond with Glint Veil and rebroadcasts the new link", () => {
    const { hostSession, clientSession, hostBox, guestBox, lastError, opened } = connectWithChain(
      "CHAIN3",
      "g-chain-3",
      openP1AttackWindow(),
    );
    const veilId = handCardIdAt(opened, P2, 0);

    const ok = clientSession.submitAction({
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: veilId,
    });
    expect(ok).toBe(true);
    expect(lastError()).toBeNull();
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

  it("drains empty reaction windows before broadcasting so guests never see a no-offer box", () => {
    const driveShaft = asAttackId("attack-lodestar-artificer-drive-shaft");
    let ready = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(ready, P1, 2);
    const target = creatureIdAt(ready, P2, 0);
    ready = withTokens(withHand(withHand(ready, P1, []), P2, []), attacker, { mechanical: 1 });
    ready = jsonClone(ready);

    const { host, guest } = openFakeLink("CHAIN-EMPTY", "g-empty");
    const hostBox: { state: GameState | null } = { state: null };
    const guestBox: { state: GameState | null } = { state: null };

    const hostSession = new HostSession({
      roomCode: "CHAIN-EMPTY",
      transport: host,
      hostClientId: HOST_CLIENT,
      seed: 1,
      initialState: ready,
      restoredRoom: persistedSeats(HOST_CLIENT, P2_CLIENT),
      onState: (state) => {
        hostBox.state = state;
      },
    });

    const clientSession = new ClientSession({
      roomCode: "CHAIN-EMPTY",
      transport: guest,
      hostPeerId: "CHAIN-EMPTY",
      clientId: P2_CLIENT,
      onState: (state) => {
        guestBox.state = state;
      },
      onWelcome: () => undefined,
    });
    clientSession.greet();

    const ok = hostSession.submitLocalAction({
      type: "ATTACK",
      playerId: P1,
      attackerId: attacker,
      attackId: driveShaft,
      targetId: target,
    });
    expect(ok).toBe(true);
    expect(hostBox.state?.pendingDecision?.type).not.toBe("reaction-priority");
    expect(guestBox.state?.pendingDecision?.type).not.toBe("reaction-priority");
    expect(guestBox.state?.chainStack).toEqual(hostBox.state?.chainStack);

    hostSession.destroy();
    clientSession.destroy();
  });
});
