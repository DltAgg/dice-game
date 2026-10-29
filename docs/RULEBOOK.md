# Dice Skirmish — living rulebook

How the game **plays today**. Open this in the app under **Rules**.

<!--
Agents: player-facing how-it-plays. Update it in the same change as any
rules edit that changes play (`.cursor/rules/rulebook.mdc`).
The source for this text is `docs/GAME_STATE.md`. Unsettled questions stay
in `docs/OPEN_DESIGN.md`. Unmodelled print stays in `docs/DEFERRED_CATALOGUE.md`.
-->

---

## 1. Object of the game

Two players each have three Fighters. One is **Active**. Two are **Reserve**. Fighters stay for the whole match.

You lose when every one of your Fighters is defeated. The other player wins. If both players are in that state on the same check, the player whose turn it is loses. Defeating a Fighter marked legendary does not by itself end the match.

Drawing a card when your deck is empty loses. There is no reshuffle. Milling cards does not lose the match by itself.

## 2. What you bring

Each player brings three Fighters, one die for each Fighter, and one shared deck of 30 to 40 cards. A deck has at most 3 copies of one card. A tag-fighter deck may include at most 9 Combat cards in total. Parry, Brace (the Block card), and Shift count. Counter does not. Shift stays a Modify; its play does not change. The opening hand is 5. There is no maximum hand size.

A deck may also include at most 2 EX cards for each Fighter, counted separately. Two for Magnus and two for Vega are allowed. Three copies of one EX card are not, even though another card may still have 3 copies. An EX card may name a Fighter who is not in your squad. You still cannot play it unless that Fighter is on your squad, alive, and your Active Fighter.

Cards are **Response** or **Modify**. An EX card is a Modify, not a card type. Tag is an operation, not a card type. Assist is on the Fighter, not a card.

The face deck is not used in the online game. It is the future physical card for a face after Replace. Replace writes that face onto the die for the rest of the match. Ryu Form’s Replace also makes that slot the showing face.

## 3. The table

The first Fighter in the squad starts Active, in front. The other two start in Reserve, behind. When the Active Fighter changes, the new Active Fighter moves to the front and every other living Fighter moves behind.

A hit targets the opponent’s Active Fighter. It does not choose a Fighter who is behind.

When your Active Fighter is defeated and a living Reserve remains, you choose who becomes Active. The defeated Fighter stays defeated. That choice spends no Tag and no Meter. If a decision is already waiting, the choice is skipped. If no living Reserve remains, there is no choice. Defeating a Reserve does not open that choice.

## 4. Match start

The match starts on turn 1, in the roll. The first player in the setup list takes that turn. Both players are dealt their opening hand. There is no extra draw before the first roll.

Each player has a Meter pool. It starts at 0. The cap is 8. It is not cleared when the turn ends or when you Tag.

## 5. Turn structure

A turn has two phases: **roll**, then **actions**. Ending the turn is an action, not a third phase.

On your roll, you roll both players’ dice, including Reserve and defeated Fighters, and you stay in the roll. You may then reroll any number of your own dice once. That reroll does not roll the opponent’s dice, and it moves you into actions. There is no second reroll. You may instead continue into actions without rerolling. The roll does not absorb symbols.

When you end the turn, the opponent becomes the active player, the turn number goes up by 1, that player draws 1, victory is checked, and the phase becomes roll.

An extra actions phase is not that. It is another actions window for the same player, on the same turn, after a sequence ends. You do not draw, the turn number does not go up, and you do not get another opening reroll. Section 13 says when you get one.

## 6. Meter

A sequence hit that resolves, is not negated, and whose target is not already defeated spends that hit’s Meter cost first. If the spend fails, the hit does not grant Meter and does not apply its effects. If it succeeds, you gain the hit’s printed Meter gain, and also 2, 3, or 4 when the hit is light, medium, or heavy. The owner of the Fighter you hit gains 1. This is not Meter per damage.

Light, medium, and heavy do not set the damage. The damage is the printed `[Strike N]`.

Playing a card spends its Meter cost when the play is legal, before anyone else can answer. An illegal play spends nothing. An exceptional mode also spends its extra Meter. An Assist spends Meter only when that Assist prints a cost greater than 0. A Tag switch does not spend Meter.

A sequence hit’s Meter is a different payment. It is spent when that hit resolves and is not negated, as the first paragraph says. An EX card spends its own Meter when you play it. The hit it replaces does not also spend or grant its sequence-hit Meter.

Crushing Throw and Air Launcher each cost 8 Meter, the whole pool, paid when you play them. Open Palm costs 2 Meter whenever you play it. You choose one of your dice, then `[Choose face]` on that die. That face becomes the one showing. Call Out spends 2 Meter. That is an exceptional cost. A later Parry or Counter does not give that Meter back. You cannot spend the same Meter twice.

## 7. The sequence

The sequence is not a phase. It is **open** or in **combo**.

