# Deferred catalogue effects

Reopened 2026-08-14 for engine vocabulary (`012` / `013`). Most printed clauses
are now data-driven. This file lists only what is still honestly unfinished.

**Sources:** `docs/specs/002-card-layer.md`, `003-creature-cards.md`,
`004-face-cards.md`, `011-token-strip-ritual-destroy.md`,
`012-deferred-vocabulary.md`, `013-face-markers.md`, `docs/OPEN_DESIGN.md`.

---

## Catalogue reset (2026-10-03)

The playable team is Vega, Magnus, and Ryu. Korr and Nyx, and the eight
meter-tax tactics, are gone. Grappler remains the spec `029` proving
Fighter. The old technique faces, including Guard, stay in the catalogue
for existing engine fixtures. They are not on the playtest dice.

## First-playtest gaps (2026-10-03)

These clauses were not wired. The printed cards do not claim them.

| Item | Wanted for | Why it is parked |
|---|---|---|
| **Dodge** (the attack misses, and is not `[Prevent]` and not a reflected hit) | A Response distinct from Brace and Counter | No miss opcode. `[Prevent]` (`grant-attack-prevent`) only arms a link of kind `attack`. Face and Technique hits are `combat-action` and are not `fromAttack`, so that prevent does not stop them. `negate-card` is Counter. `modifySubject: "target"` is Shift. |
| **Block a face or Technique** | Brace | Brace prints `[Prevent]` the Attack. That is the Attack action, not a sequence face or Technique. |
| **Change an Action's damage, sequence role, or whether it ends the sequence** | A Modify of an action property | Moveset Modify only enables a Technique the secondary input does not match (`enabledTechniqueIds`). It does not rewrite the Technique. |
| **A sixth distinct face on each die** | Magnus Dash / Power, Vega Feint / Launcher, Ryu Backstep / Sweep | `faceDeck` schema `maxItems` is 12 and `faceDeckMaxCards` is 12. Eighteen unique named faces do not validate. Each die repeats two of four names. |
| **Pass initiative when a Finisher resolves** | A Finisher that hands offense over | `passesInitiative` is on the TypeScript face and technique types and is not in the JSON schema. A Finisher returns the sequence to Open and leaves the Aggressor in place. KO still passes initiative. |
| **Assist that costs nothing without a special field** | Spec `030` normal Assist | Omitting `exceptionalAssistMeter` charges `assistMeterCost` (1) unless the Reserve is showing technique `assist`. These Fighters set the field to 0. There is no Assist face. |

## Catalogue reset (2026-08-29)

Historical: the catalogue was wiped and reauthored as Mechanical + Luminar
**Tempo**, then Arcane + Darkness **Control**. Those lists are gone; see the
2026-10-03 reset.

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
