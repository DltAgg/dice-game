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
| Turn-pool symbols | `expireTurnSymbols` deletes every symbol instance at end of turn | Leftover. Still runs. Omitted. |
| Meter per HP | `grantMeterFromStrike` grants `meterPerDamageDealt` (1) per HP lost on an `attack` link, to both the dealer and the damaged Fighter’s owner | Leftover from an older Meter implementation. Still runs. Omitted. |
| Shield | `shields` on a Fighter, `grant-shield`, `remove-shield`, `ignoreShield` | Leftover. The damage function does not spend it. Omitted. |
| Empower, Pierce, Desynthesize, Convert, forge yield, forge bank, the first synthetic forge, Overcharge’s pip source | Those effects remain in the server. No card in the current list uses them | Not current play. Omitted. |
| Attribute-exclusive verbs | Old glossary tables that give a verb to one attribute | Not current print. Omitted. |
| Dodge | No miss effect | Not current play. The glossary still names it. A new card does not use it until a card needs it. |

## Same operation, two names

| Player word | Engine name | What is settled |
|---|---|---|
| Replace | `ForgeRegion`, `FORGE_CARD`, `replaceFaceId` | One operation. It lasts for the rest of the match. The two engine names are wording. |
| Block | `reduce` in `src/server/model/dice.ts`, `reduce-damage`, and `reduceBy` | Lowers damage. Brace’s `[Block 2]` is `reduce-damage`. Not attack prevention. |

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

## Current preset

The current game is `TAG_FIGHTER_RULES` in `src/server/model/config.ts`. `DEFAULT_RULES_CONFIG` is not the current game. The engine still selects that default when a loadout does not have 3 starting dice. This file does not teach that default.

Under the current preset a player has 3 dice, the opening hand is 5, and each later turn draws 1 card (`cardsDrawnPerTurn`).

## Board

Each player has three Fighters. `frontlineSlots` is 1. The first Fighter in the squad starts as the Active Fighter, in position `frontline`. The other two start in position `back`. They are Reserve. When the Active Fighter changes, `setActiveFighter` puts the new Active Fighter on `frontline` and every other living Fighter on `back`.

A sequence hit’s target is the opponent’s Active Fighter. Range is a check on the old attack action (`targetingError`). Reposition is `reposition-creature`. No card in the current list uses either. A hit does not choose a back-row Fighter.

Defeating the Active Fighter opens `replace-ko-active` when a living Reserve remains and no decision is already pending. The owner names a living Reserve. The defeated Fighter stays defeated. The choice spends no Tag and no Meter, and it is not a Chain object (`resolveReplaceKoActive`). The sequence result of that defeat is recorded under Sequence. If a decision is already pending, the choice is skipped. If no living Reserve remains, there is no choice. Defeating a Reserve does not open that choice.

## Victory

`loseMatch` ends the match. The named player loses. The other player in `playerOrder` wins. `status` becomes `"finished"`.

`wipeVictory` is on. `checkVictory` in `src/server/reducer/victory.ts` runs. A player whose every creature is `defeated` loses. If both players are in that state, `activePlayerId` loses.

Drawing from an empty deck is a loss. `drawCards` in `src/server/reducer/zones.ts` calls `loseMatch` for that player. There is no reshuffle. Milling an empty or short deck does not end the match.

Defeating a creature marked legendary does not by itself end the match. `checkVictory` does not look at that flag.

## Turn

Phases are `roll`, then `actions` (`TURN_PHASE_ORDER`). Ending the turn is the `END_TURN` action, not a third phase.

A match starts on turn 1, phase `roll`. The first player in the setup list is `activePlayerId`. Setup deals the opening hand. It does not draw again before that first roll.

The active player plays `ROLL_DICE`. That roll covers both players’ dice, including dice of Reserve and defeated Fighters. The phase stays `roll`. The opening roll does not absorb symbols. A second `ROLL_DICE` in that same roll is `ALREADY_USED`.

After that roll, `rerollAvailable` is true. The active player may `REROLL_DICE` once this turn, naming one or more of their own dice. It does not roll the opponent’s dice. There is no second reroll. A successful `REROLL_DICE` enters `actions`: `beginOffensiveWindow` runs once, and `rerollAvailable` becomes false.

