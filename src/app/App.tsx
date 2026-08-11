import { CardCatalogue } from "@/ui/cards/CardCatalogue";
import { DeckBuilder } from "@/ui/decks/DeckBuilder";
import { Lobby } from "@/ui/match/Lobby";
import { MatchBoard } from "@/ui/match/MatchBoard";
import { useMatchStore, type MatchView } from "@/store/matchStore";

export function App() {
  const view = useMatchStore((s) => s.view);
  const setView = useMatchStore((s) => s.setView);

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <nav className="sticky top-0 z-10 flex items-center gap-2 border-b border-stone-800/80 bg-[var(--felt-deep)]/90 px-4 py-3 backdrop-blur sm:px-6">
        <p className="mr-4 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Dice Skirmish
        </p>
        <Tab active={view === "lobby"} onClick={() => setView("lobby")} label="Play" />
        <Tab active={view === "match"} onClick={() => setView("match")} label="Match" />
        <Tab active={view === "decks"} onClick={() => setView("decks")} label="Decks" />
        <Tab
          active={view === "catalogue"}
          onClick={() => setView("catalogue")}
          label="Catalogue"
        />
      </nav>

      {view === "lobby" ? (
        <Lobby />
      ) : view === "match" ? (
        <MatchBoard />
      ) : view === "decks" ? (
        <DeckBuilder />
      ) : (
        <main className="mx-auto max-w-6xl px-6 py-10">
          <CardCatalogue />
        </main>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-3 py-1 text-sm text-[var(--accent)]"
          : "rounded border border-stone-700 px-3 py-1 text-sm text-stone-400 hover:border-stone-500 hover:text-stone-200"
      }
    >
      {label}
    </button>
  );
}

export type { MatchView };
