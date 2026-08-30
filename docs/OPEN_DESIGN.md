# Open Design Register

Required by the SPDD agent instructions §48. Every question the game bible
leaves unresolved is tracked here rather than being answered silently in code.

Engine code lives in `src/server`. Catalogue print lives in
`src/server/content/{cards,creatures,faces}/*.json`.

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

### Shared cost marker (superseded)

**Status:** `SUPERSEDED` · 2026-08-24 · by **Attribute pile-up** below

Costs and attack fuel now use the player's **attribute pile**
(`PlayerState.attributePool`). See
[`docs/specs/016-attribute-pile-up.md`](./specs/016-attribute-pile-up.md) and
[`docs/RULEBOOK.md`](./RULEBOOK.md) §§6–8.

### Printed 1-token playCost is exceptional

**Status:** `DECIDED` · 2026-08-20 · bible §34.5 · `author-content` / card-designer

Do not author `playCost` totaling **1 pile token** as the default cheap band.
Those cards must be narrow and niche so 2+ cards stay appealing. The primary
way to play for 1 token is **cost reduction** (next-forge, standing discounts, on-roll
reduction) applied to a higher printed cost. Remaining 1-costs (Camshaft as a
Mechanical-face-gated forge-discount enabler, Ritual of Contamination, blessing
overloads, …) are not a license to add more generic 1-drops. Ritual of
Contamination remains a documented install exception: the real tax is stay/peel,
not the header.

### Variable (`?`) tactic pile costs

**Status:** `DEFERRED` · true variable pay-at-least-N is not in the catalogue yet.

Figma header `?` means **pay at least one pile token, and optionally more**.
Until spend UX and `playCostPaid` scaling exist, catalogue cards that print `?`
use a **fixed** `playCost` (often 2). See `src/server/content/cards.ts` and
`DEFERRED_CATALOGUE.md`. Do not use that gap as a reason to author 1-token
`playCost`; prefer 2+ and discounts (see “Printed 1-token playCost is exceptional”).

### Battlefield capacity

**Status:** `DECIDED`

Two frontline slots plus a back row, from the diagram in bible §6. A squad of
three deploys as two frontline and one back. The **legendary** always opens in
the back (definition flag); non-legendaries fill frontline first — see
**Legendary commander victory** below.

### Legendary commander victory

**Status:** `DECIDED` · 2026-08-29 · playtest · `CreatureDefinition.legendary`

Bible §4’s “eliminate opposing creatures” is replaced for constructed play:

- Every creature definition may set `legendary: true` (omit / false otherwise).
- Every legal loadout squad has **exactly one** legendary among
  `creaturesPerPlayer` (3) creatures.
- At match start the legendary is placed **back**; the other two fill
  **frontline** first. Mid-match `[Swap]` / reposition is unrestricted.
- When a player’s legendary is defeated (`defeated: true`), the **opponent
  wins** immediately. Defeating the other two alone does not win.

Implemented in `validateSquad`, `buildCreatures`, `checkVictory`, and
`docs/RULEBOOK.md` §1–§3.

---

## Resolved — design discussion, 2026-08-07 (second round)

### Attacks are paid from attributes absorbed onto the attacking creature (superseded)

**Status:** `SUPERSEDED` · 2026-08-24 · See **Attribute pile-up** and [`016-attribute-pile-up.md`](./specs/016-attribute-pile-up.md).

### Attribute pile-up (player resource bank)

**Status:** `DECIDED` · 2026-08-24 · spec `016`

Attributes the player holds live in a **persistent player pile**
(`PlayerState.attributePool`).

```text
absorb (attribute) → +1 in your pile     → enables attacks / ritual gates / spends
absorb (Shield)    → Shield on a creature → prevent
resolve            → stays in turn pool   → `[Requires]` spends this turn
```

| Surface | Paid from | Bible |
|---|---|---|
| Engine ability | unabsorbed symbols in the turn pool | §17 |
| Attack | owner’s attribute pile (`requires` gate and/or `discards` Spend) | §7, §31 |
| Ritual Active-when / Spend | owner’s attribute pile | layouts / `002` |

- Shield, Toxin, and other **creature** tokens remain on creatures.
- Absorbing an attribute into the pile is **immediate** (no end-of-turn delay),
  so same-turn attack after banking is legal.
- Face / standing `On absorb` fires when a pip is banked into the pile (or
  Shield is granted onto a creature).
