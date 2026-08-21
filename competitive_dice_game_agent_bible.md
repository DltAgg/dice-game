# Competitive Dice Skirmish — Agent Game Bible

> **Purpose:** This document is the canonical context for AI/software agents working on the game's rules, card design, balance, implementation, simulation, content generation, and documentation.
>
> **Source of truth:** The latest agreed design decisions in the conversation and the current GDD. Where the GDD contains unresolved questions, this document marks them as **OPEN** rather than silently inventing a rule.

---

## 1. Agent Instructions

When working on this game, agents MUST:

1. Treat the **dice engine as the protagonist**.
2. Preserve the game's identity as a **competitive skirmish + dice engine-builder**.
3. Prefer decisions and interactions over passive/random outcomes.
4. Keep combat rules simple; complexity should emerge from engine construction and sequencing.
5. Remember that a player controls only **three creatures**, so creature removal must generally be meaningful and not trivial.
6. Avoid designs that cause creatures to disappear too quickly unless the effect is deliberately high-cost, conditional, or part of a major payoff.
7. Preserve meaningful player interaction through reactions, rituals, equipment, dice manipulation, resource denial, positioning, and timing.
8. Avoid making any attribute universally good at everything.
9. When proposing a new mechanic, explain:
   - what problem it solves;
   - what decision it creates;
   - how it interacts with dice;
   - how it affects the three-creature constraint;
   - which archetypes benefit from it;
   - possible abuse cases.
10. If a rule is not established, label it **OPEN** instead of presenting an assumption as fact.

### Design hierarchy

When rules conflict, prioritize:

1. Core game identity
2. Dice-engine interaction
3. Meaningful decisions
4. Player interaction
5. Archetype identity
6. Balance
7. Convenience / complexity

---

# 2. Game Identity

## Elevator Pitch

A competitive **Skirmish Engine Builder** where each player controls a small squad of creatures and progressively customizes their dice during the match.

The dice are the game's engine. They generate temporary symbols that feed abilities, cards, rituals, equipment, and creature actions.

Creatures convert those symbols into meaningful actions.

Cards modify the engine.

The ultimate objective is to eliminate the opponent's creatures.

The game should feel like a mixture of:

- tactical skirmish;
- engine building;
- customizable dice;
- creature management;
- resource sequencing;
- interactive card play.

The important distinction is that the player is not simply playing cards *with* dice.

**The dice are the engine through which the cards and creatures operate.**

---

# 3. Core Design Pillars

## 3.1 The Die Is the Protagonist

No dominant strategy should be able to ignore the dice.

Cards should generally:

- modify dice;
- exploit dice results;
- manipulate symbols;
- create opportunities around dice;
- convert dice outcomes into creature actions **or** into card, ritual, face, and status effects (including damage).

A card that could function identically without dice should be scrutinized.

---

## 3.2 Combat Is Simple

Creatures should be easy to understand.

Creatures primarily have:

- Life;
- Attributes;
- available attacks;
- attack requirements;
- optional passive abilities;
- optional activated abilities.

Creatures do **not** use a conventional ATK/DEF system.

The tactical complexity comes from:

- which symbols are available;
- which creatures absorb symbols;
- which symbols remain available to the engine;
- positioning;
- equipment;
- rituals;
- timing;
- sequencing.

---

## 3.3 Rolls Create Decisions

A roll should never be merely:

> "I rolled X, therefore I do X."

The roll should create choices such as:

- use a symbol for the engine;
- let a creature absorb it;
- retain/store it;
- trigger an effect;
- preserve a die;
- alter the die;
- prepare a ritual;
- respond to an opponent.

---

## 3.4 Deckbuilding Matters

The player's strategy begins before the match.

The chosen creatures determine or influence:

- available attributes;
- available face cards;
- available tactics;
- archetype identity.

The dice then evolve that initial strategic identity during the match.

---

## 3.5 Every Match Evolves

Players should start with comparable baseline engines and end with substantially different engines.

The progression should be visible:

**Base dice → early specialization → engine development → strategic identity → endgame engine**

---

# 4. Win Condition

The primary victory condition is:

> **Eliminate all opposing creatures.**

Each player normally begins with **3 creatures**.

Because the creature count is intentionally low, creature removal is strategically significant.

Eliminating a creature means reducing its Life to zero (or otherwise defeating it). **Creature attacks are not the only, or even the primary, way to deal that damage.** Tactics, rituals, faces, equipment, statuses, and other engine conversion may deal as much or more of the damage that ends the match as creature combat does. Archetypes with weak attacks (especially Control) must still have a clear damage plan.

### Secondary victory conditions

**OPEN**

Cards may introduce secondary victory conditions, but these should not undermine the central creature-skirmish identity.

---

# 5. Player Components

Each player has:

