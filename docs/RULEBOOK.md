# Dice Skirmish — living rulebook

How the game **plays today**. Open this in the app under **Rules**.

<!--
Agents: this file is the player-facing how-it-plays. Update it in the same
change as any rules edit that changes play (`.cursor/rules/rulebook.mdc`).
It is not the design bible and not a card catalogue. Individual cards stay
in specs 002 / 003 / 004. Unsettled questions stay in OPEN_DESIGN.md.
Unmodelled print stays in DEFERRED_CATALOGUE.md. Numeric knobs live in
src/game/model/config.ts (DEFAULT_RULES_CONFIG).
-->

---

## 1. Object of the game

Two players. You win by **eliminating the opponent’s three creatures**
(Life reduced to 0). There is no deck-out loss, no reshuffle, and no
secondary victory condition.

Creature attacks are **one** damage path. Tactics, rituals, faces, equipment,
and statuses may also deal the damage that ends the match.

---

## 2. What you bring

Each player’s loadout is:

| Piece | Rule |
|---|---|
| Squad | Exactly **3** creatures |
| Tactics deck | **50–60** cards, **≤4** copies of the same card id |
| Face deck | **≤12** face cards, **≤3** sharing one attribute |
| Opening dice | Two d6 layouts (`startingDice`) |

Tactics cards always have both a **play** region and a **forge** region. On
each use you pick one: play **or** forge, never both.

**Opening dice**

- Basics (Natural Martial / Wild / Arcane / Luminar, and untyped Shield) may
  sit on opening slots **without** consuming the face deck.
- A named special on an opening slot **must** be in the face deck and starts
  **installed** (not also in the leftover pool unless the list has another
  copy of that id).
- Leftover face-deck rows are the mid-game forge pool.
- Copying an already-installed matching face (including an opening special)
  remains legal.

Opening-layout caps (prototype knobs, `ASSUMED` unless noted):

| Knob | Default |
|---|---|
| Same attribute on one die | **4** (`DEFINED`) |
| Min Shield faces per die | **1** |
| Named synthetics per player / per die | **2** / **2** |
| Faces with a non-empty On roll per die | **2** |

Forbidden Heritage, Pestilent Plague, and Arcane Echo are refused on
`startingDice` (they may still sit in the face deck for mid-game).

There is **no mulligan**. The opening hand of **5** is the hand you play.

---

## 3. The table

Each player has:

- **Frontline** (2 slots) and **Back** (the third creature). Frontline
  protects the back: a non-Range attack may hit a back-row creature only if
  that player has **no living frontline**. Range ignores this.
- **Engine area** for rituals.
- **Two dice**, each with six faces that reference face cards.
- Hand, tactics deck (top-first), graveyard, equipment, overloads.

Squad order (`creatureIds`) is left-to-right on the battlefield.

---

## 4. Match start

- First player in `playerOrder` takes turn 1, phase **roll**, with **3**
  Energy.
- Opening hand is 5. The first player does **not** draw extra before acting.
  You draw **2** when **your** turn begins after an opponent’s turn ends.
- Dice are built from that seat’s `startingDice`. Each seat’s leftover face
  pool is independent.

---

## 5. Turn structure

Two phases: **Roll → Actions**. End Turn is an **action**, not a phase.

1. **Roll.** Roll your non-retained dice. Retained dice keep their showing
   face and still generate that symbol. On-roll face / overload effects fire
   as part of the roll. Then the turn enters **actions**.
2. **Actions.** In any order you may: absorb (creature or ritual), spend
   unabsorbed symbols for `[Requires]`, attack, play, forge, activate a
   **ready** ritual, retain/release dice, or end the turn.

There is no dedicated absorb phase and no leftover-rolled flip. `rolled` (die
pip) and `available` (effect-generated) are provenance only; both are the
same unabsorbed pool for absorb and spend.

Ready rituals may activate during **actions**, not during roll.

If a `pendingDecision` is open (search, discard, choose creature, reaction
window, …), other match actions wait until it is answered. Those choices are
part of conducting an effect — they do **not** open a new reaction window.

---

## 6. Symbols and the central split

Every face is attribute-typed except **Shield** (untyped). Attributes are
Martial, Wild, Toxin, Arcane, Luminar, Mechanical, Corruption, Darkness.
Costs never require Shield.

