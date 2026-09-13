import {
  type AttackId,
  type CreatureId,
  type CreatureState,
  type GameState,
} from "@server";
import {
  CreatureTile,
} from "./CreatureTile";
import {
  EmptyFrontlineSeat,
} from "./EmptyFrontlineSeat";
import {
  type Intent,
} from "../intents/types";

export function FrontlineSeat({
  lane,
  occupant,
  state,
  intent,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
}: {
  lane: 0 | 1;
  occupant: CreatureState | null;
  state: GameState;
  intent: Intent;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
}) {
  return (
    <div data-frontline-lane={lane} className="w-52">
      {occupant === null ? (
        <EmptyFrontlineSeat />
      ) : (
        <CreatureTile
          state={state}
          creature={occupant}
          intent={intent}
          onCreatureClick={onCreatureClick}
          onAttackChoose={onAttackChoose}
          onCancelAttack={onCancelAttack}
        />
      )}
    </div>
  );
}
