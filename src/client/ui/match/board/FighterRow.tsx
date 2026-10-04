import {
  currentLife,
  getCard,
  getCreatureDefinition,
  isActiveFighter,
  type AttackId,
  type CreatureId,
  type CreatureState,
  type GameState,
  type PlayerId,
} from "@server";
import { CreatureTile } from "./CreatureTile";
import { ReserveTagAssist } from "./TagAssistBar";
import { showingFaceForCreature } from "./showingFace";
import type { Intent } from "../intents/types";

function FighterDieStrip({
  state,
  creatureId,
}: {
  state: GameState;
  creatureId: CreatureId;
}) {
  const { faceName, technique, unrolled } = showingFaceForCreature(state, creatureId);
  return (
    <div className="mt-2 rounded border border-stone-800 bg-black/40 px-2 py-1.5 text-[0.7rem]">
      <p className="text-stone-400">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
          Die
        </span>
        {" · "}
        <span className={unrolled ? "text-stone-500" : "text-stone-200"}>{faceName}</span>
      </p>
      {technique !== null && (
        <p className="mt-0.5 text-[var(--accent)] capitalize">{technique}</p>
      )}
    </div>
  );
}

function AttachedCards({
  state,
  creature,
}: {
  state: GameState;
  creature: CreatureState;
}) {
  const attached = creature.equipmentIds.flatMap((id) => {
    const card = state.cards[id];
    if (card === undefined) return [];
    const name = getCard(card.cardId)?.name;
    return name === undefined ? [] : [{ id, name }];
  });
  if (attached.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {attached.map((card) => (
        <li key={card.id} className="text-[0.65rem] text-amber-200/80">
          {card.name}
        </li>
      ))}
    </ul>
  );
}

function DefeatedFighterCard({
  state,
  creature,
}: {
  state: GameState;
  creature: CreatureState;
}) {
  const def = getCreatureDefinition(creature.definitionId);
  if (def === undefined) return null;
  const role = isActiveFighter(state.players[creature.ownerId]!, creature.id)
    ? "Active"
    : "Reserve";
  return (
    <div
      className="w-full max-w-[11rem] rounded border border-stone-800 bg-stone-950/80 p-3 opacity-55"
      aria-disabled
    >
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-red-400/80">
        KO · {role}
      </p>
      <p className="mt-1 font-medium text-stone-400">{def.name}</p>
      <p className="text-xs text-stone-600">HP 0/{def.life}</p>
      <AttachedCards state={state} creature={creature} />
      <FighterDieStrip state={state} creatureId={creature.id} />
    </div>
  );
}

export function FighterRow({
  state,
  playerId,
  band,
  intent,
  canAct,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
  onTag,
  onAssist,
}: {
  state: GameState;
  playerId: PlayerId;
  /** Active sits toward the phase bar; reserves sit behind it. */
  band: "active" | "reserve";
  intent: Intent;
  canAct: boolean;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
  onTag: (reserveCreatureId: CreatureId) => void;
  onAssist: (reserveCreatureId: CreatureId) => void;
}) {
  const player = state.players[playerId];
  if (player === undefined) return null;

  const creatureIds = player.creatureIds.filter(
    (creatureId) => isActiveFighter(player, creatureId) === (band === "active"),
  );
  if (creatureIds.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {creatureIds.map((creatureId) => {
        const creature = state.creatures[creatureId];
        if (creature === undefined) return null;

        const active = band === "active";
        const role = active ? "Active" : "Reserve";

        if (creature.defeated) {
          return (
            <div key={creatureId} className="flex flex-col items-center">
              <DefeatedFighterCard state={state} creature={creature} />
            </div>
          );
        }

        const dieStrip = <FighterDieStrip state={state} creatureId={creatureId} />;

        if (active) {
          return (
            <div key={creatureId} className="flex flex-col items-center">
              <span className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                {role}
              </span>
              <CreatureTile
                state={state}
                creature={creature}
                intent={intent}
                onCreatureClick={onCreatureClick}
                onAttackChoose={onAttackChoose}
                onCancelAttack={onCancelAttack}
                footer={dieStrip}
              />
            </div>
          );
        }

        const def = getCreatureDefinition(creature.definitionId);
        const life = currentLife(creature);
        return (
          <div key={creatureId} className="flex flex-col items-center">
            <span className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
              {role}
            </span>
            <div className="w-52 rounded border border-dashed border-stone-700 bg-stone-950/60 p-3">
              <p className="font-medium text-stone-300">{def?.name ?? "Fighter"}</p>
              <p className="text-xs text-stone-500">
                HP {life}/{def?.life ?? "—"}
              </p>
              <AttachedCards state={state} creature={creature} />
              <ReserveTagAssist
                state={state}
                playerId={playerId}
                reserveId={creatureId}
                label={def?.name ?? "Reserve"}
                canAct={canAct}
                onTag={onTag}
                onAssist={onAssist}
              />
              {dieStrip}
            </div>
          </div>
        );
      })}
    </div>
  );
}
