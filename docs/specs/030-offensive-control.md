# 030 — Offensive control

Status: **DESIGN** (revised 2026-10-03)

Supersedes the 2026-09-30 engine assumptions that spent a used face, treated
Starter / Extender / Finisher as a private sequence table, and split “lost
control” from “stolen initiative.”

Reuses spec `029` (named faces, simple moves, ordered techniques) and one
`PlayerState.meter` pool. No second action system. No action-point resource.
No separate resolution path for Modifies, Tags, or Assists. Engine types stay
`Creature*`. Print says **Fighter**.

Chain Priority is who may add to the unresolved interaction. It is not a
second offensive-control track. The declarer has Priority first. After
Priority closes, the Chain resolves **last-in, first-out**. Spec `008` gave
the opponent Priority first; that part is not this model. The last-in order
is.

`Open` and `Combo` are states of one offensive sequence. They are not turn
phases. Starter, Extender, and Finisher are properties of an Action or
Technique, not states and not card types. Act, Resolve, and Meter are not
phases. The current turn shape is still `roll` then `actions`. Do not add
Tag, Meter, or Resolve phases.

## Vocabulary

```text
Die face → input / roll result → Action → Technique
        → Chain / Priority → resolution → offensive sequence
```

- **Die face** — a face on a die. An input. Not an Action by itself.
- **Action** — an operation a Fighter or player can take.
- **Technique** — a Fighter-specific Action built from the required inputs.
- **Tag** — the operation that involves the Active Fighter and a Reserve
  Fighter. Not a synonym for Action.
- **Assist** — a Reserve Fighter’s effect. The Reserve does not become Active.
- **Priority Pass** — during a Chain, yield Priority. Not a Chain object.
- **Sequence end** — the Aggressor stops the offensive sequence, or an
  effect says the sequence ends. Not a Priority Pass.

```text
Fighter
├── dice
├── moveset
├── Techniques
└── Assist

Cards
├── Response
└── Modify
```

## Decided

### Dice are inputs (Model C)

A rolled face is an input. Using it does not consume it. Dice do not grant a
number of actions. Do not add an action-point pool.

```text
Base Action
      ↓
Fighter rules / Technique
      ↓
Modified interpretation
      ↓
Legal sequence behavior
```

The Fighter can change what an Action means. Techniques build on Actions.
Do not make a second Action system per Fighter.

An Action is legal only when all of these agree:

```text
Current offensive state
+ showing inputs
+ Fighter rules
+ Action / Technique requirements
+ sequence restrictions
= legal Actions
```

An Action that fails that check is not available. The player cannot declare
it. Declaring an illegal Action is not how a sequence ends.

### Sequence roles

Starter, Extender, and Finisher are properties of an Action or Technique.
They are not card types and not separate combat systems.

### Ending a sequence

**Priority Pass** and **sequence end** are different operations.

During a Chain, Pass yields Priority to the opponent. It does not end the
offensive sequence and it is not a Chain object.

During the Act, the Aggressor may explicitly stop the offensive sequence.
That choice is the sequence end. It is not a Priority Pass.

An Action or Technique may itself say that it ends the sequence. That is a
property of that Action or Technique. A Finisher is one such Action. It is
not the only one.

A sequence does not end because the player attempted an Action the sequence
does not allow.

Tag does not have one outcome for every Tag. A given Tag effect may end the
sequence or leave it, and may pass initiative or leave it. It may be
offensive or defensive. Do not encode “Tag always ends the sequence” or
“Tag always passes initiative.”

When a Fighter is KOed, that KO ends the current offensive sequence and
initiative passes to the opposing player. See **KO**.

### Act loop

Declaring an Action, Technique, Tag, or Assist starts an unresolved Chain
and opens Priority for the player who declared it. There is no Response
phase and no Modify phase. Both use this Priority.

```text
Aggressor declares
        ↓
That object is on the Chain; the declarer has Priority
        ↓
Player with Priority adds a legal Response or Modify, or Passes
        ↓
A Pass yields Priority to the opponent
        ↓
Two consecutive Passes, with nothing added between them
        ↓
Chain resolves last-in, first-out
        ↓
Apply what that object does to the offensive sequence
```

