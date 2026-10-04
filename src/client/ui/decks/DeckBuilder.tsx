import { useMemo, useState } from "react";
import {
  ALL_CARDS,
  BASIC_FACE_CARDS,
  CREATURES,
  rulesConfigForLoadout,
  leftoverFacePool,
  isOpeningBasicFace,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  PROTOTYPE_STARTING_DICE,
  SPECIAL_FACE_CARDS,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  type CardId,
  type CreatureDefinitionId,
  type FaceCardId,
  type StartingDiceLayout,
} from "@server";
import {
  PROTOTYPE_SAVED_DECK_ID,
  validateSavedDeck,
  type SavedDeckId,
} from "@client/decks";
import { useDeckStore } from "@client/store/deckStore";
import { CardInspectPanel } from "@client/ui/decks/CardInspectPanel";
import { LegendaryBadge } from "@client/ui/cards/LegendaryBadge";
import { UI_CONFIG } from "@client/ui/config";
import { DeckCostCurveSection } from "./DeckCostCurveSection";
import { OpeningDiceSection } from "./OpeningDiceSection";
import { CatalogueTab } from "./CatalogueTab";
import { DeckRow } from "./DeckRow";
import {
  CATALOGUE_FILTERS,
  catalogueSearchLabel,
  matchesCardQuery,
  matchesFaceQuery,
  normalizeQuery,
  type CatalogueFilter,
  type PreviewTarget,
} from "./deckBuilderSearch";
import { btnClass } from "./deckBuilderStyles";
import {
  addCopy,
  countOf,
  removeOne,
  uniqueFaceDeckSpecials,
  uniqueSortedCounts,
} from "./deckBuilderUtils";

const creatureOptions = Object.values(CREATURES);

