# Deferred catalogue effects

Reopened 2026-08-14 for engine vocabulary (`012` / `013`). Most printed clauses
are now data-driven. This file lists only what is still honestly unfinished.

**Sources:** `docs/specs/002-card-layer.md`, `003-creature-cards.md`,
`004-face-cards.md`, `011-token-strip-ritual-destroy.md`,
`012-deferred-vocabulary.md`, `013-face-markers.md`, `docs/OPEN_DESIGN.md`.

---

## Catalogue reset (2026-08-29)

The catalogue was wiped and reauthored as a Mechanical + Luminar **Tempo** set
(22 tactics, 3 creatures, 9 naturals + Shield + 6 named synthetics), then an
Arcane + Darkness **Control** set was added alongside it (22 tactics, 3
creatures, 6 more named synthetics). Rows below that name retired print (Drain /
Infection faces, Great Spark, Rekindle, Alpha's Hide, Reforge, Share the Kill,
Den Share) describe **cards that no longer have catalogue entries**. They stay
as design reference for the vocabulary decisions, not as open work.

**Nothing in the current Tempo or Control catalogue is deferred.** Every printed
clause on the 44 tactics, 6 creatures, and 12 synthetic faces is wired to
existing `EffectDefinition` / `StandingTrigger` vocabulary. No
`engine-developer` brief was needed.

---

## Intentionally not modelled

| Item | Needed for | Why |
|---|---|---|
| **Push / enemy move** | — | **DECIDED no / banned.** Ally swap & reposition stay. Former Twin Blades / Varcolac Hunt / Impact roll / Command absorb push print was **rewritten** to non-move effects. Do not reintroduce. |
| **Stun application** | — | `OPEN_DESIGN.md` stays `DEFERRED`. `DieState.stunMarkers` exists; nothing applies stun. |
| **Great Spark / Rekindle** | Named faces | Empty print — no clauses to wire. |
| **Pile-spent scaling** (`playCostPaid` → draw) | Future `?` cards | Fixed `playCost` for now; no printed clause needs it yet. |
| **Attribute-pile tax / transfer** (Drain face roll/absorb; Infection absorb) | `face-synthetic-drain`, `face-synthetic-infection` | No modelled pile-tax opcodes. `[Drain]` is life transfer only. Empty `onRoll`/`onAbsorb` (Infection roll still wires `spread-corruption-marker`). |

Implemented elsewhere (not deferred): reaction chain / negate-card / negate-ritual
(`008`); prevent buffer / reflect / prevent-draw (`009`); shared trigger hooks
(`010`); token strip / ritual destroy (`011`); movers / discounts / GY replay /
pierce / follow-ups / convert / retain-from-effect (`012`); face markers /
suppress / lock / Instinct absorb (`013`).

---

## Tactic / creature leftovers

No push leftovers. Alpha's Hide special→generate Wild is wired (`012` ASSUMED:
controller pool). Recast / Alloy Shift are wired via `replace-synthetic-face`
(`[Reforge N Attr]` / `[Cross forge N Y / Z]`, spec `012`). No tactic / creature print rows currently deferred.

## Revisit checklist

1. Stun application / removal (only if `OPEN_DESIGN` stun is reopened).
2. Great Spark / Rekindle printings.
3. Pile-spent scaling when a `?` card needs `playCostPaid`.
4. Re-measure first-player win rate after catalogue depth.

Do not treat approximate effects as final without an `OPEN_DESIGN.md` row.
