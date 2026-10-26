# Effect hosts

New print uses [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md) and the effect
members in `src/server/model/effects.ts`. This note is not a second glossary.

| Print | Member |
|---|---|
| `[Strike N]` | `damage` or `assist-hit` |
| `[Block N]` | `reduce-damage` |
| `[Counter]` | `negate-card` |
| `[Parry]` | `grant-attack-prevent` |
| `[Mark N X]` / `[Strip N X]` | `mark` / `strip` |
| Replace | `replaceFaceId` or Modify subject `die` |
| `[Draw N]` | `draw-cards` |

Do not print `[Forge]`, `[Generate]`, `[Requires]`, `[Spend]`, overload, or
ritual. A moveset Modify attaches in the equipment zone. That zone is not a
card type. Leave `onAbsorb` empty on a new face.
