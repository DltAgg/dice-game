import type {
  AttackId,
  CardInstanceId,
  CreatureId,
  CreatureState,
  DieId,
  GameState,
  PlayerId,
} from "@server";
import { Battlefield } from "./Battlefield";
import { TagSkirmishSeatPanel } from "./TagSkirmishSeatPanel";
import type { Intent } from "../intents/types";

export function MatchSeatField({
  tagSkirmish,
  state,
  playerId,
  label,
  facing,
  intent,
  absorbArmed,
  actingPlayerId,
  canAct,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
  onRitualActivate,
  onTag,
  onAssist,
  onUseFace,
  onUseTechnique,
}: {
  tagSkirmish: boolean;
  state: GameState;
  playerId: PlayerId;
  label: string;
  facing: "up" | "down";
  intent: Intent;
  absorbArmed: boolean;
  actingPlayerId: PlayerId;
  canAct: boolean;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
  onRitualActivate: (cardInstanceId: CardInstanceId) => void;
  onTag: (reserveCreatureId: CreatureId) => void;
  onAssist: (reserveCreatureId: CreatureId) => void;
  onUseFace?: (creatureId: CreatureId) => void;
  onUseTechnique?: (
    creatureId: CreatureId,
    techniqueId: string,
    secondaryDieId: DieId,
  ) => void;
}) {
  const shared = {
    state,
    playerId,
    label,
    facing,
    intent,
    absorbArmed,
    actingPlayerId,
    canAct,
    onCreatureClick,
    onAttackChoose,
    onCancelAttack,
    onRitualActivate,
  };
  if (tagSkirmish) {
    return (
      <TagSkirmishSeatPanel
        {...shared}
        onTag={onTag}
        onAssist={onAssist}
        {...(onUseFace !== undefined ? { onUseFace } : {})}
        {...(onUseTechnique !== undefined ? { onUseTechnique } : {})}
      />
    );
  }
  return <Battlefield {...shared} />;
}
