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
- the overshoot is mirrored onto the incoming player's side immediately
  (capped at the track size); when that overshoot actually ends the turn,
  the incoming player also receives `energyOnOvershootBonus` (+2), still
  capped at `trackMax`;
- the starting player opens the match with 3 (not the clean-pass amount).

### Printed Energy 1 is exceptional

**Status:** `DECIDED` · 2026-08-20 · bible §34.5 · `author-content` / card-designer

Do not author `energyCost: 1` as the default cheap band. 1-cost cards must be
narrow and niche so 2+ cards stay appealing. The primary way to play a card for
1 Energy is **cost reduction** (next-forge, standing discounts, on-roll
reduction) applied to a higher printed cost. Existing 1-costs (Camshaft,
Governor, Ritual of Contamination, blessing overloads, …) are not a license to
add more generic 1-drops. Ritual of Contamination remains a documented install
exception: the real tax is stay/peel, not the header.

### Variable (`?`) tactic Energy costs

**Status:** `DECIDED` · 2026-08-12 · `CardDefinition.variableEnergy` + `energyPaid` on
`PLAY_CARD` / `FORGE_CARD`

Figma header `?` is not "uncosted". It means **pay at least 1 Energy, and as
much more as you want**. Engine support: `energyCost` minimum +
`variableEnergy: true`, with declared `energyPaid` an integer ≥ that minimum.

**TEMP authoring (2026-08-13):** catalogue cards that print `?` currently use
fixed integer `energyCost` (no `variableEnergy`) until spend UX / scaling
effects are ready — see comment in `src/game/content/cards.ts`. Do not use that
gap as a reason to print Energy 1; on-roll support still prefers 2+ with
discounts as the 1-Energy path (see “Printed Energy 1 is exceptional”).

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
resolve → symbol stays in the pool       → feeds card `[Requires: …]` spends
                                           (including engine damage)
