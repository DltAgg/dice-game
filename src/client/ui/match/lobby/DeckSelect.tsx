import { validateSavedDeck, type SavedDeck } from "@client/decks";

export function DeckSelect({
  label,
  value,
  options,
  legalityById,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Pick<SavedDeck, "id" | "name">[];
  legalityById: ReadonlyMap<string, ReturnType<typeof validateSavedDeck>>;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-stone-400">{label}</span>
      <select
        className="rounded border border-stone-700 bg-stone-950 px-2 py-2 text-stone-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((deck) => {
          const legal = legalityById.get(deck.id)?.ok === true;
          return (
            <option key={deck.id} value={deck.id}>
              {deck.name}
              {legal ? "" : " (illegal)"}
            </option>
          );
        })}
      </select>
    </label>
  );
}
