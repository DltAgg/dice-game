# 017 — Server / client layer split

Status: **DONE** (2026-08-28)

Concern segregation so a future hosted process can take `src/server` unchanged.
This spec does **not** add an HTTP/WebSocket server. PeerJS host authority
(`007`) still wraps `advance()` in the browser.

Design cites: bible / SPDD §7 (pure engine), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

## Intent

Separate what would run on a hosted match server from what stays in the
frontend site. Types and models live on the server side and are imported by
the client. Play does not change.

## Layout

```text
src/server/          future host process — pure rules
  model/             GameState, GameAction, ids, errors, config, AST node types
  ast/               validator, compiler, executor, opcode handlers
  content/           JSON catalogues + loadouts + loaders + print formatters
  reducer/           reduce()/advance() facade + command handlers
  rules/ rng/ setup/ testing/
  index.ts           public engine barrel
src/client/          browser only
  app/ ui/ store/ decks/ networking/ metrics/
src/shared/          thin re-exports of wire DTOs (protocol + loadout aliases)
src/architecture/    purity guard (scans src/server)
```

Vite / TypeScript path aliases:

| Alias | Maps to |
|---|---|
| `@server` | `src/server/index.ts` |
| `@server/*` | `src/server/*` |
| `@client/*` | `src/client/*` |
| `@shared/*` | `src/shared/*` |
| `@/*` | `src/*` (architecture, leftover) |

`src/game` is removed. Importers use `@server` (engine API) or `@server/<path>`
for tests that need internals (`@server/testing/scenario.js`).

## Rules

1. Only `reduce()` / `advance()` mutate rules state.
2. `src/server` is pure: no React, Zustand, PeerJS, nanoid, DOM, storage,
   network, clock, or `Math.random`. Randomness is the injected `RNG`.
3. `src/client` must not implement rules. It may call server **queries**
   (`legalTargetsFor`, `validateLoadout`, `hasLegalReactionOffer`, …).
4. `src/client` may import types and the public barrel from `@server`.
5. `src/server` must not import `@client/*`, `@/ui`, `@/store`, `@/networking`,
   `@/decks`, `@/app`, `@/metrics`.
6. Networking remains an adapter: host calls `advance()`, clients send
   `GameAction` intents (`007`).
7. Deck persistence (`localStorage`) stays client; loadout **legality** stays
   `src/server/rules/loadout.ts`. Builtin list data lives in
   `src/server/content/loadouts/` (spec `019`).
8. Metrics observe `GameState` / events; they do not advance the match.

## State Changes

None. `GameState` remains a serializable DTO. No methods on state objects.

## Actions

None.

## Validation

ESLint `no-restricted-imports` / globals apply to `src/server/**/*.ts`.
`src/architecture/engine-purity.test.ts` scans `src/server` (not `src/game`).

## Resolution

N/A (packaging).

## Networking

Host authority unchanged. Protocol types may be re-exported from `src/shared`
but remain structurally identical.

## Persistence

Builtin deck JSON is engine content. User decks stay in client localStorage.

## UI

No player-facing change. Entry: `index.html` → `/src/client/app/main.tsx`.

## Acceptance Criteria

- [ ] `src/game` does not exist.
- [ ] Client modules import engine from `@server` (or `@server/...`).
- [ ] Purity lint + purity test target `src/server`.
- [ ] `npm run typecheck && npm test && npm run lint` pass.
- [ ] Hotseat and PeerJS still call the same `advance()`.

## Tests

- [ ] `src/architecture/engine-purity.test.ts` fails if `src/server` imports a
      client layer or uses forbidden globals.
- [ ] Existing engine tests run from `src/server/**/*.test.ts`.
