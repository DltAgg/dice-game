# Face cards (dice faces)

File: `src/game/content/faces.ts`  
Spec: `docs/specs/004-face-cards.md`  
Types: `src/game/model/dice.ts` (`FaceCardDefinition`)

## Kinds

| Kind | Role | Typical `maxOverloads` |
|---|---|---|
| Natural attribute | Dual-kind only: Martial / Wild / Arcane / Luminar (`face-natural-*`) | 1 |
| Untyped Shield | Untyped (`face-untyped-shield`) | 1 |
| Effectful generic synthetic | Forge targets for Arcane / Toxin / Mechanical / Corruption / Darkness (`face-synthetic-<attr>`) | 2 |
| Blank generic synthetic | Forge targets for Martial / Wild / Luminar (`face-synthetic-<attr>`, no inherent effect yet) | 2 |
| Named special | Printed inherent effect (`face-synthetic-<name>`) | usually 2 |

**Policy:** Toxin / Mechanical / Corruption / Darkness are synthetic-only
(`SYNTHETIC_ONLY_ATTRIBUTES`). Never author `kind: "natural"` faces or forge
regions for them. Martial / Wild / Arcane / Luminar are dual-kind
(`DUAL_KIND_ATTRIBUTES`).

Helpers: `naturalFaceId`, `syntheticFaceId`, `faceIdFor`, `faceIdForSymbol`.

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

- Design: [design.md](design.md). Faces are the engine; named specials should
  change how a die plays, not duplicate a creature attack.
- `onRoll` fires when the face is showing after `ROLL_DICE` (and related keep paths).
- `onAbsorb` fires when a symbol from this face is absorbed (`010-trigger-hooks`).
- New dual-region faces: standardize print as `On roll:` / `On absorb:` — see
  [standardize-card-effects](../standardize-card-effects/SKILL.md).
- Leave arrays empty when print clauses are not fully modelled; keep `rulesText`.
- Overloads attach to the **face card**, not the physical die slot.
- Face deck legality: ≤12 faces, ≤3 per attribute (`validateFaceDeck` / loadout rules).
- Forging always takes from the **forger’s** pool (or copies a face they already
  own), even when `target: "opponent-die"`. `faceCardOwnerId` stays the forger;
  when the last copy leaves the dice, the card returns to them (bible §12).
- Changing faces may require prototype face-deck / `ENGINE_TEST_FACE_DECK` updates.

## In-repo specials to copy patterns from

- Crush — `next-attack-bonus`
- Rending Claw — `remove-shield` + target selector
- Arcane Echo face — `forgeRestriction: "echo-cards"`