Playing a `Response` or `Modify` adds it to the Chain and clears the
consecutive-Pass count. It does not yield Priority. Only Pass does.

One Pass from each player at different times does not resolve the Chain.
The two Passes have to be consecutive. After `B` plays and then Passes, `A`
must Pass as well. If `A` adds something instead, the count starts over.

There is no fixed number of actions per turn. There is no Meter phase and
no initiative phase. Chain Priority and offensive control are different.

### Chain resolution

Responses and Modifies are both normal Chain objects. Tags and Assists use
this same Chain. Do not give Modifies, Tags, or Assists a separate
resolution system.

Once Priority closes, resolve last-in, first-out.

```text
A → Lariat
B → Counter
A → Counter Counter

Resolve:
Counter Counter
→ Counter
→ Lariat
```

**Play legality.** A card or effect enters the Chain only with a valid
target or context at that moment.

**Resolution legality.** If that target is gone or no longer valid when the
effect would resolve, the effect is not applied. Do not choose a replacement
target.

```text
Play legality
→ target or context must be valid when it enters the Chain

Resolution legality
→ if the target is no longer valid when it resolves,
   the effect does not apply
```

Which further objects a given card may name, beyond the Modify categories
below, stays open. This is not a second targeting system.

### Fighter identity

Rolled inputs are names. The Fighter decides which Actions those names can
form. Two Fighters can give the same faces different combo paths.

```text
Rolled inputs → Fighter moveset → legal Action → Chain → resolution
```

A Moveset `Modify` changes that reading for one Fighter: a Technique
requirement, whether a Technique is available, or how an input is read. It
does not replace the Fighter and it is not a global moveset.

Still from spec `029`: a simple move is the showing face’s Primary effect.
A Technique is an ordered pair — the Fighter’s primary face, plus one other
face matched by name, by face type, by sequence role, or by strike class
(a strength and kick or punch, such as a light kick) — and the secondary
face’s Secondary effect can change the result. Every hit and every Technique
has both a strength (light, medium, or heavy) and a strike (kick or punch).
The face and the Technique each carry their own starter, extender, or
finisher. A Fighter has no basic or special attack. Face types have no
damage or legality of their own.

### Reroll

The player has one reroll, immediately after the initial roll, before the
Act. It exists to cut variance. It is not an action-point spend.

The player may keep the results. Or they may reroll any number of their
available dice, under the existing dice model. The reroll replaces those
results. There is one normal reroll.

```text
Initial roll
    ↓
Roll interactions
    ↓
Keep, or reroll the chosen dice
    ↓
Reroll interactions
    ↓
Final results
    ↓
Act
```

Cards use the existing timing keywords and the Chain. They may modify a
roll or a reroll when their timing and target are legal, including before
or after that roll. A card may prevent a roll or a reroll only when that
effect says so. Do not add a Roll Modifier system.

### Roll result and die configuration

```text
Roll modification  → the current roll (which face is showing)
Die modification   → the die’s slots
```

A roll modification needs a roll that already happened and a slot on that
die. It does not rewrite the die. A die modification writes a slot and
stays written. There is no temporary die modification: no until-end-of-turn
face, no temporary face replacement, no temporary die configuration.

How dice are built, which faces are legal, and how a player acquires faces
are open. See **Deferred**. Only the in-game write is decided: it is
permanent.

### Tag

Tag is a normal operation, not a card. A card does not exist so that the
normal Tag can happen. A `Modify` or `Response` may still affect a Tag.

A turn may contain more than one Tag Window, including one at the beginning
of the turn and one at the end. Those windows use the existing turn. They
are not new phases.

A player may Tag at most once per turn. A Tag in the opening window means
no Tag in the closing window. Skipping the opening window leaves the
closing window available.

The normal Tag in a Tag Window does not inherently cost Meter. An
exceptional Tag may.

A Tag can be a Chain object. It can be Responded to and Modified. Its
effect says whether the sequence ends, whether initiative passes, and
whether the Tag is offensive or defensive. A defensive Tag that retargets
an incoming interaction is one such effect, not a rule for every Tag.

