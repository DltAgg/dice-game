# 016 content migration notes

Catalogue guidance for the attribute pile. Canonical rules:
[`016-attribute-pile-up.md`](./016-attribute-pile-up.md).

## Print / timing

- **`On absorb:`** — pip banked into the owner's **attribute pile** (or Shield
  granted onto a creature).
- Prefer Absorb over inventing `On bank:` unless KEYWORDS is updated in the
  same change.
- Holder voice unchanged.

## Faces

Keep `onAbsorb` as-is. Retarget effects that assumed an absorber creature when
banking attributes (`source-creature` redirect/heal → `choose-ally`).

## Rituals

`activeWhen` is a pile gate. Add `spend` where activate should burn pile tokens:

| Pattern | Spend recommendation |
|---|---|
| Instant with Active-when ×2–3 and a strong body | `spend` = same as `activeWhen` (or one less if too harsh) |
| Continuous standing (Foundry, Pack Law, …) | Usually **no** spend on activate if activate body empty |
| Paradox | No Active-when, no spend |

Standing On absorb on continuous rituals: fires when owner banks matching
attribute — keep filters.

## Creatures

- Attack `requires` / `discards` use the owner's attribute pile.
- Standing `on-absorb`: `absorberRelation` is player-scoped (`ally` for gear).

## Equipment / overload

Standing equipment `on-absorb` uses `absorberRelation: "ally"`. Overload
`onAbsorb` rows must not depend on `source-creature` for attribute banking.
