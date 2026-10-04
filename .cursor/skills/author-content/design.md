# Content model

Confirmed rules: [`docs/specs/030-offensive-control.md`](../../../docs/specs/030-offensive-control.md).
Field names: the schemas under `src/server/content/schema/` and the types in
`src/server/model/`. When a schema description still says pile fuel, legendary
victory, or natural/synthetic, follow spec `030` and this file. Do not invent
a second model. Craft gates: [design-craft.md](design-craft.md).

Print says **Fighter**. Engine types stay `Creature*`.

## How the match is shaped

Each player has three Fighters, one shared deck, one shared hand, one shared
Meter pool, and one die per Fighter. One Fighter is Active. The others are
Reserve. A KOed Fighter cannot become Active and cannot Tag. At first, that
Fighter still rolls and can still Assist. The team is the three Fighters plus
the one deck. All three dice roll, including a KOed Fighter's die.

## Layers

Use these words everywhere. Do not rename them per card.

| Layer | What it is | What it is not |
|---|---|---|
| **Die** | "What inputs are available to my Fighters right now?" Named faces: Name, Type, Primary Effect, Secondary Effect. Attacks, grabs, movement, character offensive tools. | Generic Block, Dodge, Counter, or damage reduction. Action points, mana, charges, or consumable resources. A face is not globally consumed. |
| **Fighter** | Identity: `baseDie`, those named faces, Simple Actions (own die), Techniques, one Assist, optional Passive, HP. | A generic stat block. A deck, a hand, or a card type. |
| **Card** | `response` or `modify` only. | Instant, Reaction, Equipment, Overload, Ritual, Counter, Tag, Assist, or Situation as a type. |
| **Meter** | One shared pool. Persists across turns and tags. Gained by dealing damage, taking damage, or an effect. Exceptional break of the normal rules, including an optional exceptional mode (`exceptionalMeterCost`). | Generic card mana. A cost on every strong card. A second Combo Meter. |
| **Tag** | A gameplay operation. A card may cause or alter it. | A face. A `TagCard` subsystem. |
| **Assist** | Fighter-owned (`assistName`, `assistRulesText`, `assistEffects`). May be offensive, defensive, utility, or meter-enhanced. Uses the chain. | A card. The Reserve does not become Active. |

**Response** reacts to an opponent's object already in play (an action,
another response, a Tag, an Assist). Block, Dodge, Counter, prevent, and
redirect are effects. A Response does not by itself take offense.

**Modify** changes the situation. `modifySubject`: `roll` (which face is
showing, including reroll), `die` (write a slot for the rest of the match),
`moveset`, `target`, `tag`. Either player may play one with Priority when
timing, target, and context are legal.

**Simple Action:** the Active Fighter's own die. **Technique:** primary is
that die; secondary is another die of the same player. The pair is ordered,
not a set. One face instance cannot fill both inputs of that one action.
Two Jabs on two dice are two instances.

**In-match die writes** are the card path (`modifySubject: "die"`). The next
match rebuilds Current Die from `baseDie`. No temporary die modification.
Players do not build dice while constructing the deck.

## Legality

```text
Priority
+ timing (existing keywords and the reaction window)
+ Response or Modify behavior
+ a valid target or context
+ required state
+ Meter, when that mode needs it
```

Do not invent `TimingCondition`. Priority alone is not permission.

## Lifecycle

| Lifecycle | What happens |
|---|---|
| `one-shot` | Play, resolve, then discard unless `afterResolveZone` is set. |
| `persistent` | Stays in play. |

No Reusable, Return, or other lifecycle categories. Equipment, overload, and
ritual regions may still exist on old data. They are not kinds to author.

## Offensive sequence

The sequence is who can keep pressing. Starter, Extender, and Finisher are
properties of an Action or Technique (`sequenceRole`), not card types and not
phases. Tag and Assist use the same chain. Resolution is last-in, first-out.
A Response does not take offense unless the printed effect says the sequence
ends or initiative passes.

## When concepts conflict

Use this order:

1. Confirmed rules (spec `030`, then the living rulebook for what is already shipped)
2. Existing architecture (schemas and types already in the repo)
3. Fighter identity
4. Dice / Fighter / card separation
5. Simplicity
6. Playtestability
7. Variety
8. Extensibility

## Wrong layer — stop and redirect

Do not author architecture-breaking content. Name the conflict and propose
the closest valid home.

| Request | Conflict | Closest home |
|---|---|---|
| "Give Magnus a Block face" | Generic defense is not a die face | A Response card. A Magnus-specific defensive mechanic can be his Assist or another Fighter-owned effect |
| "Counter card type" | Counter is an effect | Response whose effect interrupts |
| "Tag card" / Tag face | Tag is an operation | The Tag operation, or a Modify with `modifySubject: "tag"` |
| "Assist card" | Assist is Fighter-owned | `assistEffects` on that Fighter |
| "Each fighter has a deck" | One shared deck and hand | One deck; `fighterRestriction` if the card needs that Fighter in play |
| "Build Magnus's die in the deck builder" | Dice are not a deckbuilding product | `baseDie` on the Fighter; in-match writes are Modify `die` |
| "This strong card costs Meter" | Meter is exceptional, not mana | Normal mode with no Meter, or an optional exceptional mode |
| "Temporary die change" | Die writes last the match | Modify `roll` for the showing face, or Modify `die` for the rest of the match |
| "Shield resource" / pile `[Spend]` | Not a live fuel | An effect the schemas already model, or a brief to engine-developer |

## First playtest philosophy

Document only. Do not generate this set in the same change as a prompt tune,
and do not treat the counts as a frozen rule.

Cover the loop once:

```text
Roll → Reroll → Simple Action → Technique → Response → Modify
→ LIFO chain → Damage → Meter → offensive sequence
→ Assist → Tag → KO → Win
```

Three Fighters as examples of different jobs, not a roster to print:

| Example | Job |
|---|---|
| Magnus | Grappler |
| Vega | Rushdown |
| Ryu | Zoner |

Playtest configuration, not a rule: about one base die, six faces, two or
three Simple Actions, two or three Techniques, one Assist, optional Passive.
Example faces are offensive tools. They do not include Guard, Block, Counter,
or Dodge. Example cards: Response block, dodge, and counter; Modify for roll,
target, action, die, and moveset; one moveset card per example Fighter;
tag-related cards that do not introduce a Tag type. Optimize for mechanical
coverage, not balance or volume.

## Print

- Holder voice. Timing prefixes stay prefixes (`On roll:`, `On attack:`).
  Never "Whenever…".
- New and edited print uses [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md).
  New tokens join `[Mark]` / `[Strip]`. Do not mint Dose, Envenom, Brand, or
  a verb for Block.
- The pile-era attribute exclusives and the `[Forge 1 Synthetic …]` quick
  reference in that glossary are leftover catalogue mapping. Do not copy them
  onto new Fighters, faces, or cards.

## Anti-patterns

- Guard or Block as a generic defensive die face
- Counter, Tag, or Assist as a card type
- `DiceModificationCard` or a Tag-card subsystem
- A deck or hand per Fighter
- Combo resource, action points, or global face consumption
- Natural / synthetic / untyped Shield as face kinds
- Attribute-pile `[Spend]` / `[Requires]` / Active-when as fuel
- Shield as a resource
- A Response that takes offense by itself
- Cloning the last JSON file under a new name
- Silent fake effects for unfinished print
- Rules logic in React, Zustand, or PeerJS