Skipping the reroll is `ADVANCE_PHASE`. That enters `actions` the same way. `ADVANCE_PHASE` from `roll` is illegal until the opening roll has happened.

`END_TURN` is the active player’s action. The opponent becomes `activePlayerId`, the turn number increases by 1, that opponent draws 1, victory is checked, and the phase becomes `roll`.

## Meter

Each player has one Meter pool. It starts at 0. It is not cleared when the turn ends or when a Tag switch happens. The cap is 8 (`meterCap`). A spend larger than the pool does not happen (`INSUFFICIENT_METER`).

A sequence hit that conducts, is not negated, and whose declared target is not already defeated spends that hit’s `meterCost` first. If the spend fails, the hit does not grant Meter and does not apply its effects. If the spend succeeds, the player who declared the hit gains its printed `meterGain`, and also 2, 3, or 4 when the hit’s strength is light, medium, or heavy. The owner of the Fighter the hit was declared against gains 1. This grant does not add Meter per HP lost (`grantSequenceHitMeter` in `src/server/reducer/meter.ts`). Light, medium, and heavy do not set the damage. The damage is the printed `[Strike N]`.

Playing a card spends its `meterCost`. An exceptional mode also spends `exceptionalMeterCost`. An Assist spends `exceptionalAssistMeter` when that number is greater than 0, and spends nothing when the field is omitted (`src/server/reducer/commands/assist.ts`). A Tag switch does not spend Meter (`performTagSwitch`).

## Sequence

The sequence is not a phase. The states the engine sets are `open` and `combo`. `finished` is a third name in `OFFENSIVE_STATES` and it accepts no role. No current path sets it.

Entering `actions` calls `beginOffensiveWindow` for `activePlayerId`. That player is the Aggressor, the state is `open`, and the used sequence-action list is cleared. A new match starts the same way for the first player.

Only the Aggressor may declare a sequence hit. In `open`, the legal roles are starter and finisher. In `combo`, the legal roles are extender and finisher. A finisher is illegal on a turn that already declared Tag (`finisherBlockedByTag`). A finisher declared from `open` still ends the sequence.

A face action uses the showing face of one of your living Fighters, Active or Reserve. A Technique is only the Active Fighter. Its two inputs are two different dice you own that are showing a face. One die is showing the Technique’s primary face. The other matches the Technique’s secondary requirement. Either die may be the Active Fighter’s die. One showing face cannot fill both inputs. The Technique’s sequence role is the sequence gate for that action. The declared target is the opponent’s Active Fighter.

That secondary requirement is a named face, a sequence role, a face type still listed in `FACE_TYPES`, or a hit class. A hit class is `hitType` (punch or kick), `hitStrength` (light, medium, or heavy), or both together. `movement` is not a face type. Attack versus movement is not a requirement. A face that used to be movement is `faceType` `attack` and keeps its strength and strike.

Ryu Form (`card-ryu-form`) is a moveset Modify whose `replaceFaceId` is Form (`face-natural-ryu-form`). When that Replace conducts, the chosen slot keeps Form for the rest of the match and `rolledSlotIndex` becomes that slot, including when the slot was not showing. Form can open the sequence while it is still `open`. A later roll can show a different slot. A Modify subject `die` rewrite does not change `rolledSlotIndex`. A starter is still illegal in `combo`.

`consumeDiceOnFaceActions` is false, so a die is not marked spent by a face action or a Technique. The same face id (`face:<id>`) and the same Technique id (`technique:<id>`) cannot be declared again while that id is on the Chain or in `usedSequenceActionIds`. `attacksPerCreaturePerCombat` is the cap on the old attack action. It does not cap these hits.

Ending a sequence hands the turn to the opponent. Whether ending a sequence and ending a turn are different operations is not decided. Until that is decided, this file treats them as that one handoff (spec 031 Q48).

A sequence hit that resolves and is not negated does one of these:

- A starter or extender that does not end the sequence adds 1 to that player’s combo count and sets the state to `combo`. The Aggressor stays the same.
- A finisher ends the sequence. The turn is handed to the opponent. That player’s next `actions` window makes them the Aggressor.
- `END_SEQUENCE` is the Aggressor’s action. It ends the sequence, so the turn is handed to the opponent.

Counter negates the previous chain card and does not end the sequence. Parry negates an attack and ends the sequence, so the turn is handed to the opponent. No card in the current list sets `passesInitiative` or `seizesOffense`.

