import {
  getCard,
  getCreatureDefinition,
  getFaceCard,
  type CardDefinition,
  type GameAction,
  type GameEvent,
  type GameState,
  type HitStrength,
  type SequenceRole,
} from "@server";
import type { FighterActivity, FightingCounts, FightingTurn, MatchRecording, TurnRecord } from "./types.js";

const ZERO: FightingCounts = {
  facesUsed: 0,
  techniquesUsed: 0,
  assists: 0,
  assistHits: 0,
  tags: 0,
  rerolls: 0,
  rerollsSkipped: 0,
  starters: 0,
  extenders: 0,
  finishers: 0,
  endSequences: 0,
  meterGained: 0,
  meterSpent: 0,
  negates: 0,
  passes: 0,
  responses: 0,
  counters: 0,
  parries: 0,
  braces: 0,
  exPlays: 0,
  shifts: 0,
  tagCalls: 0,
  movesets: 0,
  replaces: 0,
  rollChanges: 0,
  otherModifies: 0,
  koSwaps: 0,
  tagOuts: 0,
  whiffs: 0,
  discards: 0,
  lightHits: 0,
  mediumHits: 0,
  heavyHits: 0,
};

export function emptyFightingCounts(): FightingCounts {
  return { ...ZERO };
}

export function emptyFightingTurn(): FightingTurn {
  return { ...ZERO, meterEnd: null, comboPeak: 0, activeFighterName: null };
}

export function addFightingCounts(
  base: FightingCounts | undefined,
  extra: FightingCounts,
): FightingCounts {
  const left = base ?? emptyFightingCounts();
  const next: { -readonly [Key in keyof FightingCounts]: number } = { ...emptyFightingCounts() };
  for (const key of Object.keys(ZERO) as (keyof FightingCounts)[]) {
    next[key] = left[key] + extra[key];
  }
  return next;
}

export interface FightingPiece {
  readonly turn: TurnRecord;
  readonly delta: FightingCounts;
  readonly seats: Readonly<Record<string, FightingCounts>>;
  readonly fighters: Readonly<Record<string, FighterActivity>>;
  readonly names: Readonly<Record<string, number>>;
}

export function mergeSeats(
  base: Readonly<Record<string, FightingCounts>>,
  extra: Readonly<Record<string, FightingCounts>>,
): Record<string, FightingCounts> {
  const next: Record<string, FightingCounts> = { ...base };
  for (const [seat, counts] of Object.entries(extra)) {
    next[seat] = addFightingCounts(next[seat], counts);
  }
  return next;
}

export function mergeFighters(
  base: Readonly<Record<string, FighterActivity>>,
  extra: Readonly<Record<string, FighterActivity>>,
): Record<string, FighterActivity> {
  const next: Record<string, FighterActivity> = { ...base };
  for (const [key, row] of Object.entries(extra)) {
    const prev = next[key];
    next[key] =
      prev === undefined
        ? row
        : {
            ...prev,
            facesUsed: prev.facesUsed + row.facesUsed,
            techniquesUsed: prev.techniquesUsed + row.techniquesUsed,
            assists: prev.assists + row.assists,
            tagsIn: prev.tagsIn + row.tagsIn,
            damageTaken: prev.damageTaken + row.damageTaken,
            defeated: prev.defeated + row.defeated,
          };
  }
  return next;
}

export function mergeNames(
  base: Readonly<Record<string, number>>,
  extra: Readonly<Record<string, number>>,
): Record<string, number> {
  const next: Record<string, number> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    next[key] = (next[key] ?? 0) + value;
  }
  return next;
}

function piece(
  turn: TurnRecord,
  delta: FightingCounts,
  seatId: string | null,
  fighters: Readonly<Record<string, FighterActivity>> = {},
  names: Readonly<Record<string, number>> = {},
  patch?: (fighting: FightingTurn) => FightingTurn,
): FightingPiece {
  const fighting = addTurn(turn.fighting, delta);
  return {
    turn: restampStall({ ...turn, fighting: patch !== undefined ? patch(fighting) : fighting }),
    delta,
    seats: seatId === null ? {} : { [seatId]: delta },
    fighters,
    names,
  };
}

function addTurn(current: FightingTurn | undefined, delta: FightingCounts): FightingTurn {
  const base = current ?? emptyFightingTurn();
  return { ...base, ...addFightingCounts(base, delta) };
}

function restampStall(turn: TurnRecord): TurnRecord {
  const hits = sequencePressure(turn);
  return { ...turn, stall: turn.damageDealt <= 0 && hits === 0 };
}

export function sequencePressure(turn: TurnRecord): number {
  const fighting = turn.fighting;
  if (fighting === undefined) return turn.attacksDeclared;
  return fighting.facesUsed + fighting.techniquesUsed + fighting.assistHits + turn.attacksDeclared;
}