Entering actions makes you the Aggressor and opens the sequence. Only the Aggressor declares hits. From open, the legal roles are starter and finisher. From combo, the legal roles are extender and finisher. Tag on this turn leaves those roles as they are. A finisher from open still ends the sequence.

A face action uses the showing face of one of your living Fighters, Active or Reserve. A Technique is only the Active Fighter. It uses two different dice you own that are showing a face. One of those dice is showing the Technique’s primary face. The other matches the Technique. Either of those faces may be the Active Fighter’s. One showing face cannot fill both inputs. The Technique’s sequence role is what the sequence checks. Both target the opponent’s Active Fighter.

The other face matches that Technique by any punch, any kick, any light, any medium, or any heavy, or by one strength together with one strike. It is not a movement face.

Ryu Form’s Replace writes Form onto the chosen slot for the rest of the match and makes that slot the showing face, including a slot that was not showing. Form can open the sequence while it is still open. A later roll can show a different slot. A starter is still illegal once the sequence is in combo.

A die is not spent by a face action or a Technique. The same face and the same Technique cannot be declared again while that action is on the Chain or already used in this sequence.

A starter or extender that hits and does not end the sequence adds 1 to your combo and sets the sequence to combo. You stay the Aggressor. A starter that hits Ryu deals half that Strike, rounded down. An extender or a finisher that hits Ryu deals its full Strike. A Grappler’s first Starter against Ryu does not hit: it deals no damage, grants no Meter, and leaves the sequence open. That Grappler needs a second Starter to hit Ryu and enter combo. That second Starter still deals half damage. A new sequence requires two Starters again.

A finisher ends the sequence. You may also end the sequence yourself. Ending a sequence hands the turn to the opponent, unless an extra actions phase is waiting. Then the sequence still ends, and you take that extra actions phase instead of handing the turn over. Whether every other sequence end is a different operation from ending a turn is not decided. Until it is, every other end is that one handoff.

You may replace a hit you just declared with an EX card, as section 13 describes. The replaced hit does not deal its own Strike. If it is not negated, it still counts as the sequence role it was declared as. A finisher still ends the sequence.

Defeating a Fighter ends that sequence. That Fighter’s owner loses their combo, and the turn is handed to the opponent. The Active-Fighter replacement in section 3 still applies.

## 8. Tag

Tag is your action during actions, at most once per turn. It is legal in an opening window or a closing window.

The opening window is before any face, Technique, Assist, card, or sequence end. The closing window is while you are the Aggressor and the sequence is in combo. A Chain, a pending decision, a second Tag, or a finisher already resolved this turn closes both windows.

The chosen Fighter must be a living Reserve and must not be locked from Tagging in. Your Active Fighter must not be defeated. Tag enters the Chain. If it resolves and is not negated, that Reserve becomes Active, the previous Active becomes Reserve, and your combo becomes 0. Meter is not spent. A Tag declared in the closing window ends the turn after the switch.

`[Tag out]` is different. It asks the opponent to choose a living Reserve to become their Active Fighter. It does not spend Tag or Meter. If that effect says the Fighter who left cannot Tag in, that Fighter cannot Tag in on the controller’s next turn. The lock ends when that turn ends. No living Reserve: nothing happens. A Fighter who is already defeated is not the target.

## 9. Assist

Assist names one of your Fighters who is not Active. That Fighter may be defeated. The Active Fighter cannot Assist. Each such Fighter can Assist once per turn.

A hit Assist is legal on your turn during actions, while you are the Aggressor, and only when that hit’s sequence role fits. It is not legal while answering a Chain. Vega Cross is an extender: light punch, `[Strike 2]`. Ryu Seal is a finisher: medium punch, `[Strike 3]`. The hit aims at the opponent’s Active Fighter. It deals that Strike, counts for combo, and grants Meter from its strength. A finisher ends the sequence, so the turn is handed to the opponent. A finisher is legal while the sequence is open or in combo. An extender is legal only in combo, with no Chain open. Tag on this turn leaves those roles as they are.

An Assist that is not a hit can be declared on your turn, or while you have priority and an opponent’s sequence hit or Technique is on the Chain. Magnus Wall is that kind. Its print is `When attacked: [Redirect 4] to this fighter.` `[Redirect 4]` sends 4 of the next attack damage in that Chain to Magnus. A hit and a Technique both count. Damage above 4 stays on the Fighter who was hit. The redirect ends when that Chain ends.

## 10. The Chain

A face action, a Technique, a hit Assist, Tag, a Response, and a Modify wait on the Chain before they take effect. The Chain is a stack. The last object added is the top.

The player who added the object acts first. That player may add another legal object or pass. A pass gives priority to the opponent. Two passes in a row, with nothing added between them, resolve the Chain from the top down. No new window opens between objects.

While the Chain is waiting, the player with priority may pass, play a Response, play a Modify that names what it changes, declare an Assist that is not a hit, or play an EX card when section 13 says that play is legal. A face action, a Technique, ending the sequence, and Tag are not legal then.

