import {
  getCard,
  getCreatureDefinition,
  hasLegalReactionOffer,
  isEnabledRitualReaction,
  isLivingReserve,
  isRitualSilenced,
  ritualsOf,
  type AttackId,
  type CardInstanceId,
  type CreatureId,
  type CreatureState,
  type GameState,
  type PlayerId,
} from "@server";
import { FighterRow } from "./FighterRow";
import { MeterStrip } from "./MeterStrip";
import { RitualTile } from "./RitualTile";
import { TagAssistBar } from "./TagAssistBar";
import type { Intent } from "../intents/types";

export function TagSkirmishSeatPanel({
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
}: {
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
}) {
  const player = state.players[playerId];
  const isActive = state.activePlayerId === playerId;
  const pending = state.pendingDecision;
  const inReactionWindow =
    pending?.type === "reaction-priority" &&
    hasLegalReactionOffer(state, pending.priorityPlayerId);
  const rituals = ritualsOf(state, playerId);

  const reserves =
    player === undefined
      ? []
      : player.creatureIds
          .filter((id) => isLivingReserve(state, player, id))
          .map((id) => {
            const creature = state.creatures[id];
            const def =
              creature !== undefined ? getCreatureDefinition(creature.definitionId) : undefined;
            return { id, label: def?.name ?? "Reserve" };
          });

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
              if (isRitualSilenced(state, card.id)) return false;
              if ((def.ritual?.effects?.length ?? 0) === 0) return false;
              if (inReactionWindow) {
                if (playerId !== actingPlayerId) return false;
                return isEnabledRitualReaction(state, playerId, def);
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
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
          {label}
          {playerId === actingPlayerId ? (inReactionWindow ? " · priority" : " · acting") : ""}
          {isActive && playerId !== actingPlayerId ? " · turn" : ""} · Tag Skirmish
        </h2>
        <MeterStrip state={state} playerId={playerId} />
      </div>
      {facing === "down" ? ritualStrip : null}
      <FighterRow
        state={state}
        playerId={playerId}
        intent={intent}
        onCreatureClick={onCreatureClick}
        onAttackChoose={onAttackChoose}
        onCancelAttack={onCancelAttack}
      />
      <TagAssistBar
        state={state}
        playerId={playerId}
        reserves={reserves}
        canAct={canAct}
        onTag={onTag}
        onAssist={onAssist}
      />
      {facing === "up" ? ritualStrip : null}
    </section>
  );
}