- 2 customizable dice;
- 3 creatures;
- 1 tactics/card deck;
- 1 face deck;
- energy/memory marker;
- relevant counters/tokens.

The player also interacts with:

- a shared energy/memory track;
- dice face cards;
- retained-resource tokens;
- equipment;
- rituals;
- creature states.

---

# 6. Battlefield

Conceptual battlefield:

```text
────────── ENEMY ──────────
[CF1] [CF2] [CF3] [CF4] [CF5]

       Enemy Engine Area

        [Back]

       [F1]   [F2]

───────────────────────────

       [F1]   [F2]

        [Back]

       Your Engine Area

[CF1] [CF2] [CF3] [CF4] [CF5]
────────── YOU ─────────────
```

## Frontline

Frontline creatures protect creatures in the back.

A normal attack cannot freely bypass the frontline.

Creatures with **Range** may ignore the frontline restriction where specified.

## Back

The back represents a rear position for creatures that are not currently in the frontline.

## Engine Area

The engine area contains continuous/non-creature cards such as:

- Rituals;
- other persistent engine pieces.

## Face Cards

Face cards represent the faces currently installed in the player's dice.

The number of face cards visible in the game may grow beyond the initial baseline as dice are forged.

---

# 7. Creatures

A creature has:

- **Life**
- **Attributes**
- **Attacks**
- **Attack requirements**
- **Passive ability** (optional)
- **Activated ability** (optional)
- potentially other explicitly defined keywords

Creatures do not have a conventional attack stat.

## Creature Energy / Absorption

During the symbol-generation phase, a creature may **absorb** a generated symbol.

When a creature absorbs a symbol:

1. The symbol is removed from the resources available to the engine for that turn.
2. The die associated with the absorbed symbol is placed on/over the creature until the end of the turn as a visual marker.
3. During engine resolution, the absorbed symbol does **not** count as an available engine symbol.
4. At end of turn, the die is returned and the game may replace the visual marker with an attribute token representing the absorbed energy.

The key gameplay principle is:

> **Absorbing a symbol powers a creature, but sacrifices engine value.**

This is one of the game's central decisions.

## Creature Attacks

Normally, a creature can use at most **one attack per Combat phase**, unless a specific effect says otherwise.

Multiple creatures may attack during the same Combat phase.

---

# 8. Deckbuilding

Each player chooses:

- 3 creatures;
- a tactics deck;
- a face deck.

The selected creatures define or unlock the strategic card pool.

### Example archetypal pools

Necromancer-style creatures:

- Death
- Blood
- Ghost

Beast-style creatures:

- Nature
- Wild
- Moon

The exact attribute names/pools may evolve, but the principle is stable:

> **Creature selection establishes the player's strategic vocabulary.**

---

# 9. Dice

Each player begins with **2 customizable d6**.

The dice are progressively forged during the match.

A die has six physical faces.

A face can be replaced by another face.

---

## 9.1 Attribute Limit

A die may contain a maximum of **4 faces sharing the same attribute**.

This prevents extreme mono-attribute dice from becoming overly consistent.

The limit applies to the physical composition of the die.

---

# 10. Face Types

There are two major face categories.

## Natural Faces

Natural faces are baseline/default faces.

They generally:

- have no intrinsic effect;
- form the initial engine;
- are easier to access;
- should not create excessive early-game power.

Natural face overload capacity should remain relatively low.

This intentionally limits overly explosive early-game engines.

## Synthetic Faces

Synthetic faces are acquired through card effects.

They may have intrinsic effects.

Synthetic faces are generally a mechanism for:

- specialization;
- disruption;
- advanced engine construction;
- archetype identity.

Synthetic faces can also be installed onto an opponent's die when a card permits it.

---

# 11. Face Cards

Each distinct face is represented by a face card.

A face card contains:

- Name
- Face symbol/art
- Type: Natural or Synthetic
- Attribute
- Intrinsic effect, if any
- Maximum overload capacity

Face cards do not normally have a direct Energy cost.

They enter play by being forged/installed through other effects.

---

# 12. Face Deck

The face deck represents all faces selected during deckbuilding.

Current intended limit:

- up to **12 face cards**;
- maximum **3 cards of the same attribute**;
- initial natural faces are separate from this limit.

Every forged face must originate from the relevant face deck.

If all copies of a face represented by a card are removed from the dice, that face card returns to its owner's face deck.

### Important ownership rule

If Player A forges a synthetic face onto Player B's die:

- the physical face belongs to Player B's die while installed;
- the face card originates from Player A's face pool;
- when the face is removed, the card returns to its owner.

This creates an important distinction between:

**installed physical state** and **card ownership**.

---

# 13. Forging

Installing a new face replaces an existing face.

A forging effect specifies:

- target die;
- face to install;
- quantity;
- Energy cost;
- optional symbol cost;
- restrictions;
- requirements.

