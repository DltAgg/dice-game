# Dice Skirmish

A local and online **3v3 tag fighter**. Each player fields three Fighters, one
die per Fighter, and one shared deck of Response and Modify cards. One Fighter
is Active; the others are Reserve. Meter is one shared pool. Confirmed content
model: [`docs/specs/030-offensive-control.md`](./docs/specs/030-offensive-control.md).
Shipped play: [`docs/RULEBOOK.md`](./docs/RULEBOOK.md).

**Not the current model:** attribute-pile fuel, natural/synthetic faces, Shield
as a resource, per-fighter decks, deckbuilding dice, or Instant / Reaction /
Equipment / Overload / Ritual as card types. Older JSON may still contain
those fields. Do not author new content from them.

## Status

| Layer | State |
|---|---|
| Game engine | Dice, symbols, absorb / On absorb, shields, combat, cards (play/forge), face deck, phases, chain |
| Content | Fighters, named faces, Response and Modify cards. Older JSON may still carry pile-era fields |
| UI | **M3** hotseat + **M4** deck builder + catalogues |
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

How the game **currently plays** is [`docs/RULEBOOK.md`](./docs/RULEBOOK.md)
(kept current whenever a rules change affects play). Print keywords are
[`docs/KEYWORDS.md`](./docs/KEYWORDS.md) (shown on the Rules tab). Open and
deferred rules live in [`docs/OPEN_DESIGN.md`](./docs/OPEN_DESIGN.md). Anything
marked `ASSUMED` is reachable from `GameRulesConfig` or content data.

Feature specifications live in [`docs/specs/`](./docs/specs).

## Cursor specialists

Project subagents live in [`.cursor/agents/`](./.cursor/agents/). They are
proactive: ask for the job, or say `Use the <name> subagent to …`.

| Subagent | Owns | Hands off |
|---|---|---|
| [card-designer](.cursor/agents/card-designer.md) | Place the request on a named face, Fighter, Response, or Modify, then author JSON in `src/server/content`. Redirect a Block face, Tag type, or per-fighter deck | New AST / hooks / reducer → **engine-developer**; shared lists → **deck-designer** |
| [engine-developer](.cursor/agents/engine-developer.md) | Pure rules in `src/server`: hooks, `EffectDefinition`, reducer, resolution, statuses | Catalogue beyond the proving card → **card-designer**; play surface → **match-ui** |
| [match-ui](.cursor/agents/match-ui.md) | Lobby, hotseat/online board, deck builder, catalogues, Zustand stores, `src/client/decks/`, PeerJS adapters | Cards → **card-designer**; rules / `pendingDecision` types → **engine-developer**; legal lists → **deck-designer** |
| [deck-designer](.cursor/agents/deck-designer.md) | One shared deck and three Fighters. Play requirements are not construction bans | Card rewrites → **card-designer**; engine / legality rules → **engine-developer**; builder UI → **match-ui** |
| [post-playtest](.cursor/agents/post-playtest.md) | Playtest debrief: notes + metrics → `docs/MECHANIC_ARCHETYPES.md` + specialist briefs | Print → **card-designer**; rules → **engine-developer**; lists → **deck-designer**; board friction → **match-ui** |
| [prompt-engineer](.cursor/agents/prompt-engineer.md) | Cursor subagents, skills, rules, `TOOLS.md`, and routing docs so specialists stay in lane | Cards → **card-designer**; rules engine → **engine-developer**; play surface → **match-ui**; loadouts → **deck-designer** |

Workflows those agents load: [`.cursor/skills/`](./.cursor/skills/)
(including [slice-changes](.cursor/skills/slice-changes/SKILL.md) for large or
cross-layer work). Routing and hard rules: [`AGENTS.md`](./AGENTS.md). Commands:
[`TOOLS.md`](./TOOLS.md). Persistent constraints: [`.cursor/rules/`](./.cursor/rules/).
Oversized files are frozen by `src/architecture/module-budget.test.ts`.
