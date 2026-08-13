# Open Design Register

Required by the SPDD agent instructions §48. Every question the game bible
leaves unresolved is tracked here rather than being answered silently in code.

**A prototype assumption must never quietly become a game rule.** Anything
marked `ASSUMED` below is reachable from a single place — usually
`GameRulesConfig` or content data — so that settling the question is an edit to
data rather than a change to the reducer.

Status vocabulary:

| Status | Meaning |
|---|---|
| `DEFINED` | Stated outright in the bible. Implemented as written. |
| `DECIDED` | Settled in a design discussion. Treated as `DEFINED` from then on. |
| `ASSUMED` | A labelled prototype assumption standing in for an open question. |
| `OPEN` | Unresolved. |
| `DEFERRED` | Deliberately parked; not to be built on until reopened. |

---

## Resolved — design discussion, 2026-08-07 (first round)

### The shape of the Energy track

**Status:** `DECIDED` · implemented in `src/game/rules/energy.ts`

Bible §16 lists a fixed phase sequence ending in "End Turn", while §18 says
control passes when a player spends beyond a threshold. Those describe
different turn-end mechanisms. The decision:

- one shared marker on a track running 10 · 0 · 10, Digimon memory style;
- `value` is the Energy available to whoever holds the marker;
- a spend that pushes the marker **past** zero ends the turn once the current
  action has finished;
- landing exactly on zero does **not** end the turn;
- the overshoot is mirrored onto the incoming player's side, capped at the
  track size;
- the starting player opens the match with 3.

### Variable (`?`) tactic Energy costs

**Status:** `DECIDED` · 2026-08-12 · `CardDefinition.variableEnergy` + `energyPaid` on
`PLAY_CARD` / `FORGE_CARD`

Figma header `?` is not "uncosted". It means **pay at least 1 Energy, and as
much more as you want**. Catalogue entries use `energyCost: 1` with
`variableEnergy: true`. The declared `energyPaid` must be an integer ≥ 1.

Effects that scale off the amount spent (e.g. "spent 3: draw 1") are not yet in
`EffectDefinition`; park those clauses in `DEFERRED_CATALOGUE.md` until a
concrete card needs the amount-as-value vocabulary.

### Battlefield capacity

**Status:** `DECIDED`

Two frontline slots plus a back row, from the diagram in bible §6. A squad of
three deploys as two frontline and one back.

---

## Resolved — design discussion, 2026-08-07 (second round)

### Attacks are paid from attributes absorbed onto the attacking creature

**Status:** `DECIDED` · implemented in `src/game/reducer/reduce.ts` and
`src/game/rules/tokens.ts`

The single largest rule change so far. Attacks are **not** paid from the shared
symbol pool. A creature absorbs attributes from rolled dice, and those
attributes are what enable its attacks — the Pokémon TCG attachment model. A
creature whose attack requires Martial + Wild must have absorbed both.

This makes the central tension of bible §33 real for the first time:

```text
absorb  → attribute sits on the creature → enables that creature's attacks
resolve → symbol stays in the pool       → feeds engine abilities and cards
```

Creatures therefore have two distinct cost surfaces, and both already exist in
the model:

| Surface | Paid from | Bible |
|---|---|---|
| Engine ability | unabsorbed symbols in the shared pool | §17 |
| Attack | attributes absorbed onto that creature | §7, §31 |

An attack names two costs. `requires` is **checked and not spent**, so a
creature that has been fuelled stays fuelled and can attack every turn
thereafter; `discards` is the part an attack actually burns, normally a subset
of what it requires. Runeblast is the prototype's one discarding attack, which
is what keeps the difference observable.

Fuel only exists once the turn is over, so **a creature can never attack on the
turn it absorbed**. Bible §7 has the die sit on the creature and become a token
at end of turn, and §16 puts Combat before End Turn; taken literally that makes
absorbing always a turn of setup, and it is. Across sixty simulated matches the
first attack lands on turn 3.5 on average, and never on turn 1.

### Absorbed energy has a payoff

**Status:** `DECIDED` — superseded by the entry above.

Previously flagged as making absorption a pure loss. Resolved: absorbed
attributes are the fuel for attacks. The engine now proves the point the other
way round — a simulated player who never absorbs cannot attack at all, and their
match never resolves.

