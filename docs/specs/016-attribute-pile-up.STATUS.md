# 016 STATUS — Attribute pile-up

Living checklist for [`016-attribute-pile-up.md`](./016-attribute-pile-up.md).

**Status:** **done** — engine, catalogue, and match UI all use the player pile.

**Content handoff:** [`016-content-migration.md`](./016-content-migration.md)

---

## Phase checklist

| Phase | Owner | Status | Notes |
|---|---|---|---|
| 0 Spec + OPEN_DESIGN | parent | **done** | Spec 016 + OPEN_DESIGN |
| 1 Engine core (pile, bank absorb, attacks) | engine-developer | **done** | `attributePool`; bank absorb; attack fuel from pile |
| 2 Ritual engine (`spend`, Active-when vs pile) | engine-developer | **done** | `RitualRegion.spend`; Active-when vs pile |
| 3 Faces content (On absorb = bank) | card-designer | **done** | Pack Share → Generate; absorber retargets |
| 4 Rituals content (Active-when + Spend) | card-designer | **done** | Instant/reaction spend = Active-when |
| 5 Creatures content | card-designer | **done** | Attack pile fuel; standing `on-absorb` → `ally` |
| 6 Equipment / overload | card-designer | **done** | Standing on-absorb → `ally`; Share/Den pile rewrite |
| 7 Match UI | match-ui | **done** | Seat pile; rolled attrs auto-bank; Shield needs creature |

---

## Docs touch list

| Doc | Status |
|---|---|
| `docs/RULEBOOK.md` | **done** |
| `docs/KEYWORDS.md` | **done** |
| `docs/OPEN_DESIGN.md` | **done** |
| `docs/specs/002`, `003`, `004` | **done** |
| `docs/DEFERRED_CATALOGUE.md` | **done** |

---

## Playtest gate

Builtin loadouts typecheck and play with pile banking and pile fuel.