- Ritual `activeWhen` gates readiness from the owner's pile; optional `spend`
  on activate burns pile tokens when the card activates.

Phased delivery: [`016-attribute-pile-up.STATUS.md`](./specs/016-attribute-pile-up.STATUS.md).

### Banked attributes have a payoff (superseded)

**Status:** `DECIDED` — see **Attribute pile-up** above.

### Turn-pass pile grants (superseded)

**Status:** `SUPERSEDED` · 2026-08-24 · by **Attribute pile-up**

Turn end is voluntary (`END_TURN`) or from effects. There is no incoming pile
grant on pass.


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

### Composition of the starting dice (superseded)

**Status:** `SUPERSEDED` · 2026-08-19 · See **Constructed opening dice** below.

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

What a player wants to keep as **attributes** is absorbed into their
**attribute pile**. Shield still sits on a creature. Unabsorbed turn-pool
symbols still expire at end of turn.

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

### Attributes reachable only by forging (superseded)

**Status:** `SUPERSEDED` · 2026-08-19 · See **Constructed opening dice** below.

### What costs playCost from the pile

**Status:** `DECIDED` · implemented for tactic cards

Playing or forging tactic cards burns the header `playCost` from the owner's
attribute pile. Engine abilities cost symbols from the turn pool; attacks cost
pile tokens per `[Requires]` / `[Spend]`. Both `PLAY_CARD` and synthetic
`FORGE_CARD` pay the printed header `playCost`.

### Equipment and opponent forging

**Status:** `DECIDED` · implemented for the subset below

- Equipment attaches to a creature and stays in the `equipment` zone until
  destroyed or the host dies.
- Friendly equipment (War Axe) may only target your own creatures.
- Opponent equipment (Black Plague) may only target theirs.
- `attack-damage-bonus` abilities add to damage on attack (War Axe; War Banner
  uses `bearerRelation: "left-ally"`).
- `play-cost-discount` / `ignore-shield` standing abilities (Archmage, Tome,
  War Minotaur) — spec `012`.
- `destroy-equipment` removes one piece of gear from a creature (Calculated
  Sacrifice). After the creature is known, 2+ attached pieces open
  `choose-equipment`; a single piece destroys without a second prompt.
- Forging may name an opposing die when the card's forge region says so
  (Black Plague).

Roll-triggered gear (Black Plague) and on-damage / on-absorb / on-change-position
hooks landed in `010-trigger-hooks`. Twin Blades push print rewritten (remove Shield).

### Forging draws a card

**Status:** `DECIDED` · implemented

Whenever a player forges a die face — on their own die or an opponent's — they
draw one card per face installed. This is a forge rule, not a card effect: empty
deck still stops quietly.

### Forge yield and synthetic forge bank

**Status:** `DECIDED` · 2026-08-29 · playtest · implemented

Forge was too weak as a late-game income path (players still banked ~2
attributes/turn from opening pips). Own-die forge is the universal scaler
every deck can use:

| Rule | Behaviour |
|---|---|
| **Forge yield** | `installFacesOnDie` onto a die you own marks each overwritten slot `forgeYield: true`. Opponent-die installs do not. Opening slots have no yield. Overwrite / peel clears yield unless re-set. |
| **On roll** | When a `forgeYield` slot is showing after `ROLL_DICE`, generate `forgeYieldGenerate` (default **1**) extra of that face’s attribute for the die owner (effect Generate / auto-bank). Skip Shield / untyped. |
| **Synthetic bank** | Successful own-die **synthetic** `FORGE_CARD` only: bank `forgeBankPerFace` (default **1**) of the forged face’s attribute into the forger’s pile per face installed. Natural forge: install + draw + yield only (no immediate bank). |

Config knobs: `GameRulesConfig.forgeYieldGenerate`, `forgeBankPerFace`. See
`docs/RULEBOOK.md` §11. Not a print keyword — forge rules like draw-on-forge.

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

**Status:** `DECIDED` · place / prepare / activate · **Active-when source
updated 2026-08-24** (spec `016` attribute pile-up)

A Ritual is played onto the engine area, not resolved from hand like an Instant:

| Orientation | Visual | Meaning |
|---|---|---|
| `preparing` | tapped | Waiting for owner’s attribute pile to meet Active-when |
| `ready` | untapped | Gate met; standing abilities on; may activate if print has an activate body |
| `exhausted` | diagonal | Used this turn (once-per-turn rituals) |

