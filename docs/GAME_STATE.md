# Current game state

Source for later updates to `docs/RULEBOOK.md`, `docs/KEYWORDS.md`, and `docs/OPEN_DESIGN.md`. This file does not replace the rulebook.

Facts below are either a recorded decision or a named engine symbol. A behavior that is still in `src/server` and will not be used is omitted. Where the server and a decision disagree, the disagreement is a question in `docs/specs/031-docs-canon-cleanup.md`. It is not resolved here.

Player words are the words for the new game. The engine name is the identifier in `src/server` today.

## Omitted

These remain in the server to avoid rewiring. They are not current play.

| Player word | Engine | Why it is omitted |
|---|---|---|
| Ritual | `CardZone` `"ritual"`, `ritual` on a card, `RitualOrientation` | Dead. Will not be used. |
| Overload | `CardZone` `"overload"`, `overload` on a card | No longer used. |

## Same operation, two names

| Player word | Engine name | What is settled |
|---|---|---|
| Replace | `ForgeRegion`, `FORGE_CARD`, `replaceFaceId` | One operation. It lasts for the rest of the match. The two engine names are wording. |
| Block | `reduce` in `src/server/model/dice.ts` (`{ type: "reduce"; amount: number }`) | One operation. |

## Equipment

A card can be attached to a Fighter. The engine zone is `"equipment"`. A moveset Modify does this in `src/server/reducer/cardModify.ts`: it moves the card to that zone and attaches it to the Fighter.

Card types in `src/server/model/cards.ts` are `modify` and `response`. A Modify that attaches may be called Equipment.

`src/server/content/cards/card-anchor.json` is a Modify named Anchor. Its current print attaches to a Fighter and draws 1 at the start of your turn. That print is not part of a Technique or an Assist. The user will rewrite the card. This file does not state the replacement print.

The equipment play path that is not used by a moveset Modify is not current play. This file does not describe it.

## Draw

“Tied to a Fighter” means attached to a Fighter.

A draw effect does not trigger more than once without a restriction or a condition. Examples the user named: discarding cards, a Meter cost, a specific action, or a specific condition. The condition examples are a specific Technique being played, or a certain pattern. This file does not define “pattern,” and it does not treat that list as closed.

An attached draw is acceptable when it is part of a Technique or part of an Assist. It is also acceptable when it has a restriction or a condition and is not part of either. Examples: draw 2 and discard 1; pay X Meter to draw that many cards. The list is not closed. X is not a number in this file. 2 and 1 are an example, not the only legal amounts.

## Faces

Faces and face cards stay. They are still useful and will be used later. This file does not yet state their rules. Those rules are not copied from `docs/RULEBOOK.md` or `docs/KEYWORDS.md`.

## Not extracted yet

Turn structure, victory, Meter, Tag, Assist, deck, hand, damage order, and the keyword list are not in this file. They are added only after a reading of `src/server`, and only after you answer anything that reading cannot settle.
