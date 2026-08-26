import type { Attribute } from "@/game";
import {
  attackCostOf,
  basicAttackOf,
  formatAttackLine,
  primaryAttribute,
  specialAttackOf,
  type CreatureDefinition,
  type SymbolRequirement,
} from "@/game";
import creatureLayout from "./assets/creature-layout.png";
import martialIcon from "./assets/attributes/martial.png";
import wildIcon from "./assets/attributes/wild.png";
import toxinIcon from "./assets/attributes/toxin.png";
import arcaneIcon from "./assets/attributes/arcane.png";
import luminarIcon from "./assets/attributes/luminar.png";
import mechanicalIcon from "./assets/attributes/mechanical.png";
import corruptionIcon from "./assets/attributes/corruption.png";
import darknessIcon from "./assets/attributes/darkness.png";
import minotaurArt from "./assets/creatures/minotaur.png";
import varcolacArt from "./assets/creatures/varcolac.png";
import garudaArt from "./assets/creatures/garuda.png";
import archmageArt from "./assets/creatures/archmage.png";
import elderArt from "./assets/creatures/corrupting-elder.png";
import voidArt from "./assets/creatures/void-summoner.png";

/**
 * The Figma `Creature card layout` template, rendered in English.
 *
 * Proportions follow the 1050×1498 frame: header (name + HP + attribute), art,
 * then Passive / Basic / Special in the bottom box. The ornate border is the
 * exported creature layout asset.
 */

const ATTRIBUTE_ICON: Readonly<Record<Attribute, string>> = {
  martial: martialIcon,
  wild: wildIcon,
  toxin: toxinIcon,
  arcane: arcaneIcon,
  luminar: luminarIcon,
  mechanical: mechanicalIcon,
  corruption: corruptionIcon,
  darkness: darknessIcon,
};

const CREATURE_ART: Readonly<Record<string, string>> = {
  "creature-minotaur": minotaurArt,
  "creature-varcolac": varcolacArt,
  "creature-garuda": garudaArt,
  "creature-archmage": archmageArt,
  "creature-corrupting-elder": elderArt,
  "creature-void-summoner": voidArt,
};

export interface CreatureCardProps {
  readonly creature: CreatureDefinition;
  readonly width?: number;
}

function costIcons(requires: SymbolRequirement): readonly { attribute: Attribute; key: string }[] {
  const icons: { attribute: Attribute; key: string }[] = [];
  for (const [attribute, count] of Object.entries(requires) as [Attribute, number | undefined][]) {
    if (count === undefined) continue;
    for (let i = 0; i < count; i += 1) {
      icons.push({ attribute, key: `${attribute}-${String(i)}` });
    }
  }
  return icons;
}

export function CreatureCard({ creature, width = 280 }: CreatureCardProps) {
  const attribute = primaryAttribute(creature);
  const art = CREATURE_ART[creature.id];
  const basic = basicAttackOf(creature);
  const special = specialAttackOf(creature);

  return (
    <article
      className="relative select-none text-black"
      style={{ width, aspectRatio: "1050 / 1498", containerType: "inline-size" }}
      aria-label={`${creature.name}, ${String(creature.life)} HP`}
    >
      {art !== undefined ? (
        <div className="absolute inset-x-[6.6%] top-[12.7%] h-[56%] overflow-hidden">
          <img
            src={art}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-[-8%] h-[140%] w-[101%] max-w-none -translate-x-1/2 object-cover"
          />
        </div>
      ) : null}

      <img
        src={creatureLayout}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      <header className="absolute inset-x-[6.6%] top-[4.4%] flex h-[8.2%] items-center">
        <h2 className="min-w-0 flex-1 truncate px-[2%] text-center font-[family-name:var(--font-card)] text-[length:clamp(0.7rem,5.2cqw,1.45rem)] font-normal leading-none tracking-tight">
          {creature.name}
        </h2>
        <div className="flex shrink-0 items-center gap-[0.35em] pr-[1%]">
          <span className="font-[family-name:var(--font-card)] text-[length:clamp(0.85rem,5.8cqw,1.55rem)] font-normal leading-none whitespace-nowrap">
            {String(creature.life)} HP
          </span>
          {attribute !== undefined ? (
            <img
              src={ATTRIBUTE_ICON[attribute]}
              alt={attribute}
              draggable={false}
              className="size-[length:clamp(1.4rem,9cqw,2.35rem)] rounded-full object-cover"
            />
          ) : null}
        </div>
      </header>

      <div className="absolute inset-x-[6.6%] bottom-[7.4%] flex h-[24.1%] flex-col justify-start overflow-hidden px-[2.4%] pt-[2.2%]">
        {creature.passiveRulesText !== "" ? (
          <p className="font-[family-name:var(--font-card)] text-[length:clamp(0.5rem,2.9cqw,0.72rem)] font-normal leading-snug">
            {creature.passiveRulesText}
          </p>
        ) : null}

        {basic !== undefined ? (
          <AttackRow
            text={formatAttackLine(basic)}
            icons={costIcons(attackCostOf(basic))}
            className="mt-[0.55em]"
          />
        ) : null}

        {special !== undefined ? (
          <AttackRow
            text={formatAttackLine(special)}
            icons={costIcons(attackCostOf(special))}
            className="mt-[0.45em]"
          />
        ) : null}
      </div>
    </article>
  );
}

function AttackRow({
  text,
  icons,
  className = "",
}: {
  text: string;
  icons: readonly { attribute: Attribute; key: string }[];
  className?: string;
}) {
  const colon = text.indexOf(": ");
  const name = colon >= 0 ? text.slice(0, colon + 1) : text;
  const body = colon >= 0 ? text.slice(colon + 1) : "";

  return (
    <div className={`flex items-start gap-[0.35em] ${className}`}>
      <div className="flex shrink-0 flex-wrap gap-[0.12em] pt-[0.1em]">
        {icons.map((icon) => (
          <img
            key={icon.key}
            src={ATTRIBUTE_ICON[icon.attribute]}
            alt={icon.attribute}
            draggable={false}
            className="size-[length:clamp(0.85rem,4.6cqw,1.15rem)] rounded-full object-cover"
          />
        ))}
      </div>
      <p className="min-w-0 font-[family-name:var(--font-card)] text-[length:clamp(0.5rem,2.9cqw,0.72rem)] leading-snug">
        <span className="font-bold">{name}</span>
        {body !== "" ? <span className="font-normal">{body}</span> : null}
      </p>
    </div>
  );
}