Rituals are placed without progress counters on the card. `activeWhen` is
checked against the owner’s **attribute pile**. Rituals with no
`[Active when: …]` become ready as soon as they hit the field. Optional
`spend` on activate burns from the pile (decision sink). Requirement wildcards
may still help meet Active-when when banking / checking as specified in `016`.

At the start of your turn, exhausted rituals come off diagonal. If the pile
still meets Active-when the ritual returns to ready, otherwise preparing.
Instant and reaction rituals leave for the graveyard after one activation;
only `continuous` rituals stay and exhaust. Standing triggers fire while ready
and do not spend Active-when / Spend unless the card activates.

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
- Runic Nullification: header `playCost` paid on place; activation pays **`[Spend: 2 x Arcane]`**, then negates the top tactic link.

**Once an effect is conducting**

- After both seats pass and a link begins resolving, that link’s body runs to
  completion and cannot be interrupted mid-flight.
- No reaction window while `pendingDecision` is search / discard /
  choose-creature (those are part of conducting the effect).

### Damage prevention

**Status:** `DECIDED` · 2026-08-26 · attack-instance prevent in
`docs/specs/009-true-prevent.md` · **tightened 2026-08-29** (reaction-exclusive)

- **`[Prevent]` / `grant-attack-prevent`** is **reaction-exclusive**. It only
  applies while a living **attack** link is on the chain, and only onto **that
  attack’s target**. No attack on the chain → the effect **whiffs** (no
  charge). It is not a proactive “arm next attack” from faces, creature
  attacks, or absorb passives.
- A legal reaction grant adds `attackPreventCount` (usually 1). The next
  **attack** against that creature is cancelled whole (before Shield). Unused
  charges from legal grants persist until consumed (`preventExpiry: "none"`).
- Damage-prevent **buffers** (`damagePreventBuffer` / `grant-damage-prevent`)
  are **gone** — they mixed with Shield at the table.
- **Apply order when attack damage lands:** attack-prevent → Shield → HP.
- Non-attack damage (toxin, face Strike, effect damage) does not consume
  attack-prevent.
- **Prismatic Barrier / Sidestep** — **DECIDED** 2026-08-26: `[Prevent]` on
  the **ally targeted by the attack** being responded to (`grant-attack-prevent`
  1, `chain-attack-target`). Proactive Luminar print uses `[Mark N Shield]` /
  `[Heal]` instead.

Attack chain links open a reaction window so prevent reactions can respond;
negate effects refuse attack links.

**Reaction costs (DECIDED · current):** Reactions pay `[Spend]` from the
reactor's **attribute pile** during the reaction window, same as other pile
costs. Turn end is voluntary (`END_TURN`) or from effects that say so.

### Toxin counters

**Status:** `DECIDED` · implemented (playtest 2026-08-29: end-of-turn clear)

Toxin counters are tokens on a creature. Soft global max is
`maxToxinMarkers` (default 3) after any Adaptive Toxin receive cap. At the
**end** of that creature's owner's turn (before the active player switches),
the creature takes damage equal to its current markers, then all markers are
cleared. `on-toxin-damage` may re-seed markers after the clear for a later
cycle. Adaptive Toxin’s absorb is `[Strip 3 Toxin]. [Strike equal]` (fixed 3,
no choose-count pending) and toxin receive cap are wired in spec `013`.

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
· implemented in `src/server/model/state.ts`, `src/server/rules/symbols.ts`,
  `src/server/reducer/reduce.ts`

The game has **two phases: Roll and Actions**. Absorption is not a separate
phase. During **actions**, players may bank attributes, absorb Shield onto
creatures, attack, play, forge, activate ready rituals, and end the turn.

- `TURN_PHASE_ORDER`: `roll` → `actions`. `END_TURN` is an action, not a phase.
- `ROLL_DICE` enters `actions`.
- Absorb is legal throughout **actions**, including on symbols created
  mid-turn (effects, extra rolls).
- Ready rituals may activate during actions (not during roll).
- Instinct's optional bonus basic is legal in actions (`optional-bonus-attack`).

**ASSUMED:** `rolled` vs `available` remain distinct statuses as provenance
(die pip vs effect-generated). They are **not** a phase gate. Both are the
same unabsorbed set for absorb and spend (`usableSymbols` / `planConsumption`).

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

