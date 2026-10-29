# 035 — EX cards

## Intent

A player who has just declared a sequence hit may spend Meter to replace that hit with an EX card, from the priority they already have. EX is not a new card type, not a new priority system, and not a new bracket. Two cards use it: Crushing Throw on Magnus, and Air Launcher on Vega.

The source for the rules below is this file. `docs/GAME_STATE.md` records the same decisions. `docs/RULEBOOK.md` is the player wording. `docs/KEYWORDS.md` does not gain a bracket for EX.

## Rules

### What an EX card is

`CardType` stays `"modify" | "response"`. Add `"ex"` to `CardSubtype`. An EX card is a `CardDefinition` with:

- `type: "modify"`
- `subtypes` includes `"ex"`
- exactly one `fighterRestriction` (one creature definition id, not a list)
- `meterCost` (the play cost)
- `exGate` (below)
- `lifecycle` one-shot, so a successful `playCard` already moves it from the hand to the graveyard before the window reopens

It has no `modifySubject`. It is not a Response. The two cards in this spec use `subtypes: ["ex"]` only. They do not include `"combat"`, so they do not count toward `deckMaxResponseCombat`.

`fighterRestriction` stays a play check in `cardRestrictionError`. The named Fighter must be on that player's squad and living. It is not a construction ban.

### Deckbuilding

`validateTacticsDeck` keeps the checks it has: deck size (`deckMinCards` / `deckMaxCards`), `deckMaxCopiesPerCard` (3 on `TAG_FIGHTER_RULES`), and `deckMaxResponseCombat` when that value is not null.

It also rejects a deck when any one `fighterRestriction` appears on more than 2 cards whose `subtypes` include `"ex"`. Copies count. The cap is per restriction id, so Magnus and Vega each have their own 2. Three copies of one EX card fail this cap even when those three copies are still inside `deckMaxCopiesPerCard`. A deck may contain an EX card whose Fighter is not in the squad.

An EX card with no `fighterRestriction` is an illegal definition. `validateTacticsDeck` rejects a deck that contains one.

### Timing

Declaring a sequence hit already keeps priority. `openCombatAction` calls `openReactionWindow` with holder `"same"`, so `pendingDecision` is `reaction-priority` and `priorityPlayerId` is the player who declared the hit. EX uses that window. There is no second priority system.

An EX card is legal only when all of these are true:

- `pendingDecision` is `reaction-priority` and `priorityPlayerId` is the player playing the card
- that player has not passed since this hit was declared (`consecutivePasses` is 0, and priority is still the priority the declaration gave them)
- the top chain link is a `combat-action`
- that link is not `negated`
- that link's `controllerId` is the player playing the card
- nothing sits above that attack (it is the top link)
- `exGate` matches that link

After that player passes, EX is illegal, including if priority later returns. After any other link is added above the attack, EX is illegal. EX is illegal when the top link is already an EX card, a Response, a Modify, Tag, or an Assist. A face action, a Technique, and `END_SEQUENCE` stay illegal inside the window, as they are today.

The gate is the object `exGate` on the card:

- `sequenceRole` (`SequenceRole`)
- `hitType` (`HitType`)
- `hitStrength` (`HitStrength`), optional

The top `combat-action` matches when its `sequenceRole` and `hitType` equal the gate. When `hitStrength` is present, the link's `hitStrength` must equal it. When `hitStrength` is omitted, any strength matches. The check does not look at the technique id or the face id.

The `fighterRestriction` Fighter must also be that player's Active Fighter (`activeCreatureId`), and the hit's `sourceCreatureId` must be that Fighter. Living on the squad is not enough. Air Launcher is legal only when Vega is Active and the hit is Vega's kick finisher. Crushing Throw is legal only when Magnus is Active and the hit is Magnus's heavy punch finisher. A matching hit from another Fighter is illegal, including when the named Fighter is Active and someone else declared the hit.