Each unabsorbed attribute symbol is a **one-time** choice:

```text
absorb  → sits on a creature or ritual  → creature fuel (next turn) or ritual Active-when
resolve → stays in the pool this turn   → [Requires] spends and engine effects
```

A symbol cannot do both. Unabsorbed symbols expire at end of turn. There is
no “store a symbol.” The only way to keep a **die result** across a roll is
**retain**.

A creature may absorb **any number** of symbols in a turn. Over-filling a
ritual’s Active-when gate is illegal.

---

## 7. Absorption payoff

- **Attribute** pips absorbed onto a creature become tokens at **end of
  turn**. A creature **cannot attack on the turn it was fuelled**.
- **Shield** pips grant **immediately** on absorb (1 Shield prevents 1
  damage, once). Shields stack and persist until spent.
- Absorbing a Shield is **not** absorbing a Natural; `On absorb Natural`
  does not fire.
- Ritual Active-when progress is credited **immediately** (not banked until
  end of turn), including multiple pips of the same attribute in one turn.

An unabsorbed Shield is wasted: nothing spends Shield from the pool.

---

## 8. Energy

One shared marker on a 10 · 0 · 10 track. `value` is Energy available to
whoever holds the marker.

| Event | Incoming Energy |
|---|---|
| First player’s first turn | **3** |
| Clean `END_TURN` (marker never crossed this turn) | **5** |
| Turn actually ends because the marker crossed zero | overshoot **+ 2**, capped at **10** |

- Spending **past** zero ends the turn after the current action/chain
  finishes. Landing **exactly** on zero does not.
- Playing **and** forging pay the printed header Energy cost.
- Engine abilities cost **pool symbols**. Attacks cost **absorbed
  attributes**, not Energy.
- Discounts apply to play / ritual place / equip / overload, **not** forge.
  Minimum cost after discount is 0.
- Printed Energy 1 on cards is exceptional; 1-Energy plays should mainly
  come from discounts on higher printed costs.
- Variable `?` costs (pay at least the printed minimum, then more) are
  designed but catalogue cards that print `?` currently use a fixed integer
  until spend UX lands.

**Reactions and the marker:** if you pay Energy during a reaction window
while you **do not** hold the marker, that cost is added to the current
holder (capped at 10). If you already hold it, you spend normally.

**Turn end vs chain:** an overshoot may flip the marker when a link’s cost
is paid, but turn end is checked only after the **whole chain** (and nested
choices) finishes. A later reaction can restore the marker so the turn
continues.

---

## 9. Playing cards

During actions (or as a legal reaction — §15):

| Kind | What happens |
|---|---|
| Instant | Pays Energy (and `[Requires]` if printed), then its effect. |
| Reaction | From hand, only while a reaction window is open and the response is legal. |
| Equipment | Attaches to a creature; stays until destroyed or the host dies. Friendly vs opponent targeting is printed. |
| Overload | Attaches to a **face card** (shared definition), not a physical die slot. Capacity is per face card. |
| Ritual | Enters the engine area (see §10). |

`[Requires]` spends unabsorbed pool symbols. Those symbols cannot also be
absorbed.

Discard-from-hand effects **draw first**, then the player **names** which
cards to discard. The engine never auto-discards the front of the hand.

Empty deck: draws quietly do nothing. No loss, no reshuffle.

---

## 10. Rituals

Played onto the engine area, not resolved from hand like an Instant.

| Orientation | Meaning |
|---|---|
| Preparing | Waiting for printed Active-when symbols |
| Ready | Gate met; standing abilities on; may activate if print has an activate body |
| Exhausted | Used this turn (once-per-turn rituals) |

Rituals arrive empty. Assign unabsorbed attributes to them during actions
until the gate is filled. Rituals with no Active-when become ready on place.

At the start of your turn, exhausted rituals come off exhausted. Banked
Active-when symbols **stay** unless an effect discards them; if the gate is
still met the ritual returns to ready, otherwise preparing.

Instant and reaction rituals go to the graveyard after one activation.
**Continuous** rituals stay and exhaust. Standing triggers fire while
**ready** and do not spend the banked symbols.

Destroying an opposing field ritual is not negate. Negate answers chain
links; destroy answers a card already on the field.

