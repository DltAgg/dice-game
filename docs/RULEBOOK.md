# Dice Skirmish — living rulebook

How the game **plays today**. Open this in the app under **Rules**.

<!--
Agents: this file is the player-facing how-it-plays. Update it in the same
change as any rules edit that changes play (`.cursor/rules/rulebook.mdc`).
It is not the design bible and not a card catalogue. Individual cards stay
in specs 002 / 003 / 004. Unsettled questions stay in OPEN_DESIGN.md.
Unmodelled print stays in DEFERRED_CATALOGUE.md. Numeric knobs live in
src/server/model/config.ts (DEFAULT_RULES_CONFIG).
-->

---

## 1. Object of the game

Two players. You win by **defeating the opponent’s legendary creature**
(Life reduced to 0). Defeating the other two creatures alone does **not**
win. There is no deck-out loss, no reshuffle, and no secondary victory
condition.

Every legal squad has **exactly one** legendary. It opens in the **back**
row; the other two open on the **frontline**. After the match starts, the
legendary may `[Swap]` / reposition like any other creature.

Creature attacks are **one** damage path. Tactics, rituals, faces, equipment,
and statuses may also deal the damage that ends the match.

---

## 2. What you bring

Each player’s loadout is:

| Piece | Rule |
|---|---|
| Squad | Exactly **3** creatures, including **exactly 1** legendary |
| Tactics deck | **40–50** cards, **≤3** copies of the same card id |
| Face deck | **≤12** face cards, **≤3** sharing one attribute |
| Opening dice | Two d6 layouts (`startingDice`) |

Tactics cards always have both a **play** region and a **forge** region. On
each use you pick one: play **or** forge, never both. Any hand card may
instead be spent to **Overcharge** (see §11) — still one use: play, forge, or
Overcharge, never two.

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

- **Frontline** (2 slots) and **Back** (the third creature at setup is the
  legendary). Frontline protects the back: a non-Range attack may hit a
  back-row creature only if that player has **no living frontline**. Range
  ignores this. Card and face effects that name creatures are not attacks:
  they ignore this unless print says otherwise. Print that names **each
  enemy** or **each ally** hits every living creature on that side.
- **Engine area** for rituals.
- **Two dice**, each with six faces that reference face cards.
- Hand, tactics deck (top-first), graveyard, equipment, overloads.

Squad order (`creatureIds`) is left-to-right on the battlefield. Opening
rows ignore squad index for the legendary: it is always placed **back**;
non-legendaries fill frontline first.

---

## 4. Match start

- First player in `playerOrder` takes turn 1, phase **roll**.
- Opening hand is 5. The first player does **not** draw extra before acting.
  You draw **2** when **your** turn begins after an opponent’s turn ends.
- Dice are built from that seat’s `startingDice`. Each seat’s leftover face
  pool is independent.

---

## 5. Turn structure

Two phases: **Roll → Actions**. End Turn is an **action**, not a phase.

1. **Roll.** Roll your non-retained dice. Retained dice keep their showing
   face and still generate that symbol. On-roll face / overload effects fire
   as part of the roll. **Usable attribute** pips from the roll then
   **auto-bank** into your attribute pile (On absorb fires). **Shield** and
   locked/unusable pips stay in the turn pool. Effect-generated attributes
   also auto-bank when created. Then the turn enters **actions**.
2. **Actions.** In any order you may: absorb Shield onto a creature, pay
   `[Spend]` from your pile (and meet `[Requires]` gates), attack, play, forge,
   activate a **ready** ritual, retain/release dice, or end the turn.

`[Reroll]` rolls **that one die** again during **actions** (you do not return
to the roll phase). The **new** showing face fires On roll (and overloads on
that face), then a usable attribute pip **auto-banks** (On absorb). The
previous roll of that die is not undone: a token already in your pile stays,
and an unabsorbed leftover (Shield, locked) is replaced by the new result
rather than sitting beside it. `[Stamp]` is different: it re-fires the
**current** showing face’s roll effects — On roll, overloads on that face,
Overcharge pips, forge-yield extra Generate, and equipment on-roll-symbol —
without changing the face or creating a new rolled pip.

There is no dedicated absorb phase and no leftover-rolled flip. The turn
pool mainly holds **Shield** (and locked/unusable pips). Attributes live in
your pile.

Ready rituals may activate during **actions**, not during roll.

If a `pendingDecision` is open (search, discard, choose creature, reaction
window, …), other match actions wait until it is answered. Those choices are
part of conducting an effect — they do **not** open a new reaction window.