### The Energy handed over on a voluntary pass

**Status:** `DECIDED` · `energyOnVoluntaryPass: 3`

A fixed amount, not a floor. An overshoot pass still hands over only the
overshoot, even when that is smaller than 3, so pushing the marker past zero
buys tempo — the same dynamic as the Digimon memory model this is drawn from.

### Every symbol is attribute-typed

**Status:** `DECIDED`

Every die face is tied to an attribute, with one exception. The face itself may
or may not carry an effect, but **cards and attacks only ever specify
attributes**.

`SymbolType` is `Attribute | "shield"`, while `SymbolRequirement` is keyed by
`Attribute` alone — so a cost that named Shield would not compile, rather than
merely being discouraged.

Bible §17's Fire / Nature / Star examples are legacy naming and carry no
mechanical weight.

### A creature may absorb more than one symbol per turn

**Status:** `DECIDED` · already the implemented behaviour

No limit. This matches bible §7, which states no restriction, and the physical
metaphor of several dice resting on one creature.

### Composition of the starting dice

**Status:** `DECIDED` · implemented as `STARTING_DIE_SYMBOLS`

Both dice of both players start identical, with six faces:

| Count | Face |
|---|---|
| 1 | Martial, no effect |
| 1 | Wild, no effect |
| 1 | Arcane, no effect |
| 1 | Luminar, no effect |
| 2 | Shield |

This replaces the round-robin layout derived from the player's squad, which was
a prototype assumption. Nothing about the opening dice varies any more, which
fits bible §35's "both players start with relatively simple engines" and leaves
forging as the only source of divergence.

The four attributes here are the ones a player can reach without forging. The
prototype squad's costs are written across all four so that no face is dead.

### Attribute naming

**Status:** `DECIDED`

The bible's §26 names stand: Martial, Wild, Toxin, Arcane, Luminar, Mechanical,
Corruption, Darkness. "Savage", "Arcana" and "Luminary" were casual phrasing for
Wild, Arcane and Luminar, not renames.

### What a Shield face is

**Status:** `DECIDED` · implemented

- **Not an attribute.** Shield is the one untyped face. It is the single
  exception to *Every symbol is attribute-typed* above.
- **One shield prevents 1 damage, once.** It is spent doing so.
- **Shields stack and persist across turns** until something spends them.
- **Costs can never require it**, which is enforced by the type of
  `SymbolRequirement` rather than by convention.

A consequence worth naming: an unabsorbed Shield is simply wasted, because no
engine ability or card can spend one. That is deliberate — it means Shield never
competes with the engine for the same symbol, and the absorb-or-resolve decision
stays about attributes.

Absorbed Shields grant immediately on absorb. Absorbed attributes still pay out
at end of turn (so a creature cannot attack on the turn it was fuelled). The
old "single timing" delay for shields only made the pool look empty while the
creature's shield count stayed at zero.

### Discard from hand is a player choice

**Status:** `DECIDED` · implemented (2026-08-11)

Effects that say "draw N and discard N" draw first, then open a
`discard-cards` pending decision. The player names which hand cards to discard.
Auto-discarding the front of the hand is gone — it silently ate the card just
drawn when the hand was otherwise empty (Eclipse).

Bulwark, the Warden's engine ability, also grants shields, so the engine has a
route to defence that does not go through absorption.

### Only "retain" exists; "store" is dropped

**Status:** `DECIDED` · implemented

Bible §21 describes both storing a symbol and retaining a die and says the
terminology should be standardized. It is: only **retain a die** survives.

Consequences, all applied:

- the `stored` symbol status is gone, and with it the rule that a stored symbol
  can pay a cost in place of a dice symbol;
- the `store-symbol` effect is gone;
- Rune Binder's "Channel" ability was replaced by "Rune Echo", which converts
  arcane into a martial symbol in the pool rather than banking one;
- unabsorbed symbols expire at end of turn with no exceptions;
- retaining a die is the only way to carry a result forward.

What a player wants to keep has to be absorbed onto a creature, where it lives
as a token or a shield rather than as a symbol.

A player declares retain (or releases it) with `RETAIN_DIE`; see the resolved
entry below.

### Retaining a die

**Status:** `DECIDED` · implemented

