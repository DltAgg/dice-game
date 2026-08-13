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

1. Identify the layer: `game` (rules) · `store` · `decks` · `networking` · `ui`.
2. If the change is **rules or content**, stay inside `src/game` and keep it pure.
3. If the change is **online**, host owns `reduce()`; clients send intents only.
4. Prefer extending data (`EffectDefinition`, catalogues) over special-casing UI.
5. Park unfinished print clauses in [`docs/DEFERRED_CATALOGUE.md`](./docs/DEFERRED_CATALOGUE.md)
   — never fake silent behavior.

## Content vs engine

| Task | Start here |
|---|---|
| Tactic / creature / face cards from print or CSV | Skill: [author-content](.cursor/skills/author-content/SKILL.md) |
| Standardize On roll / On absorb / standing triggers | Skill: [standardize-card-effects](.cursor/skills/standardize-card-effects/SKILL.md) |
| Implement / extend shared trigger hooks (`010`) | Skill: [implement-hooks](.cursor/skills/implement-hooks/SKILL.md) |
| New effect vocabulary, reducer, phases | Skill: [develop-engine](.cursor/skills/develop-engine/SKILL.md) |
| Match UI / lobby / decks | `src/ui`, `src/store`, `src/decks` — do not put rules there |
| PeerJS / protocol | `src/networking` + `docs/specs/007-peerjs.md` |

## Specs & design trackers

| Doc | Role |
|---|---|
| `docs/specs/002-card-layer.md` | Tactic grammar + catalogue tables |
| `docs/specs/003-creature-cards.md` | Creature catalogue |
| `docs/specs/004-face-cards.md` | Face catalogue |
| `docs/specs/005-local-match-ui.md` | Hotseat UI |
| `docs/specs/006-deck-persistence.md` | Deck builder / loadouts |
| `docs/specs/007-peerjs.md` | Online host authority |
| `docs/OPEN_DESIGN.md` | Unresolved design decisions |
| `docs/DEFERRED_CATALOGUE.md` | Print clauses not fully modelled |

## Definition of Done

```bash
npm run typecheck && npm test && npm run lint
```

Do not commit unless the user asks. Do not push unless the user asks.

## Hard rules (summary)

- `src/game` cannot import React, Zustand, PeerJS, nanoid, or touch DOM / storage / network / clock / `Math.random`.
- Effects are **data** (discriminated unions), never functions.
- Content ids: `card-*`, `creature-*`, `face-*`, `attack-*`, `ability-*` (kebab after prefix).
- Attachment subtypes (`equipment` / `overload`) must match their regions; rituals use main `type: "ritual"` with a `ritual` region.
- Grow effect AST only when a concrete card needs it; implement resolver + tests in the same change.