A KOed Fighter cannot Tag.

### Assist

Assist belongs to the Fighter, not to the card system. A Reserve Fighter’s
Assist affects the current situation and that Fighter stays in Reserve.

Normal Assist does not cost Meter. It uses the same Chain as other
operations: it can be added, Responded to, Modified, and resolved last-in,
first-out. It is legal when its own timing and conditions are legal. Those
conditions are part of that Fighter’s Assist. They may be open whenever the
player has Priority, or they may be narrower. Do not add an Assist
resolution system, and do not hard-code a list of enhanced Assists.

Meter is not the cost of having an Assist. Meter is for an exceptional
Assist or for breaking a restriction. A KOed Fighter can still Assist.

### Meter

Each player has one Meter pool, shared by all three Fighters. It is not
stored on a Fighter. It persists from turn to turn. Changing the Active
Fighter does not reset it.

Meter is for exceptional actions, powerful effects that justify the
resource, or breaking a normal restriction. It is not generic card mana.
A card does not cost Meter merely because it is strong. One card may have
a normal mode with no Meter and an exceptional mode that spends Meter.

A player can gain Meter when they deal damage and when they receive
damage. A specific Action, card, or other effect may also grant Meter.
Those grants are data on the effect. Do not hard-code a source list beyond
that, and do not add a separate Combo Meter.

A long sequence can be a risk: it can deal damage and generate Meter, and
it can be interrupted. That risk uses the same pool.

### KO

At 0 HP a Fighter is KOed.

- That Fighter cannot Tag.
- That Fighter can still Assist.
- The KO ends the current offensive sequence.
- Initiative passes to the opposing player.
- The Fighter stays on the team.

The player replaces a KOed Active Fighter by Tagging, under the Tag rules
above. Do not add a separate forced-Tag action.

Each player has three Fighters. When all three are KOed, that player loses
and the game ends.

### Defense

Defense is cards, not a die face. The Defender does not gain a response by
having rolled Guard, or any other face. A normal Response has no Meter
cost. An exceptional one may.

A defensive card is a `Response` or a `Modify`: dodge, counter, block,
damage reduction, prevention, redirection, and anything else that fits
those two behaviors. Those names are examples, not card types.

A Tag or an Assist may be defensive when that effect says so. Neither is
defensive for every Tag or every Assist.

### Cards

Cards supply what dice do not. They complement dice and the Fighter. They
do not replace them, and a basic Action does not require a card.

```text
Dice             → inputs
Fighter          → what those inputs mean, Techniques, Tag, Assist
Cards            → Response or Modify
Timing           → existing keywords and the reaction window
Priority / Chain → who may add, then last-in resolution
Meter            → one shared pool for exceptional use
Offensive state  → who is continuing the sequence
```

Two card behaviors only:

```text
Response
Modify
```

Do not add engine types for Counter, Reversal, Modifier, Situation,
DiceModification, RollModification, MovesetModification, or
TargetModification.

Timing reuses the reaction window and the existing timing keywords,
including `type: "reaction"`. Do not add `TimingCondition`,
`TimingConditionType`, or a second timing system. A timing keyword means
the effect is eligible in that window. It is not permission by itself.

**Response.** Reacts to an opponent’s Action, Response, Tag, Assist, or
other valid object already on the Chain. The player who has Priority may
play one only against an **opponent’s** object. They cannot Response their
own Action. They can Response an opponent’s Response. A Response does not
inherently take offensive control. Control changes only when the effect
says the sequence ends or initiative passes.

Counter (a Response that interrupts) and Reversal (a Response whose result
is that the Defender becomes Aggressor) are that same behavior with
different results.

**Modify.** Changes the current situation. Either player may play one
while they have Priority, when its timing, target, and context are legal.
One behavior, several targets:

- **Roll** — change which face a die is showing. The slots stay as they are.
  This includes the initial roll and the reroll.
- **Die** — permanently change a slot. No temporary die modification.
- **Moveset** — change what one Fighter can do with the inputs it has.
- **Target** — redirect a target an unresolved interaction already has.
  A target Modify with nothing to redirect is illegal.
