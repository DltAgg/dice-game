# Deferred catalogue effects

Reopened 2026-08-14 for engine vocabulary (`012` / `013`). Most printed clauses
are now data-driven. This file lists only what is still honestly unfinished.

**Sources:** `docs/specs/002-card-layer.md`, `003-creature-cards.md`,
`004-face-cards.md`, `011-token-strip-ritual-destroy.md`,
`012-deferred-vocabulary.md`, `013-face-markers.md`, `docs/OPEN_DESIGN.md`.

---

## Intentionally not modelled

| Item | Needed for | Why |
|---|---|---|
| **Push** | Twin Blades (basic → push); Varcolac Coordinated Hunt push rider; Impact On-roll push | **DECIDED no.** Do not approximate as reposition/swap. Accurate `rulesText` stays. |
| **Stun application** | — | `OPEN_DESIGN.md` stays `DEFERRED`. `DieState.stunMarkers` exists; nothing applies stun. |
| **Great Spark / Rekindle** | Named faces | Empty print — no clauses to wire. |
| **Energy-spent scaling** (`energyPaid` → draw) | Future `?` cards | TEMP fixed costs; no printed clause needs it yet. |

Implemented elsewhere (not deferred): reaction chain / negate-card / negate-ritual
(`008`); prevent buffer / reflect / prevent-draw (`009`); shared trigger hooks
(`010`); token strip / ritual destroy (`011`); movers / discounts / GY replay /
pierce / follow-ups / convert / retain-from-effect (`012`); face markers /
suppress / lock / Instinct absorb (`013`).

---

## Tactic / creature leftovers

| Card / creature | Gap |
|---|---|
| Twin Blades | Equip + `on-attack` ready; **push** not modelled |
| Varcolac Coordinated Hunt | Damage resolves; **push** rider not modelled |
| Impact On roll | Absorb +2 is wired; **push** on next basic is not |

Alpha's Hide special→generate Wild is wired (`012` ASSUMED: controller pool).

---

## Revisit checklist

1. Push (if design reopens it — not reposition/swap).
2. Stun application / removal (only if `OPEN_DESIGN` stun is reopened).
3. Great Spark / Rekindle printings.
4. Energy-spent scaling when a `?` card needs `energyPaid`.
5. Re-measure first-player win rate after catalogue depth.

Do not treat approximate effects as final without an `OPEN_DESIGN.md` row.
