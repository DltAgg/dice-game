# Dice Skirmish

A competitive skirmish engine-builder. Each player commands three creatures and
two customizable dice, forging the dice into an engine over the course of the
match. Eliminating the opposing squad wins.

Every turn the dice produce symbols and the player splits them two ways, which
is the decision the whole game is built around:

```text
absorb  → the attribute arms that creature's attacks, permanently
resolve → the symbol feeds engine abilities and cards, this turn only
```

A symbol can do one or the other, never both.

The design lives in [`competitive_dice_game_agent_bible.md`](./competitive_dice_game_agent_bible.md).

## Status

| Layer | State |
|---|---|
| Game engine | Dice, symbols, absorption, engine resolution, energy, shields, combat, cards (play/forge), face deck, victory |
| Content | Faces, Figma creatures + prototype squad, tactic subset + English printings |
| UI | **M3** hotseat + **M4** deck builder + Figma catalogues |
| Persistence | **M4** — `DeckRepository` over localStorage; tactics 50–60 / ≤4 copies |
| Networking | **M5** — PeerJS host authority (room create/join) |

Unfinished catalogue effects are parked in
[`docs/DEFERRED_CATALOGUE.md`](./docs/DEFERRED_CATALOGUE.md) for end-of-loop revisit.

## Commands

```bash
npm install

npm run typecheck   # tsc --noEmit
npm run test        # vitest, including the engine purity guard
npm run test:watch
npm run lint
npm run dev         # hotseat / online lobby + decks + catalogue
```

## Architecture

```text
UI  →  Zustand  →  Game Commands  →  Pure Game Reducer  →  GameState
```

A game can only advance through `reduce()`. Networking and persistence are
adapters around the engine, never sources of rules. See
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

The engine is pure by enforcement, not convention: `src/architecture/engine-purity.test.ts`
fails the build if anything under `src/game` reaches for React, Zustand, PeerJS,
the DOM, storage, the clock or `Math.random`.

## Design questions

Rules the bible leaves unresolved are tracked in
[`docs/OPEN_DESIGN.md`](./docs/OPEN_DESIGN.md) rather than being decided in
code. Anything marked `ASSUMED` is reachable from `GameRulesConfig` or content
data, so settling a question is a data edit rather than an engine change.

Feature specifications live in [`docs/specs/`](./docs/specs).