---

## 11. Forging

During actions, `FORGE_CARD` installs a face from your leftover pool **or**
copies an already-installed matching face onto a legal slot. Pay the card’s
header Energy. Forge does **not** open a reaction window.

You draw **one card per face installed** (own die or opponent’s). Empty
deck still fails the draw quietly. This draw is a forge rule, not card text.

Some faces **stay locked** on a slot for printed turns after install
(forge-lock). That is not retain.

---

## 12. Overloads

Overloads attach to the face **card**. When the last installed copy of that
face leaves the dice, its overloads detach to the graveyard.

`On roll` overloads fire during `ROLL_DICE` once per die that shows that
face card. They do not wait for engine resolution and do not care whether
the symbol is later absorbed. A later re-roll (including a retained showing
face) fires again.

---

## 13. Combat

- Each living creature may attack **once per turn** during actions.
- An attack names `requires` (checked, **not** spent) and optional
  `discards` (tokens actually burned). Fuel is absorbed attributes on **that**
  creature, not the shared pool.
- Because attributes pay out at end of turn, first attacks happen on a later
  turn than the absorb that enabled them.
- Declaring an attack opens a reaction window (§15). Prevent may answer;
  negate may not.
- Damage apply order: **prevention → Shield → Life**.
- Pierce / ignore Shield skips that many Shields **without spending them**,
  after prevention, before remaining Shields and HP.
- Some attacks queue follow-up effects after the damage link.

Enemy creature movement (push) is **not** in the game. Ally reposition is
frontline ↔ back (swap if the frontline is full).

---

## 14. Damage extras

**Prevention** (two shapes; cards pick one):

- Prevent-next-N-damage **buffers** on a creature, consumed as damage lands.
- Prevent N **attacks** (whole instances) — vocabulary exists; unused
  prevent does **not** expire for now.

**Toxin:** counters on a creature. At the start of **that creature’s
owner’s** turn, it takes 1 damage per counter. Counters persist until
something removes them.

**Stun** is implemented on dice but **deferred**: nothing applies it.

---

## 15. Reaction chain

Yu-Gi-Oh–style stack: last-in, first-out. Costs are paid when the link is
built; the body runs only after **both** seats `PASS_PRIORITY` in a row.

The turn player starts. After a link is added, priority passes to the
opponent. Seats alternate. A seat may add another legal reaction after the
opponent passes.

A window opens **after costs, before the body** for:

- Playing a tactic for its effect
- Placing a ritual
- Activating a ready ritual
- Attaching equipment
- Attaching an overload
- Declaring an attack

**Forge does not open a window.**

Legal responders: hand `reaction` cards, and ready ritual-reactions.

| Response | Legal against |
|---|---|
| Negate (top card link) | Tactic effect, ritual place/activate, equip, overload — **not** attacks |
| Negate ritual | Ritual place or activate only |
| Prevent | Attack / damage |

Once a link is conducting, it runs to completion. A negated card link keeps
its costs paid and skips the body.

---

## 16. Retain

Per die you own, you may mark it retained (or release it) with `RETAIN_DIE`,
in any phase, including before you roll.

A retained die keeps its showing face for **one** subsequent roll, still
generates that symbol, then retention clears. It does not persist turn after
turn unless you set it again. Stunned dice cannot be retained. Setting
retain needs a known showing face.

---

## 17. What this rulebook is not

Do not treat the following as current play:

- Bible §16’s longer phase list (Absorption as its own step) — **overridden**
  by Roll → Actions.
- Storing a symbol for later — **dropped**; only retain a die remains.
- Mulligan, deck-out, stun application, enemy push, a fuel cap on absorbed
  tokens — not in play (stun/push/cap: deferred or open).
- Catalogue English that is parked in `DEFERRED_CATALOGUE.md` — not a silent
  engine effect.

---

<!--
Related docs (agents):
- competitive_dice_game_agent_bible.md — design canon
- docs/OPEN_DESIGN.md — OPEN / ASSUMED / DECIDED
- docs/DEFERRED_CATALOGUE.md — unmodelled print
- docs/ARCHITECTURE.md — software advance path
- src/game/model/config.ts — numeric knobs
- specs 008–013 — chain, prevent, hooks, strip/destroy, vocabulary, markers
-->