**Status:** `DECIDED` · implemented (playtest 2026-08-26: Yu-Gi-Oh-sized)

| Rule | Value |
|---|---|
| Minimum size | 40 |
| Maximum size | 50 |
| Max copies of the same card id | 3 |

Was M4 50–60 / 4 copies. There is no tactics per-attribute cap. (Earlier
prototype used 12 cards / 3-per-attribute; superseded.)

### One deck, and every card carries both regions (superseded)

**Status:** `SUPERSEDED` · 2026-08-10 · See **Face deck and tactics deck are separate**. Tactics still carry both regions; faces come from the face deck.

### Opening hand and draw rate

**Status:** `DECIDED` · implemented (`openingHandSize: 5`, `cardsDrawnPerTurn: 2`)
· playtest 2026-08-20: now 2 (was 1)

Open with 5 cards; draw 2 at the start of each of your own turns.

### Running out of cards

**Status:** `DECIDED`

Nothing happens. A player with an empty deck simply stops drawing. The match is
still decided by defeating the opposing legendary, so there is no deck-out loss
and no reshuffle.

Worth watching: matches currently run around eighteen turns, so a twelve-card
deck drawn at two a turn empties well before a winner emerges. That makes the
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
| **playCost discounts** | Apply to `PLAY_CARD` / ritual place / equip / overload, **not** `FORGE_CARD`. “Used” = played for its play region. Min cost 0. |
| **Archmage** | First Arcane **card** (any main type) the controller plays that turn costs 1 pile token less from `playCost`. |
| **Tome of Interdiction** | First Instant Arcane that turn costs 1 less from `playCost`. Stacks with Archmage (Instant Arcane can be −2). Spent keys on the host creature / gear; cleared `END_TURN`. |
| **Paradox GY replay** | Choose 1 Instant or Ritual in the controller’s GY; resolve that card’s play effects (`effect.effects` or `ritual.effects`) immediately; ignore `[Requires: …]` / Active-when; do not pay that card’s `playCost` / Spend; the card **stays in the GY**. Creature-target effects open the usual choose pending. Cards without a playable effect body cannot be chosen. |
| **Ignore N Shield / pierce** | When the attacker deals attack damage: prevent buffers first (`009`), then skip up to N Shield (those shields are **not** spent), then remaining shields, then HP. War Minotaur: `ignore-shield` 1 standing. Rust: arm `ignoreShieldThisTurn` 2, clear `END_TURN`. |
| **Attack follow-ups** | `AttackDefinition.followUpEffects` queues extra `EffectDefinition`s after the damage link. Existing cards omit the field. |
| **Garuda Dive** | Range 2-damage basic. The optional swap rider was removed (Wild must not print Martial movement). |
| **War Charge swap** | If Minotaur is in `back` after declaring, swap with a chosen living frontline ally (required if one exists; skip if none). |
| **War Banner left ally** | Owner’s `creatureIds` order is left-to-right. “Allied creature to the left” = previous **living** creature in that list. Static `attack-damage-bonus` with `bearerRelation: "left-ally"` on that ally’s **basic** attacks. No living left neighbor → no bonus. |
| **Alpha's Hide** | On special attack by the bearer: generate 1 Wild into the **controller’s pool** (not attached to the bearer). |
| **Formation “gains 1 Shield”** | `grant-shield` 1 on a chosen allied frontline creature other than the absorber (`choose-allied-frontline-other`). Playtests replaced the old “+1 Defense this turn” / `grant-damage-prevent` reading — bible has no DEF stat. On roll “if this creature is on the frontline”: at roll time faces have no host creature, so the condition is **controller has a living frontline creature**. |
| **Opponent draws** | `draw-cards` with `player: "opponent" \| "controller"` (default controller). Forbidden Heritage On roll: opponent draws 1. |
| **Retain-from-effect** | Marks a chosen owned die retained (same rules as `RETAIN_DIE`, including a known rolled slot). |
| **Requirement wildcard** | One-shot: a matching pool symbol may pay any `[Requires]` / ritual Active-when attribute this turn (Resonance absorb). Consumed when used. |
| **Pack adjacent** | Another living ally shares a **`creatureIds` neighbor (±1)** among living creatures. At roll, `has-adjacent-ally` is true if any two consecutive entries in the controller’s `creatureIds` are both living. |
| **Instinct On absorb** | `[Frenzy]` on a chosen allied creature (`grant-extra-attack` 1). Raises `extraAttacksThisTurn`; does not clear attacks already used. Spec `013` optional-bonus-basic-attack remains for other print; Instinct no longer uses it. |
| **Aegis redirect** | Until EOT, up to 2 damage that would be dealt to **another** allied creature is dealt to the absorber instead (before prevent/shield on the original). Turn-scoped `redirectDamageThisTurn` on the absorber. |
| **Revelation heal** | Heal 2 on an allied creature with damage **strictly greater than** half life (`damage > life/2`). |
| **Mirrored Rune** | On absorb Arcane: generate 1 extra symbol matching **another** symbol currently in the controller’s available/rolled pool (`copy-pool-symbol`). |
| **Arcane Echo tactic** | Re-run showing face `onRoll` + that face’s overload `onRoll` for a chosen owned die. Does **not** generate the inherent symbol a second time. |
| **Arcane Echo face** | On roll: re-fire the **other** owned die’s showing-face `onRoll` + overload `onRoll` (same as the tactic). Not a full attribute/overlay copy of the other face. |
| **Extermination consume** | Consumed synthetic Corruption slots are replaced with natural Shield (placeholder so the die stays 6 faces). Not a forge — no forge-draw. Damage `2 * consumed` split across up to 2 creatures. |
| **Adrenaline self-damage** | After optional reroll, if the new face is still this overloaded face: 1 damage to each of up to 2 **distinct** living allied creatures (fewer if fewer living). |
| **Pestilent Plague at 2** | Counters **reset** then try to forge another Pestilent Plague onto an adjacent slot of the same die (pool / already-installed copy, existing install rules). Threshold is catalogue `pestilenceSpreadAt` (2). Copy comes from the spreading slot’s `faceCardOwnerId` (the corrupter), not the rolling die owner. If illegal (no slot / cannot-replace / no pool / attribute cap), skip the forge; counters stay at 0. |
| **ACTIVATE_FACE** | Legal in actions on the showing slot. Cost `spendBase + spendPerCorruptionOnDie * (synthetic Corruption faces on that die)`. Removed face returns to its owner’s pool like unforge; slot becomes Shield. Draw-on-forge does not apply. Peel is **not** blocked by stay / forge-lock. |

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

