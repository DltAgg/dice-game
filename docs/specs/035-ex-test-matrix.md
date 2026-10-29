# 035 — EX test matrix

Review artifact for the implementer. This file is the cases, the setup, and the risks. It is not the rules source. Do not treat it as permission to edit `docs/GAME_STATE.md`, `docs/RULEBOOK.md`, `docs/KEYWORDS.md`, or `docs/specs/035-ex-cards.md`.

Contract under test:

- EX is a Modify subtype `ex`, with one `fighterRestriction` and a `meterCost`.
- Deck: at most 2 EX cards per `fighterRestriction` inside `validateTacticsDeck`. Copy cap 3 and the combat cap stay. The Fighter does not have to be in the squad for the deck to validate.
- Play window: you have reaction priority, the top link is your non-negated combat-action matching that card's `exGate`, and nothing sits above it. After you pass, or after any other link is added, the play is illegal. A later pass that hands priority back does not reopen it.
- Replacement: the original Strike does not also resolve. The link stays `combat-action`. Meter is paid in `playCard` (it already spends `meterCost` there). An illegal play spends nothing. Parry does not refund.
- Counter already refuses a hit. It must also refuse an EX card on top. Ordinary attacks do not become counterable. Parry can negate the replaced combat-action and ends the sequence. A negated EX skips Strike, rerolls, the attack ban, and the extra phase.
- Crushing Throw (Magnus, 8, heavy punch finisher): Strike 6, reroll only the Magnus die twice (the second result replaces the first on the die), Strike 2 for each result whose face id is `face-natural-magnus-grab`, then that Magnus cannot attack on the controller's next turn (turn N+2). Other fighters and non-attacks stay legal. The ban is applied only when the body resolves.
- Air Launcher (Vega, 8, kick finisher, any strength): Strike 3, reroll all of your dice once (not the opponent's, and not the `REROLL_DICE` action), then one extra actions phase on the same turn, at the moment the finisher would have passed the turn. That phase is `beginOffensiveWindow`, no draw, no turn increment, `rerollAvailable` stays false. One play grants one phase.
- A sequence hit's `meterCost` is still spent in `conductCombatAction`. A card's `meterCost` is still spent at play.

`CardSubtype` does not include `ex` yet. Deck and play fixtures will not typecheck until that union and the gate field exist. Register fixtures with `testCard` (`src/server/testing/fixtures/builders.ts`). Do not overlay `creature-magnus` or `creature-vega`; the content registry is process-wide.

## Harness

Build the catalogue match the way `liveAssistMatch` / `p1Actions` do in `src/server/reducer/tagFighter.test.ts` and `skirmishActions` does in `src/server/reducer/formStarter.test.ts`:

- `createMatch` with `TAG_FIGHTER_RULES`, `deckMinCards: 0`, `deckOutEnabled: false`, seed fixed, squad `[creature-vega, creature-magnus, creature-ryu]`, each fighter's `baseDie` as `startingDice`.
- Active starts as Vega (squad index 0). Switch with the local `withActiveFighter` before a Magnus declaration.
- Show a face with `showCreatureFace` (tag fighter) or `showFace` (form starter) after the roll. `USE_TECHNIQUE` reads the showing face, not the slot you wish you had rolled.
- Put the EX in hand with `withHand` and play it with `handCardIdAt`.
- Set Meter with `withSeatMeter` (`tagFighter.test.ts`) or `withMeter` (`offensiveControl.test.ts`). Cap is 8 (`meterCap` on `TAG_FIGHTER_RULES`).
- `expectOk` / `advance` / `resolveOpenChain` live in `src/server/testing/scenario.ts`. `advance` builds RNG from `state.rng`. `resolveOpenChain` only passes. Use those when the body does not roll.
- When the body rolls, call `reduce(state, action, rng)` from `src/server/reducer/reduce.ts`. The third argument is the only injection point. A scripted `RNG` whose `integer()` returns a queue of slot indexes is enough: `rollOneDie` draws one `integer(0, facesPerDie - 1)` per rerolled die (`src/server/reducer/commands/rollDice.ts`). Catalogue faces used below have empty `onRoll`, so a careful reroll should not draw extra RNG. Assert the final `rolledSlotIndex` so a shifted queue fails the test.
- Illegal actions return the original state object (`result.ok === false` and `result.state === before`). Assert that, not a cloned meter value alone.
- Chain drain is LIFO (`drainChain` pops). Parry, Brace, and Counter resolve before the link under them.

### Declaring the finishers

No current test declares `technique-magnus-power-bomb` or `technique-vega-chase-kick`. Copy the `USE_TECHNIQUE` shape from `formStarter.test.ts` (Beast Form) and `sequenceHitMeter.test.ts`.

`useTechnique` adds the secondary face's `next-attack-bonus` into the technique's damage before the link is pushed. Every legal punch secondary in the catalogue has one. A damage total of 6 is therefore not proof that Crushing Throw replaced Power Bomb.

| Attack | Active die shows | Other die shows | Unreplaced damage | Why |
|---|---|---|---|---|
| Power Bomb | Magnus `face-natural-magnus-grab` | Ryu `face-natural-ryu-focus` (punch, +2) | 7 | 5 + 2. Focus is on Ryu's die, so it is a legal secondary. Grab and Heavy share Magnus's die and cannot both show. |
| Chase Kick | Vega `face-natural-vega-kick` | Magnus `face-natural-magnus-heavy` (heavy punch, +2) | 6 | 4 + 2. |

Power Bomb's secondary gate is any punch. Chase Kick's secondary gate is a heavy punch. `secondaryDiceFor` excludes the active die and every opponent die.

Control each replacement test with the same faces and no EX:

- Power Bomb alone deals 7. Crushing Throw with both rerolls non-Grab deals 6. Both applied deals 13 (7 + 6) or 7 + 6 + grab strikes. Those three numbers are distinct.
- Chase Kick alone deals 6. Air Launcher deals 3. Both applied deals 9.

Magnus Heavy as a face (`USE_FACE`, no secondary die) is also a heavy punch finisher and its primary Strike is 5 with no bonus. If `exGate` is the class and role, that face is a legal Crushing Throw window and the damage is 6, not 5, not 11. Ryu Charge (`face-natural-ryu-charge`) is a heavy punch finisher on the wrong fighter, and its face `meterCost` of 1 is spent in `conductCombatAction`, not at declaration.

### Meter after a hit that actually resolves

`grantSequenceHitMeter` still runs for a non-negated combat-action. A heavy hit grants 4 to the controller and 1 to the defender. Play spend happens first.

Start at 8. Immediately after a legal `PLAY_CARD`, before any pass: controller Meter is 0, the card has left the hand, the chain is still open. After the chain resolves unnegated: controller Meter is 4 and the defender gained 1. Deltas for the controller include `-8` then `+4`. Parry skips the grant, so Meter stays 0. A test that expects 0 after a successful resolve is wrong.

## Deck

Extend `src/server/rules/loadout.test.ts`. Pad with `OPEN_PALM` the way the combat-cap test does so the list stays inside the Tag Skirmish size when the config is `TAG_FIGHTER_RULES`. `responseCombatCount` counts subtype `combat` only. An EX whose only extra subtype is `ex` adds 0.

Register two ids, one restricted to Magnus and one to Vega. Three copies of one EX id are inside the copy cap (`deckMaxCopiesPerCard` is 3, the check is `next > cap`). That deck fails only the EX cap. Four copies of `OPEN_PALM` remains the existing copy-cap case; do not reuse it as the EX case.

| Case | Setup | Actions | Assertion |
|---|---|---|---|
| 0 EX | `TAG_SKIRMISH_LOADOUT.deck` | `validateTacticsDeck(..., TAG_FIGHTER_RULES)` | Already `{ ok: true }`. Leave that test. `responseCombatCount` unchanged. |
| 1 EX for Magnus | One Magnus EX plus fillers | `validateTacticsDeck` | `{ ok: true }`. |
| 2 EX for Magnus | Two of the Magnus id | `validateTacticsDeck` | `{ ok: true }`. |
| 3 for one fighter | Three of the Magnus id, size and combat cap otherwise legal | `validateTacticsDeck` | `{ ok: false }`. Reason is not the copy string (`copies of`) and not the combat string (`response combat`). |
| 2 + 2 | Two Magnus EX and two Vega EX | `validateTacticsDeck` | `{ ok: true }`. |
| Copy cap still 3 | Three `OPEN_PALM` under a config whose min is 0; four `OPEN_PALM` | existing copy-cap tests | Three stay legal. Four stay illegal. Do not raise the cap to make EX fit. |
| Combat cap stays | Nine combat cards (the existing Parry / Brace / Shift triple) plus two EX; then that nine plus one more Parry | `validateTacticsDeck` and `responseCombatCount` | Nine plus two EX is legal. `responseCombatCount` of the EX pair is 0. The tenth combat card is still `tactics deck has 10 response combat cards, max 9`. |
| EX in the deck, fighter not in the squad | Magnus EX, squad `[VEGA, RYU, VEGA]` | `validateTacticsDeck` (no squad argument) and `validateLoadout` | Both ok. Play is the next row. |

Play half of the last row, in the new file below, copying `handDeck.test.ts` ("plays a fighter-specific card only when that fighter is on the team" and "keeps one deck for the team"):

- Setup: match whose squad has no Magnus, Magnus EX in hand, Meter 8, and a legal Vega kick finisher on top so the only failure is `cardRestrictionError`.
- Action: `PLAY_CARD`.
- Assertion: `ok === false`, error `INVALID_TARGET`, `result.state === before`, Meter still 8, card still in hand. A defeated Magnus, when the gate would otherwise match, is the same error. `cardRestrictionError` ignores defeated fighters.

## New file

Put the rows below in `src/server/reducer/exCards.test.ts`. Share one match builder. Do not grow `offensiveControl.test.ts` or `tagFighter.test.ts` with this behavior.

Priority after `openCombatAction` belongs to the attacker (`openReactionWindow(..., "same")`). `PLAY_CARD` of a Modify keeps it there, because `modifySubject` is set and a combat-action is on the stack.

### Timing

| Case | Setup | Actions | Assertion |
|---|---|---|---|
| Immediately after a qualifying attack | Active Magnus, Grab + Focus, Meter 8, Crushing Throw in hand. `USE_TECHNIQUE` `technique-magnus-power-bomb`. | `PLAY_CARD` while priority is P1 and the top link is that combat-action. | `ok`. Top link is still `combat-action`, not negated, `sequenceRole` `finisher`, `hitStrength` `heavy`, `hitType` `punch`, source is that Magnus. Meter is 0 before any pass. Priority stays with P1. |
| After you pass | Same declaration. | `PASS_PRIORITY` as P1. | P1 is not the priority player. A `PLAY_CARD` from P1 is `NOT_PRIORITY_PLAYER` and the state is the post-pass state. |
| Priority comes back | Same, then P2 `PASS_PRIORITY` once (consecutive passes become 1, priority returns to P1). No card was added. Top is still the combat-action. | P1 `PLAY_CARD` the EX. | Illegal. State identity holds. Meter unchanged from the post-pass state. This is the case a pure "top link matches" check gets wrong. |
| After another card | Same declaration. P1 plays a non-EX Modify that is legal in the window (a `testCard` with `modifySubject: "target"` and a legal redirect target, or any Modify `playCard` already accepts above a hit). | P1 `PLAY_CARD` the EX while they still have priority. | Illegal. The top link is the other card. The combat-action is still under it and is not replaced. |
| No attack | Actions, empty chain, Meter 8, EX in hand. | `PLAY_CARD`. | Illegal, state identity, Meter 8, card in hand. |
| Wrong gate, light punch | Active Magnus showing `face-natural-jab`. `USE_FACE`. | `PLAY_CARD` Crushing Throw. | Illegal. Jab is a light punch starter. |
| Wrong gate, kick | Active Vega, Chase Kick declared (Kick + Heavy). | `PLAY_CARD` Crushing Throw. | Illegal. Kick finisher is not a heavy punch finisher. |
| Wrong gate, right class, wrong role | Active Magnus, Lariat Throw (`technique-magnus-lariat-throw`, heavy punch extender). Needs a combo first: a legal starter, resolve it, then the extender. | `PLAY_CARD` Crushing Throw. | Illegal. |
| Wrong fighter | Active Ryu showing `face-natural-ryu-charge` (heavy punch finisher). Meter at least 1 so the face itself is affordable. `USE_FACE`. | `PLAY_CARD` Crushing Throw. | Illegal even though the class and role match. Source definition is Ryu. |
| Heavy face, same gate | Active Magnus showing `face-natural-magnus-heavy`. `USE_FACE`. Meter 8. | `PLAY_CARD` Crushing Throw, then resolve with two non-Grab scripted slots. | Legal. Damage is 6, not 5, not 11. |

Air Launcher's gate is a kick finisher of any strength. Chase Kick (heavy) is the catalogue case and must be legal. A `testCard` / test technique that is a light kick finisher on Vega must also be legal. A heavy punch finisher must not be. If the only test is Chase Kick, a gate that secretly requires heavy still passes.

### Replacement

Same Power Bomb faces (Grab + Focus). Script both Magnus rerolls onto non-Grab slots (`0` jab and `3` lariat).

| Case | Actions | Assertion |
|---|---|---|
| Original does not resolve | Declare, play Crushing Throw, both pass with the scripted RNG on the resolving pass. | Defender damage is 6. The no-EX control on the same faces is 7. |
| EX strike does resolve | Same. | Damage is 6, not 0. |
| They do not stack | Same. | Damage is not 13 and not 7. Link `kind` is still `combat-action`. |
| Link identity | Read the stack after `PLAY_CARD`, before passes. | One combat-action, still the finisher, `negated === false`. Its effects are the replacement set, or the original effects are gone by the time it conducts. Either way the original 5-plus-bonus does not deal damage. |

### Meter

| Case | Setup | Actions | Assertion |
|---|---|---|---|
| Illegal spends 0 | Any illegal row above, Meter 8. | `PLAY_CARD`. | `result.state === before`. No `meter-changed`. Card in hand. |
| Legal spends 8 before resolution | Qualifying Power Bomb, Meter 8. | `PLAY_CARD` only. | Meter is 0. Chain still open. Defender damage is still 0. `meter-changed` delta `-8` is already in the log. |
| Parry does not refund | Meter 8, play EX, P1 passes, P2 plays Parry (`card-parry` or the `PARRY` fixture in `offensiveControl.test.ts`), then drain. | Resolve. | Meter is 0, not 8. No `+4` sequence grant. Damage 0. |
| Two EX cannot spend the same 8 | Two Crushing Throw copies in hand, Meter 8, one qualifying attack. | Play the first. Play the second before resolving. | Second is `INSUFFICIENT_METER`. State is the post-first-play state. Meter stays 0. One card left the hand. |
| Ordinary card `meterCost` at play | `testCard` Modify with `meterCost: 2` and a legal subject, Meter 5, actions, no chain. | `PLAY_CARD`, then a second play at Meter 1. | First drops Meter to 3 before `resolveOpenChain`. Second is `INSUFFICIENT_METER` and returns that state. Extend `src/server/reducer/playcard.test.ts` or `cardBehavior.test.ts` ("spends Meter only for the exceptional mode") so this is not only an EX fixture. |
| Sequence `meterCost` on conduct | Existing Meter Jab in `offensiveControl.test.ts`. Also Ryu Charge, `meterCost` 1, if a live-face regression is added. | Declare with enough Meter. Read Meter before any pass. Then resolve. | Declaration does not spend. Conduct spends. Short Meter is `INSUFFICIENT_METER` at declaration and does not mark the face spent. The existing test "spends and grants meter while resolving, and rejects a short meter" must stay. |

### Defense

Counter is `card-counter`: `negate-card` with `cardTypes: "any"`. `linkMatchesNegateCard` rejects `combat-action` via `isNegatableLinkKind`. Parry is `grant-attack-prevent` plus `endsSequence`. Brace is `reduce-damage` 2 onto `chain-attack-target`. `dealDamage` applies `nextIncomingDamageReduce` once, then clears it.

| Case | Setup | Actions | Assertion |
|---|---|---|---|
| Ordinary card can be countered | A non-EX effect card on the chain, Counter in the opponent's hand, opponent has priority. | `PLAY_CARD` Counter, drain. | The card link resolves negated. Its damage or draw does not happen. |
| Ordinary combat-action cannot | The existing hit, no EX. | P2 plays Counter. | `ok === false`. Leave `offensiveControl.test.ts` "does not let Counter answer a hit" green. Do not flip `isNegatableLinkKind`. |
| EX card cannot be countered | Qualifying attack, EX played, P1 passes, Counter in P2's hand, EX link is top. | P2 `PLAY_CARD` Counter. | `ok === false`, state identity. Neither the EX link nor the combat-action is negated. A following Parry from that same state still works. |
| Parry negates the EX body | EX played, P1 passes, P2 plays Parry, drain. Use the scripted RNG on that drain. | Resolve. | Damage 0. Magnus `rolledSlotIndex` unchanged. No attack ban on the later turn. No extra phase. Active player is P2, phase `roll`, turn incremented once. Combo stays 0. Meter stays 0. |
| Mistimed Parry | Three setups: no chain; attacker plays Parry against their own hit (target is the opponent); Parry after the chain has already drained. | `PLAY_CARD`. | No chain: `INVALID_CHAIN_TARGET`. Own hit: `INVALID_TARGET` (`playCard` requires the attack target to be yours). After the drain there is no window. None of them spend Meter or set `negated`. |
| Brace still reduces | EX played, non-Grab rerolls so the only strike is the opening one, P1 passes, P2 plays Brace, drain. | Resolve. | Crushing Throw damage is 4 (6 − 2). Air Launcher damage is 1 (3 − 2). Brace above a hit is the legal order. Do not expect the 2 to apply again to a later Grab strike; the reduce is consumed by the first damage effect. |

### Crushing Throw dice

Script `integer()` on the resolving `reduce`. Magnus `baseDie` slots: 0 jab, 1 Grab, 2 Grab, 3 Lariat, 4 Lariat, 5 Heavy. Snapshot every die's `rolledSlotIndex` first.

| Case | Queue | Assertion |
|---|---|---|
| Both rerolls known | First call slot 0, second slot 1. | Final Magnus slot is 1 (second replaces first). Damage is 8 (6 + one Grab). |
| 0 Grab strikes | Slot 0 then slot 3. | Damage 6. Final slot 3. |
| 1 Grab strike | Slot 0 then slot 1, and the swap (slot 1 then slot 0) as a second test. | Damage 8 both times. Final slot is the second call. The first Grab still struck after it stopped showing. |
| 2 Grab strikes | Slot 1 then slot 2. | Damage 10. Final slot 2. |
| Only the Magnus die changes | Any queue. | Vega and Ryu `rolledSlotIndex` are unchanged. Both opponent dice are unchanged, including an opponent die that is showing Grab. |
| Not `REROLL_DICE` | Read the log and `spentOncePerTurnKeys`. | No `dice-rerolled` event. `turn-reroll` was not added. `rerollAvailable` is not turned back on. |

### Attack ban

Capture `n` as `state.turn` while the chain is still open, before the resolving pass. The body runs at `n`. `passTurnAfterSequence` then makes the turn `n + 1` and the opponent active. The banned turn is `n + 2`. The controller's turn after that is `n + 4`.

Do not copy `tagInLockUntilTurn` (`src/server/rules/offensive.ts`). That helper returns `turn + 2` and the lock is `turn < until`. Stored at `n`, that frees `n + 2`, which is the turn that must be banned. `tagInLockedUntilTurn` on the creature is the pattern for where a turn stamp lives (`src/server/model/creatures.ts`), not for the arithmetic.

Walk the turns with `ROLL_DICE`, `ADVANCE_PHASE`, and `END_SEQUENCE` or a finisher. Re-show faces after each roll. `TAG_FIGHTER_RULES` draws 1 on turn start; `deckOutEnabled: false` keeps an empty deck from ending the match.

| Case | When | Action | Assertion |
|---|---|---|---|
| Ban starts on resolve | After a clean Crushing Throw drain. | Inspect, then play to `n + 2`. | No ban is observable as a refused attack before `n + 2`. On `n + 2` the refusals below fire. |
| Parry skips the ban | Parry row, then the same walk to `n + 2`. | Magnus `USE_FACE` on a legal jab. | Legal. The finisher's turn pass still happened, so `n + 2` is that Magnus's next turn and they can attack. |
| Face | `n + 2`, Magnus active, jab showing. | `USE_FACE`. | `ok === false`, state identity. |
| Technique | `n + 2`, Grab + Focus showing. | `USE_TECHNIQUE` Power Bomb, or a starter that is fuelled. | `ok === false`, state identity. |
| Hit assist | Catalogue Magnus has no hit assist (Wall is `arm-redirect-damage`). Use a `testCreature` with one `assist-hit`, an EX restricted to that creature, and the same ban. Do not overlay `creature-magnus`. | On the banned turn, `ASSIST` that reserve from `open` if its role fits. | `ok === false`, state identity. |
| Ban has passed | Walk to `n + 4` (end `n + 2`, play the opponent's `n + 3`, arrive on the controller). Also try the attack at the start of `n + 3` only if that seat could legally attack; the requirement is that the ban is not still on after `n + 2`. | Magnus `USE_FACE`. | Legal. Damage resolves. An implementation that bans through `n + 4` fails this. |
| Other fighters on the banned turn | `n + 2`. | Vega `USE_FACE` on a legal starter, or Ryu `ASSIST` (Seal is a hit finisher and fits `open`). | Legal. |
| Response | `n + 2`, Magnus active. Arrange a reaction window whose chain holds an opponent combat-action and whose priority is P1, the way `tagFighter.test.ts` writes `pendingDecision` when it needs a window without a live opposing turn. | `PLAY_CARD` a normal Response. | Legal. The attack ban is not the refusal. An empty chain still returns the existing `INVALID_CHAIN_TARGET`. |
| Tag | `n + 2`, opening of the turn, Magnus active or in reserve. | `TAG`. | Legal. Active fighter changes. Meter unchanged. |
| Non-hit assist | `n + 2`, Magnus in reserve, sequence open, no chain. | `ASSIST` Magnus (Wall). | Legal. The link is the redirect, not an `assist-hit`. Same shape as "drops an unused Wall redirect when its Chain ends". |

### Air Launcher

Chase Kick with Kick + Magnus Heavy, unless a row says otherwise. Meter 8. Script three `integer()` results that are not the current slots of Vega, Magnus, and Ryu, in `dieIds` order.

| Case | Actions | Assertion |
|---|---|---|
| Strike 3, not 4 | Play, drain with the scripted RNG. | Defender damage is 3. The no-EX control is 6. Not 9. Not 4. |
| Own dice change | Same. | All three of the controller's dice show the queued slots. |
| Opponent dice stay | Same. | Both of P2's `rolledSlotIndex` values match the snapshot. |
| Same turn, new open phase | Read the state after the drain. | `activePlayerId` is still P1. `turn` equals `n`. `phase` is `actions`. `offensiveState` is `open`. `aggressorPlayerId` is P1. `rerollAvailable` is false. `pendingDecision` is null. Chain is empty. |
| Not the action reroll | Same log. | No `dice-rerolled`. No `turn-reroll` key. `canRerollDice` is false (`phase` is not `roll`). |
| No draw, no hidden turn | Hand size and deck length match the pre-resolve snapshot. | `turn-started` did not fire. `cardsDrawnPerTurn` did not draw. |
| One phase, not a free second EX | Do not play another card. | `END_SEQUENCE` (the action `endOffensiveSequence` already uses) runs once: opponent becomes active, turn is `n + 1`, phase is `roll`. There is no second extra phase and no second Strike 3. |
| A second copy is a second play | After the extra phase, Meter was 4 from the heavy grant, not 8. A second Air Launcher in hand, even after a new kick finisher, cannot spend 8. | `INSUFFICIENT_METER`, state identity. Refill to 8, declare a new kick finisher, play the second copy: that is a new play and a new single phase, not a bonus from the first. |
| Finisher from this gate still is not Crushing Throw | Chase Kick, Air Launcher. | Turn did not pass. Magnus is not attack-banned on `n + 2`. |

`reduce` clears `rerollAvailable` on `USE_TECHNIQUE` and `PLAY_CARD`. The extra phase must leave it false, not merely inherit that clear and then call `rollDice` (which sets it true).

## Regressions to leave green

These files already cover the behavior EX must not disturb. Run them. Add a case only where the row above says to extend.

| Behavior | File and test |
|---|---|
| Modify subject `roll`, `die`, `moveset`, `target`, `tag` | `src/server/reducer/cardBehavior.test.ts` (the subject tests, plus "spends Meter only for the exceptional mode") |
| Response needs an opponent object | `cardBehavior.test.ts` "rejects a Response against your own action and accepts one against the opponent" |
| Counter vs a card, Counter vs a hit | `offensiveControl.test.ts` "does not let Counter answer a hit"; `src/server/reducer/reaction.test.ts` for a card link |
| Parry vs a non-EX hit | `offensiveControl.test.ts` "does not count or continue a parried hit, and passes the turn"; `sequenceHitMeter.test.ts` "grants nothing when the hit is parried" |
| Chain resolves top down after two passes | `offensiveControl.test.ts` "runs roll, reroll, response, meter, and a control transfer" (`resolvedKinds` ends with `combat-action`) |
| Finisher passes the turn | `offensiveControl.test.ts` "extends combo, then a finisher ends the turn" |
| Once-per-turn reroll | `offensiveControl.test.ts` "rerolls any number of your dice once, and keeps the named face" and "rejects a reroll after offense is no longer open" |
| `fighterRestriction` at play, not at validate | `src/server/reducer/handDeck.test.ts` "plays a fighter-specific card only when that fighter is on the team" and the validate assertion above it |
| Sequence meter grant by strength | `sequenceHitMeter.test.ts` |
| Combat cap and copy cap | `src/server/rules/loadout.test.ts` |

## Risks

1. **Parry has to beat the body.** Drain pops the top. A legal stack is combat-action, then the EX card, then Parry. Parry's `grant-attack-prevent` negates the nearest combat-action and sets `endSequenceAfterChain`. The EX body runs on the next pop, or inside `conductCombatAction`, only after that flag is set. If the body is applied inside `PLAY_CARD`, Parry cannot skip the Strike, the rerolls, the ban, or the extra phase. Meter stays spent either way.

2. **Negating the attack must not leave the original Strike in the effect list.** `useTechnique` has already folded the secondary bonus into `link.effects` (Power Bomb becomes 7 with Focus, Chase Kick becomes 6 with Heavy). Replacing by appending deals both. Replacing by ignoring `link.effects` and also ignoring the EX deals the original. The control numbers above are the check.

3. **The finisher settle and the extra phase are the same hook.** `settleOffense` calls `passTurnAfterSequence` for every finisher, which calls `endTurn` (draw, turn increment, opponent, phase `roll`). Air Launcher has to take that branch and call `beginOffensiveWindow` instead, without drawing and without incrementing. Crushing Throw has to keep the real pass. `beginOffensiveWindow` does not clear `usedSequenceActionIds`, does not reset combo, and does not set `rerollAvailable`. `enterPhase("actions")` does set `rerollAvailable` false and opens the window; `endTurn` also draws. Whichever function is reused, the Air Launcher assertions on turn, draw, and `rerollAvailable` are the contract. A stale combo count is not specified; `offensiveState: "open"` is.

4. **`effects.ts` cannot take a new opcode.** Freeze is 500 (`src/architecture/module-budget.test.ts`). The file is 484 lines. A new union member plus its fields will cross the freeze. Put new effect types in a new module. `resolution.ts` is frozen at 2030 and is 1900 lines. Do not rewrite it and do not add a large `case` to the switch. `state.ts` is frozen at 460 and is 313 lines. A ban stamp fits next to `tagInLockedUntilTurn` on the creature (`src/server/model/creatures.ts` is not frozen) better than a new bag on `GameState`. `playCard.ts` is 329 lines and is not frozen. New files must stay at or under 500. The EX window check belongs in its own module that `playCard` calls, not in a long branch beside the negate and prevent gates.

5. **Counter is a subtype check, not a kind check.** Refusing every `tactic-effect`, or allowing `negate-card` onto `combat-action`, breaks one of the two Counter regressions. The new refusal is "top link's card has subtype `ex`". Parry does not use that function.

6. **The play window is not "you have priority and the top matches."** Pass does not push a link. After both seats pass once, priority is back on the attacker and the top is still the combat-action. The play is still illegal. Any link pushed above the attack closes it even if the attacker kept priority.

7. **Sequence meter grant hides a missed play-spend.** After a successful heavy EX, Meter 8 becomes 0 at play and 4 at conduct. Assert the 0 before the drain. Assert the 4 after. Parry is the case that stays 0.

8. **Scripted RNG is dropped by `advance` and `resolveOpenChain`.** Those helpers call `createRng(state.rng)`. Grab strikes and "only Magnus changed" are untestable through them. The second reroll replaces the showing face and still counts as a Grab strike if that result was Grab.

9. **Attack-ban off-by-one.** The stamp is taken at turn `n`, before `endTurn` increments. The refused attacks are on `n + 2`. They are legal on `n + 4`. Tag-in lock arithmetic does the opposite.

10. **Brace is one shot of reduction.** It is legal on a combat-action because `chainAttackTargetId` walks past card links. It reduces the first damage effect only. Use the 0-Grab and Air Launcher rows for the numbers 4 and 1.

## Edges the rows above depend on

- `reduce` discards the draft when the command returns an error. A check that spends and then returns an error still looks like "spent 0". The dangerous bug is a check that spends and returns success. Illegal rows must stay `ok: false`.
- Two EX from Meter 8 fail because the cap is 8 and the spend is at play, not because of a once-per-turn rule. Do not encode a second hidden cap.
- `conductCombatAction` returns immediately when `sequenceRole` is missing, and it spends `link.meterCost` before it pushes effects. Stripping the role to "cancel the original" also skips the replacement, the sequence grant, the combo, and the finisher pass.
- `drainChain` ignores `endsSequence` on a combat-action and lets `conductCombatAction` pass the turn. Parry's own `endsSequence` is what passes the turn when the hit was negated. A negated EX must not also call the Air Launcher phase.
- Opening `REROLL_DICE` is legal only in `roll` while `rerollAvailable` is true. Air Launcher's reroll is a rules effect during resolution. It must not be implemented by emitting the `REROLL_DICE` action.
- Power Bomb from `open` is legal (`sequenceRoleFits` allows a finisher from `open`) and does not need a starter. That keeps the damage number free of a previous hit. Chase Kick is the same.
- Secondary bonus, Heavy-face same gate, Ryu Charge as the wrong fighter, and a light kick finisher for "any strength" are all specified above because the catalogue's obvious finishers do not separate those bugs.