Crushing Throw's gate is finisher, punch, heavy. Power Bomb (`technique-magnus-power-bomb` on `creature-magnus`) matches: heavy punch finisher, Strike 5, Grab + punch. The EX replaces that Strike 5.

Air Launcher's gate is finisher, kick, and no `hitStrength`. Chase Kick (`technique-vega-chase-kick` on `creature-vega`) matches: heavy kick finisher, Strike 4. A light or medium kick finisher would also match. A punch finisher would not.

### Replacement

A legal play goes through `playCard`. On success, in this order:

1. `spendMeter` spends `meterCost`. Exceptional mode is not how an EX card is paid. `exceptionalMeterCost` is not spent for this play.
2. The attack link is marked `exReplaced`. Its `kind` stays `"combat-action"`.
3. The EX card is pushed on the Chain above that attack. The link `playCard` already builds for a one-shot effect (`tactic-effect`) is that EX link.
4. `openReactionWindow` leaves priority with the same player. `playCard` already keeps priority when a `combat-action` is on the stack. Do not pass priority to the opponent because the card was EX.

The attack's original `effects`, its original Strike, and its sequence-hit Meter spend and gain do not run. Those live in `conductCombatAction`: when `exReplaced` is set, skip `spendMeter` for the link's `meterCost`, skip `grantSequenceHitMeter`, and do not push the link's `effects`. Still call `settleOffense` with the link's `sequenceRole` when the link is not negated. A finisher still ends the sequence. A starter or extender that is not a finisher still follows today's settle rules. Both gates in this spec require a finisher, so a legal EX replacement in this spec is a finisher.

`[Parry]` can still see the link because the kind is still `combat-action`. `chainAttackTargetId` already walks past card links to the nearest waiting `combat-action`. Do not stop that walk at the EX link.

When the EX link resolves, the replaced `combat-action` is still on `chainStack`. If that link is missing or `negated`, the EX body does not apply. Meter already spent stays spent. If it is not negated, the EX body applies, and the later conduct of the attack skips the original Strike and still settles the role.

Chain resolution stays top-down in `drainChain`. No new window opens between links.

### Order

1. The player declares the attack. The attack link is on the Chain. That player keeps `reaction-priority`.
2. EX legality is checked. An illegal play returns an error from `playCard` before `spendMeter`.
3. Meter is paid on a successful play.
4. The attack is marked `exReplaced` and the EX link is pushed above it.
5. The same player keeps priority.
6. That player may pass or add something else that is already legal. They may not add a second EX above the first. The opponent may then act.
7. `[Parry]` may negate the `combat-action`.
8. The Chain resolves top-down.
9. The EX body applies only if that attack was not negated.
10. The replaced attack conducts without its original Strike and without its sequence-hit Meter.
11. A finisher hands off the turn unless an extra actions phase is queued (`extraActionPhases`).

### Counter and Parry

Today `[Counter]` (`negate-card`, `cardTypes: "any"` on `card-counter`) negates the top chain card. `linkMatchesNegateCard` refuses a hit because `isNegatableLinkKind` is false for `"combat-action"` and `"attack"`. Ordinary attacks cannot be countered. Do not make them counterable.

New: `linkMatchesNegateCard` also returns false when the link's card `subtypes` include `"ex"`. `[Counter]` is then illegal. `playCard` returns an error before `spendMeter`. A Counter that was legal against some other top card is unchanged. Brace, Shift, and every other Response or Modify are unchanged. A non-hit Assist is unchanged.

`[Parry]` (`grant-attack-prevent` on `card-parry`) stays legal against the replaced `combat-action`, including one with `exReplaced`, under the existing target and timing checks: a waiting hit would damage that player's Fighter. Resolving Parry negates that `combat-action` and sets `endSequenceAfterChain`. The EX body does not apply. Meter spent to play the EX card is not refunded. Sequence-hit Meter is not spent, because a negated conduct already skips it and an `exReplaced` conduct skips it as well.

### Meter