export function turnHits(turn: TurnRecord): number | null {
  if (turn.fighting === undefined) return null;
  return turn.fighting.facesUsed + turn.fighting.techniquesUsed + turn.fighting.assistHits;
}

export function hasFightingSample(recording: MatchRecording): boolean {
  return recording.schemaVersion >= 2 && recording.fighting !== undefined;
}

function bump(key: keyof FightingCounts, amount = 1): FightingCounts {
  return { ...emptyFightingCounts(), [key]: amount };
}

function plus(left: FightingCounts, key: keyof FightingCounts, amount = 1): FightingCounts {
  return { ...left, [key]: left[key] + amount };
}

function strengthKey(strength: HitStrength | undefined): keyof FightingCounts | null {
  if (strength === "light") return "lightHits";
  if (strength === "medium") return "mediumHits";
  if (strength === "heavy") return "heavyHits";
  return null;
}

function withRole(counts: FightingCounts, role: SequenceRole | undefined): FightingCounts {
  if (role === "starter") return plus(counts, "starters");
  if (role === "extender") return plus(counts, "extenders");
  if (role === "finisher") return plus(counts, "finishers");
  return counts;
}

function withStrength(counts: FightingCounts, strength: HitStrength | undefined): FightingCounts {
  const key = strengthKey(strength);
  return key === null ? counts : plus(counts, key);
}

function fighterRow(
  state: GameState,
  creatureId: string,
  field: keyof Pick<FighterActivity, "facesUsed" | "techniquesUsed" | "assists" | "tagsIn" | "damageTaken" | "defeated">,
  amount = 1,
): Record<string, FighterActivity> {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return {};
  const definition = getCreatureDefinition(creature.definitionId);
  const key = `${creature.ownerId}:${creature.definitionId}`;
  const row: FighterActivity = {
    key,
    name: definition?.name ?? creature.definitionId,
    ownerId: creature.ownerId,
    definitionId: creature.definitionId,
    facesUsed: 0,
    techniquesUsed: 0,
    assists: 0,
    tagsIn: 0,
    damageTaken: 0,
    defeated: 0,
    [field]: amount,
  };
  return { [key]: row };
}

function namedTechnique(state: GameState, creatureId: string, techniqueId: string) {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return undefined;
  const definition = getCreatureDefinition(creature.definitionId);
  return [...(definition?.techniques ?? []), ...(creature.addedTechniques ?? [])].find(
    (technique) => technique.id === techniqueId,
  );
}

function classifyCard(card: CardDefinition): FightingCounts {
  if (card.subtypes.includes("ex")) return bump("exPlays");
  if (card.type === "response") {
    const types = new Set((card.effect?.effects ?? []).map((effect) => effect.type));
    if (card.endsSequence === true) return plus(bump("parries"), "responses");
    if (types.has("negate-card")) return plus(bump("counters"), "responses");
    if (types.has("reduce-damage")) return plus(bump("braces"), "responses");
    return bump("responses");
  }
  if (card.modifySubject === "target") return bump("shifts");
  if (card.modifySubject === "tag") return bump("tagCalls");
  if (card.modifySubject === "moveset") return bump("movesets");
  if (card.modifySubject === "die") return bump("replaces");
  if (card.modifySubject === "roll") return bump("rollChanges");
  if (card.type === "modify") return bump("otherModifies");
  return emptyFightingCounts();
}

