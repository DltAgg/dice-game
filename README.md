# Dice Skirmish

A competitive skirmish engine-builder. Each player commands three creatures and
two customizable dice, forging the dice into an engine over the course of the
match. Eliminating the opposing squad wins.

Every turn the dice produce symbols and the player splits them two ways, which
is the decision the whole game is built around:

```text
absorb  → bank the attribute into your pile (or grant Shield onto a creature)
resolve → the symbol feeds engine abilities and cards, this turn only
```

A symbol can do one or the other, never both.

The design lives in [`competitive_dice_game_agent_bible.md`](./competitive_dice_game_agent_bible.md).

## Status

| Layer | State |
|---|---|
| Game engine | Dice, symbols, attribute pile, engine resolution, shields, combat, cards (play/forge), face deck, victory |
| Content | Faces, Figma creatures + prototype squad, tactic subset + English printings |
| UI | **M3** hotseat + **M4** deck builder + Figma catalogues |
| Persistence | **M4** — `DeckRepository` over localStorage; tactics 40–50 / ≤3 copies |
| Networking | **M5** — PeerJS host authority (room seats, spectators, host-observe) |

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
fails the build if anything under `src/server` reaches for React, Zustand, PeerJS,
the DOM, storage, the clock or `Math.random`.

## Design questions

How the game currently plays is [`docs/RULEBOOK.md`](./docs/RULEBOOK.md)
(kept current whenever a rules change affects play). Print keywords are
[`docs/KEYWORDS.md`](./docs/KEYWORDS.md) (shown on the Rules tab). Rules the
bible leaves unresolved are tracked in
[`docs/OPEN_DESIGN.md`](./docs/OPEN_DESIGN.md) rather than being decided in
code. Anything marked `ASSUMED` is reachable from `GameRulesConfig` or content
data, so settling a question is a data edit rather than an engine change.

Feature specifications live in [`docs/specs/`](./docs/specs).

## Cursor specialists

Project subagents live in [`.cursor/agents/`](./.cursor/agents/). They are
proactive: ask for the job, or say `Use the <name> subagent to …`.

| Subagent | Owns | Hands off |
|---|---|---|
| [card-designer](.cursor/agents/card-designer.md) | Set craft: occupy an empty slot (attribute × kind × forge × payoff), then author print → JSON in `src/server/content` | New AST / hooks / reducer → **engine-developer**; constructed lists / identity critique → **deck-designer** |
| [engine-developer](.cursor/agents/engine-developer.md) | Pure rules in `src/server`: hooks, `EffectDefinition`, reducer, resolution, statuses | Catalogue beyond the proving card → **card-designer**; play surface → **match-ui** |
| [match-ui](.cursor/agents/match-ui.md) | Lobby, hotseat/online board, deck builder, catalogues, Zustand stores, `src/client/decks/`, PeerJS adapters | Cards → **card-designer**; rules / `pendingDecision` types → **engine-developer**; legal lists → **deck-designer** |
| [deck-designer](.cursor/agents/deck-designer.md) | Legal loadouts (squad / tactics / faces) and constructed critique (orphans, attribute identity) | Card rewrites → **card-designer**; engine / legality rules → **engine-developer**; builder UI → **match-ui** |
| [post-playtest](.cursor/agents/post-playtest.md) | Playtest debrief: notes + metrics → `docs/MECHANIC_ARCHETYPES.md` + specialist briefs | Print → **card-designer**; fuel physics → **engine-developer**; lists → **deck-designer**; board friction → **match-ui** |
| [prompt-engineer](.cursor/agents/prompt-engineer.md) | Cursor subagents, skills, rules, `TOOLS.md`, and routing docs so specialists stay in lane | Cards → **card-designer**; rules engine → **engine-developer**; play surface → **match-ui**; loadouts → **deck-designer** |

Workflows those agents load: [`.cursor/skills/`](./.cursor/skills/)
(including [slice-changes](.cursor/skills/slice-changes/SKILL.md) for large or
cross-layer work). Routing and hard rules: [`AGENTS.md`](./AGENTS.md). Commands:
[`TOOLS.md`](./TOOLS.md). Persistent constraints: [`.cursor/rules/`](./.cursor/rules/).
Oversized files are frozen by `src/architecture/module-budget.test.ts`.
