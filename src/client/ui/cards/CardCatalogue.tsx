import { ALL_CARDS, ALL_CREATURES, ALL_FACE_CARDS, BASIC_FACE_CARDS, SPECIAL_FACE_CARDS } from "@server";
import { CreatureCard } from "./CreatureCard";
import { FaceCard } from "./FaceCard";
import { LegendaryBadge } from "./LegendaryBadge";
import { TacticCard } from "./TacticCard";

/**
 * Renders every defined Figma card in English. This is a content viewer for
 * Milestone 2 — not the match interface.
 */
export function CardCatalogue() {
  return (
    <>
      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">
          Face cards
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
          Basics are starting identity faces (Natural attributes plus untyped Shield).
          Named specials are Tag Skirmish technique faces (Strike, Guard, Heavy, and the rest).
        </p>

        <h3 className="mt-8 font-[family-name:var(--font-display)] text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Basics ({BASIC_FACE_CARDS.length})
        </h3>
        <ul className="mt-4 grid list-none grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5 p-0">
          {BASIC_FACE_CARDS.map((face) => (
            <li key={face.id} className="flex justify-center">
              <FaceCard face={face} width={260} />
            </li>
          ))}
        </ul>

        <h3 className="mt-10 font-[family-name:var(--font-display)] text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Specials ({SPECIAL_FACE_CARDS.length})
        </h3>
        <ul className="mt-4 grid list-none grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5 p-0">
          {SPECIAL_FACE_CARDS.map((face) => (
            <li key={face.id} className="flex justify-center">
              <FaceCard face={face} width={260} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-500">
          Catalogue lists {ALL_FACE_CARDS.length} face definitions from the Face card page.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">
          Creature cards
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
          Tag Skirmish fighters. Passives print in full; native attacks are what the engine
          resolves today.
        </p>

        <ul className="mt-8 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 p-0">
          {ALL_CREATURES.map((creature) => (
            <li key={creature.id} className="flex flex-col items-center gap-2">
              <CreatureCard creature={creature} width={260} />
              <p className="text-center text-[0.65rem] uppercase tracking-[0.14em] text-stone-500">
                {creature.legendary === true ? <LegendaryBadge /> : null}
                <span className={creature.legendary === true ? "mt-1 block normal-case tracking-normal text-stone-600" : undefined}>
                  {creature.legendary === true ? "Legendary Creature" : "Creature"}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">
          Tactic cards
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
          Tag Skirmish tactics: fighter-locked, archetype, team, and universal cards that
          extend a Fighter’s moveset.
        </p>

        <ul className="mt-8 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 p-0">
          {ALL_CARDS.map((card) => (
            <li key={card.id} className="flex justify-center">
              <TacticCard card={card} width={260} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