export function DeckBuilder() {
  const decks = useDeckStore((s) => s.decks);
  const selectedId = useDeckStore((s) => s.selectedId);
  const select = useDeckStore((s) => s.select);
  const save = useDeckStore((s) => s.save);
  const remove = useDeckStore((s) => s.remove);
  const get = useDeckStore((s) => s.get);

  const selected = selectedId !== null ? get(selectedId) : undefined;
  const readonly = selected?.builtin === true;

  const [name, setName] = useState(selected?.name ?? "My deck");
  const [squad, setSquad] = useState<CreatureDefinitionId[]>([
    ...(selected?.squad ?? PROTOTYPE_SQUAD),
  ]);
  const [deck, setDeck] = useState<CardId[]>([...(selected?.deck ?? PROTOTYPE_DECK)]);
  const [faceDeck, setFaceDeck] = useState<FaceCardId[]>([
    ...(selected?.faceDeck ?? PROTOTYPE_FACE_DECK),
  ]);
  const [startingDice, setStartingDice] = useState<StartingDiceLayout>(
    selected?.startingDice ?? PROTOTYPE_STARTING_DICE,
  );
  const [paintTarget, setPaintTarget] = useState<{ die: 0 | 1; slot: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catalogueFilter, setCatalogueFilter] = useState<CatalogueFilter>("all");
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  const load = (id: SavedDeckId) => {
    const saved = get(id);
    if (saved === undefined) return;
    select(id);
    setName(saved.name);
    setSquad([...saved.squad]);
    setDeck([...saved.deck]);
    setFaceDeck([...saved.faceDeck]);
    setStartingDice(saved.startingDice);
    setPaintTarget(null);
    setMessage(null);
    setPreview(null);
  };

  const draft = useMemo(
    () => ({ name, squad, deck, faceDeck, startingDice }),
    [name, squad, deck, faceDeck, startingDice],
  );
  const legality = validateSavedDeck(draft);
  const cfg = rulesConfigForLoadout(startingDice.length);
  const leftoverPool = useMemo(
    () => leftoverFacePool(faceDeck, startingDice),
    [faceDeck, startingDice],
  );
  const faceDeckSpecials = useMemo(
    () => uniqueFaceDeckSpecials(faceDeck),
    [faceDeck],
  );

  const paintSlot = (id: FaceCardId) => {
    if (readonly) return;
    if (paintTarget === null) {
      setMessage("Select an opening-die slot, then a face to place.");
      return;
    }
    const needsFaceDeckRow = !isOpeningBasicFace(id) && !faceDeck.includes(id);
    if (needsFaceDeckRow) {
      if (faceDeck.length >= cfg.faceDeckMaxCards) {
        const faceName = getFaceCard(id)?.name ?? id;
        setMessage(
          `Add ${faceName} to the face deck first (max ${String(cfg.faceDeckMaxCards)}).`,
        );
        return;
      }
      setFaceDeck((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    setStartingDice((prev) => {
      const next = prev.map((die) => [...die]);
      const die = next[paintTarget.die];
      if (die === undefined) return prev;
      die[paintTarget.slot] = id;
      return next as unknown as StartingDiceLayout;
    });
    setMessage(null);
  };

  const deckEntries = useMemo(
    () =>
      uniqueSortedCounts(deck, (id) => getCard(id)?.name ?? id),
    [deck],
  );

  const faceEntries = useMemo(
    () =>
      uniqueSortedCounts(faceDeck, (id) => getFaceCard(id)?.name ?? id),
    [faceDeck],
  );

  const searchQuery = normalizeQuery(search);
  const searchActive = searchQuery.length > 0;
  const showingFaces = catalogueFilter === "faces";
  const browseHandCards = catalogueFilter !== "faces";

  const filteredTactics = useMemo(() => {
    if (!browseHandCards) return [];
    return ALL_CARDS.filter((card) => {
      if (catalogueFilter !== "all" && card.type !== catalogueFilter) return false;
      return matchesCardQuery(card, searchQuery);
    });
  }, [browseHandCards, catalogueFilter, searchQuery]);

  const filteredFaces = useMemo(() => {
    if (!showingFaces) return [];
    return [...BASIC_FACE_CARDS, ...SPECIAL_FACE_CARDS].filter((face) =>
      matchesFaceQuery(face, searchQuery),
    );
  }, [searchQuery, showingFaces]);

  const catalogueEmpty =
    filteredTactics.length === 0 && filteredFaces.length === 0;

  const resolvedPreview = useMemo((): PreviewTarget => {
    if (preview !== null) return preview;
    if (searchActive) {
      const firstHit = filteredTactics[0]?.id;
      if (firstHit !== undefined) return { kind: "tactic", id: firstHit };
      const firstFaceHit = filteredFaces[0]?.id;
      if (firstFaceHit !== undefined) return { kind: "face", id: firstFaceHit };
    }
    if (showingFaces) {
      const firstFace = faceEntries[0]?.id ?? SPECIAL_FACE_CARDS[0]?.id;
      if (firstFace !== undefined) return { kind: "face", id: firstFace };
    }
    const firstFiltered = filteredTactics[0]?.id;
    const firstTactic = firstFiltered ?? deckEntries[0]?.id ?? ALL_CARDS[0]?.id;
    if (firstTactic !== undefined) return { kind: "tactic", id: firstTactic };
    const fallbackFace = SPECIAL_FACE_CARDS[0]?.id;
    if (fallbackFace !== undefined) return { kind: "face", id: fallbackFace };
    return { kind: "tactic", id: ALL_CARDS[0]!.id };
  }, [
    preview,
    searchActive,
    showingFaces,
    deckEntries,
    faceEntries,
    filteredTactics,
    filteredFaces,
  ]);

  const previewTactic =
    resolvedPreview.kind === "tactic" ? getCard(resolvedPreview.id) : undefined;
  const previewFace =
    resolvedPreview.kind === "face" ? getFaceCard(resolvedPreview.id) : undefined;

  const onSave = (asNew: boolean) => {
    try {
      const id = asNew || selected?.builtin === true ? undefined : (selectedId ?? undefined);
      const saved = save(draft, id);
      setMessage(`Saved “${saved.name}”.`);
      load(saved.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    }
  };

  const onDelete = () => {
    if (selectedId === null || selected?.builtin === true) return;
    remove(selectedId);
    load(PROTOTYPE_SAVED_DECK_ID);
    setMessage("Deck deleted.");
  };

  const setSquadSlot = (index: number, definitionId: CreatureDefinitionId) => {
    const next = [...squad];
    next[index] = definitionId;
    setSquad(next);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Decks
          </h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--ink-muted)]">
          Hover any card to inspect it. Build a loadout (
          {cfg.deckMinCards}–{cfg.deckMaxCards} tactics, ≤{cfg.deckMaxCopiesPerCard} copies;
          face deck ≤{cfg.faceDeckMaxCards}
          {UI_CONFIG.showDeckBuilderOpeningDice
            ? `; opening dice ≤${String(cfg.startingMaxSyntheticsPerPlayer)} synthetics total, ≤${String(cfg.startingMaxSyntheticsPerDie)} per die`
            : ""}
          ). Illegal drafts can be saved; Play refuses them until they are legal.
        </p>
        </div>
        <label className="flex w-full max-w-xs flex-col gap-1 text-sm sm:w-56">
          <span className="text-stone-400">Name</span>
          <input
            className="rounded border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={readonly}
          />
        </label>
      </header>

      <div className="flex flex-wrap gap-2">
        {decks.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={
              entry.id === selectedId
                ? "rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-3 py-1 text-sm text-[var(--accent)]"
                : "rounded border border-stone-700 px-3 py-1 text-sm text-stone-400 hover:border-stone-500"
            }
            onClick={() => load(entry.id)}
          >
            {entry.name}
            {entry.builtin === true ? " · builtin" : ""}
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Squad ({squad.length}/{cfg.creaturesPerPlayer})
        </h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {squad.map((definitionId, index) => {
            const slotDef = getCreatureDefinition(definitionId);
            return (
              <div key={`squad-${String(index)}`} className="flex flex-col gap-1">
                <select
                  className="rounded border border-stone-700 bg-stone-950 px-2 py-2 text-sm text-stone-100"
                  value={definitionId}
                  disabled={readonly}
                  onChange={(event) =>
                    setSquadSlot(index, event.target.value as CreatureDefinitionId)
                  }
                >
                  {creatureOptions.map((creature) => (
                    <option key={creature.id} value={creature.id}>
                      {creature.name}
                      {creature.legendary === true ? " · Legendary" : ""}
                    </option>
                  ))}
                </select>
                {slotDef?.legendary === true ? <LegendaryBadge className="self-start" /> : null}
              </div>
            );
          })}
        </div>
      </section>

      {UI_CONFIG.showDeckBuilderOpeningDice ? (
        <OpeningDiceSection
          readonly={readonly}
          startingDice={startingDice}
          paintTarget={paintTarget}
          faceDeckSpecials={faceDeckSpecials}
          leftoverPool={leftoverPool}
          onSelectSlot={(die, slot) => setPaintTarget({ die, slot })}
          onPaint={paintSlot}
          onPreview={setPreview}
        />
      ) : null}

      {UI_CONFIG.showDeckBuilderCostCurve ? <DeckCostCurveSection deck={deck} /> : null}

      {/* Tactics (left) + preview/search (right): matched fixed height */}
      <div className="grid h-[min(62vh,680px)] grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-800/80 bg-gradient-to-b from-stone-950/80 to-black/40 p-3 sm:p-4">
          <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
              Your tactics
            </h2>
            <span className="font-mono text-xs text-stone-500">
              {deck.length}/{cfg.deckMinCards}–{cfg.deckMaxCards}
            </span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
            {deckEntries.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-stone-600">
                No tactics yet — add some from the catalogue.
              </li>
            )}
            {deckEntries.map(({ id, copies }) => {
              const card = getCard(id);
              if (card === undefined) return null;
              const active =
                resolvedPreview.kind === "tactic" && resolvedPreview.id === id;
              return (
                <li key={id}>
                  <DeckRow
                    title={card.name}
                    subtitle={`${card.type} · ${copies}/${cfg.deckMaxCopiesPerCard}`}
                    copies={copies}
                    maxCopies={cfg.deckMaxCopiesPerCard}
                    active={active}
                    readonly={readonly}
                    onHover={() => setPreview({ kind: "tactic", id })}
                    onAdd={() => setDeck(addCopy(deck, id, cfg.deckMaxCopiesPerCard))}
                    onRemove={() => setDeck(removeOne(deck, id))}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-800/80 bg-gradient-to-b from-[#1c1814] to-stone-950/90">
          <div className="h-1/2 min-h-0 overflow-hidden border-b border-stone-800/60 px-3 py-3">
            {previewTactic !== undefined && (
              <CardInspectPanel
                key={`tactic-${resolvedPreview.id}`}
                subject={{ kind: "tactic", card: previewTactic }}
              />
            )}
            {previewFace !== undefined && (
              <CardInspectPanel
                key={`face-${resolvedPreview.id}`}
                subject={{ kind: "face", face: previewFace }}
              />
            )}
          </div>

          <div className="flex h-1/2 min-h-0 flex-col px-3 pb-3 pt-2">
            <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
              <div className="flex max-w-full flex-wrap rounded border border-stone-700 p-0.5">
                {CATALOGUE_FILTERS.map((entry) => (
                  <CatalogueTab
                    key={entry.id}
                    label={entry.label}
                    active={catalogueFilter === entry.id}
                    onClick={() => setCatalogueFilter(entry.id)}
                  />
                ))}
              </div>
              <label className="relative min-w-[10rem] flex-1">
                <span className="sr-only">{catalogueSearchLabel(catalogueFilter)}</span>
                <input
                  className="w-full rounded border border-stone-700 bg-stone-950 py-1.5 pl-3 pr-3 text-sm text-stone-100 placeholder:text-stone-600"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={catalogueSearchLabel(catalogueFilter)}
                />
              </label>
            </div>

            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
              {browseHandCards &&
                filteredTactics.map((card) => {
                  const copies = countOf(deck, card.id);
                  const active =
                    resolvedPreview.kind === "tactic" && resolvedPreview.id === card.id;
                  return (
                    <li key={card.id}>
                      <DeckRow
                        title={card.name}
                        subtitle={`${card.type} · in deck ${copies}/${cfg.deckMaxCopiesPerCard}`}
                        copies={copies}
                        maxCopies={cfg.deckMaxCopiesPerCard}
                        active={active}
                        readonly={readonly}
                        onHover={() => setPreview({ kind: "tactic", id: card.id })}
                        onAdd={() =>
                          setDeck(addCopy(deck, card.id, cfg.deckMaxCopiesPerCard))
                        }
                        onRemove={() => setDeck(removeOne(deck, card.id))}
                      />
                    </li>
                  );
                })}

              {showingFaces &&
                filteredFaces.map((face) => {
                  const copies = countOf(faceDeck, face.id);
                  const active =
                    resolvedPreview.kind === "face" && resolvedPreview.id === face.id;
                  return (
                    <li key={face.id}>
                      <DeckRow
                        title={face.name}
                        subtitle={`face · in deck ×${copies}`}
                        copies={copies}
                        maxCopies={cfg.faceDeckMaxCards}
                        active={active}
                        readonly={readonly}
                        addDisabled={faceDeck.length >= cfg.faceDeckMaxCards}
                        onHover={() => setPreview({ kind: "face", id: face.id })}
                        {...(UI_CONFIG.showDeckBuilderOpeningDice
                          ? {
                              onAssign: () => paintSlot(face.id),
                              canAssign: paintTarget !== null,
                            }
                          : {})}
                        onAdd={() =>
                          setFaceDeck(addCopy(faceDeck, face.id, cfg.faceDeckMaxCards))
                        }
                        onRemove={() => setFaceDeck(removeOne(faceDeck, face.id))}
                      />
                    </li>
                  );
                })}

              {catalogueEmpty && (
                <li className="py-8 text-center text-sm text-stone-600">No matching cards</li>
              )}
            </ul>
          </div>
        </section>
      </div>

      {/* Faces: full-width strip under both columns; wrap + scroll down */}
      <section className="flex h-44 shrink-0 flex-col overflow-hidden rounded-xl border border-stone-800/80 bg-gradient-to-r from-stone-950 via-[#161310] to-stone-950 p-3 sm:p-4">
        <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Your faces
          </h2>
          <span className="font-mono text-xs text-stone-500">
            {faceDeck.length}/{cfg.faceDeckMaxCards}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <ul className="flex list-none flex-wrap content-start gap-2 p-0">
            {faceEntries.length === 0 && (
              <li className="w-full py-4 text-center text-sm text-stone-600">
                Empty face deck — switch the catalogue to Faces to add some.
              </li>
            )}
            {faceEntries.map(({ id, copies }) => {
              const face = getFaceCard(id);
              if (face === undefined) return null;
              const active =
                resolvedPreview.kind === "face" && resolvedPreview.id === id;
              return (
                <li key={id} className="w-[calc(50%-0.25rem)] min-w-[10rem] sm:w-[calc(33.333%-0.375rem)] lg:w-[calc(25%-0.375rem)] xl:w-[calc(16.666%-0.417rem)]">
                  <DeckRow
                    title={face.name}
                    subtitle={face.name}
                    copies={copies}
                    maxCopies={cfg.faceDeckMaxCards}
                    active={active}
                    readonly={readonly}
                    addDisabled={faceDeck.length >= cfg.faceDeckMaxCards}
                    onHover={() => setPreview({ kind: "face", id })}
                    {...(UI_CONFIG.showDeckBuilderOpeningDice
                      ? {
                          onAssign: () => paintSlot(id),
                          canAssign: paintTarget !== null,
                        }
                      : {})}
                    onAdd={() =>
                      setFaceDeck(addCopy(faceDeck, id, cfg.faceDeckMaxCards))
                    }
                    onRemove={() => setFaceDeck(removeOne(faceDeck, id))}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-stone-800 bg-[var(--felt-deep)]/95 py-4 backdrop-blur">
        <p className={legality.ok ? "text-sm text-emerald-400" : "text-sm text-red-300"}>
          {legality.ok
            ? "Legal — ready to play"
            : `Illegal (savable): ${legality.reason}`}
        </p>
        <button
          type="button"
          className={btnClass}
          disabled={readonly}
          onClick={() => onSave(false)}
        >
          Save
        </button>
        <button type="button" className={btnClass} onClick={() => onSave(true)}>
          Save as new
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={readonly || selectedId === null}
          onClick={onDelete}
        >
          Delete
        </button>
        {message !== null && <p className="text-sm text-stone-400">{message}</p>}
        <p className="w-full text-xs text-stone-600 sm:ml-auto sm:w-auto">
          Squad:{" "}
          {squad
            .map((id) => {
              const def = getCreatureDefinition(id);
              if (def === undefined) return id;
              return def.legendary === true ? `${def.name} (legendary)` : def.name;
            })
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}