```

Creatures therefore have two distinct cost surfaces, and both already exist in
the model:

| Surface | Paid from | Bible |
|---|---|---|
| Engine ability | unabsorbed symbols in the shared pool | §17 |
| Attack | attributes absorbed onto that creature | §7, §31 |

An attack names two costs. `requires` is **checked and not spent**; `discards`
is the part an attack actually burns, normally a subset of what it requires.
Most Aggro Slow-game-test attacks (Varcolac, Garuda, and War Minotaur's special)
set `discards` to one primary-attribute token so a fuelled creature cannot spam
forever without re-absorbing. War Minotaur's basic Heavy Axe instead requires
Martial 2 and omits `discards` (higher gate, reusable fuel). Control-squad
attacks still omit `discards` and therefore keep absorbed tokens after attacking.

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

**Status:** `DECIDED` · 2026-08-14 · `energyOnVoluntaryPass: 5`,
`energyOnOvershootBonus: 2`, `startingEnergy: 3`

Three distinct amounts:

| When | Incoming Energy |
|---|---|
| First player's first turn | `startingEnergy` (3) |
| Clean `END_TURN` (marker never crossed this turn) | `energyOnVoluntaryPass` (5) |
| Turn ends because the marker crossed zero | overshoot + `energyOnOvershootBonus` (e.g. spend 3 with 1 → overshoot 2 → incoming 4) |

The +2 is applied when the turn **actually passes**, not at the moment of
spend, so a reaction can still restore the marker before the bonus lands
(see “Turn end vs chain” below). The clean-pass 5 is not a floor on
overshoot: a 1-point overshoot still hands over 3, which is less than a
clean pass.

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

**Status:** `SUPERSEDED` · 2026-08-19 · see **Constructed opening dice**

~~Both dice of both players start identical (`STARTING_DIE_SYMBOLS`).~~ Opening
layouts are per-loadout. The old six-symbol line (Martial, Wild, Arcane,
Luminar, Shield, Shield) remains `DEFAULT_BASIC_LAYOUT` / `legacyStartingLayout()`
for engine tests only — live matches must pass `startingDice`.

### Attribute naming

**Status:** `DECIDED`

The bible's §26 names stand: Martial, Wild, Toxin, Arcane, Luminar, Mechanical,
Corruption, Darkness. "Savage", "Arcana" and "Luminary" were casual phrasing for
Wild, Arcane and Luminar, not renames.

### What a Shield face is

**Status:** `DECIDED` · implemented

- **Not an attribute.** Shield is the one untyped face (`FaceKind: "untyped"`).
  It is the single exception to *Every symbol is attribute-typed* above, and it
  is **not** a Natural face. `On absorb Natural` (Void Summoner) does not fire
  when a Shield is absorbed.
- **One shield prevents 1 damage, once.** It is spent doing so.
- **Shields stack and persist across turns** until something spends them.
- **Costs can never require it**, which is enforced by the type of
  `SymbolRequirement` rather than by convention.

A consequence worth naming: an unabsorbed Shield is simply wasted, because no
card can spend one. That is deliberate — it means Shield never
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

War Minotaur's printed combat kit and absorb choices cover pressure without a
separate pool-spend ability.

### Only "retain" exists; "store" is dropped

**Status:** `DECIDED` · implemented

Bible §21 describes both storing a symbol and retaining a die and says the
terminology should be standardized. It is: only **retain a die** survives.

Consequences, all applied:

- the `stored` symbol status is gone, and with it the rule that a stored symbol
  can pay a cost in place of a dice symbol;
- the `store-symbol` effect is gone;
- early vertical-slice "Channel" / "Rune Echo" demo abilities on the removed
  Rune Binder were retired with that creature; symbol conversion now lives on
  printed faces / tactics and Varcolac's Hunt Call slice hook;
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

**Status:** `SUPERSEDED` · 2026-08-19 · see **Constructed opening dice**

~~Toxin / Mechanical / Corruption / Darkness are reached only by forging.~~
Those attributes may appear on **opening** dice when the loadout installs a
legal named special there (paid from the face deck; XOR ledger). Naturals of
synthetic-only attributes still do not exist. Forging remains the mid-game
install path from the leftover pool (or copy, bible §13).

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
- `attack-damage-bonus` abilities add to damage on attack (War Axe; War Banner
  uses `bearerRelation: "left-ally"`).
- `energy-cost-discount` / `ignore-shield` standing abilities (Archmage, Tome,
  War Minotaur) — spec `012`.
- `destroy-equipment` removes one piece of gear from a creature (Calculated
  Sacrifice).
- Forging may name an opposing die when the card's forge region says so
  (Black Plague).

Roll-triggered gear (Black Plague) and on-damage / on-absorb / on-change-position
hooks landed in `010-trigger-hooks`. Twin Blades push print rewritten (remove Shield).

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

**Trigger timing (not a dedicated engine phase):** Overload `onRoll` effects fire in
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
· corrected 2026-08-16: Active-when symbols persist unless an effect discards them
· corrected 2026-08-20: Active-when may receive multiple pips of the same attribute in one turn (same as creature absorb)

A Ritual is played onto the engine area, not resolved from hand like an Instant:

| Orientation | Visual | Meaning |
|---|---|---|
| `preparing` | tapped | Waiting for Active-when symbols absorbed onto it |
| `ready` | untapped | Condition met; standing abilities on; may activate if print has an activate body |
| `exhausted` | diagonal | Used this turn (once-per-turn rituals) |

Rituals are placed empty. During actions the owner may assign unabsorbed
attribute symbols to a ritual (same window as creature absorb), including
multiple pips of the same attribute in one turn, until the printed
`Attr + Attr` gate is filled. Over-filling a requirement is illegal.
Symbols spent this way are consumed and never reach the engine pool. Rituals
with no `[Active when: …]` become ready as soon as they hit the field.

At the start of your turn, exhausted rituals come off diagonal. Banked
Active-when symbols stay on the card unless an effect explicitly discards or
consumes them; if the gate is still met the ritual returns to ready, otherwise
it returns to preparing. Preparing ones flip to ready once their banked
progress meets the gate. Instant and reaction rituals leave for the graveyard
after one activation; only `continuous` rituals stay and exhaust. Standing
triggers fire while ready and do not spend those symbols.

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
persist until something removes them. Adaptive Toxin’s “remove any number → damage” absorb and toxin receive cap are
wired in spec `013`.

---

## Resolved — design discussion, 2026-08-07 (third round, card layer)

## Play and forge share the actions phase

**Status:** `DECIDED` · implemented (2026-08-11)

Playing a card and forging a face happen in the same `actions` phase. The
separate forge phase was removed so hotseat play is not split across two
windows for one decision. `FORGE_CARD` names the face card from the owner's
face pool (or an installed copy) explicitly.

## Two phases: Roll and Actions (no dedicated absorb)

**Status:** `DECIDED` · playtest 2026-08-17 · user-directed
· bible §16 still lists an Absorption step — this overrides that sequence
· implemented in `src/game/model/state.ts`, `src/game/rules/symbols.ts`,
  `src/game/reducer/reduce.ts`

The game is better with **only two phases: Roll and Actions**. Absorption is
not a dedicated engine phase. The `actions` window includes everything
absorption used to allow (creature absorb, ritual absorb, ready-ritual
activate, Instinct optional bonus basic) and keeps every action already legal
in `actions` (attack, play, forge, end turn). No new player actions; none
removed.

- `TURN_PHASE_ORDER`: `roll` → `actions`. `END_TURN` stays an action, not a phase.
- `ROLL_DICE` enters `actions` (not absorption).
- `ADVANCE_PHASE` from roll → actions. There is no skip-over-absorption.
  The last phase is left only via `END_TURN`.
- Absorb (creature + ritual) is legal **throughout actions**, including on
  symbols created mid-turn (effects, extra rolls).
- `[Requires]` spends see the same unabsorbed pool. Absorb vs spend is bible
  §7: absorbed symbols leave the engine pool; spending them for Requires
  consumes them so they cannot be absorbed.
- The old “close absorption → flip remaining `rolled` to `available`, absorb
  now illegal” path is gone. Attribute tokens still pay out at **END_TURN**,
  not at an absorb-close.
- Ready rituals may activate during actions (not during roll). Absorb-to-ritual
  is also available in actions.
- Instinct’s optional bonus basic is legal in this combined window (same
  `optional-bonus-attack` pending).

**ASSUMED:** `rolled` vs `available` remain distinct statuses as provenance
(die pip vs effect-generated). They are **not** a phase gate. Both are the
same unabsorbed set for absorb and spend (`usableSymbols` / `planConsumption`).

### Face deck and tactics deck are separate

**Status:** `DECIDED` · implemented · opening layouts 2026-08-19

Bible §12's face deck is restored. Players bring:

- a **tactics deck** (two-region cards; size and copies below),
- a **face deck** (up to 12 face cards, at most 3 per attribute), and
- **starting dice** (two d6 layouts of face ids).

Basics (dual-kind naturals + Shield) on opening slots do **not** consume the
face deck and do not count toward the 12. Named specials on opening slots
**must** be ids in `faceDeck` and start **installed** (not in `facePool`).
Leftover face-deck rows are the mid-game pool. Naturals **may** be listed in
the 12 for density swaps (they then count toward the 12 and the 3-per-attribute
cap). Forging still installs from that pool or copies an already-installed
matching face (bible §13 — copy is kept).

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

### Damage is not reserved for creature attacks

**Status:** `DECIDED` · 2026-08-20 · user-directed
· bible §§3.1, 4, 24–25, 27 (Control), 33, 34.3–34.4, 35

Playtests showed Control lists with no clock: their creature attacks were
retuned to 1 damage plus riders (`003`), while design text told Control to win
by engine + disruption and treated combat as the closer. Disruption without
lethality cannot satisfy §4 (eliminate opposing creatures).

**Decision:** Creature attacks are **one** damage path, not the primary or
required one. Tactics, rituals, faces, equipment, and statuses may deal the
damage that ends the match. Control (and other non-Aggro archetypes) **must**
have a damage plan that does not depend on their creature attacks remaining
strong. Cheap permanent *destruction* stays expensive (§25, §34.3); ordinary
engine damage is progress and a valid closer.

Do not author or critique as if “only creatures deal real damage” or as if
Control’s win condition is stalling until weak attacks add up.

This does **not** retune Control attack numbers in this decision. Weak Control
attacks can stay; the closer moves to the engine.

### Stun

**Status:** `DEFERRED`

Not to be designed or built on for now. `DieState.stunMarkers` and the roll
rule that honours it stay in place — they are implemented and tested — but no
effect will apply stun, and no removal timing will be invented.

---

## Prototype assumptions — deferred vocabulary (2026-08-14)

**Status:** `ASSUMED` · implemented in `src/game` · spec `docs/specs/012-deferred-vocabulary.md`

Bible-silent rules chosen so printed catalogue clauses could ship. Settling one
is a data / spec edit, not a silent reducer rewrite.

| Topic | Assumption coded |
|---|---|
| **Reposition 1 space** | Toggle the creature between `frontline` and `back` via `setCreaturePosition` only. If moving to frontline would exceed `config.frontlineSlots` (2), the controller must **swap** with a living frontline ally (pending choose). Optional (`may`) moves can be declined. Swaps always call `setCreaturePosition` twice. **Push is not reposition.** |
| **Energy discounts** | Apply to `PLAY_CARD` / ritual place / equip / overload, **not** `FORGE_CARD`. “Used” = played for its play region. Min cost 0. |
| **Archmage** | First Arcane **card** (any main type) the controller plays that turn costs 1 Energy less. |
| **Tome of Interdiction** | First Instant Arcane that turn costs 1 less. Stacks with Archmage (Instant Arcane can be −2). Spent keys on the host creature / gear; cleared `END_TURN`. |
| **Paradox GY replay** | Choose 1 Instant or Ritual in the controller’s GY; resolve that card’s play effects (`effect.effects` or `ritual.effects`) immediately; ignore `[Requires: …]` / Active-when; do not pay that card’s Energy; the card **stays in the GY**. Creature-target effects open the usual choose pending. Cards without a playable effect body cannot be chosen. |
| **Ignore N Shield / pierce** | When the attacker deals attack damage: prevent buffers first (`009`), then skip up to N Shield (those shields are **not** spent), then remaining shields, then HP. War Minotaur: `ignore-shield` 1 standing. Rust: arm `ignoreShieldThisTurn` 2, clear `END_TURN`. |
| **Attack follow-ups** | `AttackDefinition.followUpEffects` queues extra `EffectDefinition`s after the damage link. Existing cards omit the field. |
| **Garuda Dive optional swap** | After Dive HP, controller may choose a living frontline creature (self or ally, including Garuda if already frontline = no-op) and swap; they may decline. |
| **Poisoned Charge swap** | If Minotaur is in `back` after declaring, swap with a chosen living frontline ally (required if one exists; skip if none). |
| **War Banner left ally** | Owner’s `creatureIds` order is left-to-right. “Allied creature to the left” = previous **living** creature in that list. Static `attack-damage-bonus` with `bearerRelation: "left-ally"` on that ally’s **basic** attacks. No living left neighbor → no bonus. |
| **Alpha's Hide** | On special attack by the bearer: generate 1 Wild into the **controller’s pool** (not attached to the bearer). |
| **Formation “+1 Defense this turn”** | `grant-damage-prevent` 1 on a chosen allied frontline creature other than the absorber. Bible has no DEF stat. On roll “if this creature is on the frontline”: at roll time faces have no host creature, so the condition is **controller has a living frontline creature**. |
| **Opponent draws** | `draw-cards` with `player: "opponent" \| "controller"` (default controller). Forbidden Heritage On roll: opponent draws 1. |
| **Lose / transfer Energy** | Shared track (holder + value). Lose opponent Energy: decrease opponent-held value without the controller “gaining a spend”. Transfer: same decrease plus the controller becomes/holds the marker toward them. If the opponent does not hold or holds 0 → no-op (no negative Energy). |
| **Retain-from-effect** | Marks a chosen owned die retained (same rules as `RETAIN_DIE`, including a known rolled slot). |
| **Requirement wildcard** | One-shot: a matching pool symbol may pay any `[Requires]` / ritual Active-when attribute this turn (Resonance absorb). Consumed when used. |
| **Pack adjacent** | Another living ally shares a **`creatureIds` neighbor (±1)** among living creatures. At roll, `has-adjacent-ally` is true if any two consecutive entries in the controller’s `creatureIds` are both living. |
| **Instinct On absorb** | Optional immediate basic during the actions window: pending `optional-bonus-attack` for the absorbing creature if `attacksUsedThisCombat === 0`. Player may decline or declare that creature’s basic (fuel/range as normal). Spec `013`. |
| **Aegis redirect** | Until EOT, up to 2 damage that would be dealt to **another** allied creature is dealt to the absorber instead (before prevent/shield on the original). Turn-scoped `redirectDamageThisTurn` on the absorber. |
| **Revelation heal** | Heal 2 on an allied creature with damage **strictly greater than** half life (`damage > life/2`). |
| **Mirrored Rune** | On absorb Arcane: generate 1 extra symbol matching **another** symbol currently in the controller’s available/rolled pool (`copy-pool-symbol`). |
| **Arcane Echo tactic** | Re-run showing face `onRoll` + that face’s overload `onRoll` for a chosen owned die. Does **not** generate the inherent symbol a second time. |
| **Arcane Echo face** | On roll: re-fire the **other** owned die’s showing-face `onRoll` + overload `onRoll` (same as the tactic). Not a full attribute/overlay copy of the other face. |
| **Extermination consume** | Consumed synthetic Corruption slots are replaced with natural Shield (placeholder so the die stays 6 faces). Not a forge — no forge-draw. Damage `2 * consumed` split across up to 2 creatures. |
| **Adrenaline self-damage** | After optional reroll, if the new face is still this overloaded face: 1 damage to each of up to 2 **distinct** living allied creatures (fewer if fewer living). |
| **Pestilent Plague at 2** | Counters **reset** then try to forge another Pestilent Plague onto an adjacent slot of the same die (pool / already-installed copy, existing install rules). Threshold is catalogue `pestilenceSpreadAt` (2). Copy comes from the spreading slot’s `faceCardOwnerId` (the corrupter), not the rolling die owner. If illegal (no slot / cannot-replace / no pool / attribute cap), skip the forge; counters stay at 0. |
| **ACTIVATE_FACE** | Legal in actions on the showing slot. Cost `energyBase + energyPerCorruptionOnDie * (synthetic Corruption faces on that die)`. Removed face returns to its owner’s pool like unforge; slot becomes Shield. Draw-on-forge does not apply. Peel is **not** blocked by stay / forge-lock. |

Push stays unmodelled (DECIDED no). Stun stays `DEFERRED`.

---

## Prototype assumptions — stay-on-slot (2026-08-17)

**Status:** `ASSUMED` · implemented in `src/game` · specs `docs/specs/004-face-cards.md`, `docs/specs/012-deferred-vocabulary.md`

Bible is silent on “cannot be replaced by forging” duration and whose turns count. Stun remains `DEFERRED` — do not approximate stun with stay.

| Topic | Assumption coded |
|---|---|
| **Cannot-replace is data** | `FaceCardDefinition.stayPolicy`. Forbidden Heritage: `{ kind: "cannot-replace-by-forge" }` while the slot shows that face. Not a name check. Blocks `FORGE_CARD`, `forge-faces`, `replace-synthetic-face`, pestilence adjacent spread, and any `installFacesOnDie` overwrite. Unforge / consume / `ACTIVATE_FACE` peel are not this restriction. |
| **“4 turns”** | Die **owner’s** turns (`DieState.ownerId`), not complete rounds. Decrement remaining lock by 1 on each finish of that owner’s turn (voluntary `END_TURN` or spent-to-zero), floor 0. The opponent’s turn does not tick. |
| **Lock lives on the slot** | `DieSlot.forgeLockRemaining`, like `pestilenceCounters`. Copies of the same face on other slots / dice do not share it. |
| **Duration 4 is catalogue** | Pestilent Plague `stayPolicy: { kind: "forge-lock", turns: 4 }`. While remaining > 0 the slot cannot be replaced by forging; at 0, forging over it is legal again. |
| **Reset on new PP install** | Whenever a Pestilent Plague is installed onto a die (player `FORGE_CARD` / `forge-faces` **or** pestilence spread), set remaining lock to 4 on **every** slot of **that same die** that currently shows Pestilent Plague, including the newly installed slot. |
| **Non-PP install** | Installing a different face does not reset PP locks on other slots of that die. |
| **New lock after expiry** | Installing PP onto a slot whose remaining was 0 (or which never had a lock) still starts that slot (and every other PP on the die) at 4. |

---

## Prototype assumptions — Corruption install tempo (2026-08-17)

**Status:** `ASSUMED` · catalogue in `src/game/content/{cards,faces}.ts`

Bible §27 says Corruption effects should be **expensive**. Playtests showed Energy 2 + Requires Arcane+Corruption for **one** opponent-die face was too expensive versus own-die forge instants, and free overwrite made contamination a stall rather than a tempo steal.

Assumption: **install is affordable; stay and peel are the expense.** Stick comes from stay-on-slot (Forbidden Heritage never-replace; Pestilent Plague 4 die-owner-turn forge-lock that resets on new Plague) plus `ACTIVATE_FACE` peel `2 + Corruption faces on that die`. Stain / Infection remain marker harassment that does not occupy a slot (the cheap dodge of a face install).

| Card | Old | Tempo retune |
|---|---|---|
| Ritual of Contamination | Energy 2, Requires Arcane+Corruption, 1 opponent-die face | Energy **1**, Requires **Corruption** (cheaper Instant; still not an ungated copy of own-die forge instants) |
| Great Contamination | Energy 5, Active when Arcane+Corruption+Corruption, 3 faces | Energy 3, Active when Arcane+Corruption, still 3 faces |
| Black Plague | Energy 4, forge opponent-die **or** equip | Energy 2 |
| Persistent Infection | Energy 4, own-die overload | Energy 2 |
| Latent Corruption | Energy 4, Arcane-face overload | Energy **2** (On-roll refund/engine band) |
| Extermination | Energy 6, consume Corruption → damage | Unchanged (late conversion, not an install) |

---

## Prototype assumptions — face markers (2026-08-14)

**Status:** `ASSUMED` · implemented in `src/game` · spec `docs/specs/013-face-markers.md`

| Topic | Assumption coded |
|---|---|
| **Corruption markers** | Per **physical die slot** (`DieSlot.corruptionMarkers`), not per face-card definition. Copies of the same face on different slots do not share markers. “Corrupted face” = slot with ≥1 marker. |
| **Suppress inherent** | Skip face `onRoll` only (overloads still fire). Flags on all slots of a rolled die clear on that `ROLL_DICE`; showing slot’s suppress skips its inherent. |
| **Resource lock** | Slot flag this turn; if showing, matching rolled/available symbols get `usable: false`. Cannot pay Requires / Active-when / absorb. |
| **Decay unusable symbol** | Strip face → Shield (like `ACTIVATE_FACE`); create Corruption in **Decay controller’s** pool with `usable: false` (not the face owner’s). |
| **Toxin receive cap** | At most `amount` markers **gained** while the cap remains (remaining counter), until that creature’s owner’s next turn starts. |
| **Catalyst absorb copy** | Re-queue `onRoll` of a synthetic face that showed during this controller’s last `ROLL_DICE` (`facesAppearedThisRoll`). Not overloads. |
| **Overcharge double** | Next pending effect with `sourceDieId !== null` is applied twice; flag clears. |
| **Instinct absorb** | Optional actions-window basic via `optional-bonus-attack` (see row above). |

---

## Open questions

### Special face inherent-effect text

**Status:** `DECIDED` for the six printed specials (2026-08-10) · engine support in `011`

English printings are in `docs/specs/004-face-cards.md` and `src/game/content/faces.ts`.
Crush, Rending Claw, Arcane Echo (re-fire other die onRoll), Blade Rain, Forbidden
Heritage, and Pestilent Plague are wired. Great Spark / Rekindle still lack
printings. Face-marker systems (Stain, Decay, Catalyst, Overcharge, Adaptive Toxin,
Infection roll, Instinct absorb) are wired in `013-face-markers.md`.

### Whether a creature's fuel is capped

**Status:** `OPEN` — not blocking (cap still undecided)

**Why it matters.** Tokens persist and are spent by attacks that name a
discard, and by strip effects (`discard-attribute-tokens`, spec `011`). A
creature that survives long enough can still accumulate without a hard cap.

**The question.** Is there a cap per creature, or per attribute?

**DECIDED (playtest, 2026-08-14).** Effects may strip tokens. Siphon Sigil
proves `discard-attribute-tokens`: strip in `ATTRIBUTES` array order without a
player attribute pick; fewer tokens than `amount` discards all remaining
(whiff-legal at zero). Bible §20 / §25.

**ASSUMED (label for the strip path).** Attribute order is fixed engine order
(`martial` → … → `darkness`); controller does not choose which attributes.
Token **cap** remains OPEN.

**Decision (cap).** TBD.

---

### Optional ally swap / reposition without a decline action

**Status:** `ASSUMED` · 2026-08-14 · `swap-positions` / `reposition-creature`

Print often says “you may swap/reposition”. The engine has no cancel /
decline action for creature choices today.

**ASSUMED:** when at least one legal ally (or self) move exists, open
`choose-creature` and the controller must name a legal target; when none
exist, the effect whiffs. Do not invent `creatureId: null` decline unless
design reopens optional choices.

Garuda Dive swap is queued as attack `followUpEffects` (after the damage
effect resolves on the chain). Print may still say “On deal damage”; if
Shields reduce damage to 0 the follow-up still runs under this assumption.

**Banned forever:** any effect that moves an **enemy** creature (push).

---

## Resolved — constructed opening dice, 2026-08-19

### Constructed opening dice

**Status:** `DECIDED` · `LoadoutInput.startingDice` · leftover `facePool`

Engine identity is a deckbuilding choice. Each loadout names two d6 layouts
(`startingDice`) plus a face deck. At `createMatch`:

- Dice are built from that seat’s `startingDice` (never a global identical
  `STARTING_DIE_SYMBOLS` fill for live matches).
- `facePool` = `faceDeck` minus each **non-basic** id installed on **that**
  player’s opening dice (multiset / unique-id ledger). Opponent dice never
  steal the pool at setup.
- Basics (Natural Martial / Wild / Arcane / Luminar, and untyped Shield) may
  occupy opening slots without being listed in `faceDeck`.
- A named special on an opening slot must be an id in `faceDeck` and starts
  installed (XOR: not also pooled unless the list contains another copy of
  that id). No extra copies-per-face-id rule.
- Copy-already-installed (bible §13) is **kept**, including copying an
  opening synthetic.
- If an opening face were legal and had `stayPolicy`, apply slot flags as if
  just installed (forge-lock remaining = catalogue turns). Forbidden Heritage
  and Pestilent Plague are refused on `startingDice` (legal in the face deck
  for mid-game); tests install them with `FORGE_CARD`.

Caps (bible silent on constructed layouts) live on `GameRulesConfig`:

| Knob | Default | Status |
|---|---|---|
| `startingMinShieldsPerDie` | 1 | `ASSUMED` |
| `startingMaxSyntheticsPerPlayer` | 2 | `ASSUMED` |
| `startingMaxSyntheticsPerDie` | 2 | `ASSUMED` |
| `startingMaxOnRollFacesPerDie` | 2 | `ASSUMED` (non-empty `onRoll`) |
| `maxFacesOfSameAttributePerDie` | 4 | `DEFINED` §9.1 |

`validateLoadout` / `validateStartingDice` return reasons. `createMatch` does
not throw from a layout helper; it uses the same loadout check as tactics
(and still throws if that check fails, as with an illegal squad).

**OPEN (default refuse, implemented):** Arcane Echo on an opening slot
(`forgeRestriction: "echo-cards"`). Echo may sit in `faceDeck` for mid-game.
Forbidden Heritage / Pestilent Plague on `startingDice` (`stayPolicy`). Pool
OK.

**OPEN (keep §13):** copy from an opening synthetic. Soften via synth caps,
not by deleting copy.

---

### First-player advantage

**Status:** `OPEN` — an observation, not yet a question anyone has to answer

Across sixty simulated matches under a greedy identical-policy driver, the
player who moves first wins about 65% of the time. That sample used identical
squads and identical dice; constructed opening dice (2026-08-19) change the
second half. This task does **not** retune first-player win rate.

Recorded here because it is worth watching, not because it needs fixing now.

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