export function noteFightingEvent(turn: TurnRecord, event: GameEvent, state: GameState): FightingPiece | null {
  if (event.type === "face-used") {
    const face = getFaceCard(event.faceCardId);
    const counts = withStrength(withRole(bump("facesUsed"), face?.sequenceRole), face?.hitStrength);
    return piece(turn, counts, event.playerId, fighterRow(state, event.creatureId, "facesUsed"), {
      [face?.name ?? event.faceCardId]: 1,
    });
  }
  if (event.type === "technique-used") {
    const technique = namedTechnique(state, event.creatureId, event.techniqueId);
    const counts = withStrength(
      withRole(bump("techniquesUsed"), technique?.sequenceRole),
      technique?.hitStrength,
    );
    return piece(turn, counts, event.playerId, fighterRow(state, event.creatureId, "techniquesUsed"), {
      [technique?.name ?? event.techniqueId]: 1,
    });
  }
  if (event.type === "assist-declared") {
    const creature = state.creatures[event.reserveCreatureId];
    const definition = creature === undefined ? undefined : getCreatureDefinition(creature.definitionId);
    const hit = definition?.assistEffects?.find((effect) => effect.type === "assist-hit");
    let counts = bump("assists");
    if (hit !== undefined && hit.type === "assist-hit") {
      counts = withStrength(withRole(plus(counts, "assistHits"), hit.sequenceRole), hit.hitStrength);
    }
    const label = definition?.assistName ?? definition?.name ?? event.reserveCreatureId;
    return piece(turn, counts, event.playerId, fighterRow(state, event.reserveCreatureId, "assists"), {
      [`${definition?.name ?? "Fighter"} ${label}`]: 1,
    });
  }
  if (event.type === "tag-switched") {
    const counts = bump("tags");
    const creature = state.creatures[event.toCreatureId];
    const definition = creature === undefined ? undefined : getCreatureDefinition(creature.definitionId);
    const incoming = definition?.name;
    return piece(
      turn,
      counts,
      event.playerId,
      fighterRow(state, event.toCreatureId, "tagsIn"),
      {},
      (fighting) => ({
        ...fighting,
        activeFighterName:
          event.playerId === turn.playerId && incoming !== undefined
            ? incoming
            : fighting.activeFighterName,
      }),
    );
  }
  if (event.type === "dice-rerolled") {
    return piece(turn, bump("rerolls"), event.playerId);
  }
  if (event.type === "meter-changed") {
    const counts =
      event.delta > 0
        ? bump("meterGained", event.delta)
        : event.delta < 0
          ? bump("meterSpent", Math.abs(event.delta))
          : emptyFightingCounts();
    return piece(turn, counts, event.playerId, {}, {}, (fighting) =>
      event.playerId === turn.playerId ? { ...fighting, meterEnd: event.meter } : fighting,
    );
  }
  if (event.type === "combo-changed") {
    const fighting = addTurn(turn.fighting, emptyFightingCounts());
    return {
      turn: {
        ...turn,
        fighting: { ...fighting, comboPeak: Math.max(fighting.comboPeak, event.comboCount) },
      },
      delta: emptyFightingCounts(),
      seats: {},
      fighters: {},
      names: {},
    };
  }
  if (event.type === "card-played") {
    const card = getCard(event.cardId);
    if (card === undefined) return null;
    return piece(turn, classifyCard(card), event.playerId);
  }
  if (event.type === "chain-link-negated") return piece(turn, bump("negates"), null);
  if (event.type === "priority-passed") return piece(turn, bump("passes"), event.playerId);
  if (event.type === "card-discarded") return piece(turn, bump("discards"), event.playerId);
  if (event.type === "damage-dealt") {
    return {
      turn,
      delta: emptyFightingCounts(),
      seats: {},
      fighters: fighterRow(state, event.creatureId, "damageTaken", event.amount),
      names: {},
    };
  }
  if (event.type === "creature-defeated") {
    return {
      turn,
      delta: emptyFightingCounts(),
      seats: {},
      fighters: fighterRow(state, event.creatureId, "defeated"),
      names: {},
    };
  }
  return null;
}

export function noteFightingAction(
  turn: TurnRecord,
  action: GameAction,
  prevPhase: string | null,
): FightingPiece | null {
  if (action.type === "END_SEQUENCE") return piece(turn, bump("endSequences"), action.playerId);
  if (action.type === "ADVANCE_PHASE" && prevPhase === "roll") {
    return piece(turn, bump("rerollsSkipped"), action.playerId);
  }
  if (action.type === "RESOLVE_REPLACE_KO_ACTIVE") return piece(turn, bump("koSwaps"), action.playerId);
  if (action.type === "RESOLVE_TAG_OUT") return piece(turn, bump("tagOuts"), action.playerId);
  return null;
}

export function noteWhiffs(turn: TurnRecord, prev: GameState | null, next: GameState): FightingPiece | null {
  const before = new Set(prev?.usedSequenceActionIds ?? []);
  let count = 0;
  for (const id of next.usedSequenceActionIds) {
    if (id.startsWith("starter-whiff:") && !before.has(id)) count += 1;
  }
  if (count === 0) return null;
  return piece(turn, bump("whiffs", count), turn.playerId);
}

export function snapshotFightingTurn(turn: TurnRecord, state: GameState): TurnRecord {
  const fighting = turn.fighting ?? emptyFightingTurn();
  const player = state.players[turn.playerId as keyof typeof state.players];
  let active: string | null = fighting.activeFighterName;
  for (const creature of Object.values(state.creatures)) {
    if (creature.ownerId === turn.playerId && creature.position === "frontline" && !creature.defeated) {
      active = getCreatureDefinition(creature.definitionId)?.name ?? creature.definitionId;
      break;
    }
  }
  return restampStall({
    ...turn,
    fighting: {
      ...fighting,
      meterEnd: player?.meter ?? fighting.meterEnd,
      comboPeak: Math.max(fighting.comboPeak, player?.comboCount ?? 0),
      activeFighterName: active,
    },
  });
}