A forging effect may:

1. create another copy of an already-installed face; or
2. transfer a face card from the owner's face deck to represent the newly installed face.

If a specific face is required, the card must satisfy that exact requirement.

---

# 14. Overload

**Overload** is the equivalent of attaching equipment/modifiers to a die face.

A face may receive additional effects.

The face card specifies how many overload/modifier cards it can support.

Overload effects can make a simple face substantially more valuable.

Example:

> Fire face: "Whenever this face is resolved, draw 1 card."

If the face is absorbed by a creature, its engine effect does not trigger because it was not resolved by the engine.

This creates another important choice:

> **Do I spend this symbol on my creature, or do I leave it available to activate my upgraded die engine?**

---

# 15. Symbols

Symbols are temporary resources generated by dice.

Symbols:

- are generated by dice;
- can be consumed;
- can be converted;
- can be duplicated;
- can be stored/retained;
- can energize creatures;
- can satisfy ritual requirements.

A symbol does not necessarily have an intrinsic meaning.

Its meaning comes from the effects that consume or reference it.

---

# 16. Core Turn Flow

The current conceptual flow is:

```text
Roll Dice
   ↓
Generate Symbols
   ↓
Choose Absorption / Resource Allocation
   ↓
Resolve Engine
   ↓
Combat
   ↓
Spend Energy / Execute remaining actions
   ↓
Modify / Forge Dice
   ↓
End Turn
```

The exact ordering of substeps remains subject to refinement.

---

# 17. Engine Resolution

The player chooses how to resolve compatible engine effects.

Example:

Creature A:

> Consume Fire → deal 2 damage.

Creature B:

> Consume Nature → heal 2.

Equipment:

> Whenever you heal → generate Star.

Creature C:

> Consume Star → draw 1 card.

The player may choose the order in which effects resolve.

Therefore:

```text
Nature
→ heal
→ equipment generates Star
→ consume Star
→ draw
```

can be different from:

```text
Star
→ draw
→ Nature
→ heal
```

The engine should reward sequencing and planning.

---

# 18. Energy / Memory

The game uses a shared Energy resource inspired by the memory system of Digimon TCG.

Energy can be spent on:

- installing faces;
- equipment;
- instant effects;
- rituals;
- activated abilities;
- other actions.

The Energy track creates tempo.

Printed tactic costs should generally start at 2. Energy 1 on a card is an exceptional niche tool. Players should more often reach a 1-Energy play by reducing a heavier card than by drawing a printed 1-drop (see §34.5).

When a player spends beyond the relevant threshold, control passes / the turn ends according to the finalized memory-track rules.

**Implementation note:** The exact numerical threshold and turn-transition rules are **OPEN** and should not be hard-coded until finalized.

---

# 19. Card Architecture

The intended card architecture is a **two-use card**.

A card may have two functional regions.

## Upper Section — Face Installation

Contains:

- Energy cost;
- optional symbol cost;
- face being installed;
- quantity;
- restrictions;
- requirements.

## Lower Section — Tactical Effect

May represent:

- Equipment;
- Instant;
- Ritual;
- Reaction;
- other future tactical types.

The concept is that one card can participate in both:

1. **engine construction**, and
2. **moment-to-moment gameplay**.

This reduces dead cards and makes deckbuilding more strategically dense.

## 19.1 Print voice — holder perspective

Card text is written for the player who **currently holds the card on their field** (the die, creature, ritual row, or equipment zone where it sits).

- **you** / **your** means that holder.
- **opponent** / **opposing** / **enemy** means the holder’s opponent.

If a card is handed, forged, or equipped onto the other side of the table, the new holder is now “you.” Do not keep writing from the original owner’s or forger’s point of view. “Opponent” on a card sitting on the opponent’s die means *their* opponent (the player who sent it), not “the player who currently owns the physical face.”

When one player must choose a target and another must discard, strip, or pay, name both actors in the print. Ambiguous owner/controller jargon is a design bug.

---

# 20. Card Types

## Instant

Resolves once immediately and is discarded.

Use for:

- tactical bursts;
- temporary interaction;
- emergency conversion;
- combat tricks.

---

## Ritual

Rituals are persistent preparation-based effects.

A Ritual begins in a **Prepared** state.

It is placed face-up in the Engine Area, normally rotated horizontally.

The player fulfills its activation requirements over time.

When the requirements are fulfilled, the Ritual becomes **Active** and is rotated vertically.

### Continuous Ritual

Once active, remains in play and continuously generates/apply effects.

### One-shot Ritual

Once active, performs its effect once and is then discarded.

### Ritual requirement accumulation

Requirements may specify whether resources can be accumulated across multiple turns.

- **AND / cumulative requirement:** resources may be supplied over multiple turns.
- **+ / same-turn requirement:** all required resources must be supplied in the same turn.

