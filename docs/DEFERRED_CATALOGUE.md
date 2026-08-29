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
| **Push / enemy move** | — | **DECIDED no / banned.** Ally swap & reposition stay. Former Twin Blades / Varcolac Hunt / Impact roll / Command absorb push print was **rewritten** to non-move effects. Do not reintroduce. |
| **Stun application** | — | `OPEN_DESIGN.md` stays `DEFERRED`. `DieState.stunMarkers` exists; nothing applies stun. |
| **Great Spark / Rekindle** | Named faces | Empty print — no clauses to wire. |
| **Energy-spent scaling** (`energyPaid` → draw) | Future `?` cards | TEMP fixed costs; no printed clause needs it yet. |
| **Lose / Move Energy** (Drain face absorb/roll; Infection absorb) | `face-synthetic-drain`, `face-synthetic-infection` | No Energy track in engine; former `drain-attribute-tokens` stub removed when `[Drain]` became life transfer. |

Implemented elsewhere (not deferred): reaction chain / negate-card / negate-ritual
(`008`); prevent buffer / reflect / prevent-draw (`009`); shared trigger hooks
(`010`); token strip / ritual destroy (`011`); movers / discounts / GY replay /
pierce / follow-ups / convert / retain-from-effect (`012`); face markers /
suppress / lock / Instinct absorb (`013`).

---

## Tactic / creature leftovers

No push leftovers. Alpha's Hide special→generate Wild is wired (`012` ASSUMED:
controller pool). Reforge (`card-reforge`) is wired via `replace-synthetic-face`
(`012`). No tactic / creature print rows currently deferred.

Spec `016` Phase 6 catalogue conversion is **done** (standing on-absorb →
`ally`; Share the Kill → `[Drain 1]`; Den Share → `[Frenzy]` ally; Instinct /
Pounce prove Frenzy). Unused `transfer-attribute-tokens` /
`copy-attribute-tokens` stubs were **removed**. `[Drain]` and `[Frenzy]`
(`grant-extra-attack`) are live.

## Revisit checklist

1. Stun application / removal (only if `OPEN_DESIGN` stun is reopened).
2. Great Spark / Rekindle printings.
3. Energy-spent scaling when a `?` card needs `energyPaid`.
4. Re-measure first-player win rate after catalogue depth.
5. Spec `016` Phase 6 complete. Pack-feed stubs deleted; Wild exclusive is `[Frenzy]`.

Do not treat approximate effects as final without an `OPEN_DESIGN.md` row.
