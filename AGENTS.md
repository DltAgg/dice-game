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

**Slice, do not rewrite.** OOP / DRY / KISS / YAGNI — compose existing opcodes
and queries; extract modules instead of growing frozen files. Always-on:
[`.cursor/rules/scope-and-modules.mdc`](.cursor/rules/scope-and-modules.mdc).
Large or cross-layer work: skill [slice-changes](.cursor/skills/slice-changes/SKILL.md).
Mechanical gate: `src/architecture/module-budget.test.ts` (DoD).

## Before you change code

1. Identify the layer: `src/server` (rules + JSON catalogues) · `src/client` (store, decks, networking, metrics, ui).
2. If the change is **rules or content**, stay inside `src/server` and keep it pure.
3. If the change is **online**, host owns `reduce()`; clients send intents only.
4. Prefer composing AST opcodes in catalogue JSON over special-casing UI.
5. Park unfinished print clauses in [`docs/DEFERRED_CATALOGUE.md`](./docs/DEFERRED_CATALOGUE.md)
   — never fake silent behavior.
6. If a rules change changes how the game plays, update
   [`docs/RULEBOOK.md`](./docs/RULEBOOK.md) in the same change.
7. Print, tokens, hooks, and new mechanics use
   [`docs/KEYWORDS.md`](./docs/KEYWORDS.md) — prefer `[Mark N X]` over a new verb.

## Content vs engine

| Task | Start here |
|---|---|
| Rewrite, revamp, “implement the whole plan”, or work that spans layers | Skill: [slice-changes](.cursor/skills/slice-changes/SKILL.md) — then delegate |
| New or updated tactic / ritual / face / creature cards | Subagent: [card-designer](.cursor/agents/card-designer.md) + skill [author-content](.cursor/skills/author-content/SKILL.md) |
| Standardize On roll / On absorb / standing triggers | Skill: [standardize-card-effects](.cursor/skills/standardize-card-effects/SKILL.md) (used by card-designer) |
| Implement / extend shared trigger hooks (`010`) | Subagent: [engine-developer](.cursor/agents/engine-developer.md) + skill [implement-hooks](.cursor/skills/implement-hooks/SKILL.md) |
| New effect vocabulary, reducer, resolution, statuses, phases | Subagent: [engine-developer](.cursor/agents/engine-developer.md) + skill [develop-engine](.cursor/skills/develop-engine/SKILL.md) |
| Match UI / lobby / decks | Subagent: [match-ui](.cursor/agents/match-ui.md) + skill [match-ui](.cursor/skills/match-ui/SKILL.md) — do not put rules there |
| Builtin / constructed loadouts, card-has-no-home, attribute identity in builds | Subagent: [deck-designer](.cursor/agents/deck-designer.md) |
| New or tuned agents, skills, rules, TOOLS.md, AGENTS.md routing | Subagent: [prompt-engineer](.cursor/agents/prompt-engineer.md) + skill [author-interactions](.cursor/skills/author-interactions/SKILL.md) |
| Match metrics, pacing charts, agent export of playtest recordings | Skill: [analyze-match-metrics](.cursor/skills/analyze-match-metrics/SKILL.md) + `src/client/metrics` (spec `014`) |
| PeerJS / protocol (adapter side) | Subagent: [match-ui](.cursor/agents/match-ui.md) + `src/client/networking` + `docs/specs/007-peerjs.md` |

## Subagents

Project specialists live in [`.cursor/agents/`](.cursor/agents/). Delegate rather
than doing their job in the parent thread. If a request needs two specialists,
invoke them separately — do not implement both layers yourself.

| Subagent | Use when |
|---|---|
| [card-designer](.cursor/agents/card-designer.md) | New/updated catalogue cards; print → data; delegates new mechanics to engine-developer |
| [engine-developer](.cursor/agents/engine-developer.md) | `src/server` rules: hooks, triggers, `EffectDefinition`, reducer, resolution, statuses |
| [match-ui](.cursor/agents/match-ui.md) | Lobby, MatchBoard, deck builder, catalogues, stores, decks persistence, PeerJS adapters |
| [deck-designer](.cursor/agents/deck-designer.md) | Legal loadouts; constructed critique (orphans, attribute identity) |
| [prompt-engineer](.cursor/agents/prompt-engineer.md) | Human-to-AI interactions: subagents, skills, rules, TOOLS.md, routing |

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
| `docs/specs/017-layer-split.md` | `src/server` vs `src/client` import rules |
| `docs/specs/018-ast-engine.md` | Opcode AST, validator / compiler / executor |
| `docs/specs/019-content-json.md` | Per-entity / per-loadout JSON catalogues |
| `docs/specs/020-module-split.md` | Reducer commands + MatchBoard carve |
| `docs/RULEBOOK.md` | Living how-the-game-plays (must stay current with engine rules) |
| `docs/KEYWORDS.md` | Print keywords (`[Mark]`, `[Empower]`, …). Rules tab shows player sections |
| `docs/OPEN_DESIGN.md` | Unresolved design decisions |
| `docs/DEFERRED_CATALOGUE.md` | Print clauses not fully modelled |

## Definition of Done

```bash
npm run typecheck && npm test && npm run lint
```

Do not commit unless the user asks. Do not push unless the user asks.

## Hard rules (summary)

- `src/server` cannot import React, Zustand, PeerJS, nanoid, `@client/*`, or touch DOM / storage / network / clock / `Math.random`.
- Effects are **data** (JSON AST / discriminated unions), never functions. New tokens are `[Mark]` / `[Strip]` arguments, not new opcodes.
- Content ids: `card-*`, `creature-*`, `face-*`, `attack-*`, `ability-*` (kebab after prefix).
- Attachment types (`equipment` / `overload`) must match their regions; rituals use main `type: "ritual"` with a `ritual` region and ritual subtypes.
- Grow effect AST only when a concrete card needs it; one opcode handler class + tests in the same change. No unreachable stubs.
- Do not rewrite `resolution.ts` / MatchBoard / catalogues in one shot; do not grow files past `module-budget.test.ts`.
- Print voice is the **holder**: `you` / `your` is the player who currently has the card on their field; `opponent` is that player’s opponent (including after the card is handed/forged/equipped onto the other side).
- Printed `energyCost: 1` is exceptional and niche. Players should reach 1-Energy plays mainly via **cost reduction**, not a catalogue of 1-drops.
- Gameplay rule changes update [`docs/RULEBOOK.md`](./docs/RULEBOOK.md) in the same change.
- New/edited card print and new tokens/keywords follow [`docs/KEYWORDS.md`](./docs/KEYWORDS.md).
