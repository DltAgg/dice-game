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

Two players each control a permanent team of **three Fighters** (the engine
still calls them creatures). **1 Active**, **2 Reserve**. Fighters persist
for the whole match.

**Win:** the first player whose three Fighters are all defeated loses. The
opponent wins. If both squads wipe in the same check, the player whose turn
it is loses. There is no deck-out loss and no reshuffle.

The **Tag Skirmish** loadout is the live prototype: technique dice, Meter,
Tag, Assist, and combo. It is the only builtin list.

Loadouts need **three** Fighters. Setup places by **squad index**: index 0
opens **Active**. Tag-fighter matches use **one frontline (Active)** and two
Reserve. Skirmish defaults still place two frontline then back.

A Tag Fighter has no basic or special attack. The showing face on the Active
Fighter is a hit by itself. A Technique pairs that face with one other face
you rolled: a named face, any face of a type, any face with a sequence role,
or a strike class such as a light kick. Every hit and every Technique has a
strength (light, medium, or heavy) and a strike (kick or punch). The face
and the Technique each say whether they are a starter, an extender, or a
finisher. Both target the opponent’s Active Fighter.

---

## 2. What you bring

Each player’s loadout is:

| Piece | Rule |
|---|---|
| Squad | Exactly **3** creatures |
| Tactics deck | **40–50** cards, **≤3** copies of the same card id |
| Face deck | **≤12** face cards |
| Opening dice | **2** d6 (skirmish) or **3** d6 (Tag Skirmish: one die bound to each Fighter) |

Tactics cards always have both a **play** region and a **forge** region. On
each use you pick one: play **or** forge, never both. Any hand card may
instead be spent to **Overcharge** (see §11) — still one use: play, forge, or
Overcharge, never two.

**Opening dice**

- Blank faces (empty rules, no technique, no face type, empty On roll)
  may sit on opening slots **without** consuming the face deck.
- A named face on an opening slot **must** be in the face deck and starts
  **installed**. One face card backs every slot showing that id.
- Leftover face-deck rows are the mid-game forge pool.
- Copying an already-installed face (including an opening face) remains legal.

Opening-layout caps (prototype knobs, `ASSUMED` unless noted):

| Knob | Default |
|---|---|
| Faces with On roll, convert Choose one, or While showing per die | **2** |

Forbidden Heritage, Pestilent Plague, and Arcane Echo are refused on
`startingDice` (they may still sit in the face deck for mid-game).

There is **no mulligan**. Each player is dealt **5** (`openingHandSize`).
That number is a playtest knob, not a final balance decision.

---

## 3. The table

Each player has:

- **Frontline** and **Reserve**. In Tag Skirmish, **Active** is the only
  frontline Fighter; the other two are Reserve. A non-Range attack may hit a
  back-row creature only if that player has **no living frontline**. Range
  ignores this. Technique-gated native attacks always target the opponent’s
  **Active** Fighter.
- **Engine area** for rituals.
- **Dice:** one per Fighter. Tag Skirmish rolls all three, including a
  KOed Fighter. The Fighter's base die is what the match starts from. A
  card can rewrite the current faces for the rest of the match. Changing
  the roll does not rewrite the die. The next match starts from the base
  die again. A Technique's other face comes from another of your dice,
  never the opponent's.
- **Meter** (0–8): combat momentum. Spend on Tag-cancel, Assist (when the
  technique is not showing), and some cards. Gain Meter when your attack
  Strike actually removes HP.
- **Combo:** increments when your Active Fighter successfully declares an
  attack; resets on Tag, KO-promote, and end of turn.
- One hand, one tactics deck (top-first), one graveyard, plus equipment,
  overloads, and rituals. The three Fighters share that hand and deck.

---

## 4. Match start

- First player in `playerOrder` takes turn 1, phase **roll**.
- Opening hand is 5 for both players. At the start of every turn, including
  the first, the player whose turn it is draws **1** (`cardsDrawnPerTurn`).
  There is no extra first-player draw and no skipped first draw.
