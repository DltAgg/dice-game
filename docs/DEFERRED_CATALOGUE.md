# Deferred catalogue effects

Reopened 2026-08-14 for engine vocabulary (`012`). Most printed clauses are now
data-driven. This file lists only what is still honestly unfinished.

**Sources:** `docs/specs/002-card-layer.md`, `003-creature-cards.md`,
`004-face-cards.md`, `011-token-strip-ritual-destroy.md`,
`012-deferred-vocabulary.md`, `docs/OPEN_DESIGN.md`.

---

## Intentionally not modelled

| Item | Needed for | Why |
|---|---|---|
| **Push** | Twin Blades (basic → push); Varcolac Coordinated Hunt push rider; Impact On-roll push | **DECIDED no.** Do not approximate as reposition/swap. Accurate `rulesText` stays. |
| **Stun application** | — | `OPEN_DESIGN.md` stays `DEFERRED`. `DieState.stunMarkers` exists; nothing applies stun. |
| **Great Spark / Rekindle** | Named faces | Empty print — no clauses to wire. |
| **Energy-spent scaling** (`energyPaid` → draw) | Future `?` cards | TEMP fixed costs; no printed clause needs it yet. |
| **Instinct On absorb extra basic** | Instinct | Print kept. ASSUMED no extra attack: the absorber may still declare a basic later in actions if `attacksUsedThisCombat === 0`. Absorb does not grant a flag and cannot attack during absorption. |

Implemented elsewhere (not deferred): reaction chain / negate-card / negate-ritual
(`008`); prevent buffer / reflect / prevent-draw (`009`); shared trigger hooks
(`010`); token strip / ritual destroy (`011`); movers / discounts / GY replay /
pierce / follow-ups / convert / retain-from-effect (`012`).

---

## Face-marker / suppress / lock subsystems (skipped this pass)

These need a dedicated “face marker / suppress inherent / lock resource”
system. Print is accurate; structured hooks are empty.

| Face | Gap |
|---|---|
| Adaptive Toxin | Roll: cap toxin receive; absorb: remove any number of markers → that much damage |
| Stain | Roll: Corruption marker on opposing synthetic; absorb: lock a Corrupted face as a resource |
| Infection On roll | Spread Corruption onto another face of the same die (absorb **is** wired: opponent loses 1 Energy) |
| Decay | Roll: suppress Natural inherent until next roll; absorb: strip Corrupted → unusable pool symbol |
| Catalyst | Roll: Synthetic as any attribute; absorb: copy a Synthetic face effect that appeared this roll |
| Overcharge | Roll: optional Energy + skip next inherent; absorb: resolve the next face effect twice |

---

## Tactic / creature leftovers

| Card / creature | Gap |
|---|---|
| Twin Blades | Equip + `on-attack` ready; **push** not modelled |
| Varcolac Coordinated Hunt | Damage resolves; **push** rider not modelled |
| Impact On roll | Absorb +2 is wired; **push** on next basic is not |
| Alpha's Hide | Equip; special→generate Wild on another card still deferred |
| Overcharge skip-next inherent | Overload absorb clause still deferred |

---

## Revisit checklist

1. Push (if design reopens it — not reposition/swap).
2. Stun application / removal (only if `OPEN_DESIGN` stun is reopened).
3. Face-marker subsystem: Adaptive Toxin, Stain, Infection roll, Decay, Catalyst, Overcharge.
4. Great Spark / Rekindle printings.
5. Energy-spent scaling when a `?` card needs `energyPaid`.
6. Re-measure first-player win rate after catalogue depth.

Do not treat approximate effects as final without an `OPEN_DESIGN.md` row.
