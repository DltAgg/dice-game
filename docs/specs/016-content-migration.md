# 016 content migration notes (Phases 3–6)

Design guidance for `card-designer` after engine Phases 1–2 land.
Canonical rules: [`016-attribute-pile-up.md`](./016-attribute-pile-up.md).
Ticks: [`016-attribute-pile-up.STATUS.md`](./016-attribute-pile-up.STATUS.md).

## Print / timing

- Keep prefix **`On absorb:`** — means the pip was banked into the **owner’s attribute pile** (or Shield granted onto a creature).
- Do not invent `On bank:` unless KEYWORDS is updated in the same change (prefer Absorb).
- Holder voice unchanged.

## Faces (Phase 3)

Most dual-timing faces keep `onAbsorb` as-is if effects do not assume creature-local fuel (`source-creature` for redirect/heal on absorber still means “the creature that would have been the absorb target” — **broken for attributes**).

**Must rewrite or defer:**

| Face / effect | Issue | Proposed |
|---|---|---|
| Pack Share `copy-attribute-tokens` | Creature↔creature tokens gone | **Done Phase 3:** `On absorb: [Generate 1 Wild]` |
| Aegis-style `arm-redirect-damage` `source-creature` on absorb | No absorber creature | **Done Phase 3:** `choose-ally` |
| Effects that said “the absorbing creature” | No absorber | **Done Phase 3:** choose-ally / choose-enemy / player Empower |

Effects that only `gain-energy`, `look-top-deck`, `next-attack-bonus`, `generate-symbol`, forge arms, toxin Mark, etc. usually **keep** — they never needed creature tokens.

## Rituals (Phase 4)

`activeWhen` stays as pile gate. Add `spend` where the old “sink pips into the card” was the interesting cost:

| Pattern | Spend recommendation |
|---|---|
| Instant with Active-when ×2–3 and a strong body (Extermination, Living Library, Great Contamination, …) | `spend` = same as `activeWhen` (or one less if too harsh) |
| Continuous standing (Foundry, Pack Law, Clockwork, Battle Hymn, …) | Usually **no** spend on activate if activate body empty; gate via Active-when only |
| Paradox | No Active-when, no spend |
| High swing (e.g. 4 damage Arcane+Darkness) | Prefer spend = Active-when |

Standing On absorb on continuous rituals: fires when owner banks matching attribute — keep filters.

## Creatures (Phase 5)

- Attack `requires` / `discards` already pile-based after engine; verify print text (“absorbed attributes” → “attributes in your pile” if editing).
- Standing `on-absorb`: keep; `absorberRelation` may need engine semantics check (any / self) — bank is player-scoped.

## Phase 6 (equipment / overload / pack-feed)

Concrete hooks still assuming creature absorb / creature tokens (from catalogue grep):

**Cards with standing `on-absorb` or overload `onAbsorb`:** review each id around lines in `cards.ts` (Mirrored Rune, gear, Den Share, Mutant Spores, Ratchet, Transmission, pack feeders, …).

**Effects to retarget or DEFER:**

- `transfer-attribute-tokens` / `copy-attribute-tokens`
- `discard-attribute-tokens` vs enemy creature tokens → enemy pile or DEFER
- `choose-attribute-tokens` pending (creature-scoped)

Until Phase 6, prefer `DEFERRED_CATALOGUE.md` rows over silent empty `effects: []` on printed clauses.