- There is no hand limit, and the game does not discard down to one.
- A deck may include at most **3** copies of a card (`deckMaxCopiesPerCard`).
  The fixed deck size is not chosen yet (`deckSize` null). Until it is, a
  list still has to sit in the previous size range.
- Drawing from an empty deck loses the match when deck-out is on. Nothing
  is reshuffled, and an empty deck does not deal damage. A card draws only
  when its own effect says so. Playing a card does not draw by itself.
- A played one-shot goes to the graveyard unless that card names another
  destination. Equipment, overloads, continuous rituals, and other
  persistent cards stay in play.
- Dice are built from that seat’s `startingDice`. Each seat’s leftover face
  pool is independent.

---

## 5. Turn structure

Two phases: **Roll → Actions**. End Turn is an **action**, not a phase.

1. **Roll.** Both players’ dice are rolled on **every** roll phase. The turn
   player issues the single `ROLL_DICE`; the opponent does not click Roll.
   Each seat randomizes their non-retained dice, **auto-absorbs** their own
   usable attribute pips (**On absorb** fires), and resolves **their** On roll /
   overloads / convert Choose one (including on the opponent’s turn). Geometry
   still sees both of **that owner’s** showing faces before their On roll.
   Named specials may produce **more than one pip** from the showing face
   itself (inherent extra pips — not a `[Generate]` line). Absorbed attributes
   leave the turn pool; there is **no** persistent attribute pile. Some faces
   print **Choose one** on roll (Sigil Flare, Mainspring, Pyre of Names):
   **absorb this die's usable pips**, or take the printed payoff and **do not
   absorb** that die (inherent extra pips, showing pip, forge yield, Overcharge
   are forfeited). It is a real prompt — the die owner picks. The **other**
   die of that owner auto-absorbs normally.
   Locked/unusable pips stay in the turn pool. The non-active
   player cannot absorb during the turn player’s actions, so **off-turn
   leftovers have no absorb window** — they expire or are replaced like
   other leftovers. Their usable attributes still auto-absorb on roll.
   Effect-generated usable attributes also auto-absorb when created. Then the
   turn enters **actions** (still only the turn player’s window).
   **While showing** is a continuous stance while that face is the showing
   face (including retain). Both sides’ showing faces refresh every roll phase,
   so defensive Reduce on the opponent uses **their new** showing face from
   this shared roll. It is not a second On-roll trigger.
   **Retain:** a retained die is never randomized while marked retained. The
   keep is **not spent** on the opponent’s shared roll (the face stays, and
   so does retain). It is spent on **your** next roll phase as the turn
   player.
2. **Actions.** In any order you may: absorb leftover usable attributes (if
   any), attack, play, forge, activate a
   **ready** ritual, retain/release dice, or end the turn. Printed `[Spend]` /
   `[Requires]` on cards and attacks are **not enforced** (catalogue leftover).

`[Reroll]` rolls **that one die** again during **actions** (you do not return
to the roll phase). The **new** showing face fires On roll (and overloads on
that face), then a usable attribute pip **auto-absorbs** (On absorb) unless
that new face offers convert Choose one. The previous roll of that die is not
undone: an already-absorbed pip stays absorbed, and an unabsorbed leftover
(locked or unusable) is replaced by the new result rather than sitting beside it.
`[Stamp]` is
different: it re-fires the **current** showing face’s roll effects — On roll,
overloads on that face, Overcharge pips, forge-yield extra Generate, and
equipment on-roll-symbol — without changing the face or creating a new rolled
pip (and without minting a second copy of inherent extra pips). Stamp on a
convert face opens Choose one again (yield / Overcharge wait until you pick
absorb).

On-roll lines may be **conditional on dice geometry** (your other die showing
the same face, how many slots on this die show that face). Those are ordinary
On-roll conditions, not a new phase. Both of that owner’s dice are rolled
before their On roll fires, so geometry can see both showing faces.

