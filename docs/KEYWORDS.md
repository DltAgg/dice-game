<!--
Agents: this file is print vocabulary (`.cursor/rules/keywords.mdc`). Player
sections render on the Rules tab; HTML comments are stripped.

New and edited print uses this file. The current game is `docs/GAME_STATE.md`.
Reuse [Mark], [Strip], and [Modify]. Do not mint a verb. A new token joins
[Mark] / [Strip]. Timing stays a prefix. Never “Whenever…”.
Tag is an operation. Assist is on the Fighter. Cards are Response or Modify.
-->

## Keywords

### Current print

Dice are named inputs. A face has a name, a type, a primary effect, and a secondary effect. Primary applies when that face is the hit, and when it is the first face of a Technique. Secondary applies when that face is the other face of the Technique. A hit and a Technique have a strength (light, medium, or heavy) and a strike (kick or punch). Strength sets Meter, not damage. The damage is `[Strike N]`.

Cards are Response or Modify. Block, Counter, Parry, and redirect are effects, not card types. `[Counter]` negates the previous chain card and does not end the sequence. `[Parry]` negates a hit, leaves you offensive, and ends the sequence. `[Block N]` lowers the next damage by N and does not cancel the hit. A Modify changes a roll, a die, a moveset, a target, or a Tag. Tag is an operation. Assist is a Fighter ability.

`[Replace]` writes a named face onto a slot of that Fighter’s die for the rest of the match. `[Tag out]` makes the opponent’s Active Fighter leave. They choose a living Reserve. The Fighter who leaves is not defeated, and Tag is not spent. No living Reserve: nothing happens. When that line also says the Fighter cannot `[Tag in]` until the end of its next turn, that Fighter cannot be Tagged in during its controller’s next turn.

Meter is one shared pool. A card’s play cost, when it has one, is the Meter you spend to play that card. Do not also write “Spend N Meter” for that same cost. Meter for a mode that is not the only way to play the card stays in the rules text.

`[Draw N]` does not attach to a Fighter and does not repeat without a restriction or a condition, unless it is part of a Technique or an Assist.

Timing stays a prefix (`On roll:`, `On attack:`). Never “Whenever…”.

### New tokens

A new token does not get its own verb. It joins an existing operator:

| Print | Use |
|---|---|
| `[Mark N X]` | Place N of token X. |
| `[Strip N X]` | Remove N of token X. |
| `[Modify]` | Change a roll, a die, a moveset, a target, or a Tag. |

Dodge is not current print. Shield is not a resource. Do not print `[Forge]`, `[Requires]`, `[Spend]`, `[Generate]`, `[Empower]`, `[Pierce]`, `[Convert]`, `[Desynthesize]`, or an attribute-only verb on a new card.