Print that says you **may** (optional discard, optional reroll, optional
reposition / swap) includes **Decline**. Declining skips that effect and any
“if you do” rider. Naming a target for a **mandatory** effect (“choose an
enemy”, “an allied creature you choose”) is not optional: if a legal target
exists you must name one; if none exist, the effect whiffs.

---

## 6. Symbols and the central split

Every face is attribute-typed except **Shield** (untyped). Attributes are
Martial, Wild, Toxin, Arcane, Luminar, Mechanical, Corruption, Darkness.
Costs never require Shield.

**Rolled and effect-generated usable attributes** auto-bank into your pile
(On absorb fires). Locked/unusable pips and **Shield** stay in the turn pool.

`[Requires: …]` is a **gate**: your pile must hold it; it is not spent.
`[Spend: …]` **burns** from your pile. Resonance wildcards may cover shortfall
on either. An attack or card may print both. Costs may name attributes and/or
**Any** (generic pile tokens of any attribute — not Shield, not a ninth
colour). Named pips are reserved first; leftover tokens cover Any. Unabsorbed
turn-pool symbols expire at end of turn. There is no “store a symbol.” The only
way to keep a **die result** across a roll is **retain**.

Shield absorb still names a creature (below).

---

## 7. Absorption payoff

- **Attribute** pips from a **roll** or **effect** bank into **your attribute
  pile** automatically (usable pips only; On absorb fires). The pile persists
  across turns until spent or removed. Same-turn attack after banking is legal.
- Each **On absorb** hook (standing ability, face, or overload) fires **at
  most once per turn** per source, so generated pips cannot re-trigger the same
  absorb effect in a loop.
- **Shield** pips grant **immediately** on absorb onto a living owned creature
  (1 Shield prevents 1 damage, once). Shields stack and persist until spent.
- Absorbing a Shield is **not** absorbing a Natural; `On absorb Natural`
  does not fire.
- Ritual `[Active when: …]` is a **one-time unlock** against your **pile**
  (Resonance wildcards may help the first time). Once the ritual is **ready**,
  spending pile tokens elsewhere does not put it back to preparing unless an
  effect says so. Optional **Spend** on activate still burns from the pile
  (wildcards may cover shortfall).
- **`[Drain]`** deals damage to a chosen enemy creature and heals your
  **most-damaged ally** for the HP actually lost (after Prevent/Shield).

An unabsorbed Shield is wasted: nothing spends Shield from the pool.

---

## 8. Playing and forging costs

**Play** burns the tactic’s header `[Spend: …]` from your **attribute pile**.
**Forge** depends on the forge region’s face kind:

- **Natural forge** is free (no pile burn). Header `[Spend]` still applies when
  you **play** the card for its effect.
- **Synthetic forge** burns the same header `[Spend]` when you install faces.
- **Discounts** (`[Discount N]`) cut N tokens from the header pile total
  (minimum 0). Discount reduces **Any** pips first, then named attributes, so
  `[Spend: Arcane + 2 x Any]` with Discount 1 still needs the Arcane plus one
  Any. After discount you still pay with attributes that appear on the printed
  cost, without exceeding each named attribute’s printed count — e.g. cost
  `1 Arcane + 1 Corruption` with discount 1 needs **one** token: either Arcane
  or Corruption. Any pips may be paid with any attribute leftover after named
  pips. Spend of Any burns leftover tokens in attribute order (Martial first)
  until a picker exists. **On roll** `[Discount N]` (no **forge** word) cheapens
  the next **play** this turn. `[Discount N] forge` cheapens the next synthetic
  `FORGE_CARD`. Play-cost discounts do not apply to forge; forge has a
  separate one-turn discount from some gear that applies only to synthetic
  forge (natural is already free and does not consume that discount). A
  synthetic install that **consumes** that forge discount does **not** also
  get the immediate synthetic forge bank (§11) — Discount 1 on a 2-cost
  Mechanical synthetic with 1 pip in the pile spends that pip.
  `[Discount]` never reduces a `[Requires]` gate.
- Attacks (`[Requires]` gate and `[Spend]` discards) and ritual Active-when /
  activate Spend also use the pile (see §6). A card may print header
  `[Spend]` **and** a `[Requires]` gate; tokens stay unless Spend also names them.
- Reactions pay pile costs during a reaction window.
- Turn end is voluntary (`END_TURN`) or from effects that say so.

---

## 9. Playing cards

During actions (or as a legal reaction — §15):

| Kind | What happens |
|---|---|
| Instant | Must meet any `[Requires]` gate, then pays header `[Spend]`, then resolves. |
| Reaction | From hand, only while a reaction window is open and the response is legal. |
| Equipment | Attaches to a creature; stays until destroyed or the host dies. Friendly vs opponent targeting is printed. |
| Overload | Attaches to a **face card** (shared definition), not a physical die slot. Capacity is per face card. |
| Ritual | Enters the engine area (see §10). |