There is no dedicated absorb phase and no leftover-rolled flip. The turn
pool holds locked/unusable pips until they expire at end of turn. Absorbed
attributes are gone from the pool (On absorb only — no bank).

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

## 6. Symbols and the turn pool

A face is not an attribute, not natural or synthetic, and not Shield.
There is no Shield face and no Shield pip. Usable pips are the face’s
printed pip bag, or pips an effect generates. Symbol names (Martial, Wild,
Toxin, Arcane, Luminar, Mechanical, Corruption, Darkness) are pip labels,
not face types.

**Rolled and effect-generated usable pips** auto-absorb (On absorb fires).
There is **no** cross-turn attribute bank. Locked/unusable pips stay in the
turn pool until they expire at end of turn. Convert **Choose one** faces
absorb that die’s usable pips only if
you pick the absorb branch; the payoff branch forfeits that die’s roll pips
(inherent extra pips, showing pip, forge yield, Overcharge). The other die is
untouched.

Printed `[Requires: …]`, `[Spend: …]`, `[Active when: …]`, and **Any** costs
may still appear on catalogue cards but are **not enforced** today.

Unabsorbed turn-pool symbols expire at end of turn. There is no “store a
symbol.” The only way to keep a **die result** across a roll is **retain**.

---

## 7. Absorption payoff

- **Attribute** pips from a **roll** or **effect** are marked **absorbed**
  automatically when eligible (usable pips only; **On absorb** fires). They do
  not enter a persistent pile.
- Each **On absorb** hook (standing ability, face, or overload) fires **at
  most once per turn** per source, so generated pips cannot re-trigger the same
  absorb effect in a loop.
- Ritual **Active-when** pile gates in print are **not enforced**; rituals
  become ready per engine rules without pile unlock (see §10).
- **`[Drain]`** deals damage to a chosen enemy creature and heals your
  **most-damaged ally** for the HP actually lost (after attack prevention).

---

## 8. Playing and forging costs

Printed header `[Spend: …]`, effect `[Requires: …]`, attack `discards`, and
ritual Active-when / activate Spend are **not enforced** (catalogue leftovers).

**Play** and **forge** are legal when the rest of the action is legal — no pile
payment step. Forge does not distinguish face kinds, and there is no
first-forge waiver.

**Discounts** (`[Discount N]`) may still arm on-roll or while-showing discounts
on `GameState` where implemented; they do not spend a pile.

Turn end is voluntary (`END_TURN`) or from effects that say so.

---

## 9. Playing cards

During actions (or as a legal reaction — §15):

| Kind | What happens |
|---|---|
| Modify | Changes the current situation. Either player may play one while they have priority, when it is legal. A Modify may resolve an effect, attach equipment, overload a face, or place a ritual. |
| Response | From hand, only against an opponent’s object while a reaction window is open. |

Printed `[Spend]` / `[Requires]` on cards and attacks are not enforced. Forge
does not check a card’s effect `[Requires]` (play vs forge is exclusive).

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
| Preparing | Ritual not yet ready (legacy Active-when in print — **not** pile-gated today) |
| Ready | Standing abilities on; may activate if print has an activate body |
| Exhausted | Used this turn (once-per-turn rituals) |

Rituals become **ready** on place when the engine has no Active-when gate to
enforce. Printed Active-when / activate Spend are catalogue leftovers.

At the start of your turn, exhausted rituals come off exhausted and return to
**ready**.

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
copies an already-installed face onto a legal slot. You name the face. There
is no natural/synthetic split and no first-forge waiver. Printed header
`[Spend]` is not enforced. Forge does **not** open a reaction window.

You draw **one card per face installed** (own die or opponent’s). Empty
deck still fails the draw quietly. This draw is a forge rule, not card text.

