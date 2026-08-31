---
name: slice-changes
description: >-
  Break Dice Skirmish work into small, layered slices so agents do not rewrite
  megamodules or implement engine+UI+catalogue in one shot. Use when the user
  asks for a rewrite, architecture change, large feature, “just implement the
  plan,” or anything that would touch reduce.ts, resolution.ts, MatchBoard, or
  more than one of server/client/content.
---

# Slice changes (anti-megamodule)

Read `.cursor/rules/scope-and-modules.mdc` first. Spec `020` file budget.
Mechanical gate: `src/architecture/module-budget.test.ts` (part of `npm test`).

## Decide in 30 seconds

| Request looks like | Do this |
|---|---|
| One card / print / JSON | `card-designer` + `author-content`. Design a unique slot first; compose existing opcodes. |
| New verb / hook / phase | `engine-developer` + `develop-engine` or `implement-hooks`. One handler class or one `fire*`. |
| Lobby / board / decks UI | `match-ui`. Query engine; do not copy legality. |
| Overcharge (spec `021`) | Rules already shipped (`engine-developer`). UI → `match-ui` (`canOvercharge` / `legalOverchargeFaces`; face-card picker like overload, not `DieSlotPickModal`). Not spec `013` `optional-overcharge`. |
| Legal lists / identity | `deck-designer`. Edit `loadouts/*.json`. |
| Playtest debrief (notes ± metrics, wrong-archetype feel) | `post-playtest` + `review-playtest`. Update `docs/MECHANIC_ARCHETYPES.md`; brief owners; do not implement. |
| Playtest “felt like the wrong archetype” (already debriefed) | `card-designer` (print) / `engine-developer` (physics) / `deck-designer` (list). |
| New/rewrite agent, skill, rule, AGENTS.md routing | `prompt-engineer` + `author-interactions`. One artifact. |
| Spans two columns above | Parent **delegates**; does not implement both. |
| “Rewrite X”, “revamp”, “AST”, “split everything” | Spec first (`docs/specs/_TEMPLATE.md`). Strangler. Stop after one stage. |

## Hard stops

- Do not rewrite `src/server/reducer/resolution.ts` or `MatchBoard.tsx` in one change.
- Do not put catalogue bodies back into `cards.ts` / `creatures.ts` / `faces.ts`.
- Do not add methods/closures on `GameState` or JSON documents.
- Do not grow a frozen file past `module-budget.test.ts` — extract instead.
- Do not invent opcodes, `GameState` bags, or HTTP servers “for flexibility.”
- Incomplete print → `docs/DEFERRED_CATALOGUE.md`, not a silent fake.

## OOP / DRY / KISS / YAGNI (this repo)

1. **Compose** `mark` / `strip` / `modify` / `damage` / `heal` in JSON.
2. **New verb** = one `IOpcodeHandler` + compile mapping + proving card + tests.
3. **Commands** stay in `src/server/reducer/commands/`; `reduce.ts` is a facade.
4. **UI** dispatches `GameAction` and reads queries. No second rules engine.
5. Ship the smallest slice that makes tests and the rulebook true.

## Workflow

```text
Slice Progress:
- [ ] 1. Name the single concern and the owning subagent/skill
- [ ] 2. Confirm existing opcodes / queries / components cover it
- [ ] 3. Implement only that slice (JSON-only if possible)
- [ ] 4. Focused tests, then DoD
- [ ] 5. Stop. Hand the next slice to the next owner.
```

Focused tests: `npx vitest run src/architecture/module-budget.test.ts` plus the
area you touched (`src/server/reducer/playcard.test.ts`, etc.).