- **Tag** — perform or alter a Tag. The normal Tag is not this card.
- An Action, an effect, or another legal object, when a card names it.

The effect list inside those categories is open. Scope and duration are
properties of the effect, not a second system.

**Legality.** Priority is not permission to play any card.

```text
Priority
+ timing
+ Response or Modify legality
+ a valid target or context
+ any required state
+ Meter, when that mode requires it
```

Cards affect the offensive state only through the result of resolution.
There is no card initiative track beside the offensive sequence.

## To test

These are the current intended models. They are not frozen implementation
rules. Do not treat a later playtest change to either one as a reversal of
the rest of this spec.

### Finisher returns to Open

A Finisher is the current model for ending a sequence by playing it.

```text
Aggressor
→ uses a Finisher
→ the Finisher resolves
→ the offensive sequence ends
→ the game returns to Open
```

The intended sense is: the combo is finished, and play is back in Open.
Other Actions may also end the sequence by saying so. Who is Aggressor
after that return to Open is not specified here.

### No repeated Action in one sequence

The same Action cannot normally be used twice in one offensive sequence.

```text
Lariat
→ use Lariat
→ Lariat cannot be used again during this sequence
```

The face is still an input. It may still be part of a Technique.

```text
Lariat
→ used as a simple Action

Later, in the same sequence:

Lariat + Grab
→ used as a Technique
```

The restriction is on repeating that Action, not on locking the face out
of every Technique.

If that proves too narrow, a later model may mark specific Actions
`Once Per Sequence` instead of restricting every Action. That later model
is not the rule to use now.

## Hand, deck, and card lifecycle

Confirmed 2026-10-03. The numbers below are the initial playtest
configuration. They are knobs on `GameRulesConfig`, not final balance.

A player brings one team and one deck.

```text
Player
├── Team
│   ├── Fighter
│   ├── Fighter
│   └── Fighter
└── Deck
```

There is one deck and one hand. Fighters do not get their own decks or
hands. The three Fighters are the team’s identity. The deck is the
strategic list. The same three Fighters may be played with different
decks. A list may emphasize one Fighter as Active, another through
Assist, and another through Tag.

Fighters do not restrict what the deck may contain. A deck may mix
generic cards and cards associated with any of the three Fighters. A
Fighter-specific card may require that Fighter to be on the team before
it can be played. That is a play check. It is not a deckbuilding ban.
“Magnus must be on your team” is not “the deck may only contain Magnus’s
cards.”

Cards are still only Response or Modify. Counter, Reversal, Block,
Dodge, and the Modify subjects stay effects on that card. Generic and
Fighter-specific cards are the same card.

### Confirmed

- Both players are dealt `openingHandSize` at match setup, before anyone
  acts. Who has the first turn does not change that deal.
- At the beginning of every turn, including turn 1, the player whose
  turn it is draws `cardsDrawnPerTurn`. Turn 1 uses that same draw. There
  is no skipped first turn and no extra first-player draw on top of it.
- There is no maximum hand size while `maxHandSize` is null. The game
  does not discard down to a hand limit.
- A deck contains at most `deckMaxCopiesPerCard` of one card id.
- One-shot is the default lifecycle for a card that is not already a
  persistent field card. It leaves the hand. Its normal destination is
  the discard pile (the graveyard). `afterResolveZone` on that card is
  the only override, and it applies when the card resolves.
- Persistent cards stay in play. Equipment, overload, and continuous
  rituals already do. A card marked `lifecycle: "persistent"` that is
  not one of those stays in the existing in-play list. Persistent is not
  a new effect engine.
- Discard is that destination, not a separate system. A card does not go
  to discard unless its lifecycle or its own effect sends it there.
- A Block does not draw a card unless that card’s effect says so. Card
  advantage is printed on the card. The existing draw effect is the path.
- When `deckOutEnabled` is true, a draw from an empty deck loses the
  match. The opponent wins. There is no fatigue damage and no reshuffle.
  When `deckOutEnabled` is false, that draw stops, the `deck-empty`
  event is logged, and the match continues.