`playCard` already spends `meterCost`, and exceptional-mode Meter, only after the legality checks that sit above `spendMeter`. `spendMeter` returns `INSUFFICIENT_METER` before it changes the pool when the pool is smaller than the amount. That is "pay on legal activation." Implementation must not move the spend earlier, and must not move sequence-hit payment.

Sequence-hit `meterCost` stays on conduct, in `conductCombatAction` / the Meter section of `docs/GAME_STATE.md`. An `exReplaced` attack skips that spend and skips `grantSequenceHitMeter` even when the attack is not negated. Do not move sequence-hit payment onto declare, and do not pay it as well as the card.

`meterCap` is 8. A `meterCost` of 8 is the whole pool and is legal when the player has 8.

No automatic refunds. A later Parry or Counter does not return Meter. Two plays cannot spend the same Meter: the second `spendMeter` sees the pool the first play already reduced.

Implementation must add regression tests for those three facts: an illegal play spends nothing; a later Parry or Counter does not refund; two plays cannot spend the same Meter.

### Crushing Throw

- id `card-crushing-throw`
- name `Crushing Throw`
- Fighter `creature-magnus`
- `type: "modify"`, `subtypes` includes `"ex"`
- `meterCost` 8
- `exGate`: `sequenceRole` `"finisher"`, `hitType` `"punch"`, `hitStrength` `"heavy"`

Print, holder voice, existing brackets only:

`Heavy Punch Finisher. [Strike 6]. Reroll your Magnus die 2 times. [Strike 2] for each Grab rolled. Magnus cannot attack during your next turn.`

The body runs only when the replaced attack is not negated, in this order:

1. `[Strike 6]` to the replaced attack's `declaredTargetCreatureId`, as chain-attack damage (`dealDamage` with the chain-attack flag a sequence-hit Strike uses).
2. Reroll the die bound to the living Magnus, twice. That is the living creature on the controller's squad whose `definitionId` is this card's `fighterRestriction`. The die is the one `dieForCreature` returns (`boundCreatureId`). Do not roll the other two dice that player owns. Do not roll the opponent's dice.
3. `[Strike 2]` once for each Grab among those two results, to the same declared target, each as its own chain-attack damage.
4. Set that Magnus creature's `attackBannedOnTurn` to the controller's next turn.

Each reroll is `rollOneDie(draft, die, rng, true)`. Force is true so a retained die does not keep its face. Reroll 1 replaces the showing face. Reroll 2 replaces reroll 1. The final showing face is the second result. A result is Grab when the landed slot's `faceCardId` is `face-natural-magnus-grab`. Additional `[Strike 2]` happens once per such result, so the extra damage is 0, 2, or 4. Both results count, including a first result that is no longer showing.

This is not the `REROLL_DICE` action. It does not set `rerollAvailable` and does not spend `TURN_REROLL_KEY`.

If no living Magnus remains when the body resolves, skip both rerolls, the Grab count is 0, Strike 6 still applies, and the ban is set on that creature instance if it still exists. A Strike that deals no damage does not stop the later steps. Each Strike is its own chain-attack damage, so an armed `[Redirect N]` or `[Block N]` applies through the existing damage order, starting with Strike 6.

The original Power Bomb Strike 5 does not happen. Heavy sequence-hit Meter for that attack does not happen.

### Attack ban

`attackBannedOnTurn` is a turn number on `CreatureState`. Set it only if the EX body resolves. Parry negating the attack does not set it.

Turns alternate. Played on turn N while that player is active, the banned turn number is `N + 2` (`draft.turn + 2` at resolution). The same arithmetic as `tagInLockUntilTurn`, but the check is equality: the ban applies while `GameState.turn === attackBannedOnTurn`. It expires when the turn number is no longer `N + 2`. The field may stay; it no longer matches.

On that turn, `useFace`, `useTechnique`, and a hit `ASSIST` (`assist-hit`) are illegal for that creature. They return an error and do not push a link. Responses, a non-hit Assist (Magnus Wall), Tag, and other Fighters' attacks stay legal. Playing another EX card is not an attack declaration, so the ban does not by itself make the card illegal.