**Status:** `ASSUMED` · catalogue in `src/server/content/{cards,faces}.ts`

Bible §27 says Corruption effects should be **expensive**. Playtests showed
`playCost` 2 + Requires Arcane+Corruption for **one** opponent-die face was too
expensive versus own-die forge instants, and free overwrite made contamination a
stall rather than a tempo steal.

Assumption: **install is affordable; stay and peel are the expense.** Stick comes from stay-on-slot (Forbidden Heritage never-replace; Pestilent Plague 4 die-owner-turn forge-lock that resets on new Plague) plus `ACTIVATE_FACE` peel `2 + Corruption faces on that die`. Stain / Infection remain marker harassment that does not occupy a slot (the cheap dodge of a face install).

| Card | Old | Tempo retune |
|---|---|---|
| Ritual of Contamination | playCost 2, Requires Arcane+Corruption, 1 opponent-die face | playCost **1**, Requires **Corruption** |
| Great Contamination | playCost 5, Active when Arcane+Corruption+Corruption, 3 faces | playCost 3, Active when **Corruption+Corruption**, still 3 faces |
| Black Plague | playCost 4, forge opponent-die **or** equip | playCost 2 |
| Persistent Infection | playCost 4, own-die overload | playCost 2 |
| Latent Corruption | playCost 4, Arcane-face overload | playCost **2** |
| Extermination | playCost 6, consume Corruption → damage | Unchanged (late conversion, not an install) |

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

English printings are in `docs/specs/004-face-cards.md` and `src/server/content/faces.ts`.
Crush, Rending Claw, Arcane Echo (re-fire other die onRoll), Blade Rain, Forbidden
Heritage, and Pestilent Plague are wired. Great Spark / Rekindle still lack
printings. Face-marker systems (Stain, Decay, Catalyst, Overcharge, Adaptive Toxin,
Infection roll, Instinct absorb) are wired in `013-face-markers.md`.

### Whether a creature's fuel is capped

**Status:** `OPEN` — not blocking (cap still undecided)