A Response is legal only when an opponent’s object is on the Chain and is not already negated. `[Counter]` negates the top card. It does not negate a hit, and it does not end the sequence. It is also not legal when the top object is an EX card. `[Parry]` negates a hit that would damage your Fighter, including a hit an EX card replaced, and leaves you offensive. It ends the sequence, so the turn is handed to the opponent, unless an extra actions phase is waiting. `[Block N]` uses the same target. Brace is `[Block 2]`. It lowers the next damage by N. It does not cancel the hit. Other Responses and Modifies are unchanged.

A card’s Meter is spent when you play it, and only if that play is legal. A hit’s Meter is spent when the hit resolves and is not negated. A hit an EX card replaced does not spend or grant that hit Meter. Meter spent on the EX card is not returned if the hit is later negated.

A one-shot card leaves your hand for the graveyard when you play it. A Moveset stays in hand until it resolves, then attaches to the Fighter. A negated object does not apply its effects. A negated hit does not add combo.

## 11. Damage

Damage is applied in this order:

1. `[Redirect N]` on a living ally takes up to N of this attack damage, when this damage is a hit or a Technique in the Chain where that redirect was armed. That ally takes that much. The rest stays here. The redirect is then spent.
2. Bonus damage on the next hit is added once.
3. `[Block N]` is subtracted once. While a face is showing a reduction, and a standing reduction on taking damage, are the same kind of reduction. They lower damage. They do not cancel the hit.
4. What remains is added to the Fighter’s damage. The Fighter is defeated when damage reaches that Fighter’s life.

`[Parry]` cancels the waiting hit before this damage is applied.

## 12. Cards

A draw is not attached to a Fighter, and a draw does not happen again and again without a restriction or a condition. An attached draw is acceptable as part of a Technique or an Assist, and also when it has a restriction, such as draw 2 and discard 1, or pay Meter to draw that many cards. Those amounts are examples.

Anchor is a Modify you play on your turn. When it resolves, choose one: `[Draw 2]; [Discard 1]`. Or spend 4 Meter: `[Draw 3]; [Discard 1]`. You draw first, then you choose the card you discard. The 4 Meter is spent when you choose that option. If you have less than 4 Meter, you draw 2 and discard 1.

## 13. EX

EX is a Modify you play on a hit you just declared, while you still have priority and that hit is the top of the Chain. You have not passed yet, and that hit is still the top object. The hit is yours, it is not negated, and it matches that card. After you pass, or after anything else is added above the hit, that EX card is illegal. It uses the priority you already have.

The card names one Fighter. That Fighter must be your Active Fighter. The hit you replace must be that Fighter’s, and it must match the card: role, strike, and strength. Another Fighter’s hit does not qualify, even when the named Fighter is the one in front. The deck limit in section 2 is separate from this.

Playing it spends its Meter, then puts the EX card on the Chain above the hit. You keep priority. The hit’s printed Strike does not happen. If the hit is a finisher, the sequence still ends.

`[Parry]` can still negate that hit. If it does, the EX card’s effect does not happen. The Meter you spent stays spent. `[Counter]` is illegal while an EX card is the top of the Chain. Counter remains illegal against a hit.

**Crushing Throw** is Magnus’s EX card. It costs 8 Meter. Magnus must be your Active Fighter, and the hit must be Magnus’s heavy punch finisher. Power Bomb is that kind of hit. The printed Strike is replaced by `[Strike 6]`, then you reroll Magnus’s die twice, then `[Strike 2]` for each of those two rolls that lands on Grab. Both rolls count, and the die ends on the second roll. Only Magnus’s die rolls. Then Magnus cannot attack on your next turn.

That ban is your next turn. An extra actions phase on this turn is still this turn, so Magnus can still attack during it. On the banned turn, Magnus cannot use a face, a Technique, or a hit Assist. You can still play Responses. Magnus can still use a non-hit Assist. You can still Tag. Your other Fighters can still attack. If the hit was negated, the ban does not start.

**Air Launcher** is Vega’s EX card. It costs 8 Meter. Vega must be your Active Fighter, and the hit must be Vega’s kick finisher of any strength. Chase Kick is that kind of hit. The printed Strike is replaced by `[Strike 3]`. Then you reroll each of your dice once, including Reserve and defeated Fighters. The opponent’s dice stay as they are. This is not your once-per-turn reroll, and you do not get another opening reroll. Then you take one extra actions phase.

The sequence still ends, because the hit was a finisher. When it would hand the turn over, you stay the active player and start that extra actions phase. The turn number stays, you do not draw, and you do not reroll for the opening of a turn. One Air Launcher gives one extra phase. Playing it again on a later sequence can give another. Choosing to end the turn does not spend a stored extra phase. The extra phase is not a new turn. If the hit was negated, you do not get the phase.

Tag Skirmish includes one copy of each of these cards.

## 14. What this rulebook is not

There is no attribute pile, no turn-pool symbols, no Shield resource, no Ritual, and no Overload. Range and Reposition are not used. Dodge is not a current effect. Empower, Pierce, Desynthesize, Convert, and attribute-only verbs are not current print.
