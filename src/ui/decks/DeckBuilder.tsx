import { useMemo, useState } from "react";
import {
  ALL_CARDS,
  ALL_FACE_CARDS,
  CREATURES,
  DEFAULT_RULES_CONFIG,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  type CardId,
  type CreatureDefinitionId,
  type FaceCardId,
} from "@/game";
import {
  PROTOTYPE_SAVED_DECK_ID,
  validateSavedDeck,
  type SavedDeckId,
} from "@/decks";
import { useDeckStore } from "@/store/deckStore";

const creatureOptions = Object.values(CREATURES);

function countOf<T extends string>(list: readonly T[], id: T): number {
  return list.filter((entry) => entry === id).length;
}

function addCopy<T extends string>(list: readonly T[], id: T, max: number): T[] {
  if (countOf(list, id) >= max) return [...list];
  return [...list, id];
}

function removeOne<T extends string>(list: readonly T[], id: T): T[] {
  const index = list.indexOf(id);
  if (index < 0) return [...list];
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

export function DeckBuilder() {
  const decks = useDeckStore((s) => s.decks);
  const selectedId = useDeckStore((s) => s.selectedId);
  const select = useDeckStore((s) => s.select);
  const save = useDeckStore((s) => s.save);
  const remove = useDeckStore((s) => s.remove);
  const get = useDeckStore((s) => s.get);

  const selected = selectedId !== null ? get(selectedId) : undefined;

  const [name, setName] = useState(selected?.name ?? "My deck");
  const [squad, setSquad] = useState<CreatureDefinitionId[]>([
    ...(selected?.squad ?? PROTOTYPE_SQUAD),
  ]);
  const [deck, setDeck] = useState<CardId[]>([...(selected?.deck ?? PROTOTYPE_DECK)]);
  const [faceDeck, setFaceDeck] = useState<FaceCardId[]>([
    ...(selected?.faceDeck ?? PROTOTYPE_FACE_DECK),
  ]);
  const [message, setMessage] = useState<string | null>(null);

  const load = (id: SavedDeckId) => {
    const saved = get(id);
    if (saved === undefined) return;
    select(id);
    setName(saved.name);
    setSquad([...saved.squad]);
    setDeck([...saved.deck]);
    setFaceDeck([...saved.faceDeck]);
    setMessage(null);
  };

  const draft = useMemo(
    () => ({ name, squad, deck, faceDeck }),
    [name, squad, deck, faceDeck],
  );
  const legality = validateSavedDeck(draft);
  const cfg = DEFAULT_RULES_CONFIG;

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
    if (selectedId === null || selectedId === PROTOTYPE_SAVED_DECK_ID) return;
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Decks
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--ink-muted)]">
          Build a loadout: three creatures, a tactics deck ({cfg.deckMinCards}–{cfg.deckMaxCards},
          ≤{cfg.deckMaxCopiesPerCard} copies), and a face deck (up to {cfg.faceDeckMaxCards}).
          Saved decks stay in this browser.
        </p>
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

      <label className="flex max-w-md flex-col gap-1 text-sm">
        <span className="text-stone-400">Name</span>
        <input
          className="rounded border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={selected?.builtin === true}
        />
      </label>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Squad ({squad.length}/{cfg.creaturesPerPlayer})
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {squad.map((definitionId, index) => (
            <select
              key={`squad-${String(index)}`}
              className="rounded border border-stone-700 bg-stone-950 px-2 py-2 text-sm text-stone-100"
              value={definitionId}
              disabled={selected?.builtin === true}
              onChange={(event) =>
                setSquadSlot(index, event.target.value as CreatureDefinitionId)
              }
            >
              {creatureOptions.map((creature) => (
                <option key={creature.id} value={creature.id}>
                  {creature.name}
                </option>
              ))}
            </select>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Tactics deck ({deck.length}/{cfg.deckMinCards}–{cfg.deckMaxCards})
        </h2>
        <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
          {ALL_CARDS.map((card) => {
            const copies = countOf(deck, card.id);
            return (
              <li
                key={card.id}
                className="flex items-center justify-between gap-2 rounded border border-stone-800 bg-stone-950/80 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-stone-100">{card.name}</p>
                  <p className="text-xs capitalize text-stone-500">
                    {card.attribute} · {copies}/{cfg.deckMaxCopiesPerCard}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={btnTiny}
                    disabled={selected?.builtin === true || copies >= cfg.deckMaxCopiesPerCard}
                    onClick={() => setDeck(addCopy(deck, card.id, cfg.deckMaxCopiesPerCard))}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className={btnTiny}
                    disabled={selected?.builtin === true || copies === 0}
                    onClick={() => setDeck(removeOne(deck, card.id))}
                  >
                    −
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Face deck ({faceDeck.length}/{cfg.faceDeckMaxCards})
        </h2>
        <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
          {ALL_FACE_CARDS.map((face) => {
            const copies = countOf(faceDeck, face.id);
            return (
              <li
                key={face.id}
                className="flex items-center justify-between gap-2 rounded border border-stone-800 bg-stone-950/80 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-stone-100">{face.name}</p>
                  <p className="text-xs capitalize text-stone-500">
                    {face.kind} · {face.symbol} · ×{copies}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={btnTiny}
                    disabled={
                      selected?.builtin === true || faceDeck.length >= cfg.faceDeckMaxCards
                    }
                    onClick={() => setFaceDeck(addCopy(faceDeck, face.id, cfg.faceDeckMaxCards))}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className={btnTiny}
                    disabled={selected?.builtin === true || copies === 0}
                    onClick={() => setFaceDeck(removeOne(faceDeck, face.id))}
                  >
                    −
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-stone-800 bg-[var(--felt-deep)]/95 py-4 backdrop-blur">
        <p
          className={
            legality.ok ? "text-sm text-emerald-400" : "text-sm text-red-300"
          }
        >
          {legality.ok ? "Legal loadout" : legality.reason}
        </p>
        <button type="button" className={btnClass} disabled={!legality.ok} onClick={() => onSave(false)}>
          Save
        </button>
        <button type="button" className={btnClass} disabled={!legality.ok} onClick={() => onSave(true)}>
          Save as new
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={selected?.builtin === true || selectedId === null}
          onClick={onDelete}
        >
          Delete
        </button>
        {message !== null && <p className="text-sm text-stone-400">{message}</p>}
      </div>

      <p className="text-xs text-stone-600">
        Squad preview:{" "}
        {squad.map((id) => getCreatureDefinition(id)?.name ?? id).join(" · ")}. Sample tactics:{" "}
        {deck
          .slice(0, 3)
          .map((id) => getCard(id)?.name ?? id)
          .join(", ")}
        {deck.length > 3 ? "…" : ""}. Faces:{" "}
        {faceDeck
          .slice(0, 3)
          .map((id) => getFaceCard(id)?.name ?? id)
          .join(", ")}
        {faceDeck.length > 3 ? "…" : ""}.
      </p>
    </div>
  );
}

const btnClass =
  "rounded border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 hover:border-stone-400 disabled:opacity-40";
const btnTiny =
  "rounded border border-stone-700 px-2 py-0.5 text-sm text-stone-300 hover:border-stone-500 disabled:opacity-40";
