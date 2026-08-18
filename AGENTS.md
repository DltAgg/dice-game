# Agent guide — Dice Skirmish

Read this first. Deeper workflows live under [`.cursor/skills/`](.cursor/skills/)
and persistent constraints under [`.cursor/rules/`](.cursor/rules/). Commands and
verification live in [`TOOLS.md`](./TOOLS.md).

## What this project is

A competitive skirmish engine-builder. Design canon:
[`competitive_dice_game_agent_bible.md`](./competitive_dice_game_agent_bible.md).

Architecture (non-negotiable):

```text
UI → Zustand → GameAction → reduce()/advance() → GameState
```

Only `reduce()` advances rules state. Networking and persistence are adapters.
Details: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Before you change code

1. Identify the layer: `game` (rules) · `store` · `decks` · `networking` · `metrics` · `ui`.
2. If the change is **rules or content**, stay inside `src/game` and keep it pure.
3. If the change is **online**, host owns `reduce()`; clients send intents only.
4. Prefer extending data (`EffectDefinition`, catalogues) over special-casing UI.
5. Park unfinished print clauses in [`docs/DEFERRED_CATALOGUE.md`](./docs/DEFERRED_CATALOGUE.md)
   — never fake silent behavior.

## Content vs engine

| Task | Start here |
|---|---|
| New or updated tactic / ritual / face / creature cards | Subagent: [card-designer](.cursor/agents/card-designer.md) + skill [author-content](.cursor/skills/author-content/SKILL.md) |
| Standardize On roll / On absorb / standing triggers | Skill: [standardize-card-effects](.cursor/skills/standardize-card-effects/SKILL.md) (used by card-designer) |
| Implement / extend shared trigger hooks (`010`) | Subagent: [engine-developer](.cursor/agents/engine-developer.md) + skill [implement-hooks](.cursor/skills/implement-hooks/SKILL.md) |
| New effect vocabulary, reducer, resolution, statuses, phases | Subagent: [engine-developer](.cursor/agents/engine-developer.md) + skill [develop-engine](.cursor/skills/develop-engine/SKILL.md) |
| Match UI / lobby / decks | Subagent: [match-ui](.cursor/agents/match-ui.md) + skill [match-ui](.cursor/skills/match-ui/SKILL.md) — do not put rules there |
| Builtin / constructed loadouts, card-has-no-home, attribute identity in builds | Subagent: [deck-designer](.cursor/agents/deck-designer.md) |
| Match metrics, pacing charts, agent export of playtest recordings | Skill: [analyze-match-metrics](.cursor/skills/analyze-match-metrics/SKILL.md) + `src/metrics` (spec `014`) |
| PeerJS / protocol (adapter side) | Subagent: [match-ui](.cursor/agents/match-ui.md) + `src/networking` + `docs/specs/007-peerjs.md` |

## Subagents

Project specialists live in [`.cursor/agents/`](.cursor/agents/). Delegate rather
than doing their job in the parent thread.

| Subagent | Use when |
|---|---|
| [card-designer](.cursor/agents/card-designer.md) | New/updated catalogue cards; print → data; delegates new mechanics to engine-developer |
| [engine-developer](.cursor/agents/engine-developer.md) | `src/game` rules: hooks, triggers, `EffectDefinition`, reducer, resolution, statuses |
| [match-ui](.cursor/agents/match-ui.md) | Lobby, MatchBoard, deck builder, catalogues, stores, decks persistence, PeerJS adapters |
| [deck-designer](.cursor/agents/deck-designer.md) | Legal loadouts; constructed critique (orphans, attribute identity) |

## Specs & design trackers

| Doc | Role |
|---|---|
| `docs/specs/002-card-layer.md` | Tactic grammar + catalogue tables |
| `docs/specs/003-creature-cards.md` | Creature catalogue |
| `docs/specs/004-face-cards.md` | Face catalogue |
| `docs/specs/005-local-match-ui.md` | Hotseat UI |
| `docs/specs/006-deck-persistence.md` | Deck builder / loadouts |
| `docs/specs/007-peerjs.md` | Online host authority |
| `docs/specs/014-match-metrics.md` | Observer telemetry, dashboard, agent export |
| `docs/OPEN_DESIGN.md` | Unresolved design decisions |
| `docs/DEFERRED_CATALOGUE.md` | Print clauses not fully modelled |

## Definition of Done

```bash
npm run typecheck && npm test && npm run lint
```

Do not commit unless the user asks. Do not push unless the user asks.

## Hard rules (summary)

- `src/game` cannot import React, Zustand, PeerJS, nanoid, `@/metrics`, or touch DOM / storage / network / clock / `Math.random`.
- Effects are **data** (discriminated unions), never functions.
- Content ids: `card-*`, `creature-*`, `face-*`, `attack-*`, `ability-*` (kebab after prefix).
- Attachment types (`equipment` / `overload`) must match their regions; rituals use main `type: "ritual"` with a `ritual` region and ritual subtypes.
- Grow effect AST only when a concrete card needs it; implement resolver + tests in the same change.
