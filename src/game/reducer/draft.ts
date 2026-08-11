import type { RngState } from "../rng/rng.js";
import type { CardInstance } from "../model/cards.js";
import type { GameRulesConfig } from "../model/config.js";
import type { CreatureState } from "../model/creatures.js";
import type { DieState } from "../model/dice.js";
import type { GameEvent, LoggedEvent } from "../model/events.js";
import type { CreatureId, DieId, MatchId, PlayerId, SymbolInstanceId } from "../model/ids.js";
import type {
  EnergyTrack,
  GameState,
  MatchStatus,
  PendingDecision,
  PendingEffect,
  PlayerState,
  TurnPhase,
} from "../model/state.js";
import type { SymbolInstance } from "../model/symbols.js";

/**
 * A shallow-mutable working copy of GameState used inside a single reduction.
 *
 * The containers are copied and entity objects are always replaced wholesale
 * rather than edited in place, so the caller's state is never touched. A Draft
 * is structurally assignable to GameState, which lets the read-only rules
 * modules be reused mid-reduction without a conversion step.
 */
export interface Draft {
  matchId: MatchId;
  status: MatchStatus;
  turn: number;
  phase: TurnPhase;
  activePlayerId: PlayerId;
  playerOrder: readonly [PlayerId, PlayerId];
  players: Record<string, PlayerState>;
  creatures: Record<string, CreatureState>;
  dice: Record<string, DieState>;
  symbols: Record<string, SymbolInstance>;
  cards: Record<string, CardInstance>;
  energy: EnergyTrack;
  resolutionStack: PendingEffect[];
  pendingDecision: PendingDecision | null;
  attackBonusThisTurn: Record<string, number>;
  winner: PlayerId | null;
  log: LoggedEvent[];
  rng: RngState;
  config: GameRulesConfig;
  nextInstanceSeq: number;
}

export const createDraft = (state: GameState): Draft => ({
  ...state,
  players: { ...state.players },
  creatures: { ...state.creatures },
  dice: { ...state.dice },
  symbols: { ...state.symbols },
  cards: { ...state.cards },
  resolutionStack: [...state.resolutionStack],
  log: [...state.log],
});

export const emit = (draft: Draft, event: GameEvent): void => {
  draft.log.push({ seq: draft.log.length, turn: draft.turn, event });
};

/**
 * Deterministic instance ids. The engine must not call nanoid: two peers
 * replaying the same action log have to produce byte-identical state.
 */
export const nextInstanceId = (draft: Draft, prefix: string): string => {
  const id = `${prefix}-${String(draft.nextInstanceSeq)}`;
  draft.nextInstanceSeq += 1;
  return id;
};

export const patchCreature = (
  draft: Draft,
  id: CreatureId,
  patch: Partial<CreatureState>,
): void => {
  const current = draft.creatures[id];
  if (current === undefined) return;
  draft.creatures[id] = { ...current, ...patch };
};

export const patchDie = (draft: Draft, id: DieId, patch: Partial<DieState>): void => {
  const current = draft.dice[id];
  if (current === undefined) return;
  draft.dice[id] = { ...current, ...patch };
};

export const patchSymbol = (
  draft: Draft,
  id: SymbolInstanceId,
  patch: Partial<SymbolInstance>,
): void => {
  const current = draft.symbols[id];
  if (current === undefined) return;
  draft.symbols[id] = { ...current, ...patch };
};

export const patchPlayer = (draft: Draft, id: PlayerId, patch: Partial<PlayerState>): void => {
  const current = draft.players[id];
  if (current === undefined) return;
  draft.players[id] = { ...current, ...patch };
};
