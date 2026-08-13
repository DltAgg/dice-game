# Face cards (dice faces)

File: `src/game/content/faces.ts`  
Spec: `docs/specs/004-face-cards.md`  
Types: `src/game/model/dice.ts` (`FaceCardDefinition`)

## Kinds

| Kind | Role | Typical `maxOverloads` |
|---|---|---|
| Natural attribute | Identity faces (`face-natural-*`) | 1 |
| Natural Shield | Untyped (`face-natural-shield`) | 1 |
| Generic synthetic | Forge targets (`face-synthetic-<attr>`) | 2 |
| Named special | Printed inherent effect (`face-synthetic-<name>`) | usually 2 |

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

- `onRoll` fires when the face is showing after `ROLL_DICE` (and related keep paths).
- `onAbsorb` fires when a symbol from this face is absorbed (`010-trigger-hooks`).
- New dual-region faces: standardize print as `On roll:` / `On absorb:` — see
  [standardize-card-effects](../standardize-card-effects/SKILL.md).
- Leave arrays empty when print clauses are not fully modelled; keep `rulesText`.
- Overloads attach to the **face card**, not the physical die slot.
- Face deck legality: ≤12 faces, ≤3 per attribute (`validateFaceDeck` / loadout rules).
- Tactics install faces via forge from the owner’s face pool — changing faces may
  require prototype face-deck / test updates.

## In-repo specials to copy patterns from

- Crush — `next-attack-bonus`
- Rending Claw — `remove-shield` + target selector
- Arcane Echo face — `forgeRestriction: "echo-cards"`