`[Spend]` burns from your **attribute pile** (wildcards may cover shortfall).
`[Requires]` on an attack **or on a card’s effect** is a gate: the pile must
hold it (wildcards may cover), and those tokens stay unless a `[Spend]` also
names them. `[Discount]` reduces header Spend only — never the Requires gate.
Forge does not check a card’s effect `[Requires]` (play vs forge is exclusive).

Discard-from-hand effects **draw first**, then the player **names** which
cards to discard. The engine never auto-discards the front of the hand.
Optional `you may [Discard N]` lets you name fewer cards, including none.

**Mill** puts cards from the **top of a tactics deck** into that deck’s
owner’s graveyard. It is not discard-from-hand. An empty or short deck
mills what remains (including nothing). There is no deck-out loss.

Empty deck: draws quietly do nothing. No loss, no reshuffle.

---

## 10. Rituals

Played onto the engine area, not resolved from hand like an Instant.

| Orientation | Meaning |
|---|---|
| Preparing | Owner’s attribute pile has not yet met Active-when (one-time unlock) |
| Ready | Active-when unlocked once (or no Active-when); standing abilities on; may activate if print has an activate body |
| Exhausted | Used this turn (once-per-turn rituals) |

Rituals with no Active-when become ready on place. Otherwise the owner’s
**attribute pile** must meet the printed Active-when **once** to unlock ready.
Optional **Spend** on activate burns from that pile only.

At the start of your turn, exhausted rituals come off exhausted and return to
**ready** (they were already unlocked). Only rituals still in **preparing**
need the pile gate.

**Continuous** and **Reaction** rituals stay on the field. Activating (if they
have an activate body) exhausts them until the owner's next turn.
**Ritual / Instant** is retired from play; a leftover instant-subtype ritual
still leaves for the graveyard after one activation.

Reaction rituals may still respond in a reaction window from the field while
**ready**. Standing triggers fire while **ready** and do not spend Active-when
/ Spend.

Destroying an opposing field ritual, attached equipment, or attached overload
is not negate. Negate answers chain links; destroy answers a card already on
the field. When an effect names `[Destroy Ritual]`, `[Destroy Equipment]`, or
`[Destroy Overload]` your opponent controls, you pick one opposing card of that
kind (always a prompt if at least one exists, including exactly one). An empty
opposing field is a legal whiff.

**Bounce** answers the same opposing field cards — ritual, equipment, or
overload — but the chosen card **returns to its owner’s hand** instead of the
graveyard. Detach first (equipment off the creature, overload off the face,
ritual off the field). Preparing, ready, and exhausted rituals are all legal.
Bounce is not discard and does not negate a chain link. An empty legal set is
a legal whiff; if at least one eligible card exists you always pick.

---

## 11. Forging

During actions, `FORGE_CARD` installs a face from your leftover pool **or**
copies an already-installed matching face onto a legal slot. **Natural** forge
regions install for free; **synthetic** forge regions burn the card’s header
`[Spend]` from your pile. Forge does **not** open a reaction window.

You draw **one card per face installed** (own die or opponent’s). Empty
deck still fails the draw quietly. This draw is a forge rule, not card text.

**Own-die forge yield:** When you install a face onto **your own** die (via
`FORGE_CARD` or a forge-faces effect), that slot gains **forge yield**. While
that forged face is showing after your roll, you also generate one extra pip of
its attribute (same auto-bank path as effect Generate). Shield / untyped faces
grant no yield. Opponent-die installs (Corruption harassment) do **not** gain
yield. Overwriting or peeling a slot clears yield unless the new install
re-sets it.

**Synthetic forge bank:** On a successful own-die **synthetic** `FORGE_CARD`
only, you also bank one of the forged face’s attribute into your pile **per
face installed** (immediate payoff), **unless this install consumed a forge
discount**. Natural forge stays free install + draw + yield with no immediate
bank. Discount and the bank do not stack on the same card.

Some faces **stay locked** on a slot for printed turns after install
(forge-lock). That is not retain.

**Desynthesis.** `[Desynthesize]` peels a **synthetic** attribute face on
**any die** (yours or the opponent’s) back to that attribute’s **natural**
identity face. It is not a forge (no forge-draw) and is **not** `[Reforge]`
(swap to a different synthetic from your pool). Stay / forge-lock does not
block it. The natural belongs to the **die owner**; the displaced synthetic
returns to its owner’s pool when the last copy leaves, and overloads /
Overcharge on that orphaned face leave as they do on overwrite. An already
generated pip on a showing slot stays; the next roll uses the natural.