**Own-die forge yield:** When you install a face onto **your own** die (via
`FORGE_CARD` or a forge-faces effect), that slot gains **forge yield**. While
that forged face is showing after your roll, you also generate one extra pip
for each of that face’s printed pips (same auto-absorb path as effect
Generate), **unless** you pick the convert payoff on that showing face
(Choose one). A face with no printed pips grants no yield. Opponent-die installs do **not**
gain yield. Overwriting or peeling a slot clears yield unless the new install
re-sets it.

**Forge bonus effects.** Some cards print extra keyword clauses on the forge
line (for example `[Forge] … [Empower 1].`). Those resolve **immediately after
a successful `FORGE_CARD`**, still **without** a reaction window. They do
**not** run if you play the card for its effect region (or attach /
Overcharge). Play vs forge vs Overcharge remains exclusive — you still choose
one use.

Some faces **stay locked** on a slot for printed turns after install
(forge-lock). That is not retain.

**Desynthesis.** There is no Shield face to peel to, so `[Desynthesize]`
does not change the slot. It is not a forge and it is not `[Reforge]` or
`[Cross forge]`.

**Reforge / Cross forge.** `[Reforge N]` on **one of your dice**: replace
any N replaceable faces with N faces from your pool (you name the slots and
the pool faces). `[Cross forge]` is the same replacement; it does not require
the slots to show a particular face. Neither is a forge (no forge-draw, no
yield). Stay / cannot-replace slots are illegal. Displaced faces return to
pool when orphaned; their overloads / Overcharge leave as on overwrite. You
cannot play a Reforge / Cross forge (or a Choose one whose every mode is
Reforge / Cross forge) when no legal assignment exists — the card stays in
hand; it is not spent for a silent no-op.

**Choose one.** Some cards (e.g. Tooling Order) and some faces (Sigil Flare,
Mainspring, Pyre of Names) read "Choose one:" with two modes. You pick exactly
one; the other is ignored. If only one mode can legally resolve, it is chosen
automatically. If none can, the Choose one does nothing. On convert faces the
modes are **absorb this die's usable pips** or the printed payoff (do not
absorb).

**Overcharge.** Once per turn during actions, you may spend **any** card
from hand to Overcharge one face card installed on your dice.
That face card gains +1 of the first pip symbol in the spent card’s
`playCost`. The next time **any** of your dice show that face after a roll
(including a retained keep or an actions-window reroll), **each** showing die
also `[Generate]`s that pip — the same on-roll Generate path as forge yield /
overload — **unless** you pick that showing face’s convert payoff (those Overcharge
pips are forfeited with the rest of that die’s roll). One spend covers every
copy you have showing. Overcharge does
does **not** draw, does **not** set forge yield, and
does **not** open a reaction window.

Pips sit on the **face card** until the last copy you own leaves the dice
(overwrite or peel) — the same moment overloads detach. Overwriting one of
two copies keeps the Overcharge on the remaining copy. Stay / cannot-replace
does not block Overcharge (you are not replacing the face). Which die the
face sits on does **not** gate Overcharge. Multiple Overcharges on the same
face card stack across turns.

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
- Printed attack `[Requires]` / `[Spend]` / `discards` are **not enforced**.
- You may attack on the same turn you absorb symbols.
- Declaring an attack opens a reaction window (§15). Prevent may answer;
  negate may not.
- Damage apply order: **`[Reduce]` → attack prevention → Life**.
- `[Reduce N]` subtracts N from that incoming hit (minimum 0) before attack
  prevention. It applies to any damage that hits the creature, not only
  attacks. It does not cancel the attack. **While showing** `[Reduce N]` uses
  the same math for the controller’s living creatures while that face is
  showing.
- There is no Shield. Nothing between attack prevention and Life stops the
  remaining damage.
- **While showing** `[Pierce N]` applies to the controller’s attacks for as
  long as the face is showing (every attack, not a one-shot arm). It does not
  add a barrier step.
- **While showing** `[Empower N]` adds N to the controller’s attacks for as
  long as the face is showing (every attack, not next-attack-once).