A player may choose, per die they own, whether that die is retained. A retained
die keeps its showing face for **one** subsequent roll instead of rerolling, and
still generates that symbol. After that kept roll, retention clears
automatically — it does not persist turn after turn. The owner may also release
it early with `RETAIN_DIE`. Any number of owned dice may be retained.
`RETAIN_DIE` is legal in any phase (including roll, so a player can release
before rolling). Setting retain requires a known `rolledSlotIndex`; stunned
dice cannot be retained.

### Attributes reachable only by forging

**Status:** `DECIDED`

The starting dice carry Martial, Wild, Arcane, Luminar and Shield. Toxin,
Mechanical, Corruption and Darkness are reached only by forging. That split is
intentional, not a content gap.

### What can cost Energy

**Status:** `DECIDED` · implemented for tactic cards

Playing tactic cards costs Energy, and that is the overall limit on what a
player can do in a turn. Engine abilities and attacks cost symbols and absorbed
attributes respectively, not Energy. Both `PLAY_CARD` and `FORGE_CARD` pay the
printed header cost.

### Equipment and opponent forging

**Status:** `DECIDED` · implemented for the subset below

- Equipment attaches to a creature and stays in the `equipment` zone until
  destroyed or the host dies.
- Friendly equipment (War Axe) may only target your own creatures.
- Opponent equipment (Black Plague) may only target theirs.
- `attack-damage-bonus` abilities add to damage on attack (War Axe).
- `destroy-equipment` removes one piece of gear from a creature (Calculated
  Sacrifice).
- Forging may name an opposing die when the card's forge region says so
  (Black Plague).

Still out: the rest of the equipment catalogue (cost reduction, position
triggers, …). Roll-triggered gear (Black Plague) and on-damage / on-absorb
hooks landed in `010-trigger-hooks`.

### Forging draws a card

**Status:** `DECIDED` · implemented

Whenever a player forges a die face — on their own die or an opponent's — they
draw one card per face installed. This is a forge rule, not a card effect: empty
deck still stops quietly.

### No mulligan

**Status:** `DECIDED`

There is no mulligan. The opening hand of five is the hand you play.

---

## Resolved — design discussion, 2026-08-07 (fourth round, subtypes)

### Overloads attach to face cards

**Status:** `DECIDED` · implemented

Dice, face cards, and overloads are decoupled:

| Layer | Role |
|---|---|
| **Die face (slot)** | Physical face on one die; references a `faceCardId` |
| **Face card** | Shared definition; many die faces may point at the same card (1:N) |
| **Overload** | Attaches to the **face card** (`attachedToFaceCardId`), not a slot |

Capacity (`maxOverloads`) is per face card. When the last installed copy of that
face returns to the pool, its overloads detach to the graveyard.

**Trigger timing (not the engine phase):** Overload `onRoll` effects fire in
`ROLL_DICE` as soon as a die shows that face card — once per such die during
that roll action. Which physical die or slot does not matter; only the shared
`faceCardId` does. They do **not** wait for engine resolution, and they do
**not** care whether the generated symbol is later absorbed or left for the
engine pool.

**Repeats:** A later re-roll fires again for each die that shows that face card.
Two dice showing the same overloaded Luminar with one Prism ⇒ two applications.
Retention that keeps a showing face also re-fires on that roll step.

### Rituals live on the engine field with an orientation

**Status:** `DECIDED` · implemented for place / prepare / activate

A Ritual is played onto the engine area, not resolved from hand like an Instant:

| Orientation | Visual | Meaning |
|---|---|---|
| `preparing` | tapped | Waiting for its `[Active when: …]` condition |
| `ready` | untapped | Condition met; may be activated |
| `exhausted` | diagonal | Used this turn (once-per-turn rituals) |

At the start of your turn, exhausted rituals return to ready if still active,
and preparing ones flip to ready once their condition is met. Instant-duration
rituals leave for the graveyard after one activation.

### Reactions use a Yu-Gi-Oh style chain

**Status:** `DECIDED` · 2026-08-12 · spec `docs/specs/008-reaction-chain.md`
· implementation tracked in `docs/DEFERRED_CATALOGUE.md` until wired
· corrected same day: equip / overload / attack / ritual place open windows