An extra actions phase is not a new turn. A ban stamped on turn N does not apply during an extra actions phase of turn N. It applies on turn `N + 2`.

### Air Launcher

- id `card-air-launcher`
- name `Air Launcher`
- Fighter `creature-vega`
- `type: "modify"`, `subtypes` includes `"ex"`
- `meterCost` 8
- `exGate`: `sequenceRole` `"finisher"`, `hitType` `"kick"`, `hitStrength` omitted

Print:

`Kick Finisher. [Strike 3]. Reroll your dice. Take an extra actions phase.`

The body runs only when the replaced attack is not negated, in this order:

1. `[Strike 3]` to the replaced attack's declared target, as chain-attack damage. This replaces the qualifying attack's Strike. Chase Kick's Strike 4 does not happen, and that attack's sequence-hit Meter does not happen.
2. Reroll every die whose `ownerId` is the player who played the card. That includes Active, Reserve, and defeated Fighters. One `rollOneDie(draft, die, rng, true)` each, not twice. Do not roll the opponent's dice.
3. Increment `extraActionPhases` by 1.

Step 2 is not the once-per-turn `REROLL_DICE` action. It does not set `rerollAvailable`, does not clear it, and does not grant another opening reroll. It does not spend `TURN_REROLL_KEY`.

### Extra actions phase

`extraActionPhases` starts at 0 on the match (`createMatch`). Air Launcher's body is the only increment in this spec, and it increments by exactly 1, only when that body resolves.

The qualifying action is a finisher, so the current sequence still ends. `settleOffense` still runs for a non-negated finisher, including the combo increment it already performs before `passTurnAfterSequence`.

When that finisher would `endTurn` / `passTurnAfterSequence`, and when `drainChain` would call `endTurn` because `endSequenceAfterChain` is set: if `extraActionPhases > 0`, decrement it by 1 once and call `beginOffensiveWindow` for the same player (the player who was about to be passed away from). Stay in phase `actions`. Do not increment `turn`. Do not draw. Do not change `activePlayerId`. Leave `rerollAvailable` false. Do not call `endTurn` / `finishTurn` for that handoff. Clear `usedSequenceActionIds` as `passTurnAfterSequence` already does before it would call `endTurn`, so the new sequence does not remember the old one.

One resolution grants one phase. The handoff decrements once. It must not loop while the count is positive. A later separate Air Launcher, on a later sequence, can increment again and grant another phase.

`passTurnAfterSequence` performs this branch for a finisher. It does not set `endSequenceAfterChain`, so `drainChain` must not grant a second phase for the same handoff. `drainChain`'s own `endTurn` uses the same branch when `endSequenceAfterChain` is set, so a queued count is not dropped on a Parry-style end. A player's `END_TURN` action still calls `endTurn` and does not read `extraActionPhases`.

The extra phase is not a new turn. It does not emit `turn-ended` or `turn-started`. Tag windows are unchanged: this handoff does not start a turn, so a finisher already resolved this turn still closes Tag.

Because `finishTurn` does not run, the combo reset, the draw, the toxin tick, and the rest of end-of-turn cleanup do not run for this handoff. The finisher's combo increment from `settleOffense` remains.

### Print

Do not mint a bracket. Do not add `[EX]`, `[Reroll]`, or `[Spend]`. Do not put EX under `### New tokens`. `[Strike N]`, `[Counter]`, and `[Parry]` stay the print for those effects. `docs/KEYWORDS.md` current-print prose says a Modify may also replace a qualifying attack when it is EX.

Tag Skirmish includes one copy of each card. The shared deck is 30 to 40 cards. A second copy of either EX card still fits that range and the per-Fighter cap of 2.

### Conflicts recorded

The locks above are kept. None was refused. These are the places the current server does not already do what the lock requires:

