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
| Tactic catalogue | `src/game/content/cards.ts` |
| Creature catalogue | `src/game/content/creatures.ts` |
| Face catalogue | `src/game/content/faces.ts` |
| Effect AST | `src/game/model/effects.ts` |
| Card / forge / ritual types | `src/game/model/cards.ts` |
| Creature / attack types | `src/game/model/creatures.ts` |
| Die / face types | `src/game/model/dice.ts` |
| Reducer | `src/game/reducer/reduce.ts` |
| Effect resolution | `src/game/reducer/resolution.ts` |
| Loadout legality | `src/game/rules/loadout.ts` |
| Purity guard | `src/architecture/engine-purity.test.ts` |
| Match store | `src/store/matchStore.ts` |
| Deck store / localStorage | `src/store/deckStore.ts`, `src/decks/` |
| PeerJS sessions | `src/networking/` |

## Tests that matter for content

| File | Checks |
|---|---|
| `src/game/content/cards.consistency.test.ts` | Attachment subtype ↔ region lockstep |
| `src/game/content/cardText.test.ts` | English type / forge / requirement printing |
| `src/game/rules/loadout.test.ts` | Deck 50–60, ≤4 copies, known ids |
| `src/architecture/engine-purity.test.ts` | Engine stays pure |
| `src/game/reducer/*.test.ts` | Behavior of play / forge / combat / etc. |

Focused run:

```bash
npx vitest run src/game/content/cards.consistency.test.ts
npx vitest run src/game/reducer/playcard.test.ts
```

## Manual smoke (online)

1. `npm run dev` — two browser tabs.
2. Tab A: Play → Host room → copy room code.
3. Tab B: Play → Join with code.
4. Confirm shared state, seat-gated actions, Resync on guest.

Details: `docs/specs/007-peerjs.md`.

## Front-end knobs

| File | Purpose |
|---|---|
| `src/ui/config.ts` | Toggle deck-builder card art (`showDeckBuilderCardArt`) |

## Agent skills (project)

| Skill | Use when |
|---|---|
| `.cursor/skills/author-content/` | Adding catalogue cards from print / CSV |
| `.cursor/skills/standardize-card-effects/` | Normalizing On roll / On absorb text and wiring triggers |
| `.cursor/skills/develop-engine/` | New effect AST, reducer, hooks |
| `.cursor/skills/match-ui/` | Lobby / MatchBoard / stores |

- No CSV/OCR ingest scripts unless the user explicitly asks to build tooling.
- No second rules engine in UI or networking.
- No committing secrets, `node_modules`, `dist`, or `*.traineddata`.
