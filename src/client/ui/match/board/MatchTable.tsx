import type { AttackId, CardInstanceId, CreatureId, CreatureState, DieId, GameState, PlayerId, TurnPhase } from "@server";
import { MATCH_P1, MATCH_P2 } from "@client/store/matchStore";
import { MatchSeatField } from "./MatchSeatField";
import { PhaseBar } from "./PhaseBar";
import { seatMayPressTag } from "./tagAssistLegality";
import { ShowingFaceTray } from "./ShowingFaceTray";
import type { Intent } from "../intents/types";

/** Seats, the phase bar, and the showing-face trays. Kept out of MatchBoard. */
export function MatchTable({
  tagSkirmish,
  state,
  intent,
  actingId,
  canAct,
  canEndSequence,
  isOnline,
  localPlayerId,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
  onRitualActivate,
  onTag,
  onAssist,
  onUseFace,
  onUseTechnique,
  onReroll,
  onGoToPhase,
  onEndTurn,
  onEndSequence,
}: {
  tagSkirmish: boolean;
  state: GameState;
  intent: Intent;
  actingId: PlayerId;
  canAct: boolean;
  canEndSequence: boolean;
  isOnline: boolean;
  localPlayerId: PlayerId | null;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
  onRitualActivate: (cardInstanceId: CardInstanceId) => void;
  onTag: (reserveCreatureId: CreatureId) => void;
  onAssist: (reserveCreatureId: CreatureId) => void;
  onUseFace: (creatureId: CreatureId) => void;
  onUseTechnique: (creatureId: CreatureId, techniqueId: string, secondaryDieId: DieId) => void;
  onReroll: (dieIds: readonly DieId[]) => void;
  onGoToPhase: (phase: TurnPhase) => void;
  onEndTurn: () => void;
  onEndSequence: () => void;
}) {
  const seat = (playerId: typeof MATCH_P1 | typeof MATCH_P2, label: string, facing: "up" | "down") => (
    <MatchSeatField
      tagSkirmish={tagSkirmish}
      state={state}
      playerId={playerId}
      label={label}
      facing={facing}
      intent={intent}
      absorbArmed={intent.kind === "absorb"}
      onCreatureClick={onCreatureClick}
      onAttackChoose={onAttackChoose}
      onCancelAttack={onCancelAttack}
      actingPlayerId={actingId}
      canAct={canAct}
      mayTag={seatMayPressTag(isOnline, localPlayerId, playerId)}
      onRitualActivate={onRitualActivate}
      onTag={onTag}
      onAssist={onAssist}
    />
  );
  const faces = (playerId: typeof MATCH_P1 | typeof MATCH_P2, label: string) => (
    <ShowingFaceTray
      state={state}
      playerId={playerId}
      label={label}
      actingPlayerId={actingId}
      canAct={canAct}
      onUseFace={onUseFace}
      onUseTechnique={onUseTechnique}
      onReroll={onReroll}
    />
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,30%)] items-stretch gap-x-3 gap-y-4">
      {seat(MATCH_P2, "Player 2", "down")}
      {faces(MATCH_P2, "P2 faces")}
      <div className="col-span-2 min-w-0">
        <PhaseBar
          state={state}
          canAct={canAct}
          canEndSequence={canEndSequence}
          onGoToPhase={onGoToPhase}
          onEndTurn={onEndTurn}
          onEndSequence={onEndSequence}
        />
      </div>
      {seat(MATCH_P1, "Player 1", "up")}
      {faces(MATCH_P1, "P1 faces")}
    </div>
  );
}
