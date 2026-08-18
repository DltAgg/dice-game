---
name: implement-hooks
description: >-
  Design and implement standing trigger hooks as shared rules events with rich
  context ids and catalogue-side filters. Use when adding on-attack, on-take-damage,
  on-discard, extending on-roll-symbol / on-absorb, wiring equipment / creature /
  continuous-ritual standing abilities, or when the user mentions trigger hooks,
  StandingTrigger, or spec 010.
---

# Implement standing trigger hooks

One **system event** → one **hook** → rich **context ids** → **ability data**
filters. Do not invent coupled hook names (`on-ally-attack`,
`on-opponent-roll-symbol`).

Companion skills: [develop-engine](../develop-engine/SKILL.md),
[standardize-card-effects](../standardize-card-effects/SKILL.md),
[author-content](../author-content/SKILL.md). Spec: `docs/specs/010-trigger-hooks.md`.

## Principles

1. **Shared event, not special-case type.** Prefer extending context on an
   existing hook over a new union member that encodes a relationship.
2. **Identity is instance id.** Two Varcolacs are different `CreatureId`s; ally
   filters use `ownerId` + `attackerId !== hostId`, never card name/definition id.
3. **Filters live in catalogue data.** Relation enums
   (`self` | `ally` | `ally-other` | `any`, `controller` | `opponent` | `any`)
   sit on the ability, not in the reducer branch name.
4. **Hosts share one trigger union.** Equipment, creature standing passives, and
   continuous-ritual standing abilities use the same `StandingTrigger` shape
   (or a thin alias). Reducer walks all hosts the same way.
5. **Effects stay data.** Hooks only queue `EffectDefinition`s (or apply an
   explicit in-event modifier such as `reduceBy` on take-damage). Never attach
   functions.
6. **Wire only complete clauses.** Missing movers / pierce / copy → keep print,
   leave abilities empty or omit, row in `DEFERRED_CATALOGUE.md`.

## Context checklist (always pass)

| Hook | Required context |
|---|---|
| `on-attack` | `attackerId`, `attackerOwnerId`, `attackKind`, `targetId` |
| `on-roll-symbol` | `rollingPlayerId`, `symbol` |
| `on-absorb` | absorber instance (creature id or ritual card instance id), `absorberOwnerId`, `symbol` (+ face kind when filtering Natural) |
| `on-deal-damage` | bearer = source; damaged creature as declared target |
| `on-take-damage` | `damagedCreatureId`, incoming amount (pre or post prevent — document which) |
| `on-discard` | `discardingPlayerId` |
| `on-change-position` | `creatureId` that moved (`from` / `to` available to `fire*` but unused by filters today) |

## Relation filters (canonical)

```ts
type CreatureRelation = "self" | "ally" | "ally-other" | "any";
type PlayerRelation = "controller" | "opponent" | "any";
```

| Print cue | Filter |
|---|---|
| `On attack:` (this creature) | `on-attack` + `attackerRelation: "self"` (default for gear) |
| `On attack, another ally:` | `on-attack` + `attackerRelation: "ally-other"` |
| `On roll Corruption:` (host controller) | `on-roll-symbol` + `rollingPlayer: "controller"` |
| `On opponent roll Corruption:` | `on-roll-symbol` + `rollingPlayer: "opponent"` |
| `On absorb:` / `On absorb <Symbol>:` | `on-absorb` + `absorberRelation: "self"` |
| `On absorb Natural:` (any creature / ritual) | `on-absorb` + `absorberRelation: "any"` (+ Natural filter; untyped Shield does not match) |

## Workflow

```text
Hook Progress:
- [ ] 1. Name the rules event (not the card relationship)
- [ ] 2. Extend / reuse StandingTrigger + context; update 010
- [ ] 3. Implement fire* in triggers.ts; call from the single event site
- [ ] 4. Walk equipment + creature standing + ready continuous rituals
- [ ] 5. Wire proving cards; defer incomplete print honestly
- [ ] 6. Tests + DoD
```

### Call sites

| Event | Typical call site |
|---|---|
| Attack declared | `attack()` in `reduce.ts` after costs / before or with chain push |
| Symbol shown on roll | existing `ROLL_DICE` path (pass `rollingPlayerId`) |
| Absorb | `queueAbsorbTriggers` |
| HP dealt | `dealDamage` / attack damage path |
| Incoming damage modify | inside `dealDamage` **before** prevent/shield when `reduceBy` |
| Discard | `discardSpecificCards` (and any other discard entry) |
| Position change | `setCreaturePosition` in `zones.ts` only |

### once-per-turn

Track spent keys on `CreatureState` / player (e.g.
`spentOncePerTurnTriggers`) keyed by host + trigger kind; clear on `END_TURN`.
Ability sets `oncePerTurn: true` (Insignia, Hunting Armour).

## Anti-patterns

- `on-ally-attack` / `on-opponent-roll-*` union members
- Filtering by `definitionId` or printed name (breaks duplicate creatures)
- One-off reducer `if (cardId === …)` instead of catalogue triggers
- Queuing effects for a clause that still needs unimplemented vocabulary
- Firing take-damage **reduce** after HP is already applied

## More detail

- Hook catalogue & proving cards: [reference.md](reference.md)
- Before/after ability shapes: [examples.md](examples.md)
