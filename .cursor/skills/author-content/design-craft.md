# Set craft

Model: [design.md](design.md) and
[`docs/specs/030-offensive-control.md`](../../../docs/specs/030-offensive-control.md).
Print: [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md).

This sibling is **craft**. Do not paste it into the agent. Do not treat
pile-era spec tables (`002` bridges, natural/synthetic forges, attribute
exclusives) as cards to clone.

## Catalogue truth

**Live JSON** in `src/server/content/{cards,faces,creatures}/` is the set.
Grep it before choosing a slot. Then read the matching schema. Reuse a field
that already exists (`modifySubject`, `fighterRestriction`, `baseDie`,
`primaryEffects`, `techniques`, `assistEffects`, `exceptionalMeterCost`).

Leftover zones (a required `forge` object, `equipment` / `overload` /
`ritual` regions, `face-natural-technique-guard` in an old list) are not
slots to fill again.

## Designer gates

1. **Too complicated.** One focus. A face is an input. A card is a Response
   or a Modify. Do not stack a second resource on top.
2. **Wrong layer.** If the request is a Block face, a Tag card, or a
   per-fighter deck, stop. [design.md](design.md) has the closest home.
3. **No separation.** Dice, Fighter, and cards stay distinct. A card does
   not replace a basic action. A die does not become the defense system.
4. **Doesn't fit the rules.** Compose existing opcodes. If the proving card
   needs new vocabulary, brief `engine-developer`. Do not fake it.
5. **Power level last.** First-playtest work optimizes for covering the loop
   in [design.md](design.md), not for balance or volume.

## Uniqueness

Reject a reskin: same behavior, same subject, same Fighter, new name.

A cycle is fine when each member changes the subject, the timing, or which
Fighter it belongs to. "Another card" still needs a new slot, or a question
back to the user.

Do not copy:

- the last Modify that only draws
- a face whose only text is generic damage reduction
- `[Spend] X, [Generate] Y`
- `On roll: [Generate 1 SameAttr]` as a die identity
- a Forge-1 natural/synthetic sticker

## What a new piece must touch

Every new face, move, or card cares about at least one of: a rolled input,
a Simple Action, a Technique, a Response, a Modify subject, an exceptional
Meter mode, Tag, or Assist.

Shared side effects (a small heal, a draw) still need that hook. They are
not a reason to bring back an attribute pie.

## Moveset and die writes

A moveset card is Modify `moveset`. One per example Fighter in the
playtest philosophy is enough to show the subject. A generic moveset omits
`fighterRestriction`. A Fighter-specific one sets it and does not rewrite
another Fighter's die.

Modify `die` writes the current die for the rest of the match. Modify `roll`
only changes which face is showing. Do not author both as one vague "dice
card."

## Anti-patterns

See the table in [design.md](design.md). Also reject:

- Guard, Block, Dodge, or Counter on a new face
- Meter on a card because it is strong
- A second lifecycle besides `one-shot` and `persistent`
- A new timing enum
- Filling `attacks` with pile `[Requires]` to satisfy the creature schema
  and calling that the Fighter
