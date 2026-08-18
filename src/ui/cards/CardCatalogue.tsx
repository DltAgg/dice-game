import { ALL_CARDS, ALL_CREATURES, ALL_FACE_CARDS, BASIC_FACE_CARDS, SPECIAL_FACE_CARDS } from "@/game";
import { CreatureCard } from "./CreatureCard";
import { FaceCard } from "./FaceCard";
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
          English printing of the Figma Face card page. Basics are starting identity
          faces (Natural attributes plus untyped Shield); named specials are synthetics.
          The face deck holds up to twelve of these (bible §12).
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
          English printing of the Figma Creature card page (Slow game test). Passives print in
          full; attack costs and damage are what the engine resolves today.
        </p>

        <ul className="mt-8 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 p-0">
          {ALL_CREATURES.map((creature) => (
            <li key={creature.id} className="flex justify-center">
              <CreatureCard creature={creature} width={260} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">
          Tactic cards
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
          English printing of the Figma card layouts. Each card is either forged onto a die or
          played for its effect — never both.
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
