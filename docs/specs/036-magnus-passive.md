# Magnus passive

## Intent

Magnus’s printed passive currently does nothing useful. Replace it with two
rules that apply to the Magnus who is the source of the action, whether he
is Active or Reserve:

1. Grab hits he executes, and Techniques he executes, deal +1 damage.
2. When the opponent starts a sequence with a light punch or a light kick,
   Magnus deals +2 damage on his next attack on the next turn. If he does
   not attack on that turn, the +2 expires.

A Technique is not also counted as a grab hit. The +1 applies once. The +2
stacks with that +1 when the attack that spends it is a grab hit or a
Technique. The +2 does not stack with itself: a later qualifying opener
before it is spent refreshes the same +2 for the following turn.

## Rules

The source is `docs/GAME_STATE.md`. Player-facing wording goes in
`docs/RULEBOOK.md` in the same change. Print stays inside the current
glossary. Do not mint a verb. `+N damage` is already how faces print a
damage add.

**Grab or Technique +1.** When a combat action whose source is this Fighter
conducts and is not negated, not a whiff, and not blocked by a failed Meter
spend, add 1 to each damage effect on that action when either:

- the action is a face hit (not a Technique) and the face’s `faceType` is
  `grab`, or
- the action is a Technique this Fighter executes.

Assist hits and EX card bodies are not a separate category. If an EX card
replaced the Strike on a grab hit or Technique that this Fighter executed,
the +1 still applies to the damage that conducts. A negated or whiffed
action deals no damage, so the bonus does not create a hit.

**Light-opener punish.** The opponent starts a sequence when they declare a
starter whose `hitStrength` is `light` and whose `hitType` is `punch` or
`kick`. That includes a light starter hit and a light starter Technique.
Arm the bonus when that starter is declared, including when a later response
negates it. Do not arm it for an illegal declaration.

The Magnus on the other player’s team receives the bonus. A defeated Magnus
does not. A team with no Magnus does not. The bonus is +2, available only
on the next turn (`turn + 1`), and only on Magnus’s next sequence attack
that turn (face hit, Technique, or a hit Assist he is the source of,
including damage an EX card substituted onto that attack). After that
attack conducts, clear it. At the end of the turn it was available, clear
it if it was not spent. It does nothing on the turn the opponent opened.

Do not hardcode the definition id `creature-magnus`. Put the amounts on
`CreatureDefinition` fields and wire them on Magnus. Keep the existing
Ryu starter-halve and grappler-whiff rules.

## State Changes

- `CreatureDefinition` gains optional data for the +1 (grab hits and
  Techniques) and for the light-starter punish amount. Magnus JSON sets
  both. No other Fighter sets them in this change.
- `CreatureState` records at most one delayed bonus: the amount and the
  turn number it becomes available. `null` when none is armed.
- `src/server/model/state.ts` is frozen. If adding the field would exceed
  `module-budget.test.ts`, extract a type instead of growing the freeze.
- Setup creates the field empty. It is serializable. No clock and no
  `Math.random`.

## Actions

No new `GameAction`. The existing face, Technique, and Assist declarations
are the actions. The engine derives the bonus. Clients do not send an
amount.

## Acceptance

Tests can check, using the catalogue Magnus:

- A grab hit he executes deals its printed Strike + 1. The same grab face
  executed by another Fighter does not gain that +1.
- A Technique he executes deals its printed Strike + 1, once, including
  when the primary face is a grab.
- A non-grab face hit he executes does not gain the +1.
- A negated or whiffed grab deals 0.
- When the opponent declares a light punch starter or a light kick starter,
  Magnus’s next sequence attack on the following turn deals +2. An attack
  on the opener’s turn does not. A second qualifying opener does not raise
  the bonus above 2. The bonus is gone after that next attack, and gone at
  the end of the available turn if he does not attack.
- A medium or heavy starter does not arm the bonus. An extender does not
  arm it.
- `passiveRulesText` states both clauses in holder voice. `docs/RULEBOOK.md`
  and `docs/GAME_STATE.md` describe the same timing.

No game code belongs in this spec beyond the field names above.
