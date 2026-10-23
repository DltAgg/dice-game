import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  currentLife,
  formatAttackFuel,
  formatAttackLine,
  formatEffectRegion,
  formatHitClass,
  formatTypeLine,
  getCard,
  getCreatureDefinition,
  isCreatureSilenced,
  type CreatureState,
  type FighterTechniqueDefinition,
  type GameState,
  type HitStrength,
  type HitType,
} from "@server";
import { KeywordRichText } from "@client/ui/keywords/KeywordReminders";
import { LegendaryBadge } from "@client/ui/cards/LegendaryBadge";
import { formatCostDetail } from "../intents/format";
import {
  CREATURE_TOOLTIP_GAP_PX,
  CREATURE_TOOLTIP_WIDTH_PX,
  fixedTooltipPairStyle,
  useAnchoredTooltipPair,
  type AnchoredTooltipPairPos,
} from "../tooltips/anchoredTooltip";

function techniqueRole(role: FighterTechniqueDefinition["sequenceRole"]): string {
  if (role === "starter") return "Starter";
  if (role === "extender") return "Extender";
  if (role === "finisher") return "Finisher";
  return "";
}

function hitClassLabel(hit: {
  readonly hitStrength?: HitStrength;
  readonly hitType?: HitType;
}): string {
  if (hit.hitStrength === undefined || hit.hitType === undefined) return "";
  return formatHitClass({ hitStrength: hit.hitStrength, hitType: hit.hitType });
}

/**
 * Inspect hover for any Fighter. The printed Techniques list is always shown.
 */
export function FighterInspectHover({
  state,
  creature,
  className,
  children,
}: {
  state: GameState;
  creature: CreatureState;
  className?: string;
  children: ReactNode;
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

  return (
    <div
      ref={rootRef}
      data-creature-id={creature.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
    >
      {pairPos !== null &&
        def !== undefined &&
        createPortal(
          <FighterInspectPair state={state} creature={creature} pairPos={pairPos} />,
          document.body,
        )}
      {children}
    </div>
  );
}

function FighterInspectPair({
  state,
  creature,
  pairPos,
}: {
  state: GameState;
  creature: CreatureState;
  pairPos: AnchoredTooltipPairPos;
}) {
  const def = getCreatureDefinition(creature.definitionId);
  if (def === undefined) return null;
  const isLegendary = def.legendary === true;
  const silenced = isCreatureSilenced(state, creature.id);
  const life = currentLife(creature);
  const owner = state.players[creature.ownerId];
  const activeFighter = owner !== undefined && owner.activeCreatureId === creature.id;
  const equipment = creature.equipmentIds.flatMap((id) => {
    const instance = state.cards[id];
    if (instance === undefined) return [];
    const cardDef = getCard(instance.cardId);
    if (cardDef === undefined) return [];
    return [{ instanceId: id, def: cardDef }];
  });

  return (
    <>
      <div
        className="pointer-events-none fixed z-[70] max-h-[min(24rem,70vh)] w-64 overflow-y-auto rounded border border-stone-600 bg-stone-950 p-3 text-left shadow-xl"
        style={fixedTooltipPairStyle(pairPos, "primary")}
        role="tooltip"
      >
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-100">
          <span>{def.name}</span>
          {isLegendary && <LegendaryBadge />}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          HP {life}/{def.life}
          {creature.attackPreventCount > 0 ? ` · Prevent ${creature.attackPreventCount}` : ""}
          {creature.nextAttackBonus > 0 ? ` · Next ATK +${creature.nextAttackBonus}` : ""} · Toxin{" "}
          {creature.toxinMarkers}
          {silenced ? " · Silenced" : ""}
        </p>
        <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-stone-500">
          {creature.position}
          {isLegendary ? " · Legendary" : ""}
          {activeFighter ? "" : " · Reserve"}
        </p>
        <div className="mt-2 space-y-2 border-t border-stone-800 pt-2 font-[family-name:var(--font-card)] text-[0.7rem] leading-relaxed text-stone-300">
          {def.passiveRulesText !== "" && (
            <p>
              <span className="text-stone-500">Passive:</span> {def.passiveRulesText}
            </p>
          )}
          {def.assistRulesText !== undefined && def.assistRulesText !== "" && (
            <p>
              <span className="text-stone-500">Assist:</span> {def.assistRulesText}
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
              <span className="text-[var(--accent)]">{formatAttackFuel(attack) || "—"}</span>
            </p>
          ))}
          {(def.techniques?.length ?? 0) + (creature.addedTechniques?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-stone-500">Techniques</p>
              {[...(def.techniques ?? []), ...(creature.addedTechniques ?? [])].map((technique) => {
                const summary = [hitClassLabel(technique), techniqueRole(technique.sequenceRole)]
                  .filter((part) => part !== "")
                  .join(" · ");
                return (
                  <p key={technique.id}>
                    <span className="text-stone-100">{technique.name}</span>
                    {summary !== "" ? ` · ${summary}` : ""}
                    {technique.rulesText !== undefined && technique.rulesText !== "" && (
                      <span className="mt-0.5 block text-stone-400">
                        <KeywordRichText text={technique.rulesText} />
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div
        className="pointer-events-none fixed z-[70] w-64 overflow-y-auto rounded border border-amber-700/50 bg-stone-950 p-3 text-left shadow-xl"
        style={fixedTooltipPairStyle(pairPos, "secondary")}
        role="tooltip"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">Attached</p>
        {equipment.length === 0 ? (
          <p className="mt-2 text-[0.7rem] text-stone-500">None attached</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {equipment.map(({ instanceId, def: equipDef }) => (
              <li key={instanceId} className="border-t border-stone-800 pt-2 first:border-0 first:pt-0">
                <p className="text-sm font-medium text-stone-100">{equipDef.name}</p>
                <p className="mt-0.5 text-[0.65rem] text-stone-500">
                  {formatCostDetail(equipDef, formatTypeLine(equipDef))}
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
    </>
  );
}
