import {
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  attackIsFuelled,
  canAbsorbSymbol,
  currentLife,
  formatAttackFuel,
  formatAttackLine,
  formatEffectRegion,
  formatTypeLine,
  getCard,
  getCreatureDefinition,
  isCreatureSilenced,
  SHIELD,
  type AttackId,
  type CreatureId,
  type CreatureState,
  type GameState,
} from "@server";
import {
  attackIsArmed,
} from "../intents/attack";
import {
  formatPlayCostCompact,
} from "../intents/format";
import {
  type Intent,
} from "../intents/types";
import {
  btnClass,
  btnPrimary,
} from "../styles";
import { LegendaryBadge } from "@client/ui/cards/LegendaryBadge";
import {
  CREATURE_TOOLTIP_GAP_PX,
  CREATURE_TOOLTIP_WIDTH_PX,
  fixedTooltipPairStyle,
  useAnchoredTooltipPair,
} from "../tooltips/anchoredTooltip";

export function CreatureTile({
  state,
  creature,
  intent,
  onCreatureClick,
  onAttackChoose,
  onCancelAttack,
}: {
  state: GameState;
  creature: CreatureState;
  intent: Intent;
  onCreatureClick: (creature: CreatureState) => void;
  onAttackChoose: (attackerId: CreatureId, attackId: AttackId) => void;
  onCancelAttack: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const pairPos = useAnchoredTooltipPair(
    hovered,
    rootRef,
    CREATURE_TOOLTIP_WIDTH_PX,
    CREATURE_TOOLTIP_GAP_PX,
  );

  const def = getCreatureDefinition(creature.definitionId);
  if (def === undefined) return null;
  const isLegendary = def.legendary === true;
  const silenced = isCreatureSilenced(state, creature.id);
  const life = currentLife(creature);
  const selectedAttacker = intent.kind === "attack" && intent.attackerId === creature.id;
  const absorbSymbolId = intent.kind === "absorb" ? intent.symbolId : undefined;
  const absorbPip =
    absorbSymbolId !== undefined ? state.symbols[absorbSymbolId] : undefined;
  const absorbHere =
    absorbPip !== undefined &&
    absorbPip.symbol === SHIELD &&
    absorbSymbolId !== undefined &&
    canAbsorbSymbol(state, creature.ownerId, absorbSymbolId, creature.id);
  const absorbBlocked =
    absorbPip !== undefined &&
    absorbPip.symbol === SHIELD &&
    !absorbHere &&
    creature.ownerId === state.activePlayerId;
  const equipment = creature.equipmentIds.flatMap((id) => {
    const instance = state.cards[id];
    if (instance === undefined) return [];
    const cardDef = getCard(instance.cardId);
    if (cardDef === undefined) return [];
    return [{ instanceId: id, def: cardDef }];
  });

  return (
    <div
      ref={rootRef}
      data-creature-id={creature.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        selectedAttacker || absorbHere
          ? "relative w-52 rounded border-2 border-[var(--accent)] bg-stone-900 p-3 shadow-[0_0_12px_rgba(212,168,75,0.25)]"
          : absorbBlocked
            ? "relative w-52 rounded border border-stone-800 bg-stone-950 p-3 opacity-60"
            : "relative w-52 rounded border border-stone-700 bg-stone-950 p-3"
      }
    >
      {pairPos !== null &&
        createPortal(
          <>
            <div
              className="pointer-events-none fixed z-[70] w-64 overflow-y-auto rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl"
              style={fixedTooltipPairStyle(pairPos, "primary")}
              role="tooltip"
            >
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-100">
                <span>{def.name}</span>
                {isLegendary && <LegendaryBadge />}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                HP {life}/{def.life} · Shield {creature.shields}
                {creature.attackPreventCount > 0
                  ? ` · Prevent ${creature.attackPreventCount}`
                  : ""}
                {creature.nextAttackBonus > 0 ? ` · Next ATK +${creature.nextAttackBonus}` : ""} ·
                Toxin {creature.toxinMarkers}
                {silenced ? " · Silenced" : ""}
              </p>
              <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
                {creature.position}
                {isLegendary ? " · Legendary" : ""} · {def.attributes.join(", ")}
              </p>
              <div className="mt-2 space-y-2 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                {def.passiveRulesText !== "" && (
                  <p>
                    <span className="text-stone-500">Passive:</span> {def.passiveRulesText}
                  </p>
                )}
                {def.attacks.map((attack) => (
                  <p key={attack.id}>
                    <span className="text-stone-500">
                      {attack.kind === "basic" ? "Basic" : "Special"}:
                    </span>{" "}
                    {formatAttackLine(attack)}
                    {attack.range ? " (Range)" : ""}
                    {" · "}
                    <span className="text-[var(--accent)]">
                      {formatAttackFuel(attack) || "—"}
                    </span>
                  </p>
                ))}
              </div>
            </div>
            <div
              className="pointer-events-none fixed z-[70] w-64 overflow-y-auto rounded border border-amber-700/50 bg-stone-950 p-3 text-left shadow-xl"
              style={fixedTooltipPairStyle(pairPos, "secondary")}
              role="tooltip"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                Equipment
              </p>
              {equipment.length === 0 ? (
                <p className="mt-2 text-[0.7rem] text-stone-500">None attached</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {equipment.map(({ instanceId, def: equipDef }) => (
                    <li
                      key={instanceId}
                      className="border-t border-stone-800 pt-2 first:border-0 first:pt-0"
                    >
                      <p className="text-sm font-medium text-stone-100">{equipDef.name}</p>
                      <p className="mt-0.5 text-[0.65rem] text-stone-500">
                        {formatPlayCostCompact(equipDef)} · {formatTypeLine(equipDef)}
                      </p>
                      <pre className="mt-1 whitespace-pre-wrap font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
                        {formatEffectRegion(equipDef).join("\n")}
                      </pre>
                      {(equipDef.equipment?.abilities.length ?? 0) > 0 && (
                        <p className="mt-1 text-[0.65rem] text-stone-500">
                          Standing: {String(equipDef.equipment?.abilities.length)} abilit
                          {(equipDef.equipment?.abilities.length ?? 0) === 1 ? "y" : "ies"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>,
          document.body,
        )}

      <button type="button" className="w-full text-left" onClick={() => onCreatureClick(creature)}>
        <p className="flex flex-wrap items-center gap-2 font-medium text-stone-100">
          <span>{def.name}</span>
          {isLegendary && <LegendaryBadge />}
          {silenced && (
            <span className="inline-block rounded border border-violet-400/40 bg-violet-950/50 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-violet-200">
              Silenced
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          HP {life}/{def.life} · Shield {creature.shields}
          {creature.attackPreventCount > 0
            ? ` · Prevent ${creature.attackPreventCount}`
            : ""}{" "}
          · Toxin {creature.toxinMarkers}
        </p>
        <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
          {creature.position}
          {isLegendary ? " · Legendary" : ""} · {def.attributes.join(", ")}
        </p>
        {equipment.length > 0 && (
          <p className="mt-1 text-[0.65rem] text-amber-200/80">
            +{equipment.length} equipment
          </p>
        )}
        {absorbHere && (
          <p className="mt-1 text-[0.65rem] font-medium text-[var(--accent)]">Absorb Shield here</p>
        )}
      </button>

      <ul className="mt-2 space-y-1 border-t border-stone-800 pt-2">
        {def.attacks.map((attack) => (
          <li key={attack.id} className="text-[0.7rem] leading-snug text-stone-300">
            <span className="text-stone-500">{attack.kind === "basic" ? "B" : "S"}:</span>{" "}
            {attack.name}{" "}
            <span className="text-[var(--accent)]">
              {formatAttackFuel(attack) || "—"}
            </span>
          </li>
        ))}
      </ul>

      {selectedAttacker && intent.attackId === undefined && (
        <div className="mt-2 flex flex-col gap-1">
          {def.attacks.map((attack) => {
            const armed = attackIsArmed(state, creature, attack);
            const fuelled = attackIsFuelled(
              state.players[creature.ownerId]?.attributePool ?? {},
              attack,
            );
            return (
              <button
                key={attack.id}
                type="button"
                disabled={!armed}
                className={armed ? btnPrimary : `${btnClass} opacity-40`}
                onClick={() => onAttackChoose(creature.id, attack.id)}
              >
                {attack.name}
                {!fuelled ? " · not fuelled" : ""}
              </button>
            );
          })}
          <button type="button" className={btnClass} onClick={onCancelAttack}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