1. `playCard` returns `CARD_NOT_AVAILABLE` for a Modify with no `modifySubject` during `reaction-priority`, before `spendMeter`. An EX card has no `modifySubject`. The implementation must allow `subtypes` including `"ex"` in that window when the gate passes, and must do that before `spendMeter`.
2. `rollOneDie` does not change `rolledSlotIndex` when the die is stunned, even with `force` true. A retained die keeps its face unless `force` is true. EX rerolls call `rollOneDie` with `force` true so a retained die is replaced. A stunned skip lands no face. For Crushing Throw that skipped result is not Grab, and the showing face stays what it was before that call. Do not add a second roll path to force a stunned die.
3. `passTurnAfterSequence` always calls `endTurn`, which increments the turn, switches the active player, draws, and enters `roll`. `drainChain` also calls `endTurn` when `endSequenceAfterChain` is set. The extra-phase branch replaces those sequence handoffs when `extraActionPhases > 0`. It does not replace the `END_TURN` action.
4. A card link above a `combat-action` is a legal `negate-card` target today. The new refusal is only when that card's `subtypes` include `"ex"`. Hits stay refused.

Checked, and already true, so they are not conflicts: `CardType` is only `modify` and `response`; the declarer keeps priority; ordinary attacks are not counterable; Parry negates the nearest waiting `combat-action` and ends the sequence; card Meter is spent on a legal `playCard` and sequence-hit Meter is spent on conduct; `meterCap` is 8; `validateTacticsDeck` does not look at the squad; Power Bomb and Chase Kick match the gates above.

## State Changes

- `CardSubtype` gains `"ex"`.
- `CardDefinition` gains `exGate`.
- `ChainLink` gains `exReplaced`. Set on the replaced `combat-action` only. Absent or false means the attack conducts as it does today.
- `CreatureState` gains `attackBannedOnTurn`. Absent means that Fighter is not banned.
- `GameState` gains `extraActionPhases`, starting at 0.
- A successful play changes that player's `meter` by minus `meterCost`, moves the one-shot card to the graveyard, pushes a chain link, and sets `exReplaced`.
- A resolving Crushing Throw body changes the declared target's `damage`, Magnus's die `rolledSlotIndex` (twice, unless a call skips), and `attackBannedOnTurn`.
- A resolving Air Launcher body changes the declared target's `damage`, each of that player's dice `rolledSlotIndex` once (unless a call skips), and `extraActionPhases`.
- An extra-phase handoff changes `extraActionPhases` (minus 1), `offensiveState`, `aggressorPlayerId`, and `usedSequenceActionIds`. It does not change `turn`, `activePlayerId`, `phase`, or `rerollAvailable`.

An illegal play changes none of these. A negated attack does not apply the EX body, so it does not set `attackBannedOnTurn` or increment `extraActionPhases`. The card's Meter stay spent.

## Actions

No new `GameAction`. The active player, while they hold the priority described above, sends the existing `PLAY_CARD` for the EX card. `playCard` enforces the gate.

The opponent sends the existing `PLAY_CARD` for Parry, Counter, or another already-legal card, or passes with the existing priority pass.

`useFace`, `useTechnique`, and hit `ASSIST` are refused for a Fighter while `attackBannedOnTurn === turn`.

`REROLL_DICE` is not the EX reroll. `END_TURN` is not the extra-phase handoff.

## Acceptance

A test can check each of these. This list is the behavior, not the test code.