Reaction timing is a Yu-Gi-Oh–style chain: links stack and resolve last-in,
first-out. The existing `resolutionStack` is the seed. Concrete rules:

**Priority**

- The turn player has priority to start a chain (play a card that opens one).
- After a link is added (costs paid, effect not yet conducted), priority passes
  to the opposing seat.
- Seats alternate. If the opposing seat passes, the seat that still has
  something to add may activate another reaction / ritual-reaction as the next
  link (multiple cards in one chain when the opponent keeps passing).
- The chain resolves only after **both** seats have explicitly
  `PASS_PRIORITY` in succession (no implicit timeout).

**What opens a window**

After costs are paid and **before** the effect / attach / attack body runs, a
reaction window opens for:

- Playing a tactic for its effect (instant / reaction from hand);
- Placing a ritual onto the engine field;
- Activating a ready ritual (including ritual-reactions);
- Attaching equipment;
- Overloading a face;
- Declaring an attack.

**Only forge is silent:** `FORGE_CARD` does **not** open a reaction window.

**Who may respond**

- Hand cards with the `reaction` subtype, and
- Ready ritual-reactions on the engine field (e.g. Runic Nullification).

Legal response **kind** depends on the top link:

- **Negate** — only if the top link is a tactic-card link (effect play, ritual
  place/activate, equip attach, overload attach). Not legal against an attack
  link.
- **Prevent** — the response path against attack / damage (see “Damage
  prevention” below; vocabulary in `009`).

**Negation**

- Negate targets the **top** chain link only, and only when that link is a
  negatable tactic-card link (not an attack).
- Runic Nullification: header cost paid on place; activation pays an **extra
  3 Energy**, then negates the top tactic link.

**Once an effect is conducting**

- After both seats pass and a link begins resolving, that link’s body runs to
  completion and cannot be interrupted mid-flight.
- No reaction window while `pendingDecision` is search / discard /
  choose-creature (those are part of conducting the effect).

### Damage prevention

**Status:** `DECIDED` · 2026-08-12 · full card wiring in
`docs/specs/009-true-prevent.md`

- **Vocabulary (both):** (1) “prevent next N damage” **buffers**, and
  (2) prevent **N attacks** (whole attack instances). Concrete cards pick one.
- **Apply order when damage lands:** prevention → Shield → HP (Life).
- **Expiry of unused prevent:** **none for now** (buffers / attack-prevents
  persist until consumed). Expiry must live in `GameRulesConfig` (or equivalent
  data) so a later design can add end-of-turn / end-of-chain cleanup without a
  reducer rewrite.
- **Prismatic Barrier** (“Prevent 2 damage”) — **DECIDED** 2026-08-12:
  create a **prevent-next-2-damage buffer** on the **ally targeted by the
  attack** being responded to (prevent reaction; not a free retarget). Migrates
  off the `grant-shield ×2` approximation in `009`.

Attack chain links open a reaction window so prevent reactions can respond;
negate effects refuse attack links.

**Reaction Energy (DECIDED · 2026-08-12):** The Energy track is an opposing
+/- between the two seats (holder + value on their side). Paying a cost while
you **hold** the marker moves it toward the opponent (normal spend / overshoot).
Paying a cost during a reaction-priority window while you **do not** hold the
marker moves it the other way: the cost is applied as **Energy added to the
current holder** (capped at `trackMax`). If a prior overshoot already flipped
the marker to the reactor, their reaction pay is a normal holder spend (still
toward their opponent — restoring the turn player).

**Turn end vs chain (DECIDED · 2026-08-12):** An overshoot may flip the marker
when a link’s cost is paid, but **turn end is evaluated only after the entire
chain (and nested search/discard/choose) finishes**. If a later reaction has
moved the marker back to the turn player, the turn continues. Example: A holds
2, plays a 3-cost tactic (marker flips to B); B pays a 3-cost negate (marker
returns to A); after Pass×2 the chain resolves and A’s turn does **not** end.

### Toxin counters

**Status:** `DECIDED` · implemented

Toxin counters are tokens on a creature. At the start of that creature's
owner's turn, the creature takes 1 damage per Toxin counter it holds. Counters
persist until something removes them; nothing removes them yet.

---

## Resolved — design discussion, 2026-08-07 (third round, card layer)

## Play and forge share the actions phase