Example:

> Ritual requirement: 3 Star.

A player may generate:

- Turn 1: Star + Shield
- Turn 2: Star + Star

The Ritual becomes active when its cumulative requirement is satisfied.

---

## Reaction

A Reaction responds to another action/event.

Reactions may remain on the field and trigger when their condition occurs.

Example:

> Whenever an opponent absorbs Fire, ...

Reactions are one of the primary mechanisms for maintaining player interaction.

---

## Equipment

Equipment attaches to a creature.

The equipment remains associated with that creature while active.

Its effects can trigger while the creature is equipped.

Example:

> Whenever this creature attacks, discard 1 Fire from the target.

If the creature attacks twice because another effect permits it, the trigger can occur twice.

---

# 21. Retained Resources

The game has two related concepts.

## Store / Guard a Symbol

A player may store a symbol for later use.

Example:

> Store 1 Fire.

This is represented by a resource token.

Stored resources can generally be consumed instead of current dice symbols.

Unless an effect explicitly requires a symbol to come directly from a die, a stored symbol may satisfy the requirement.

This creates a decision between:

- immediate flexibility;
- future reliability.

## Retain a Die

A player may retain a die/result so that it is not rerolled.

This preserves a result at the cost of reduced future variability.

The exact terminology between **store**, **retain**, and related mechanics should be standardized before implementation.

---

# 22. Stunned Dice

A die can become **Stunned**.

While stunned:

- it cannot be rolled;
- its symbols do not contribute to the current roll/engine;
- it receives a stun marker.

At the beginning of the player's turn, after rolling, one stun marker is removed according to the finalized timing rules.

### Current limitation

A player may have only one stunned die at a time.

If both dice would be stunned, the player may move the stun marker between dice so that only one remains stunned into the next turn.

This rule exists to prevent both dice from becoming permanently unavailable while still allowing meaningful disruption.

---

# 23. Player Interaction

Interaction should occur throughout the match rather than only during combat.

Primary interaction mechanisms include:

- Reactions;
- Rituals;
- defensive Equipment;
- creature disruption;
- die Stun;
- synthetic face installation;
- symbol manipulation;
- engine disruption;
- positioning.

Interaction should usually create a **decision problem**, not simply invalidate the opponent's turn.

---

# 24. Combat Philosophy

Combat is deliberately not the primary source of complexity **or of damage**.

The game should avoid becoming:

> "Play creature → calculate attack value → remove blocker."

Instead, combat should answer:

- Which creature attacks?
- Which creature is protected?
- Which creature was energized?
- Which attack requirements can I satisfy?
- Which resources must I sacrifice to attack?
- Is attacking worth giving up an engine symbol?
- How does equipment change the attack?
- What can the opponent react with?