Defeating a Fighter ends that sequence (`promoteOnKo`). The defeated owner’s combo count becomes 0, and the turn is handed to the opponent. If the defeated Fighter was Active, a living Reserve remains, and no decision is already pending, that owner chooses the new Active Fighter.

## Tag

`TAG` is the active player’s action during `actions`, at most once per turn. It is legal in an opening window or a closing window (`tagWindow` in `src/server/rules/offensive.ts`). The opening window is before any face, Technique, Assist, card, attack, or sequence end. The closing window is while that player is the Aggressor and the offensive state is `combo`. A Chain, a pending decision, a second Tag, or a Finisher already resolved this turn closes both windows.

The chosen Fighter must be a living Reserve and must not be Tag-in locked. The Active Fighter must not be defeated. The Tag enters the Chain. If it resolves and is not negated, that Reserve becomes Active, the previous Active becomes the other position, and that player’s combo count becomes 0. Meter is not spent. A Tag declared in the closing window ends the turn after the switch (`conductTag`).

`[Tag out]` is a different operation (`beginTagOut`). It asks the opponent to choose a living Reserve to become their Active Fighter. It does not spend Tag or Meter. If that effect says the Fighter who left cannot Tag in, `tagInLockedUntilTurn` is `turn + 2`, and `tagInLocked` is true while `turn` is less than that number. No living Reserve: nothing happens. A Fighter who is already defeated is not Tag-out’s target.

## Assist

`ASSIST` names one of your Fighters who is not Active. That Fighter may be defeated. The Active Fighter cannot Assist. The Fighter needs a non-empty `assistEffects` list. Each such Fighter can Assist once per turn.

A hit Assist spends `exceptionalAssistMeter` when that number is greater than 0. It is legal on your turn during `actions`, while you are the Aggressor, and only when that hit’s sequence role fits. It is not legal in a reaction window. Vega Cross is an extender: light punch, `[Strike 2]`. Ryu Seal is a finisher: medium punch, `[Strike 3]`. Both are `assist-hit`. The link is a `combat-action` aimed at the opponent’s Active Fighter. Conduct goes through `conductCombatAction`: Strike damage, combo, and Meter from strength. A finisher ends the sequence, so the turn is handed to the opponent. A finisher is legal while the sequence is `open` or in `combo`. An extender is legal only in `combo`, with no Chain open. Tag this turn blocks a finisher Assist.

An Assist that is not a hit can be declared on your turn during `actions`, or in a reaction window when you have priority and an opponent’s sequence hit or Technique is on the Chain. Magnus Wall is that kind. If it resolves and is not negated, its effects are applied (`conductAssist`).

## Chain

A face action, a Technique, a hit Assist, Tag, a Response, and a Modify each go on the Chain before they take effect. The Chain is a stack. The last object added is the top.

Adding one of those objects opens a reaction window (`reaction-priority`). The player who added it keeps priority. That player may add another legal object or pass. A pass gives priority to the opponent and counts as one pass. Two passes in a row, with nothing added between them, close the window. The Chain then resolves from the top down. No new window opens between objects (`drainChain`).

During the window the priority player may pass, play a Response, play a Modify that names a subject, or declare an Assist that is not a hit. A face action, a Technique, and `END_SEQUENCE` are not legal in the window. Tag is refused while a decision is pending (`tagWindow`).

A Response is legal only when an opponent’s object is on the Chain and is not already negated. Counter negates the top object when that object is a card. It refuses a hit. Parry is legal when a waiting hit would damage your Fighter. Brace uses that same target check.

A card’s Meter is spent when the card is played, before the window reopens. No card in the current list sets `meterCost`. Open Palm’s 2 Meter is `exceptionalMeterCost`, paid to play it outside a Chain. Call Out’s 2 Meter is the same field, and Call Out is played in that exceptional mode. A sequence hit’s `meterCost` is spent when the hit resolves and is not negated, as recorded under Meter. A hit Assist spends `exceptionalAssistMeter` when it is declared.

A one-shot Response or Modify leaves the hand for the graveyard when it is played. A moveset Modify stays in hand until its link resolves, then moves to the equipment zone. A negated object does not apply its effects. A negated hit does not add combo.

## Deck and hand

