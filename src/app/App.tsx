import { useEffect, useLayoutEffect } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CardCatalogue } from "@/ui/cards/CardCatalogue";
import { DeckBuilder } from "@/ui/decks/DeckBuilder";
import { Lobby } from "@/ui/match/Lobby";
import { MatchBoard } from "@/ui/match/MatchBoard";
import { MetricsDashboard } from "@/ui/metrics/MetricsDashboard";
import { useMatchStore, type MatchView } from "@/store/matchStore";
import { APP_NAV, pathFromView, viewFromPath } from "./routes.js";

export function App() {
  useEffect(() => {
    void useMatchStore.getState().tryResumeOnlineSession();
  }, []);

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <RouterViewBridge />
      <nav className="sticky top-0 z-10 flex items-center gap-2 border-b border-stone-800/80 bg-[var(--felt-deep)]/90 px-4 py-3 backdrop-blur sm:px-6">
        <p className="mr-4 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Dice Skirmish
        </p>
        {APP_NAV.map((item) => (
          <NavTab key={item.to} to={item.to} label={item.label} />
        ))}
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/play" element={<Lobby />} />
        <Route path="/match" element={<MatchBoard />} />
        <Route path="/decks" element={<DeckBuilder />} />
        <Route
          path="/catalogue"
          element={
            <main className="mx-auto max-w-6xl px-6 py-10">
              <CardCatalogue />
            </main>
          }
        />
        <Route path="/metrics" element={<MetricsDashboard />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </div>
  );
}

/**
 * URL is what the shell shows; `matchStore.view` / `setView` stay as a mirror
 * so startLocal, resume, Leave, and in-board Lobby buttons keep working.
 */
function RouterViewBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    const view = viewFromPath(location.pathname);
    if (useMatchStore.getState().view !== view) {
      useMatchStore.setState({ view });
    }
  }, [location.pathname]);

  useLayoutEffect(() => {
    return useMatchStore.subscribe((state, prev) => {
      if (state.view === prev.view) return;
      const path = pathFromView(state.view);
      if (window.location.pathname !== path) {
        void navigate(path);
      }
    });
  }, [navigate]);

  return null;
}

function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        isActive
          ? "rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-3 py-1 text-sm text-[var(--accent)]"
          : "rounded border border-stone-700 px-3 py-1 text-sm text-stone-400 hover:border-stone-500 hover:text-stone-200"
      }
    >
      {label}
    </NavLink>
  );
}

export type { MatchView };
