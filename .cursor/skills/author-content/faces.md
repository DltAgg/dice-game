# Face cards (dice faces)

File: `src/server/content/faces/<face-id>.json` (add the id constant in `faces.ts`)  
Spec: `docs/specs/004-face-cards.md`  
Types: `src/server/model/dice.ts` (`FaceCardDefinition`)
Craft: [design-craft.md](design-craft.md) — uniqueness + dual-pip hole

**Audit live faces first.** Naturals are empty single-`symbol` identity.
Synthetics that generate (Cogtooth, Augur Glass, Lucent Choir, Gloomwell, …)
generate **the same** attribute they show. That slot is filled. Dual-attribute
generating faces (one Natural, one Synthetic) are a **first-class hole**.

## Kinds

| Kind | Role | Typical `maxOverloads` |
|---|---|---|
| Natural attribute | All eight attributes (`face-natural-*`) | 1 |
| Untyped Shield | Untyped (`face-untyped-shield`) | 1 |
| Named special | Printed inherent effect (`face-synthetic-<name>`, e.g. Cogtooth, Gloomwell) | usually 2 |

**Author only those three.** There are no blank or generic identity synthetics.
Never author `face-synthetic-martial`, `face-synthetic-corruption`, or any
`face-synthetic-<attr>` card whose name is just the attribute (Forged Martial,
Synthetic Corruption, etc.). Forging a synthetic attribute **names a special
from the owner's pool** that has that symbol.

**Policy:** every attribute is dual-kind (`DUAL_KIND_ATTRIBUTES` = all eight).
Natural identity faces exist for Martial / Wild / Toxin / Arcane / Luminar /
Mechanical / Corruption / Darkness. `SYNTHETIC_ONLY_ATTRIBUTES` is empty (kept
for API stability). Dual-kind **synthetic** forges still install a named
special (Cogtooth, Gloomwell, Lucent Choir, …), not a generic.

Helpers:

| Helper | Use |
|---|---|
| `naturalFaceId(attr)` | Starting identity (`face-natural-*`) for any attribute |
| `faceIdFor(kind, attr)` | Natural only; **throws** if `kind === "synthetic"` |
| `faceIdForSymbol(symbol)` | Starting-die symbols only (naturals + Shield) |

There is no `syntheticFaceId`. Tests and setup that need a synthetic must import
a named special (`COGTOOTH`, `AUGUR_GLASS`, `GLOOMWELL`, …).

Print (`rulesText` / on-roll / on-absorb) uses the **holder** of the die that
shows the face: **you** is that die’s controller; **opponent** is their
opponent. A face forged onto the opponent’s die is read by them. Name both
actors when one player chooses and the other discards or pays.

## Dual-attribute generating faces

`FaceCardDefinition.symbol` is **one** field. Prefer composing **today**:

```ts
face({
  id: EXAMPLE_BRIDGE_FACE,
  name: "Example Dual-Pip",
  kind: "natural", // or "synthetic" — occupy both holes over time, not one clone
  symbol: "martial",
  rulesText: "On roll: [Generate 1 Wild].",
  onRoll: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
  onAbsorb: [],
  maxOverloads: 1,
  forgeRestriction: null,
}),
```

Yield follows the showing `symbol` (Martial here). `[Generate]` supplies the
partner. A Synthetic that shows Arcane and generates Darkness is the other
hole — not `On roll: [Generate 1 Arcane]` on an Arcane face (Cogtooth clone).

If proving print needs two inherent pips or a second `symbol` field, **design
the card**, then brief `engine-developer` with the standard proving-card
brief. Do not abandon the slot.

Do **not** fill this space with another Cogtooth. Sunward Lens (Heal +
Generate Mechanical on a Luminar face) is cross-attr generate, not a dual-pip
Natural; do not treat it as occupying the Natural dual-pip hole.

## Shape (named special)

```ts
export const EXAMPLE_FACE: FaceCardId = asFaceCardId("face-synthetic-example");

face({
  id: EXAMPLE_FACE,
  name: "Example",
  kind: "synthetic",
  symbol: "martial", // or SHIELD for the shield face only
  rulesText: "Next attack deals +1 damage.",
  onRoll: [{ type: "next-attack-bonus", amount: 1 }],
  maxOverloads: 2,
  forgeRestriction: null, // or "echo-cards" (Arcane Echo)
}),
```

## Rules of thumb

- Design: [design.md](design.md) + [design-craft.md](design-craft.md). Faces
  are the engine; named specials should change how a die plays, not merely
  copy a creature’s basic attack or reprint Generate-same. Face damage that
  converts a rolled or absorbed symbol is valid (and expected for Control
  closers). Dual-pip faces (symbol + `[Generate]` other attr) occupy an empty
  hole — see above.
- `onRoll` fires when the face is showing after `ROLL_DICE` (and related keep paths).
- `onAbsorb` fires when a symbol from this face is **banked into the owner’s
  attribute pile** (roll auto-bank, effect generate, or manual absorb — spec `016`).
  See [attribute-pile.md](attribute-pile.md).
- New dual-region faces: standardize print as `On roll:` / `On absorb:` — see
  [standardize-card-effects](../standardize-card-effects/SKILL.md).
- Leave arrays empty when print clauses are not fully modelled; keep `rulesText`.
- Overloads attach to the **face card**, not the physical die slot.
- Face deck legality: ≤12 faces, ≤3 per attribute (`validateFaceDeck` / loadout rules).
- Opening dice: basics (naturals + Shield) need not be in the 12. Named specials on `startingDice` must be in `faceDeck` and start installed. Naturals **may** be packed in the 12 for density swaps.
- Forging always takes from the **forger’s leftover pool** (or copies a face they already
  own), even when `target: "opponent-die"`. `faceCardOwnerId` stays the forger;
  when the last copy leaves the dice, the card returns to them (bible §12).
- Changing faces may require prototype face-deck / `ENGINE_TEST_FACE_DECK` updates.

## In-repo specials to copy patterns from

**Live JSON** (`src/server/content/faces/`). Do not copy vanished Crush /
Rending Claw / Arcane Echo unless those files exist again.

| Face | Why | Do not clone for |
|---|---|---|
| Cogtooth | Generate-same + forge discount | The dual-pip hole (`On roll: [Generate 1 SameAttr]`) |
| Augur Glass | Generate Arcane + `[Insight]` | Same-attr generate as the whole face |
| Gloomwell | Generate Darkness + mill | Same-attr generate as the whole face |
| Gear Train | Conditional generate + `[Double]` | Mechanical reconstruction exclusives on other attributes |
| Halo Lamp | Generate Shield + `[Mark N Shield]` | Generic-reach faces that ignore dice |
| Sunward Lens | Cross-attr generate on absorb | Occupying Natural dual-pip |

Occupy the **empty** dual-pip Natural and dual-pip Synthetic slots instead.
