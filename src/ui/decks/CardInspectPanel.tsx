import type { ReactNode } from "react";
import {
  attributeLabel,
  formatEffectRegion,
  formatEnergyCost,
  formatForgeLine,
  formatRequirementLine,
  formatTypeLine,
  type CardDefinition,
  type FaceCardDefinition,
} from "@/game";
import { UI_CONFIG } from "@/ui/config";
import { FaceCard } from "@/ui/cards/FaceCard";
import { TacticCard } from "@/ui/cards/TacticCard";

export type InspectSubject =
  | { readonly kind: "tactic"; readonly card: CardDefinition }
  | { readonly kind: "face"; readonly face: FaceCardDefinition };

/**
 * Deck-builder (and similar) inspect surface: optional card art on the left,
 * full printed dossier on the right. Only the dossier scrolls.
 */
export function CardInspectPanel({
  subject,
  showArt = UI_CONFIG.showDeckBuilderCardArt,
}: {
  subject: InspectSubject;
  /** Override {@link UI_CONFIG.showDeckBuilderCardArt} for a one-off. */
  showArt?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 gap-3">
      {showArt && (
        <div className="flex w-[42%] min-w-[8.5rem] max-w-[13rem] shrink-0 items-start justify-center overflow-hidden py-1">
          {subject.kind === "tactic" ? (
            <TacticCard card={subject.card} width={200} />
          ) : (
            <FaceCard face={subject.face} width={168} />
          )}
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {subject.kind === "tactic" ? (
          <TacticDossier card={subject.card} />
        ) : (
          <FaceDossier face={subject.face} />
        )}
      </div>
    </div>
  );
}

function TacticDossier({ card }: { card: CardDefinition }) {
  const gate = formatRequirementLine(card);
  const effectLines = formatEffectRegion(card);
  const playRegion = playRegionLabel(card);

  return (
    <div className="space-y-3 pb-2 text-sm text-stone-200">
      <header>
        <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--ink)]">
          {card.name}
        </h3>
        <p className="mt-1 font-mono text-xs text-stone-500">{card.id}</p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <Dt>Energy</Dt>
        <Dd>
          {formatEnergyCost(card)}
          {card.variableEnergy === true ? " (pay 1+)" : ""}
        </Dd>

        <Dt>Type</Dt>
        <Dd className="capitalize">{card.type}</Dd>

        <Dt>Subtypes</Dt>
        <Dd className="capitalize">{card.subtypes.join(", ") || "—"}</Dd>

        <Dt>Attribute</Dt>
        <Dd>{attributeLabel(card.attribute)}</Dd>

        <Dt>Type line</Dt>
        <Dd>{formatTypeLine(card)}</Dd>

        <Dt>Forge</Dt>
        <Dd>{formatForgeLine(card.forge)}</Dd>

        {card.forgeTags !== undefined && card.forgeTags.length > 0 && (
          <>
            <Dt>Forge tags</Dt>
            <Dd>{card.forgeTags.join(", ")}</Dd>
          </>
        )}

        <Dt>Play region</Dt>
        <Dd>{playRegion}</Dd>

        {gate !== null && (
          <>
            <Dt>Gate</Dt>
            <Dd>{gate}</Dd>
          </>
        )}
      </dl>

      <section>
        <h4 className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Effect / rules
        </h4>
        <div className="space-y-1 rounded border border-stone-800/80 bg-black/30 px-3 py-2 text-sm leading-relaxed text-stone-200">
          {effectLines.map((line) => (
            <p
              key={line}
              className={line.startsWith("[") ? "font-semibold text-amber-100/90" : undefined}
            >
              {line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function FaceDossier({ face }: { face: FaceCardDefinition }) {
  return (
    <div className="space-y-3 pb-2 text-sm text-stone-200">
      <header>
        <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--ink)]">
          {face.name}
        </h3>
        <p className="mt-1 font-mono text-xs text-stone-500">{face.id}</p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <Dt>Kind</Dt>
        <Dd className="capitalize">{face.kind}</Dd>

        <Dt>Symbol</Dt>
        <Dd className="capitalize">{face.symbol}</Dd>

        <Dt>Max overloads</Dt>
        <Dd>{face.maxOverloads}</Dd>

        <Dt>Forge restriction</Dt>
        <Dd>{face.forgeRestriction ?? "None"}</Dd>

        <Dt>On roll</Dt>
        <Dd>
          {face.onRoll.length > 0
            ? `${String(face.onRoll.length)} effect(s) modelled`
            : "Print only / none"}
        </Dd>

        <Dt>On absorb</Dt>
        <Dd>
          {face.onAbsorb.length > 0
            ? `${String(face.onAbsorb.length)} effect(s) modelled`
            : "Print only / none"}
        </Dd>
      </dl>

      <section>
        <h4 className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Rules text
        </h4>
        <div className="space-y-1 rounded border border-stone-800/80 bg-black/30 px-3 py-2 text-sm leading-relaxed text-stone-200">
          {face.rulesText.length > 0 ? (
            face.rulesText.split("\n").map((line) => <p key={line}>{line}</p>)
          ) : (
            <p className="text-stone-500">None (identity / footer-only face).</p>
          )}
        </div>
      </section>
    </div>
  );
}

function playRegionLabel(card: CardDefinition): string {
  if (card.equipment !== undefined) return "Equipment";
  if (card.overload !== undefined) return "Overload";
  if (card.ritual !== undefined) return "Ritual";
  if (card.effect !== undefined) return "Effect (instant / one-shot)";
  return "Forge only";
}

function Dt({ children }: { children: string }) {
  return <dt className="text-stone-500">{children}</dt>;
}

function Dd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dd className={className}>{children}</dd>;
}