**Status:** `DECIDED` · implemented (2026-08-11)

Playing a card and forging a face happen in the same `actions` phase. The
separate forge phase was removed so hotseat play is not split across two
windows for one decision. `FORGE_CARD` names the face card from the owner's
face pool (or an installed copy) explicitly.

### Face deck and tactics deck are separate

**Status:** `DECIDED` · implemented

Bible §12's face deck is restored. Players bring:

- a **tactics deck** (two-region cards; size and copies below), and
- a **face deck** (up to 12 face cards, at most 3 per attribute).

Starting natural faces on the opening dice sit outside the face-deck limit.
Forging installs from the in-match face pool (or copies an already-installed
matching face). This reverses the earlier "one deck" reading of §19–20: tactics
still carry a forge region, but the face that region installs must come from
the face deck.

### Tactics deck size and copies

**Status:** `DECIDED` · implemented (M4)

| Rule | Value |
|---|---|
| Minimum size | 50 |
| Maximum size | 60 |
| Max copies of the same card id | 4 |

There is no tactics per-attribute cap. (Earlier prototype used 12 cards /
3-per-attribute; superseded.)

### One deck, and every card carries both regions

**Status:** `SUPERSEDED` by "Face deck and tactics deck are separate" (2026-08-10)

~~There is a single deck, not a face deck and a tactics deck.~~ Tactics cards
still carry both regions; the face they forge is drawn from the face deck.

### Opening hand and draw rate

**Status:** `DECIDED` · implemented (`openingHandSize: 5`, `cardsDrawnPerTurn: 1`)

Open with 5 cards; draw 1 at the start of each of your own turns.

### Running out of cards

**Status:** `DECIDED`

Nothing happens. A player with an empty deck simply stops drawing. The match is
still decided by eliminating creatures, so there is no deck-out loss and no
reshuffle.

Worth watching: matches currently run around eighteen turns, so a twelve-card
deck drawn at one a turn empties well before a winner emerges. That makes the
back half of a match play out on board state alone, which is a legitimate shape
but a deliberate one.

### Stun

**Status:** `DEFERRED`

Not to be designed or built on for now. `DieState.stunMarkers` and the roll
rule that honours it stay in place — they are implemented and tested — but no
effect will apply stun, and no removal timing will be invented.

---

## Open questions

### Special face inherent-effect text

**Status:** `DECIDED` for the six printed specials (2026-08-10) · partial engine support

English printings are in `docs/specs/004-face-cards.md` and `src/game/content/faces.ts`.
Crush and Rending Claw resolve on roll. Arcane Echo (copy), Blade Rain (split
damage), Forbidden Heritage, and Pestilent Plague remain print-only until their
clauses have modelled effects. Great Spark / Rekindle still lack printings.
Tracked in `docs/DEFERRED_CATALOGUE.md` for end-of-loop revisit.

### Whether a creature's fuel is capped

**Status:** `OPEN` — not blocking

**Why it matters.** Tokens persist and are only spent by attacks that name a
discard, so a creature that survives long enough accumulates without limit. In
simulated matches this stays modest, but nothing stops it.

**The question.** Is there a cap per creature, or per attribute? Does anything
strip tokens? Bible §20's equipment example — "discard 1 Fire from the target" —
implies effects can, but none exist yet.

**Decision.** TBD.

---

### First-player advantage

**Status:** `OPEN` — an observation, not yet a question anyone has to answer

Across sixty simulated matches under a greedy identical-policy driver, the
player who moves first wins about 65% of the time. Both squads and both sets of
dice are identical, so this is turn order alone.

Recorded here because it is worth watching, not because it needs fixing now.
Worth re-measuring now that the card layer and forging are in.

---

### Deferred until the layers that need them

Not yet load-bearing; recorded so they are not forgotten.

| Question | Bible | Needed by |
|---|---|---|
| Whether forging a card costs its Energy cost, or only playing it does | §19, §20 | Forging |
| The keyword for the forging action | — | Card layer |
| Overload cards allowed per face | §37 | Forging |
| Secondary victory conditions and ties | §4, §37 | Content |
| Stun application and removal timing | §22 | Reopening stun |

Reaction timing windows (bible §37) are **DECIDED** above
(“Reactions use a Yu-Gi-Oh style chain”, 2026-08-12).