1. `CardType` is only `"modify"` and `"response"`. A card with `subtypes` including `"ex"` is an EX card: `type` `"modify"`, one `fighterRestriction`, a `meterCost`, and an `exGate`.
2. `validateTacticsDeck` accepts two EX cards that share one `fighterRestriction` and rejects a third, even when each card id is still within `deckMaxCopiesPerCard` of 3.
3. That cap is separate per `fighterRestriction`. Two EX cards for `creature-magnus` and two for `creature-vega` are legal together.
4. Deck size, `deckMaxCopiesPerCard`, and `deckMaxResponseCombat` still apply. An EX card whose subtypes are only `"ex"` does not count toward `deckMaxResponseCombat`.
5. `validateTacticsDeck` accepts an EX card whose Fighter is not in the squad. Playing it fails the existing `fighterRestriction` check when that Fighter is absent or defeated.
6. After a sequence hit is declared, `pendingDecision` is `reaction-priority` and the declarer has priority. A matching EX card is legal then. It is illegal after that player passes, when any link sits above that `combat-action`, when the top link is not a non-negated `combat-action` that player controls, and when `exGate` does not match. Each illegal play returns an error and does not change Meter.
7. A successful play spends `meterCost` before the window reopens, sets `exReplaced` on that `combat-action`, pushes the EX card above it, leaves the attack's kind as `combat-action`, and leaves priority with the same player.
8. The replaced attack's original effects do not run, its original Strike does not happen, and its sequence-hit Meter spend and gain do not run. The link still settles its sequence role. A non-negated finisher still ends the sequence.
9. Power Bomb matches Crushing Throw when Magnus is Active and declared it. Chase Kick matches Air Launcher when Vega is Active and declared it. A heavy punch that is not a finisher does not match Crushing Throw. A heavy punch finisher does not match Air Launcher. A matching hit from another Fighter does not match, whether or not the named Fighter is Active.
10. Playing an EX card with Meter below `meterCost` returns an error and leaves Meter unchanged. Playing it at Meter 8 with `meterCost` 8 spends 8 and leaves 0. A second play that needs Meter cannot spend Meter the first play already spent.
11. Parry stays legal against the replaced `combat-action` under the existing target and timing checks, including when the EX link sits above it. It negates that attack and ends the sequence. The EX body does not apply. Meter spent to play the EX card is not refunded.
12. Counter stays illegal against a top link whose kind is `combat-action` or `attack`. Counter is also illegal when the top link is an EX card, returns an error, and spends nothing. Counter against a non-EX card that is the top link stays legal. Other Responses and Modifies are unchanged.
13. When Crushing Throw's body resolves, it deals Strike 6 as chain-attack damage to the declared target, then rolls only the living Magnus die twice via `rollOneDie` with force true, then deals Strike 2 as chain-attack damage once for each of those two results whose face id is `face-natural-magnus-grab`, then sets that creature's `attackBannedOnTurn` to the current turn plus 2. The showing face is the second result. The player's other dice and the opponent's dice do not roll.
14. A retained Magnus die still receives a new `rolledSlotIndex` from that reroll. A stunned die that `rollOneDie` skips does not change its showing face, and that skipped result is not Grab.
15. While `turn` equals `attackBannedOnTurn`, that Magnus cannot declare a face action, a Technique, or a hit Assist. Responses, a non-hit Assist, Tag, and other Fighters' attacks are legal. On any other turn the ban does not apply. The field is not set when the body does not resolve.
16. When Air Launcher's body resolves, it deals Strike 3 as chain-attack damage to the declared target, then rolls each die that player owns once and does not roll the opponent's dice, then increments `extraActionPhases` by 1. It does not use `REROLL_DICE`, does not set `rerollAvailable`, and does not grant another opening reroll.
17. When a finisher would pass the turn and `extraActionPhases` is greater than 0, that count decreases by 1, `beginOffensiveWindow` runs for the same player, the phase stays `actions`, the turn number does not increase, no card is drawn, and `rerollAvailable` stays false. One Air Launcher resolution grants one such phase and does not loop. A later separate Air Launcher can grant another. The player's `END_TURN` action does not spend `extraActionPhases`.
18. An extra actions phase is not a new turn. A Crushing Throw ban stamped on turn N does not apply during an extra actions phase of turn N. It applies on turn N+2.
19. Replacing Power Bomb does not deal Strike 5 and does not grant heavy sequence-hit Meter. Replacing Chase Kick does not deal Strike 4.
20. No new print bracket is added. `[Strike N]`, `[Counter]`, and `[Parry]` stay.