The current preset’s shared deck has 10 to 24 cards, with at most 3 copies of one card. `TAG_FIGHTER_RULES` sets `deckMaxResponseCombat` to 9, so that deck may include at most 9 Combat cards in total. Parry, Brace (the Block card), and Shift count. Counter does not. Shift stays a Modify; its play does not change. `DEFAULT_RULES_CONFIG` sets `deckMaxResponseCombat` to null and has no cap. The opening hand is 5. Each later turn draws 1. There is no maximum hand size (`maxHandSize` is null, and `drawCards` does not discard down). Drawing from an empty deck loses, as recorded under Victory.

The Tag Skirmish loadout also has a `faceDeck`, and each Fighter has a `baseDie`. The face deck is not current play. It is the future physical representation of a face after Replace. Ryu Form (`card-ryu-form`) replaces a slot with Form (`face-natural-ryu-form`) and has no separate face card on the table today. That Replace also makes the rewritten slot the showing face, as recorded under Sequence. In the physical game that Form card comes from the face deck. The online game does not need that physical card. The forge-pool rule that copies an already-installed face (`eligibleFacesForForge`) is not current play.

## Damage

`dealDamage` in `src/server/reducer/resolution.ts` does this, in order:

1. A living ally with `redirectDamageThisTurn` takes some of the damage, up to that number. The redirected part is applied to that ally without the original options.
2. `nextIncomingDamageBonus` is added once, then cleared.
3. `nextIncomingDamageReduce` is subtracted once, then cleared. Brace’s `[Block 2]` adds to that number through `reduce-damage`. While-showing `reduce` and `reduceBy` are the same kind of reduction: Block. They lower damage. They do not cancel the hit.
4. While-showing `reduce` on the damaged Fighter’s controller lowers the damage. Silenced showing slots do not add it.
5. Attached cards and the Fighter’s standing `on-take-damage` abilities with `reduceBy` lower it further. A silenced Fighter skips those.
6. When the damage is marked `fromAttack` and the Fighter has `attackPreventCount`, one count is spent and the rest of this damage is prevented. Parry’s `grant-attack-prevent` adds to that count and also marks the waiting `combat-action` negated, so the hit is skipped before damage. A sequence hit’s own effects are not marked `fromAttack`.
7. What remains is added to `damage`. The Fighter is defeated when `damage` reaches that Fighter’s `life`.

## Keywords in the current list

This list is the Tag Skirmish squad and deck only: Vega, Magnus, Ryu, and the cards in `deck-tag-skirmish`. It is not the whole effect union.

| Print on those cards or faces | Engine | Note |
|---|---|---|
| `[Strike N]` | `damage`, or `assist-hit` when the Strike is an Assist | Faces, Techniques, Vega Cross, and Ryu Seal. |
| `+N damage` | `next-attack-bonus` | Secondary effect on a face. |
| `[Tag out]` and cannot `[Tag in]` | `tag-out` with `preventTagIn` | Vega Drill. |
| `[Replace]`, and Reforge Grip’s slot rewrite | `replaceFaceId`, or Modify subject `die` | One operation. Lasts for the rest of the match. A moveset `replaceFaceId` also makes that slot the showing face. A subject `die` rewrite does not. |
| `[Moveset]` | `modifySubject` `moveset` and `addedTechnique` | The card attaches in the equipment zone. |
| Tag | Modify subject `tag`, or the `TAG` action | Call Out. |
| Change the showing face | Modify subject `roll` | Open Palm. The roll changes which slot is showing and does not rewrite the face on the slot. |
| Redirect | Modify subject `target`, or `arm-redirect-damage` | Shift, and Magnus’s Assist. |
| `[Draw N]` | `draw-cards` | Anchor. That print is being rewritten. |
| `[Block N]` | `reduce-damage`, stored as `nextIncomingDamageReduce` | Brace is `[Block 2]`. Lowers the next damage by N. Does not cancel the hit. |
| `[Counter]` | `negate-card` | The Counter card. Negates the previous chain card. Refuses a hit (`combat-action` or `attack`). Does not end the sequence. |
| `[Parry]` | `grant-attack-prevent`, and `endsSequence` | The Parry card. Negates the waiting hit and leaves you offensive. Ends the sequence, so the turn is handed to the opponent. |

Counter and Parry are separate. Only Parry ends the sequence. No Assist negates a card.

Open Manual’s Technique is not printed yet. This file does not invent it.
