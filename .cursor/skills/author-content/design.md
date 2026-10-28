# Content model

The source is [`docs/GAME_STATE.md`](../../../docs/GAME_STATE.md). How a match
plays is [`docs/RULEBOOK.md`](../../../docs/RULEBOOK.md). Print is the whole
of [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md). Field names are the
schemas under `src/server/content/schema/` and the types in
`src/server/model/`. When a schema description still says pile fuel,
legendary victory, or natural/synthetic, follow `docs/GAME_STATE.md`. Do not
invent a second model. Spec 030 is not the source. Craft gates:
[design-craft.md](design-craft.md).

Print says **Fighter**. Engine types stay `Creature*`.

## How the match is shaped

Each player has three Fighters, one shared deck, one shared hand, one shared
Meter pool, and one die per Fighter. One Fighter is Active. The others are
Reserve. A defeated Fighter stays defeated. That Fighter can still Assist.
All three dice roll, including a defeated Fighter's die.

## Layers

Use these words everywhere. Do not rename them per card.

| Layer | What it is | What it is not |
|---|---|---|
| **Die** | Named faces: name, type, primary effect, secondary effect. Attacks, grabs, movement, character offensive tools. | Generic Block, Dodge, Counter, or Parry. A face is not spent by a hit. |
| **Fighter** | Identity: `baseDie`, those named faces, face actions, Techniques, one Assist, life. | A generic stat block. A deck, a hand, or a card type. |
| **Card** | `response` or `modify` only. Parry, Brace, and Shift use subtype `combat`. A tag-fighter deck has at most 9 cards of that subtype, counting copies. Combat is a deckbuilding subtype, not an effect. A moveset Modify may attach in the equipment zone. | Instant, Reaction, Overload, Ritual, Counter, Tag, Assist, or Situation as a type. Combat as a keyword effect. |
| **Meter** | One shared pool. It starts at 0, is not cleared on turn end or Tag, and the cap is 8. A sequence hit grants its printed gain plus 2, 3, or 4 for light, medium, or heavy. The owner of the Fighter who was hit gains 1. | Meter per HP. Generic card mana. A cost on every strong card. |
| **Tag** | A gameplay operation, at most once per turn. A card may cause or alter it. | A face. A `TagCard` subsystem. |
| **Assist** | Fighter-owned. The Fighter is not Active and may be defeated. Once per turn. | A card. The Reserve does not become Active. |

**Response** is legal when an opponent's object is on the Chain and is not
negated. `[Block N]`, `[Counter]`, and `[Parry]` are effects. Dodge is not
current print. `[Counter]` does not end the sequence. `[Parry]` does. A
Response does not by itself take offense.

**Modify** changes the situation. `modifySubject`: `roll`, `die`, `moveset`,
`target`, `tag`. A die write is Replace and lasts the rest of the match.

**Face action:** the showing face of a living Fighter, Active or Reserve.
**Technique:** the Active Fighter only. Primary is that Fighter's showing
face. Secondary is another of your rolled dice. One face instance cannot
fill both inputs of that one action.

## Legality

```text
Priority
+ timing (existing prefixes and the reaction window)
+ Response or Modify behavior
+ a valid target or context
+ required state
+ Meter, when that mode needs it
```

Do not invent `TimingCondition`. Priority alone is not permission.

## Lifecycle

| Lifecycle | What happens |
|---|---|
| `one-shot` | Play, resolve, then the graveyard unless `afterResolveZone` is set. |
| `persistent` | A moveset stays in hand until it resolves, then attaches in the equipment zone. |

No other lifecycle categories. Overload and ritual are not kinds to author.
The unused equipment play path is not current play.

## Offensive sequence

The sequence is who can keep pressing. Starter, extender, and finisher are
properties of a hit (`sequenceRole`), not card types and not phases. Only
the Aggressor declares. Open accepts a starter. Combo accepts an extender or
a finisher. A finisher, and any other sequence end, hands the turn to the
opponent until that distinction is decided. Tag and a hit Assist use the
Chain. Resolution is last-in, first-out.

## When concepts conflict

Use this order:

1. `docs/GAME_STATE.md`, then `docs/RULEBOOK.md` for how it plays, then `docs/KEYWORDS.md` for print
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
| "Give Magnus a Block face" | Generic defense is not a die face | A Response. A Fighter-specific defense can be that Fighter's Assist |
| "Counter card type" | Counter is an effect | Response whose effect is `[Counter]` |
| "Tag card" / Tag face | Tag is an operation | The Tag operation, or a Modify with `modifySubject: "tag"` |
| "Assist card" | Assist is Fighter-owned | `assistEffects` on that Fighter |
| "Each fighter has a deck" | One shared deck and hand | One deck; `fighterRestriction` if the card needs that Fighter in play |
| "Build Magnus's die in the deck builder" | Dice are not a deckbuilding product | `baseDie` on the Fighter; in-match writes are Replace |
| "This strong card costs Meter" | Meter is exceptional, not mana | Normal mode with no Meter, or an optional exceptional mode |
| "Temporary die change" | Replace lasts the match | Modify `roll` for the showing face, or Modify `die` for the rest of the match |
| "Shield resource" / pile `[Spend]` | Not current play | An effect the schemas already model, or a brief to engine-developer |

## Print

Read [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md) before print or effect
data. Holder voice. Timing prefixes stay prefixes (`On roll:`, `On attack:`).
Never "Whenever…". New tokens join `[Mark]` / `[Strip]`. Do not mint a verb.
The change is not done when the print and the glossary disagree.
User-supplied print stays verbatim. Do not invent Open Manual’s Technique
or Anchor’s replacement print.

## Anti-patterns

- Guard or Block as a generic defensive die face
- Counter, Tag, or Assist as a card type
- Dodge as current print
- `DiceModificationCard` or a Tag-card subsystem
- A deck or hand per Fighter
- A die spent by a face action or a Technique
- Natural / synthetic kinds, or Shield as a resource
- Attribute-pile `[Spend]` / `[Requires]` / `[Forge]` / `[Generate]`
- A Response that takes offense by itself
- Cloning the last JSON file under a new name
- Silent fake effects for unfinished print
- Rules logic in React, Zustand, or PeerJS
