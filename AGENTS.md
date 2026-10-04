# Agent guide — Dice Skirmish

Read this first. Deeper workflows live under [`.cursor/skills/`](.cursor/skills/)
and persistent constraints under [`.cursor/rules/`](.cursor/rules/). Commands and
verification live in [`TOOLS.md`](./TOOLS.md).

## What this project is

A **3v3 tag fighter**. Each player has three Fighters, one shared deck, one
shared hand, one shared Meter pool, and one die per Fighter. One Fighter is
Active; the others are Reserve. Cards are Response or Modify. Dice are named
inputs, not a deckbuilding product. Confirmed content model:
[`docs/specs/030-offensive-control.md`](./docs/specs/030-offensive-control.md).
Player-facing truth for rules that are already shipped:
[`docs/RULEBOOK.md`](./docs/RULEBOOK.md). Unsettled questions:
[`docs/OPEN_DESIGN.md`](./docs/OPEN_DESIGN.md) — pile-era sections there are
historical and are not the authoring model.

Architecture (non-negotiable):

```text
UI → Zustand → GameAction → reduce()/advance() → GameState
AI playtest → GameAction → reduce()/advance() → GameState
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
8. Playtest “this felt like the wrong deck” →
   [`docs/MECHANIC_ARCHETYPES.md`](./docs/MECHANIC_ARCHETYPES.md) (mechanic ×
   window × archetype). Update that catalogue in the same change as any retarget.

## Content vs engine

| Task | Start here |
|---|---|
| Rewrite, revamp, “implement the whole plan”, or work that spans layers | Skill: [slice-changes](.cursor/skills/slice-changes/SKILL.md) — then delegate |
| New or updated Fighter, named face, Response, or Modify | Subagent: [card-designer](.cursor/agents/card-designer.md) + skill [author-content](.cursor/skills/author-content/SKILL.md) — **place it in an existing layer, then author** ([design.md](.cursor/skills/author-content/design.md)); refuse a request that needs a new card type, a defensive die face, or a per-fighter deck |
| Standardize timing-prefixed print on faces, Responses, and Modifies | Skill: [standardize-card-effects](.cursor/skills/standardize-card-effects/SKILL.md) (used by card-designer) |
| Implement / extend shared trigger hooks (`010`) | Subagent: [engine-developer](.cursor/agents/engine-developer.md) + skill [implement-hooks](.cursor/skills/implement-hooks/SKILL.md) |
| New effect vocabulary, reducer, resolution, statuses, phases | Subagent: [engine-developer](.cursor/agents/engine-developer.md) + skill [develop-engine](.cursor/skills/develop-engine/SKILL.md) |
| Match UI / lobby / decks | Subagent: [match-ui](.cursor/agents/match-ui.md) + skill [match-ui](.cursor/skills/match-ui/SKILL.md) — do not put rules there |
| Builtin / constructed lists, “does this card have a home?” | Subagent: [deck-designer](.cursor/agents/deck-designer.md) — one shared deck; Fighter text is a play requirement, not a construction ban |
| New or tuned agents, skills, rules, TOOLS.md, AGENTS.md routing | Subagent: [prompt-engineer](.cursor/agents/prompt-engineer.md) + skill [author-interactions](.cursor/skills/author-interactions/SKILL.md) |
| After a playtest (notes ± metrics, “felt like the wrong deck”) | Subagent: [post-playtest](.cursor/agents/post-playtest.md) + skill [review-playtest](.cursor/skills/review-playtest/SKILL.md) — updates `docs/MECHANIC_ARCHETYPES.md`, briefs owners; does not author JSON or reducer |
| Match metrics dump with **no** playtest narrative (playable/fun, pace, unpaid attacks, forge vs Overcharge) | Skill: [analyze-match-metrics](.cursor/skills/analyze-match-metrics/SKILL.md) + `src/client/metrics` (spec `014`). Copy agent prompt is instructions only; attach Download JSON. |
| PeerJS / protocol (adapter side) | Subagent: [match-ui](.cursor/agents/match-ui.md) + `src/client/networking` + `docs/specs/007-peerjs.md` |

## Subagents

Project specialists live in [`.cursor/agents/`](.cursor/agents/). Delegate rather
than doing their job in the parent thread. If a request needs two specialists,
invoke them separately — do not implement both layers yourself.

When launching a Task subagent, pass `model` as Grok/Composer (`inherit` or a
grok/composer slug) for implementation. Pass Opus/GPT only for orchestration
or go/no-go after that work exists. Policy:
[`.cursor/rules/model-routing.mdc`](.cursor/rules/model-routing.mdc).

| Subagent | Use when |
|---|---|
| [card-designer](.cursor/agents/card-designer.md) | Place a request on an existing layer (named face, Fighter, Response, Modify), then author catalogue JSON; redirect architecture-breaking requests; delegates new mechanics to engine-developer |
| [engine-developer](.cursor/agents/engine-developer.md) | `src/server` rules: hooks, triggers, `EffectDefinition`, reducer, resolution, statuses |
| [match-ui](.cursor/agents/match-ui.md) | Lobby, MatchBoard, deck builder, catalogues, stores, decks persistence, PeerJS adapters |
| [deck-designer](.cursor/agents/deck-designer.md) | One shared deck plus three Fighters; constructed critique (orphans, play-check vs ban) |
| [post-playtest](.cursor/agents/post-playtest.md) | After a playtest: reconstruct, update `MECHANIC_ARCHETYPES.md`, brief owners |
| [prompt-engineer](.cursor/agents/prompt-engineer.md) | Human-to-AI interactions: subagents, skills, rules, TOOLS.md, routing |

## Specs & design trackers

| Doc | Role |
|---|---|
| `docs/specs/002-card-layer.md` | Historical tactic grammar. Not the current card kinds |
| `docs/specs/003-creature-cards.md` | Fighter catalogue files (engine type creature) |
| `docs/specs/004-face-cards.md` | Face catalogue files. Named inputs; not natural/synthetic kinds |
| `docs/specs/005-local-match-ui.md` | Hotseat UI |
| `docs/specs/006-deck-persistence.md` | Deck builder / loadouts |
| `docs/specs/007-peerjs.md` | Online host authority |
| `docs/specs/014-match-metrics.md` | Observer telemetry, dashboard, agent export |
| `docs/specs/016-attribute-pile-up.md` | **Obsolete** — historical attribute-pile spec |
| `docs/specs/017-layer-split.md` | `src/server` vs `src/client` import rules |
| `docs/specs/018-ast-engine.md` | Opcode AST, validator / compiler / executor |
| `docs/specs/019-content-json.md` | Per-entity / per-loadout JSON catalogues |
| `docs/specs/020-module-split.md` | Reducer commands + MatchBoard carve |
| `docs/specs/021-overcharge.md` | Tactic `[Overcharge]` (hand-card spend). Not spec `013` `optional-overcharge`. |
| `docs/specs/026-ai-playtest.md` | Headless two-AI local playtest (`src/ai`; public `@server` only) |
| `docs/specs/027-local-vs-ai.md` | Lobby + store Play vs AI (`chooseAction` as a player adapter) |
| `docs/specs/028-tag-fighter-prototype.md` | Earlier 3v3 prototype. Where it disagrees with spec `030`, follow `030` |
| `docs/specs/029-fighter-combat-core.md` | Named faces, Simple Actions, ordered Techniques |
| `docs/specs/030-offensive-control.md` | Current content model: Response, Modify, Meter, Tag, Assist, dice, deck |
| `docs/RULEBOOK.md` | Living how-the-game-plays (must stay current with engine rules) |
| `docs/KEYWORDS.md` | Print keywords (`[Mark]`, `[Empower]`, …). Rules tab shows player sections |
| `docs/OPEN_DESIGN.md` | Unresolved design decisions |
| `docs/MECHANIC_ARCHETYPES.md` | Mechanic × window × deck-style feel (playtest tracker) |
| `docs/DEFERRED_CATALOGUE.md` | Print clauses not fully modelled |

## Definition of Done

```bash
npm run typecheck && npm test && npm run lint
```

Do not commit unless the user asks. Do not push unless the user asks.

## Hard rules (summary)

- `src/server` cannot import React, Zustand, PeerJS, nanoid, `@client/*`, or touch DOM / storage / network / clock / `Math.random`.
- Headless playtest AI lives in `src/ai` (spec `026`). It imports the public `@server` barrel only. `src/server` must not import it. The client may import `@ai` for local vs-AI (lobby + spec `027`).
- Effects are **data** (JSON AST / discriminated unions), never functions. New tokens are `[Mark]` / `[Strip]` arguments, not new opcodes.
- Content ids: `card-*`, `creature-*` (print: Fighter), face ids matching the current `faceId` pattern, `attack-*`, `ability-*` (kebab after prefix). The face-id prefix is not a natural/synthetic kind.
- Cards are `response` or `modify`. Equipment, overload, and ritual names in older JSON are leftover regions, not kinds to author. Tag is an operation. Assist stays on the Fighter.
- Grow effect AST only when a concrete card needs it; one opcode handler class + tests in the same change. No unreachable stubs.
- Do not rewrite `resolution.ts` / MatchBoard / catalogues in one shot; do not grow files past `module-budget.test.ts`.
- Print voice is the **holder**: `you` / `your` is the player who currently has the card on their field; `opponent` is that player’s opponent (including after the card is handed onto the other side).
- No attribute pile, no natural/synthetic face kinds, no Shield resource, no per-fighter decks, and no deckbuilding dice. Do not author new cards as if those were live.
- Gameplay rule changes update [`docs/RULEBOOK.md`](./docs/RULEBOOK.md) in the same change.
- New/edited card print and new tokens/keywords follow [`docs/KEYWORDS.md`](./docs/KEYWORDS.md).
- Model routing: Grok/Composer for research, scaffolding, and implementation. Opus/GPT (and similarly powerful models) only for orchestration and decisions after that work is handed off — never to write the feature or explore the repo as the primary researcher. [`.cursor/rules/model-routing.mdc`](.cursor/rules/model-routing.mdc).
