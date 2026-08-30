# Tools & verification

Commands agents should run while developing this repo. Prefer these over ad-hoc
scripts.

## Setup

```bash
npm install
```

Node + npm as used by the lockfile. No Python content pipeline.

## Everyday checks

| Command | Purpose |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (engine purity guard included) |
| `npm run test:watch` | Watch mode while iterating |
| `npm run lint` | ESLint (includes engine import bans) |
| `npm run dev` | Vite app — lobby, hotseat, online, decks, catalogues |

**DoD gate** after meaningful changes:

```bash
npm run typecheck && npm test && npm run lint
```

## Where things live (quick map)

| Concern | Path |
|---|---|
| Tactic catalogue | `src/server/content/cards/*.json` (ids in `cards.ts`) |
| Creature catalogue | `src/server/content/creatures/*.json` (ids in `creatures.ts`) |
| Face catalogue | `src/server/content/faces/*.json` (ids in `faces.ts`) |
| Builtin loadouts | `src/server/content/loadouts/*.json` |
| Effect AST | `src/server/ast/` (legacy union still in `src/server/model/effects.ts`) |
| Card / forge / ritual types | `src/server/model/cards.ts` |
| Creature / attack types | `src/server/model/creatures.ts` |
| Die / face types | `src/server/model/dice.ts` |
| Reducer | `src/server/reducer/reduce.ts` |
| Effect resolution | `src/server/reducer/resolution.ts` |
| Loadout legality | `src/server/rules/loadout.ts` |
| Purity guard | `src/architecture/engine-purity.test.ts` |
| Module budget | `src/architecture/module-budget.test.ts` (no megamodules / freeze) |
| Living rulebook | `docs/RULEBOOK.md` (update when play changes) |
| Keyword glossary | `docs/KEYWORDS.md` (update when print vocabulary / tokens change; Rules tab) |
| Mechanic × archetype feel | `docs/MECHANIC_ARCHETYPES.md` (post-playtest agent updates this; same change as a later retarget) |
| Match store | `src/client/store/matchStore.ts` |
| Deck store / localStorage | `src/client/store/deckStore.ts`, `src/client/decks/` |
| Match metrics / IndexedDB | `src/client/metrics/`, `src/client/ui/metrics/`, `src/client/store/metricsStore.ts` |
| PeerJS sessions | `src/client/networking/` |

## Tests that matter for content

| File | Checks |
|---|---|
| `src/server/content/cards.consistency.test.ts` | Attachment subtype ↔ region lockstep |
| `src/server/content/cardText.test.ts` | English type / forge / requirement printing |
| `src/server/rules/loadout.test.ts` | Deck 40–50, ≤3 copies, known ids |
| `src/architecture/engine-purity.test.ts` | Engine stays pure |
| `src/architecture/module-budget.test.ts` | File size freeze; no `src/game`; thin catalogue loaders |
| `src/server/reducer/*.test.ts` | Behavior of play / forge / combat / etc. |

Focused run:

```bash
npx vitest run src/architecture/module-budget.test.ts
npx vitest run src/server/content/cards.consistency.test.ts
npx vitest run src/server/reducer/playcard.test.ts
```

## Manual smoke (online)

1. `npm run dev` — three browser tabs if testing spectators.
2. Tab A: Play → Host room → copy room code (host may remain spectator).
3. Tabs B/C: Play → Join with code → claim P1 and P2 with legal loadouts.
4. Tab A: Start match. Confirm shared state, seat-gated actions, spectator
   cannot act, Resync on a seated client.
5. Seated client: refresh the page with the same room code — must rebind that
   seat by `clientId` and restore host state.
6. Optional: host refresh in the same tab — same room code, clients reconnect
   to the live match.

Details: `docs/specs/007-peerjs.md`.

## Front-end knobs

| File | Purpose |
|---|---|
| `src/client/ui/config.ts` | Toggle deck-builder card art (`showDeckBuilderCardArt`) |

## Agent skills (project)

| Skill | Use when |
|---|---|
| `.cursor/skills/slice-changes/` | Large / cross-layer work — stop megamodule rewrites |
| `.cursor/skills/author-content/` | Design then author catalogue cards (uniqueness / forge / dice-resonance) |
| `.cursor/skills/standardize-card-effects/` | Normalizing On roll / On absorb text and wiring triggers |
| `.cursor/skills/develop-engine/` | New effect AST, reducer, hooks |
| `.cursor/skills/implement-hooks/` | Shared standing trigger events (`010`) |
| `.cursor/skills/match-ui/` | Lobby / MatchBoard / stores |
| `.cursor/skills/analyze-match-metrics/` | Diagnose pacing from a Metrics export |

## Subagents (project)

| Agent | Use when |
|---|---|
| `.cursor/agents/card-designer.md` | Design then author tactics / rituals / faces / creatures (unique slot first); new mechanics → engine-developer |
| `.cursor/agents/engine-developer.md` | Implementing rules in `src/server` (hooks, reducer, resolution, statuses) |
| `.cursor/agents/match-ui.md` | Lobby / MatchBoard / deck builder / stores / PeerJS adapters |
| `.cursor/agents/deck-designer.md` | Constructed loadouts; orphan / attribute-identity critique |

- No CSV/OCR ingest scripts unless the user explicitly asks to build tooling.
- No second rules engine in UI or networking.
- No committing secrets, `node_modules`, `dist`, or `*.traineddata`.