- Deck construction checks size, copy limit, and that the card id exists.
  It does not check Fighter play requirements. Play checks those.

### Initial playtest configuration

| Knob | Config field | Initial value |
|---|---|---|
| Starting hand | `openingHandSize` | 5 |
| Draw at each turn start | `cardsDrawnPerTurn` | 1 |
| Hand limit | `maxHandSize` | null (no limit, and no discard-to-limit) |
| Copies of one card | `deckMaxCopiesPerCard` | 3 |
| Deck out | `deckOutEnabled` | true |
| Fixed deck size | `deckSize` | null |

`deckSize` null means a playtest has not chosen the fixed size yet. While
it is null, validation still uses the previous range (`deckMinCards` /
`deckMaxCards`) so existing lists stay legal. Setting `deckSize` to a
number requires that exact count and does not also apply the range. A
later minimum/maximum model can use those range fields without a new
deck type. The range is not the confirmed real-game size.

`maxHandSize` may be set to a number later. The current rules do not
discard excess cards even if a number is present.

### Deferred

- Reusable and Return as lifecycle categories. A later card may say what
  happens to it. That is not a global rule yet.
- Mulligan.
- The real-game deck size, and whether that size is a range.
- Which Fighter requirements exist beyond the current play check: the
  named Fighter must be on the team and still living
  (`fighterRestriction`). “On the team even while KOed” is not a separate
  rule yet.

## Fighter dice

Confirmed 2026-10-03, except where a line is marked as an initial
playtest rule or deferred.

### Fighter dice

Each Fighter has one die. The Fighter defines that die. The player does
not build it while constructing the deck.

### Base die configuration

`baseDie` on the Fighter is the configuration a match starts from.

### Current die configuration

The slots in play are the current die. At match start they are a copy
of the base die.

### In-match dice modification

A card with Modify subject `die` rewrites a current slot. That write
lasts for the rest of the match. There is no temporary die change.
`fighterRestriction`, when set, limits the write to that Fighter's die.

### Roll modification vs die modification

A card with Modify subject `roll` changes which face is showing. It
does not write the slots.

### Moveset cards

A Moveset card is a Modify subject `moveset`. A generic one omits a
Fighter requirement and may apply to more than one Fighter. There is
no separate Moveset engine. When it resolves, the card stays attached
to that Fighter for the rest of the match, the same way equipment stays
on a creature, so the modified moveset remains visible. A negated
moveset card goes to the graveyard and does not attach.

### Fighter-specific Moveset cards

A Fighter-specific Moveset sets `fighterRestriction`. It may enable a
technique on that Fighter and, when the card says so, rewrite that
Fighter's current die. It does not modify another Fighter's die.

### Rolling all three dice

On the roll, every die on the team is rolled: Active, Reserve, and
KOed.

### KOed Fighter dice

Initial playtest rule: a KOed Fighter cannot become Active and cannot
Tag. Their die still rolls, and they can still Assist. No extra die,
reroll, Meter, or card is granted for the KO. Three KOed Fighters
still loses when `wipeVictory` is on.

### Rolled face instances

Each result stays on the die that rolled it. Two dice showing the same
face are two inputs.

### Primary vs secondary face usage

A face used as the primary input is not the same use as that face as
the secondary input. Primary and secondary effects stay on the face.

### Simple Actions vs Techniques

A simple Action uses the Active Fighter's own die. A Technique uses
that die as the primary face and one other die owned by the same
player as the secondary face. An opponent's die is not an input.

### Input reuse

One rolled face cannot fill both the primary and the secondary of the
same Technique. A later, different Action in the same sequence may use
that face again. Dice are not action points. The live tag preset does
not spend a die when a face is used. The same Action id still cannot
be declared twice in one sequence.

### Match reset

The next match builds each die from its base again. Nothing carries
from one match to the next.

### Deferred

- The final face count and the final face pool. `facesPerDie` is the
  playtest length. It is not a final size.
- The Moveset card list and its numbers.
- Building dice during deck construction.
- Keeping die changes after the match, or gaining a face outside a
  match.