- Some attacks queue follow-up effects after the damage link.

**Tag Skirmish (spec `028`)**

- Native attacks with `requiredTechniques` need the **Active** Fighter’s bound
  die to show that technique. They hit the opponent’s Active only. Each
  Fighter may attack **twice** per turn in this preset (`attacksPerCreaturePerCombat: 2`).
- **[Tag]:** switch Active with a living Reserve, once per turn. Free in the
  opening or closing window of the actions phase. Adding Tag to a Chain that
  is already open spends **2 Meter**. The switch waits for that Chain. A KOed
  Fighter cannot Tag, and a KO does not switch Active for you.
- **[Assist]:** a Reserve, including a KOed Reserve, fires its Assist on the
  Chain. Free if **that** Reserve’s die shows Assist; otherwise spend Meter
  (**1**, or that Fighter’s exceptional cost). Once per named Reserve per turn.
  Assist does not change the Active Fighter.
- **Meter:** cap **8**, one pool for the team. It stays across turns and Tags.
  On an attack Strike, the dealer and the Fighter who was hit each gain 1 per
  HP actually lost. Cards may also print a Meter spend.
- **Combo:** +1 when Active successfully declares an attack; 0 on Tag,
  KO-promote, and end of turn.
- In-match **dice evolution** is still `[Forge]` onto the bound die (persistent
  face change). No temporary face replacement.

**Named faces and Fighter techniques (spec `029`, ASSUMED knobs)**

- Some faces are **named actions** with a **Type** (Attack, Grab, Guard,
  Movement, Tag, …). Types have **no** fixed damage of their own — the face’s
  printed effects do.
- **Primary Effect:** resolve alone with **Use Face** — the Active Fighter
  uses the showing face on **their own** bound die. No second face needed.
- **Fighter technique (two faces):** the Active Fighter’s own die shows the
  technique’s **primary** named face, and **another** of your rolled dice
  shows a face matching the secondary: a named face, any face of a type, any
  face with a sequence role, or a strike class such as a light kick. Every
  hit and every Technique has a strength (light, medium, or heavy) and a
  strike (kick or punch). Resolve the technique’s base effect, then
  that secondary face’s **Secondary Effect**. Swapping which die shows which
  face does not fire the same technique.
- These actions happen in the **actions** phase (the Act). Using a face does
  not spend it. The same face may still be part of a Technique. Repeating the
  same Action in one sequence is the model under test (spec `030`). What is
  legal depends on the offensive sequence and that Fighter’s actions, not on
  a count of dice.
- The current build still marks a used face `face-action:<dieId>` when
  `consumeDiceOnFaceActions` is on. That spend is leftover engine behavior,
  not the rule (spec `030`, revised 2026-10-02).
- Legacy faces without a Type / Primary Effect cannot Use Face.

**Offensive control (spec `030`, revised 2026-10-03)**

This is how combat plays. Tag, Assist, Meter, and KO follow the same rules
as the Tag Skirmish lines above.

During the Act there is an **Aggressor** and a **Defender**. Dice show named
inputs. They are not action points. An Action you cannot legally continue
with is not available. Declaring it does not end the sequence.

Starter, Extender, and Finisher are properties of a lone face and of a
Technique. A starter, once it resolves, moves the sequence from Open into
Combo. In Combo, the next face or Technique is legal only when its own role
is extender or finisher. Passing Priority inside a chain only yields
Priority. Separately, the Aggressor may stop the offensive sequence and
return it to Open. A Finisher also returns it to Open. Tag does not always
do either.

Immediately after the opening roll, you may reroll any number of your dice
once, or keep them. Cards can change that roll or that reroll.

A response does not require a Guard face. Cards respond or modify. A
response does not by itself take the offense. Counter, Reversal, Modifier,
and Situation are names for a result, not card types.

