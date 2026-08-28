import {
  getCard,
  isLegalRitualReaction,
  livingCreaturesOf,
  ritualsOf,
  type AttackId,
  type CardInstanceId,
  type CreatureId,
  type CreatureState,
  type GameState,
  type PlayerId,
} from "@server";
import {
  CreatureTile,
} from "./CreatureTile";
import {
  RitualTile,
} from "./RitualTile";
import {
  type Intent,
} from "../intents/types";

export function Battlefield({
  state,
  playerId,
  label,
  facing,
  intent,
  absorbArmed,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
  actingPlayerId,
  canAct,
  onRitualActivate,
}: {
  state: GameState;
  playerId: PlayerId;
  label: string;
  facing: "up" | "down";
  intent: Intent;
  absorbArmed: boolean;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
  actingPlayerId: PlayerId;
  canAct: boolean;
  onRitualActivate: (cardInstanceId: CardInstanceId) => void;
}) {
  const living = livingCreaturesOf(state, playerId);
  const front = living.filter((c) => c.position === "frontline");
  const back = living.filter((c) => c.position === "back");
  const isActive = state.activePlayerId === playerId;
  const inReactionWindow = state.pendingDecision?.type === "reaction-priority";
  const rituals = ritualsOf(state, playerId);

  const backRow = (
    <div className="flex justify-center gap-3">
      {back.map((creature) => (
        <CreatureTile
          key={creature.id}
          state={state}
          creature={creature}
          intent={intent}
          onCreatureClick={onCreatureClick}
          onAttackChoose={onAttackChoose}
          onCancelAttack={onCancelAttack}
        />
      ))}
    </div>
  );

  const frontRow = (
    <div className="flex justify-center gap-3">
      {front.map((creature) => (
        <CreatureTile
          key={creature.id}
          state={state}
          creature={creature}
          intent={intent}
          onCreatureClick={onCreatureClick}
          onAttackChoose={onAttackChoose}
          onCancelAttack={onCancelAttack}
        />
      ))}
    </div>
  );

  const ritualStrip =
    rituals.length > 0 ? (
      <div
        className={
          facing === "down"
            ? "mb-3 border-b border-stone-800/80 pb-3"
            : "mt-3 border-t border-stone-800/80 pt-3"
        }
      >
        <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Rituals
        </h3>
        <div className="flex flex-wrap gap-2">
          {rituals.map((card) => {
            const def = getCard(card.cardId);
            const ready = card.ritualOrientation === "ready";
            const canActivate = (() => {
              if (!canAct || !ready || absorbArmed || def === undefined) return false;
              if ((def.ritual?.effects?.length ?? 0) === 0) return false;
              if (inReactionWindow) {
                if (playerId !== actingPlayerId) return false;
                return isLegalRitualReaction(state, def);
              }
              return isActive && playerId === actingPlayerId && state.phase !== "roll";
            })();
            return (
              <RitualTile
                key={card.id}
                card={card}
                state={state}
                canActivate={canActivate}
                onActivate={() => onRitualActivate(card.id)}
              />
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <section
      className={
        playerId === actingPlayerId
          ? "rounded-lg border border-[var(--accent)]/35 bg-black/30 p-4"
          : "rounded-lg border border-stone-800 bg-black/20 p-4"
      }
    >
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
        {label}
        {playerId === actingPlayerId ? (inReactionWindow ? " · priority" : " · acting") : ""}
        {isActive && playerId !== actingPlayerId ? " · turn" : ""} · frontline / back
      </h2>
      {facing === "down" ? ritualStrip : null}
      <div className="mt-3 flex flex-col gap-3">
        {facing === "down" ? (
          <>
            {backRow}
            {frontRow}
          </>
        ) : (
          <>
            {frontRow}
            {backRow}
          </>
        )}
      </div>
      {facing === "up" ? ritualStrip : null}
    </section>
  );
}