- A later limit on Assist from a KOed Fighter.

## Open

Do not implement these as if they were decided.

- What moves Neutral into Open, and what maintains a sequence besides the
  legal-Action check.
- Who is Aggressor after a voluntary sequence end, and after a Finisher
  returns play to Open.
- How a Chain result maps onto the offensive state, beyond the KO rule,
  the sequence-end property, and the Finisher model under test.
- The exact effects inside Response and inside each Modify category, and
  the scope/duration set.
- Which cards spend exceptional Meter, and the amount of any Meter grant.
  The sources above are decided. The numbers are data.
- Where, inside the existing `roll` / `actions` turn, the beginning and
  end Tag Windows sit. Not a new phase.
- The timing condition on a particular Assist, beyond “that Fighter’s
  Assist says when.”
- Who starts as Aggressor at the beginning of the match.
- Anything not listed under Decided or To test.

## Engine note

Not design. What the build now does, and what it still does not.

Aligned with this revision:

- A sequence-role Action is not spent as a face. The Action id
  (`face:<id>` or `technique:<id>`) cannot be declared again until the
  sequence returns to Open. A face used as a simple Action can still be
  the primary input of a different Technique.
- A finisher, or `endsSequence`, returns the sequence to Open. Initiative
  moves only when that Action sets `passesInitiative`, or on KO.
  `END_SEQUENCE` returns to Open and leaves the Aggressor where they are.
- One `REROLL_DICE` is legal in the actions phase before any other Act,
  of any number of your dice. A later Act closes it.
- `TAG` and `ASSIST` are Chain objects on the existing combat-action
  link. One Tag per turn. A Tag in the opening or closing actions window
  is free. Adding Tag to a Chain that is already open spends the existing
  tag-cancel cost. A KOed Active cannot Tag. A KOed Reserve can Assist.
  KO does not switch the Active Fighter. It ends the sequence and passes
  initiative. Three KOed Fighters still loses when `wipeVictory` is on.
- Attack Strike damage grants the existing per-HP amount to the dealer
  and to the player who was hit. No second rate was added.
- Opening hands, the per-turn draw, the copy cap, deck-out, and one-shot
  versus persistent use the existing deck, hand, graveyard, and in-play
  lists. `deckSize` null still checks the previous range. `maxHandSize`
  is stored and does not discard.
- Each die stores `baseSlots` and `boundCreatureId`. Current slots start
  as a copy of the base. A die Modify writes slots only. A roll Modify
  writes `rolledSlotIndex` only. `facesPerDie` is the playtest length
  (default 6). The next `createMatch` builds from the base again.
- `ROLL_DICE` walks every die on the team, including a KOed Fighter.
  `secondaryDiceFor` returns other dice of the same player. The primary
  die is excluded, so one result cannot fill both inputs.
- `setActiveFighter` refuses a defeated Fighter. A die or moveset Modify
  with `fighterRestriction` must match that Fighter.
- The tag preset sets `consumeDiceOnFaceActions` off. Dice are inputs,
  not action points.

Still not this document:

- `consumeDiceOnFaceActions` still spends a die when that flag is on.
  The default preset leaves the flag on so older tests keep that
  leftover. The tag preset turns it off.
- `sequenceRole` is still the continuation check (open takes a starter;
  combo takes an extender or finisher). That table was not re-specified.
- `seizesOffense` still takes offensive control by itself.
- Spec `008` tactic windows still give the opponent Priority first. A
  combat-action chain, and a card that sets `behavior`, gives Priority to
  the player who just acted.
- Tag windows are the actions phase: opening before any Act, closing
  after. The spec leaves the exact seat inside `roll` / `actions` open.
- Who is Aggressor after a voluntary end or a Finisher is open. The build
  leaves them in place unless `passesInitiative` or a KO says otherwise.

`src/server/reducer/offensiveControl.test.ts`,
`src/server/reducer/tagFighter.test.ts`,
`src/server/reducer/cardBehavior.test.ts`, and
`src/server/reducer/diceIdentity.test.ts` lock this slice.
