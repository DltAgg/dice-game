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

### Attribute pile-up Phase 6 (spec `016`)

| Item | Needed for | Why |
|---|---|---|
| **Pack feed transfer/copy** | `card-share-the-kill`, `card-den-share` | Creature↔creature attribute tokens removed; effects currently no-op until retargeted to piles. **Pack Share** face rewritten Phase 3 to `[Generate 1 Wild]` on absorb. |
| **Equipment standing On absorb (`self`)** | `card-mirrored-rune`, `card-archmages-grimoire`, `card-predators-claws`, `card-hunters-collar`, `card-wild-carapace`, `card-servomotor`, `card-umbral-brand`, `card-warding-charm`, `card-venom-font`, `card-grave-whisper`, `card-den-share` | Default / explicit `self` no longer matches **player** pile bank (still fires if a stale `creatureId` is passed). Convert to `ally` or retarget in Phase 6. Foundry / Pack Law already use `ally`. |
---

## Revisit checklist

1. Stun application / removal (only if `OPEN_DESIGN` stun is reopened).
2. Great Spark / Rekindle printings.
3. Energy-spent scaling when a `?` card needs `energyPaid`.
4. Re-measure first-player win rate after catalogue depth.
5. Spec `016` Phase 6 pack-feed (Share / Den Share) / On absorb self hosts.

Do not treat approximate effects as final without an `OPEN_DESIGN.md` row.