Creature attacks remain one damage path (Aggro's usual closer). They are not a gate on lethality. Cards, rituals, faces, and statuses may deal the damage that wins, especially when an archetype's attacks are intentionally weak.

---

# 25. Creature Removal Philosophy

This is a critical balancing principle.

The game has only **3 creatures per player**.

Therefore:

- creature destruction is inherently high-impact;
- unconditional cheap removal is dangerous;
- repeated removal should be rare;
- early-game creature destruction should generally be difficult;
- control should preferably interact through tempo, positioning, resource denial, disabling, and engine manipulation before resorting to **permanent destruction** (“destroy this creature”).

That last point is about **state deletion**, not about withholding damage. Ordinary damage from the engine is progress (§34.3) and is a valid Control closer. Preferring disruption over cheap *destroy* effects must not be read as “Control does not deal damage” or “only creatures deal damage.”

A useful rule of thumb:

> **The smaller the creature count, the more expensive every permanent removal effect becomes.**

---

# 26. Attributes

The game uses thematic attributes rather than conventional elemental color-pie design.

Current important attributes include:

- **Martial**
- **Wild**
- **Toxin**
- **Arcane**
- **Luminar**
- **Mechanical**
- **Corruption**
- **Darkness**

These attributes should have differentiated strategic identities.

---

# 27. Archetype Philosophy

The current high-level archetypes are:

## Aggro

Primary focus:

- creatures;
- attacks;
- equipment;
- tempo;
- efficient symbol conversion.

Current strong attribute identity:

- Martial
- Wild
- Toxin

Aggro should win by converting dice into immediate creature pressure.

It should not simply have the best raw removal.

---

## Midrange

Primary focus:

- creature development;
- equipment;
- flexible engine construction;
- combat plus incremental value.

Midrange should sit between aggressive creature pressure and long-term control.

---

## Combo

Primary focus:

- engine chaining;
- symbol conversion;
- sequencing;
- repeated effects;
- high-value interactions.

Important attributes include:

- Luminar
- Wild
- Mechanical
- Toxin

Combo should require careful sequencing rather than simply producing large numbers.

---

## Control

Primary focus:

- rituals;
- engine manipulation;
- disruption;
- delayed value;
- resource denial;
- reactive play;
- converting that engine into lethal damage.

Important attributes include:

- Arcane
- Darkness

Control should win by creating a superior long-term engine, disrupting opposing plans, **and converting that engine into enough damage to eliminate creatures**. Disruption without a damage plan is not a win path: the victory condition is still eliminating creatures (§4).

Control creature attacks may stay weak. **Damage is not reserved for creature combat.** Tactics, rituals, faces, equipment, and statuses may deal the damage that closes the match. That damage should still read as the attribute (setup, consume, delayed, conditional, expensive) rather than as efficient Aggro attacks.

Do not treat “engine hate / disruption” as a substitute for lethality.

Control’s important attributes are **Arcane** and **Darkness**. Corruption is no longer a Control splash — see Burn below.

## Burn

Primary focus:

- stacking delayed damage;
- turn-start / on-roll / on-absorb ticks;
- markers that close the match without cheap creature beatdown.

Important attributes include:

- Toxin
- Corruption

Burn should win by ongoing attrition that the opponent cannot out-tempo with a single attack. It must still touch the engine (forge + standing rituals / overloaded faces). Unflavored “deal 1” with no forge is a miss.

### Corruption

Corruption is primarily a **synthetic** mechanic.

Its central concept is **continuous burn**: damage over time from standing rituals, opponent-equip hexes, and named faces that ping on roll or absorb. Installing a face onto an opponent's die may remain as **minor spice** when that face ticks damage (holder voice: they hurt themselves). Contaminate-the-die is not the primary plan and must not require Arcane, Darkness, or a four-resource Control manabase.

Corruption effects should:

- be setup-taxed (Energy 2+, Active-when / Requires), not cheap Aggro;
- stack or persist (each turn, on roll, on absorb);
- not become generic Arcane negate;
- not become generic creature-attack text.

### Toxin

Toxin’s primary identity is **burn ticks**: markers that deal damage at the start of the creature’s owner’s turn. Aggro may still use Toxin as creature-pressure (apply on attack). Burn leans harder into stacking, spreading, and amplifying those ticks without needing to attack.

---

# 28. Attribute Design Rules

Each attribute should have a primary strategic characteristic.

Do not give every attribute:

- large damage;
- healing;
- card draw;
- removal;
- disruption;
- resource generation.

Instead, attributes should have strengths and weaknesses.

### Important constraint

An attribute's primary identity should remain recognizable even when used outside its archetype.

For example:

- a sustain-oriented attribute should not become the game's strongest burst-damage attribute;
- a control attribute should not simply become efficient aggro;
- a combo attribute should not automatically provide the best raw efficiency.

---

# 29. Current Attribute Direction

| Attribute | Primary identity | Exclusive mechanic | Typical archetypes |
|---|---|---|---|
| Martial | Direct combat / efficient attacks | Ally creature movement (swap / reposition) | Aggro |
| Wild | Creature pressure / flexible aggression | Pack feeding (share absorbed tokens) | Aggro, Combo |
| Toxin | Attrition / delayed ticks / burn stacking | Toxin counter placement | Aggro, Combo, Burn |
| Luminar | Synergy / support / combo value | Damage prevention | Combo, Support |
| Mechanical | Engine manipulation / construction | Own-die reconstruction | Combo, Support |
| Arcane | Control / manipulation / support | See and rearrange top of deck | Control, Support |
| Corruption | Continuous burn (DoT); contaminate-dice is spice | Opponent-die manipulation | Burn |
| Darkness | Control / delayed value / disruption | Mill | Control |

These identities are directional rather than immutable numerical rules.

**Exclusive mechanic** (DECIDED 2026-08-21): the one verb no other attribute
may print. Authoring detail, off-pie leaks, and proving cards live in
`.cursor/skills/author-content/design.md`. Do not treat identity (damage,
own-attribute generate, small combat tricks) as exclusive.

---

# 30. Support

Support-style effects are not restricted to a single attribute.

Support may use:

- Arcane;
- Luminar;
- Wild;
- Mechanical.

Utility cards may contribute to multiple archetypes. That does **not** mean they should be printed at Energy 1. Prefer 2+ printed costs; let discounts create 1-Energy plays (§34.5).

Arcane effects should generally have medium/high costs when they provide strong control.

---

# 31. Example Creature Design

A creature can look conceptually like:

```text
Life: 20
Attributes: Martial + Toxin

Passive:
Whenever this creature consumes Toxin, ...

Basic Attack:
Requires Martial
Deal 2 damage.

Special Attack:
Requires Martial + Toxin
Deal 4 damage.
```

The exact numbers are placeholders for balancing, not canonical values.

---

# 32. Engine Design Principles

Every engine effect should answer:

1. What symbol does it consume?
2. What does the player gain?
3. What opportunity cost exists?
4. Can the player sequence it with another effect?
5. Does absorbing the symbol change the decision?
6. Does the effect create interaction?
7. Does it reinforce an archetype?

Avoid effects that are simply:

> "If you have the correct symbol, gain a large amount of generic value."

Prefer effects that create choices.

---

# 33. Dice vs Creature Tension

This is one of the most important design principles.

A symbol can often be used in two broad ways:

```text
              Generated Symbol
                     |
          ┌──────────┴──────────┐
          ↓                     ↓
   Creature absorbs        Engine resolves
          |                     |
    Creature power        Card / ritual / face / status
          |                     |
    Combat damage         Engine value, including damage
```

Therefore, the player is constantly choosing between:

**immediate creature combat** and **engine conversion**.

Engine conversion includes lethality. Control and other non-Aggro lists often spend symbols on cards and rituals that deal damage rather than on powering weak attacks. That is the intended tension, not a failure to “play creatures.”

This tension should appear frequently.

---

# 34. Balance Principles

## 34.1 Reliability Has a Cost

More copies of an attribute increase consistency.

Therefore:

- attribute caps matter;
- face distribution matters;
- overload matters;
- forging costs matter.

---

## 34.2 Strong Effects Need Opportunity Cost

A powerful effect should generally demand one or more of:

- Energy;
- specific symbols;
- specific attributes;
- creature positioning;
- timing;
- setup;
- deckbuilding commitment;
- die customization;
- opportunity cost against creature absorption.

---

## 34.3 Removal Is More Expensive Than Damage

Because only three creatures exist, permanent removal should generally cost more than ordinary damage.

Damage is progress.

Removal is state deletion.

The distinction matters.

---

## 34.4 Engine Disruption Is Preferable to Constant Creature Destruction

Especially for Control **interaction** — not as Control’s only way to win.

Control can interact through:

- stun;
- corrupting dice;
- preventing rerolls;
- removing equipment;
- interrupting rituals;
- manipulating symbols;
- forcing inefficient sequencing.

This creates interaction without making creatures disposable.

Control must still **close**. Closing is damage (and other defeat) sufficient to eliminate the opposing squad. That damage may come from cards, rituals, faces, statuses, and the rest of the engine; it need not come from Control’s creature attacks. Cheap “destroy target creature” remains the thing to tax, not ordinary engine damage.

---

## 34.5 Printed Energy 1 is exceptional

Do not fill the catalogue with 1-cost cards. A printed Energy 1 card must be **narrow and niche** so that 2+ cards remain appealing to hold and sequence.

The **primary** way a player should play a card for 1 Energy is **cost reduction** (next-forge discounts, standing cost reduction, on-roll reduction) applied to a higher printed cost — not a roster of natural 1-drops.

Cheap cycle at 1 Energy flattens tempo and makes medium/high cards feel unplayable. Existing 1-cost cards are not a license to add more. A rare exception (for example a Corruption install whose real tax is stay/peel rather than the header) must be justified in design notes.

---

# 35. Desired Game Feel

The intended match should feel like:

1. Both players start with relatively simple engines.
2. Dice begin producing basic resources.
3. Players make early strategic commitments.
4. Creatures start competing for symbols.
5. Dice become specialized.
6. Equipment and rituals establish engines.
7. Opponents interfere with one another.
8. Engines become increasingly distinct.
9. Engines become decisive: accumulated advantages convert into damage the opponent cannot ignore — via attacks, cards, rituals, faces, or statuses, not combat alone.
10. The final creature losses feel earned and consequential.

---

# 36. Anti-Patterns

Agents should flag or reject designs that:

### A. Ignore dice

> A card is equally powerful regardless of the player's dice.

### B. Destroy creatures too cheaply

> "Destroy target creature" at low cost with little setup.

### C. Remove all counterplay

> An effect prevents meaningful response and simultaneously destroys a creature/engine.

### D. Make one attribute universally useful

> The same attribute provides the best damage, draw, healing and control.

### E. Make rolling irrelevant

> The optimal strategy is determined before rolling.

### F. Make absorption strictly better

If absorbing symbols is always optimal, engine resolution becomes irrelevant.

### G. Make engine resolution strictly better

If Aggro and midrange players never want to energize creatures, **their** combat becomes disconnected from the dice. This does not forbid Control from spending symbols on engine damage instead of weak attacks.

### H. Create solitaire engines

A combo should still expose the opponent to interaction.

### I. Overload early-game natural faces

Natural faces should establish the game, not create an explosive deterministic opening.

### J. Flood the catalogue with printed 1-cost cards

A 1-Energy card that is just an efficient version of a heavier card makes the heavier card unplayable. 1-Energy turns should come from cost reduction.

### J. Give Control no damage plan

A Control list that only disrupts, stalls, or chips with 1-damage attacks cannot satisfy §4. Engine hate is interaction, not a win condition.

---

# 37. Open Questions

These items should be tracked explicitly instead of being silently decided by agents.

## Rules

- Exact Energy track numbers.
- Exact threshold for ending/passing a turn.
- Exact starting Energy.
- Exact starting hand size and draw timing.
- Exact turn phase ordering.
- Exact timing of creature absorption markers.
- Exact rules for stored symbols.
- Exact distinction between "store" and "retain".
- Exact stun timing.
- Exact handling when both dice are stunned.
- Exact Range rules.
- Exact frontline targeting rules.

## Components

- Final number of tactics cards in a deck.
- Whether the tactics deck and face deck remain separate.
- Exact number of starting natural face cards.
- Exact physical implementation of detachable die faces.
- Exact number of overload cards allowed per face.

## Cards

- Whether every tactics card must contain both upper and lower sections.
- Whether synthetic face cards can be represented without a lower tactical effect.
- Final keyword vocabulary.
- Final timing language.
- Final reaction timing windows.

## Victory

- Whether secondary victory conditions will exist.

---

# 38. Terminology

Use these terms consistently unless the GDD explicitly changes them.

| Term | Meaning |
|---|---|
| Die | A customizable six-sided die |
| Face | One physical die face |
| Face Card | Card representing a particular face |
| Natural Face | Baseline face |
| Synthetic Face | Card-created face with special properties |
| Symbol | Temporary resource generated by a die |
| Absorb | Creature takes a symbol, removing it from engine resolution |
| Engine | The collection of effects resolving from generated symbols |
| Forge | Replace/install a die face |
| Overload | Attach a modifier/effect to a die face |
| Energy | Shared tempo resource |
| Ritual | Persistent preparation-based card |
| Reaction | Responsive card/effect |
| Equipment | Card attached to a creature |
| Frontline | Forward creature position |
| Back | Rear creature position |
| Stun | State preventing a die from being rolled |
| Face Deck | Deck containing available face cards |
| Tactics Deck | Main tactical card deck |

---

# 39. Agent Workflow for New Cards

When asked to design a card, follow this sequence.

## Step 1 — Identify archetype

Determine:

- Aggro
- Midrange
- Combo
- Control
- Support

## Step 2 — Identify attribute

Choose the attribute based on its identity.

Do not choose an attribute only because it is mechanically convenient.

## Step 3 — Identify the dice interaction

State:

> "This card interacts with the dice by..."

If the answer is weak, redesign the card.

## Step 4 — Identify the decision

State:

> "The player must choose between..."

A good card should create a meaningful tradeoff.

## Step 5 — Check creature economy

Ask:

- Does this kill a creature?
- Does it indirectly enable removal?
- Is the effect too efficient given the 3-creature system?

## Step 6 — Check interaction

Ask:

- Can the opponent respond?
- Does this create a reaction window?
- Can the opponent disrupt the setup?

## Step 7 — Check sequencing

Ask:

- Can this interact with another engine effect?
- Does order matter?

## Step 8 — Check balance

Evaluate:

- consistency;
- cost;
- setup;
- flexibility;
- opportunity cost;
- archetype commitment.

---

# 40. Agent Workflow for New Mechanics

Before adding a mechanic:

### Required justification

```text
Problem:
What gameplay problem does this solve?

Player decision:
What meaningful choice does it create?

Dice interaction:
How does it interact with the dice?

Resource interaction:
What does it cost or generate?

Archetype:
Which strategies benefit?

Counterplay:
How can an opponent respond?

Complexity:
Does it add rules burden disproportionate to its value?

Abuse:
What is the strongest possible exploit?

Verdict:
Keep / Modify / Reject
```

---

# 41. Agent Workflow for Balance Reviews

When reviewing a card, mechanic, creature, or archetype, inspect:

### Consistency

How often can the effect be accessed?

### Efficiency

How much value is produced per Energy/symbol?

### Flexibility

How many game states can the card solve?

### Opportunity cost

What is sacrificed to use it?

### Interaction

Can the opponent respond?

### Scaling

Does the card become exponentially stronger when the engine improves?

### Snowballing

Does early advantage make future advantage too easy?

### Creature economy

Does it disproportionately affect the limited three-creature system?

### Dice dependence

Would the card still be good if dice were removed?

If yes, that is a warning sign.

---

# 42. Software / Digital Implementation Guidance

If this design is implemented digitally, model the game around explicit state and deterministic event resolution.

Recommended conceptual entities:

```text
Game
 ├── Players
 │    ├── Creatures
 │    ├── Dice
 │    ├── FaceDeck
 │    ├── TacticsDeck
 │    ├── Hand
 │    ├── Discard
 │    ├── Energy
 │    └── StoredResources
 │
 ├── Battlefield
 │    ├── Frontline
 │    ├── Back
 │    └── EngineArea
 │
 ├── Turn
 │    ├── Roll
 │    ├── SymbolGeneration
 │    ├── Absorption
 │    ├── EngineResolution
 │    ├── Combat
 │    └── EndTurn
 │
 └── Event/Effect System
      ├── Trigger
      ├── Cost
      ├── Requirement
      ├── Effect
      └── Resolution
```

## Important implementation principle

Do not encode card behavior as arbitrary special-case logic.

Prefer a data-driven model:

```text
Card
  ├── InstallationEffect
  ├── TacticalEffect
  ├── Costs
  ├── Requirements
  ├── Targets
  └── Triggers
```

The game will require many interactions between:

- symbols;
- dice;
- creatures;
- equipment;
- rituals;
- reactions.

A generic effect/event system will therefore scale better than hard-coded card logic.

---

# 43. Deterministic Resolution

The digital rules engine should make resolution explicit.

A useful conceptual sequence:

```text
Event occurs
    ↓
Find eligible triggers
    ↓
Check requirements
    ↓
Create effects
    ↓
Resolve effects in defined order
    ↓
Update state
    ↓
Check state-based rules
    ↓
Open next reaction window
```

This is particularly important for:

- reactions;
- equipment triggers;
- ritual activation;
- overload;
- absorption;
- chained symbol consumption.

---

# 44. Testing Requirements

Every implemented mechanic should have tests for:

### Happy path

The intended use works.

### Invalid path

The effect cannot be used without its requirements.

### Timing

The effect works at the correct point in the turn.

### Interaction

Opponent reactions can occur where intended.

### Resource accounting

Symbols and Energy are neither duplicated nor lost incorrectly.

### Dice accounting

Forging, removing, and returning face cards correctly updates ownership and installed state.

### Absorption

Absorbed symbols do not incorrectly trigger engine effects.

### Stun

Stunned dice cannot be rolled/resolved incorrectly.

### Creature death

Creature removal correctly checks the victory condition.

---

# 45. Simulation / Balance Testing

When simulating the game, collect at minimum:

- average game length;
- turns per game;
- creature deaths by turn;
- first creature death turn;
- average Energy spent per turn;
- average symbols generated per turn;
- symbol absorption frequency;
- dice composition over time;
- face replacement frequency;
- ritual activation turn;
- reaction frequency;
- equipment persistence;
- win rate by archetype;
- win rate by opening configuration.

Particular attention should be paid to:

> **How early the first creature dies.**

If creatures regularly disappear very early, the game may be violating its intended three-creature skirmish philosophy.

---

# 46. Content Design Philosophy

Card names, art, and mechanics should communicate a coherent fantasy.

The game should not feel like a generic deckbuilder with dice pasted onto it.

The fantasy should be:

> **You are commanding a small squad while forging a magical/mechanical engine through customizable dice.**

The dice should feel physical and consequential.

A face is not merely a token.

It is a permanent strategic modification to the player's engine.

---

# 47. Canonical Mental Model

The easiest way for an agent to understand the game is:

```text
CREATURES
   ↑
   │ absorb symbols
   │
DICE ───────→ SYMBOLS ───────→ ENGINE
 │               │                │
 │               │                ├── Rituals
 │               │                ├── Equipment
 │               │                ├── Reactions
 │               │                └── Creature abilities
 │
 └── forged by cards

CARDS
 ├── Forge faces
 └── Modify the engine
```

The player is continuously balancing:

```text
        CREATURE POWER
             ↕
        ENGINE POWER
             ↕
        DICE QUALITY
             ↕
        OPPONENT DISRUPTION
```

---

# 48. Final Design Test

Before accepting a new feature, ask:

> **Does this make the dice more interesting?**

Then:

> **Does this create a meaningful decision?**

Then:

> **Does this preserve the importance of the three-creature skirmish?**

Then:

> **Does this create or preserve interaction?**

Then:

> **Does this reinforce a strategic identity?**

If the answer to most of these is "no", the feature probably does not belong in the game.

---

# 49. Source / Status

This document consolidates:

- the current Game Design Document;
- established decisions from the design discussions;
- current archetype and attribute philosophy;
- current dice/face/engine concepts;
- explicit constraints around the three-creature combat model.

The GDD still contains unresolved decisions. Those are intentionally marked **OPEN** here.

When a future design decision is finalized:

1. update this document;
2. remove or revise the corresponding OPEN item;
3. update terminology consistently;
4. update implementation requirements;
5. update balance assumptions.

**Do not silently diverge between the GDD, cards, rules implementation, and agent instructions.**
