# Set craft

Model: [design.md](design.md). The source is
[`docs/GAME_STATE.md`](../../../docs/GAME_STATE.md). Print is the whole of
[`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md). Read it before print. The
change is not done when the print and the glossary disagree.

This sibling is **craft**. Do not paste it into the agent.

## Catalogue truth

**Live JSON** in `src/server/content/{cards,faces,creatures}/` is the set.
Grep it before choosing a slot. Then read the matching schema. Reuse a field
that already exists (`modifySubject`, `fighterRestriction`, `baseDie`,
`primaryEffects`, `techniques`, `assistEffects`, `exceptionalMeterCost`).

A required `forge` object is a validator leftover. Satisfy it. Do not design
the card around it. Overload and ritual regions are not slots. A moveset
Modify attaches in the equipment zone. That is not a card type.

## Designer gates

1. **Too complicated.** One focus. A face is an input. A card is a Response
   or a Modify. Do not stack a second resource on top.
2. **Wrong layer.** If the request is a Block face, a Tag card, or a
   per-fighter deck, stop. [design.md](design.md) has the closest home.
3. **No separation.** Dice, Fighter, and cards stay distinct.
4. **Doesn't fit the rules.** Compose existing opcodes. If the proving card
   needs new vocabulary, brief `engine-developer`. Do not fake it.
5. **Power level last.** Cover the current loop. Do not chase volume.

## Uniqueness

Reject a reskin: same behavior, same subject, same Fighter, new name.

A cycle is fine when each member changes the subject, the timing, or which
Fighter it belongs to. "Another card" still needs a new slot, or a question
back to the user.

Do not copy:

- a draw that repeats with no restriction and is not part of a Technique or an Assist
- a face whose only text is generic Block
- `[Spend] X, [Generate] Y`
- a Forge sticker

## What a new piece must touch

Every new face, move, or card cares about at least one of: a rolled input,
a face action, a Technique, a Response, a Modify subject, an exceptional
Meter mode, Tag, or Assist.

Shared side effects (a draw) still need that hook, and a draw needs a
restriction unless it is part of a Technique or an Assist.

## Moveset and die writes

A moveset card is Modify `moveset`. It attaches in the equipment zone. A
generic moveset omits `fighterRestriction`. A Fighter-specific one sets it
and does not rewrite another Fighter's die.

Replace (`modifySubject: "die"`) writes the current die for the rest of the
match. Modify `roll` only changes which face is showing.

## Anti-patterns

See the table in [design.md](design.md). Also reject:

- Guard, Block, Dodge, Counter, or Parry on a new face
- Meter on a card because it is strong
- A second lifecycle besides `one-shot` and `persistent`
- A new timing enum
- Filling `attacks` with pile `[Requires]` and calling that the Fighter