**Overcharge.** Once per turn during actions, you may spend **any** card
from hand to Overcharge one **attribute face card** installed on your dice
(not Shield / untyped). That face card gains +1 of the spent card’s
attribute. The next time **any** of your dice show that face after a roll
(including a retained keep or an actions-window reroll), **each** showing die
also `[Generate]`s that pip — the same on-roll Generate path as forge yield /
overload. One spend covers every copy you have showing. Overcharge does
**not** pay pile cost, does **not** draw, does **not** set forge yield, and
does **not** open a reaction window.

Pips sit on the **face card** until the last copy you own leaves the dice
(overwrite or peel) — the same moment overloads detach. Overwriting one of
two copies keeps the Overcharge on the remaining copy. Stay / cannot-replace
does not block Overcharge (you are not replacing the face). Forge kind
(natural vs synthetic) and forge target (your die vs opponent’s) do **not**
gate Overcharge. Multiple Overcharges on the same face card stack across
turns.

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

- Each living creature may attack **once per turn** during actions, unless an
  effect grants extra attacks (`[Frenzy]` — Wild exclusive).
- Fuel is the **owner’s attribute pile**. An attack may print a **`[Requires: …]`
  gate** (must hold, not spent), a **`[Spend: …]` cost** (burned on declare),
  or **both**. Basics usually Spend only. Specials typically Require a mix and
  Spend one of those attributes.
- Because banking is immediate, you may attack on the same turn you absorb
  the fuel.
- Declaring an attack opens a reaction window (§15). Prevent may answer;
  negate may not.
- Damage apply order: **prevention → Shield → Life**.
- Pierce / ignore Shield skips that many Shields **without spending them**,
  after prevention, before remaining Shields and HP.
- Some attacks queue follow-up effects after the damage link.

Enemy creature movement (push) is **not** in the game. Ally reposition is
Martial’s exclusive (`[Reposition]` / `[Swap]`): frontline ↔ back (swap if the
frontline is full). Wild’s exclusive is `[Frenzy]` (extra attacks this turn).

---

## 14. Damage extras

**Prevention** (reaction to an attack declaration — not a proactive buffer):

- `[Prevent]` is **reaction-exclusive**. It grants `attackPreventCount` only
  while a living **attack** link is on the chain, and only onto **that attack’s
  target**. Grants with no attack on the chain whiff (no charge).
- That charge cancels the next **attack** against the creature (the whole
  instance, before Shield). Unused charges from a **legal** reaction grant
  persist until consumed (`preventExpiry: "none"`) — they are not a lasting
  “arm next attack” you set up on your turn.
- Toxin ticks, face `[Strike]`, and other effect damage do **not** consume
  attack-prevent.
- Prevent reactions (Prismatic Barrier, Sidestep, Luminar Judgement) answer
  an attack on the chain. Proactive Luminar absorb / attack follow-ups use
  `[Mark N Shield]` or `[Heal]` instead.

**Toxin:** counters on a creature (soft max **3** per creature; excess from
`[Mark]` is discarded). At the **end** of **that creature’s owner’s** turn,
it takes damage equal to its markers, then **all** markers are cleared.
Markers applied during the owner’s own turn detonate at that same turn’s
end.

**Silence:** `[Silence]` names an opposing **creature**, **field ritual**, or
**die slot** (the card lists which). Until the **start of your next turn**
(the rest of this turn plus the opponent’s intervening turn):

- That host cannot **activate** or **fire its effects**, including inherited
  ones: a silenced creature’s standing abilities and attached equipment; a
  silenced showing slot’s face On roll / On absorb, attached overloads, and
  Overcharge / forge-yield extra pips; a silenced ritual cannot
  `ACTIVATE_RITUAL`, and a silenced continuous ritual’s standing abilities
  do not fire. Passive while-attached modifiers from silenced equipment or
  a silenced continuous ritual do not apply.
- Rolled **pips still generate**. Attacks may still be **declared**; Strike,
  Prevent, and Shield still happen. Extra attack effects and follow-ups from
  a silenced attacker are skipped.
- Equipment and overloads are not named directly — they are silenced with
  their host creature or showing slot. Hand, deck, and unattached cards are
  not silenced.

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
| Prevent | Attack declaration (reaction only) |

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
- docs/KEYWORDS.md — print keywords (appended on the Rules tab)
- docs/ARCHITECTURE.md — software advance path
- src/server/model/config.ts — numeric knobs
- specs 008–015 — chain, prevent, hooks, strip/destroy, vocabulary, markers, mill
-->