Declaring an action opens Priority for the player who declared it. While you
have Priority you may add a legal response or modify, if it has a valid
target, or you may pass. A pass is not a Chain entry. Adding a response or
modify does not yield Priority. You may respond only to an opponent’s
object. Either player may modify while they have Priority. After two passes
in a row, the chain resolves last in, first out. If a target has become
invalid by then, that effect does not happen.

A modify can change the roll you just made, or it can permanently change a
die. Changing the roll does not rewrite the die. There is no temporary die
change. It can also change what one Fighter’s inputs allow. That moveset
card stays attached to that Fighter for the rest of the match, so the
change remains visible. It can also redirect a target that is already part
of the exchange.

Tag is not a card. A turn can offer a Tag Window at the beginning and one
at the end. You can Tag only once in the turn. The normal Tag does not
spend Meter. Assist is printed on the Fighter, uses the same chain, and
does not spend Meter unless that Assist is exceptional. One Meter pool is
shared by all three Fighters. It stays when you Tag and when the turn
changes. You can gain it by dealing damage, by taking damage, or from an
effect that says so.

At 0 HP a Fighter is KOed. They cannot Tag. They can still Assist. The
sequence ends and the opponent takes initiative. When all three of your
Fighters are KOed, you lose.

Hand size, draw, deckbuilding, and how dice are customized are **not
decided** ([`OPEN_DESIGN.md`](./OPEN_DESIGN.md)). There is no Resolve phase
and no Meter phase.

Enemy creature movement (push) is **not** in the game. Ally reposition is
Martial’s exclusive (`[Reposition]` / `[Swap]`): frontline ↔ back (swap if the
frontline is full). Wild’s exclusive is `[Frenzy]` (extra attacks this turn).

---

## 14. Damage extras

**Reduce** (incoming hit math — not Prevent):

- `[Reduce N]` on `On take damage:` cuts N from that hit before attack
  prevention. Optional `, once per turn` is a print qualifier, not a second
  keyword. Distinct from `[Prevent]` (cancel the next attack) and
  `[Discount]` (legacy cost reduction where armed).

**Prevention** (reaction to an attack declaration — not a proactive buffer):

- `[Prevent]` is **reaction-exclusive**. It grants `attackPreventCount` only
  while a living **attack** link is on the chain, and only onto **that attack’s
  target**. Grants with no attack on the chain whiff (no charge).
- That charge cancels the next **attack** against the creature (the whole
  instance, before Life). Unused charges **expire at end of turn**
  (`preventExpiry: "end-of-turn"`) — they are not a lasting “arm next attack”
  you set up on your turn.
- Toxin ticks, face `[Strike]`, and other effect damage do **not** consume
  attack-prevent.
- Prevent reactions (Prismatic Barrier, Sidestep, Luminar Judgement) answer
  an attack on the chain. Proactive Luminar absorb / attack follow-ups use
  `[Heal]` instead.

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
- Rolled **pips still generate**. Attacks may still be **declared**; Strike
  and Prevent still happen. Extra attack effects and follow-ups from
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

A retained die is never randomized while marked retained. The keep survives
the opponent’s shared roll without spending; on **your** next roll phase it
still generates that symbol, then retention clears. It does not persist turn
after turn unless you set it again. Stunned dice cannot be retained. Setting
retain needs a known showing face.

---

## 17. What this rulebook is not

Do not treat the following as current play:

- **Attribute pile** banking, `[Requires]` / `[Spend]` / ritual Active-when
  **enforcement**, and **legendary commander victory** — removed.
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
- docs/OPEN_DESIGN.md — OPEN / ASSUMED / DECIDED / cleanup notes
- docs/DEFERRED_CATALOGUE.md — unmodelled print
- docs/KEYWORDS.md — print keywords (appended on the Rules tab)
- docs/ARCHITECTURE.md — software advance path
- src/server/model/config.ts — numeric knobs
- specs 008–015 — chain, prevent, hooks, strip/destroy, vocabulary, markers, mill
-->