**Why it matters.** Tokens persist and are spent by attacks that name
`discards`. A player that banks long enough can still accumulate without a
hard cap. (`[Drain N]` is life transfer — see DECIDED row below — not pile
steal.)

**The question.** Is there a cap per player, or per attribute?

**DECIDED (playtest, 2026-08-26).** Attribute tokens live on the player pile.
You cannot Strip Martial/Arcane off a creature.

**DECIDED (playtest, 2026-08-29).** `[Drain N]` / `drain-life` transfers life:
deal up to N damage to a chosen enemy (normal Prevent → Shield → HP), then
heal your **most-damaged ally** for the **HP actually lost** (auto; no second
creature choice). Siphon Sigil / Share the Kill / Hexbrand / Nightbound Adept /
Nightwell / Umbra Gravewarden prove it. Spec `011`.

**ASSUMED (label for homogeneous discard order on other effects).** When
there is no mix leftover for token discards, strip uses `ATTRIBUTES` array
order (`martial` → … → `darkness`). Token **cap** remains OPEN.

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

War Charge swap is queued as attack `followUpEffects` (after the damage
effect resolves on the chain). Optional `swap-positions` still supports a
decline. Garuda Dive no longer swaps.

**Banned forever:** any effect that moves an **enemy** creature (push).

---

### Whether a named Natural face is free on opening dice

**Status:** `OPEN` · 2026-08-30 · raised by `face-natural-dawnwright`

**Why it matters.** `isOpeningBasicFace` (`src/server/rules/loadout.ts`) treats
**any** face whose `kind` is `natural` as an opening basic, so it neither
consumes a face-deck row nor counts against
`startingMaxSyntheticsPerDie` / `startingMaxSyntheticsPerPlayer`. That was
written when every Natural was one of the eight identity blanks. Dawnwright is
a **named** Natural with printed `On roll: [Generate 1 Luminar]`, so a
constructed layout can currently paint it onto opening slots for free and get a
strictly better basic than `face-natural-mechanical`.

**The question.** Is "basic" defined by `kind === "natural"`, or by being an
identity face (`id === face-natural-<its own symbol>`)?

**Design intent (card-designer, not yet implemented).** Identity. A named
Natural should be packed and capped like any other named special; only the
eight blanks and Shield stay free. The catalogue side of that is already
asserted (`faceKindPolicy.test.ts` keeps named naturals out of
`BASIC_FACE_CARDS` and inside `SPECIAL_FACE_CARDS`), but loadout legality is
engine work and is **not** done — an `engine-developer` change to
`isOpeningBasicFace` plus `validateStartingDice` coverage is required before
named Naturals are safe in constructed.

**Decision.** TBD.

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

## Resolved — attribute exclusive mechanics, 2026-08-21

### Each attribute owns one exclusive verb

**Status:** `DECIDED` · authoring canon in `.cursor/skills/author-content/design.md`
· bible §29

Not a rules-engine change. Card-designer must not print another attribute’s
signature verb. Shared secondaries (damage, own-attribute generate, tiny heal,
a single attack bonus, cost reduction, forge of your own attribute) stay legal.

| Attribute | Exclusive verb |
|---|---|
| Arcane | See and rearrange the top of your deck |
| Darkness | Mill |
| Luminar | Damage prevention |
| Corruption | Opponent-die manipulation |
| Toxin | Toxin counter placement |
| Martial | Ally creature movement (swap / reposition) |
| Mechanical | Own-die reconstruction (extra/replace/re-fire **your** faces and overloads) |
| Wild | Extra attacks (`[Frenzy]`) |

Catalogue off-pie leaks (Sift, Sidestep, Predator’s Claws, …) were moved or
rewritten — do not copy the old print. Wild's exclusive is `grant-extra-attack`
(`[Frenzy]`). Darkness mill is `mill-cards`.

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
| Whether forging a card costs its `playCost`, or only playing it does | §19, §20 | Forging |
| The keyword for the forging action | — | Card layer |
| Overload cards allowed per face | §37 | Forging |
| Secondary victory conditions and ties | §4, §37 | Content — primary win is legendary defeat (`DECIDED` 2026-08-29); secondary/ties still open |
| Stun application and removal timing | §22 | Reopening stun |

Reaction timing windows (bible §37) are **DECIDED** above
(“Reactions use a Yu-Gi-Oh style chain”, 2026-08-12).
