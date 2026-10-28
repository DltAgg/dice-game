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

Each player brings three Fighters, one die for each Fighter, and one shared deck of 10 to 24 cards. A deck has at most 3 copies of one card. The opening hand is 5. There is no maximum hand size.

Cards are **Response** or **Modify**. Tag is an operation, not a card type. Assist is on the Fighter, not a card.

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

On your roll, you roll both players’ dice, including Reserve and defeated Fighters, and you stay in the roll. You may then reroll any number of your own dice once. That reroll does not roll the opponent’s dice. There is no second reroll. You then continue into actions. The roll does not absorb symbols.

When you end the turn, the opponent becomes the active player, the turn number goes up by 1, that player draws 1, victory is checked, and the phase becomes roll.

## 6. Meter

A sequence hit that resolves, is not negated, and whose target is not already defeated spends that hit’s Meter cost first. If the spend fails, the hit does not grant Meter and does not apply its effects. If it succeeds, you gain the hit’s printed Meter gain, and also 2, 3, or 4 when the hit is light, medium, or heavy. The owner of the Fighter you hit gains 1. This is not Meter per damage.

Light, medium, and heavy do not set the damage. The damage is the printed `[Strike N]`.

Playing a card spends its Meter cost when you play it. An exceptional mode also spends its extra Meter. An Assist spends Meter only when that Assist prints a cost greater than 0. A Tag switch does not spend Meter.

No card in the current list has an ordinary Meter cost. Open Palm spends 2 Meter to play it outside a Chain. Call Out spends 2 Meter. Both are that exceptional cost.

## 7. The sequence

The sequence is not a phase. It is **open** or in **combo**.

Entering actions makes you the Aggressor and opens the sequence. Only the Aggressor declares hits. From open, the legal roles are starter and finisher. From combo, the legal roles are extender and finisher. A finisher is illegal on a turn that already declared Tag. A finisher from open still ends the sequence.

A face action uses the showing face of one of your living Fighters, Active or Reserve. A Technique is only the Active Fighter. It uses two different dice you own that are showing a face. One of those dice is showing the Technique’s primary face. The other matches the Technique. Either of those faces may be the Active Fighter’s. One showing face cannot fill both inputs. The Technique’s sequence role is what the sequence checks. Both target the opponent’s Active Fighter.

Ryu Form’s Replace writes Form onto the chosen slot for the rest of the match and makes that slot the showing face, including a slot that was not showing. Form can open the sequence while it is still open. A later roll can show a different slot. A starter is still illegal once the sequence is in combo.

A die is not spent by a face action or a Technique. The same face and the same Technique cannot be declared again while that action is on the Chain or already used in this sequence.

A starter or extender that does not end the sequence adds 1 to your combo and sets the sequence to combo. You stay the Aggressor.

A finisher ends the sequence. You may also end the sequence yourself. Ending a sequence hands the turn to the opponent. Whether ending a sequence and ending a turn are different operations is not decided. Until it is, they are that one handoff.

Defeating a Fighter ends that sequence. That Fighter’s owner loses their combo, and the turn is handed to the opponent. The Active-Fighter replacement in section 3 still applies.

## 8. Tag

Tag is your action during actions, at most once per turn. It is legal in an opening window or a closing window.

The opening window is before any face, Technique, Assist, card, or sequence end. The closing window is while you are the Aggressor and the sequence is in combo. A Chain, a pending decision, a second Tag, or a finisher already resolved this turn closes both windows.

The chosen Fighter must be a living Reserve and must not be locked from Tagging in. Your Active Fighter must not be defeated. Tag enters the Chain. If it resolves and is not negated, that Reserve becomes Active, the previous Active becomes Reserve, and your combo becomes 0. Meter is not spent. A Tag declared in the closing window ends the turn after the switch.

`[Tag out]` is different. It asks the opponent to choose a living Reserve to become their Active Fighter. It does not spend Tag or Meter. If that effect says the Fighter who left cannot Tag in, that Fighter cannot Tag in on the controller’s next turn. The lock ends when that turn ends. No living Reserve: nothing happens. A Fighter who is already defeated is not the target.

## 9. Assist

Assist names one of your Fighters who is not Active. That Fighter may be defeated. The Active Fighter cannot Assist. Each such Fighter can Assist once per turn.

A hit Assist is legal on your turn during actions, while you are the Aggressor, and only when that hit’s sequence role fits. It is not legal while answering a Chain. Vega Cross is an extender: light punch, `[Strike 2]`. Ryu Seal is a finisher: medium punch, `[Strike 3]`. The hit aims at the opponent’s Active Fighter. It deals that Strike, counts for combo, and grants Meter from its strength. A finisher ends the sequence, so the turn is handed to the opponent. A finisher is legal while the sequence is open or in combo. An extender is legal only in combo, with no Chain open. Tag this turn blocks a finisher Assist.

An Assist that is not a hit can be declared on your turn, or while you have priority and an opponent’s sequence hit or Technique is on the Chain. Magnus Wall is that kind.

## 10. The Chain

A face action, a Technique, a hit Assist, Tag, a Response, and a Modify wait on the Chain before they take effect. The Chain is a stack. The last object added is the top.

The player who added the object acts first. That player may add another legal object or pass. A pass gives priority to the opponent. Two passes in a row, with nothing added between them, resolve the Chain from the top down. No new window opens between objects.

While the Chain is waiting, the player with priority may pass, play a Response, play a Modify that names what it changes, or declare an Assist that is not a hit. A face action, a Technique, ending the sequence, and Tag are not legal then.

A Response is legal only when an opponent’s object is on the Chain and is not already negated. `[Counter]` negates the top card. It does not negate a hit, and it does not end the sequence. `[Parry]` negates a hit that would damage your Fighter and leaves you offensive. It ends the sequence, so the turn is handed to the opponent. `[Block N]` uses the same target. Brace is `[Block 2]`. It lowers the next damage by N. It does not cancel the hit.

A card’s Meter is spent when you play it. A hit’s Meter is spent when the hit resolves and is not negated.

A one-shot card leaves your hand for the graveyard when you play it. A Moveset stays in hand until it resolves, then attaches to the Fighter. A negated object does not apply its effects. A negated hit does not add combo.

## 11. Damage

Damage is applied in this order:

1. A living ally who is redirecting damage takes some of it, up to that number.
2. Bonus damage on the next hit is added once.
3. `[Block N]` is subtracted once. While a face is showing a reduction, and a standing reduction on taking damage, are the same kind of reduction. They lower damage. They do not cancel the hit.
4. What remains is added to the Fighter’s damage. The Fighter is defeated when damage reaches that Fighter’s life.

`[Parry]` cancels the waiting hit before this damage is applied.

## 12. Cards

A draw is not attached to a Fighter, and a draw does not happen again and again without a restriction or a condition. An attached draw is acceptable as part of a Technique or an Assist, and also when it has a restriction, such as draw 2 and discard 1, or pay Meter to draw that many cards. Those amounts are examples.

Anchor’s current print attaches and draws 1 at the start of your turn. That print is being rewritten. Open Manual’s Technique is not printed yet.

## 13. What this rulebook is not

There is no attribute pile, no turn-pool symbols, no Shield resource, no Ritual, and no Overload. Range and Reposition are not used. Dodge is not a current effect. Empower, Pierce, Desynthesize, Convert, and attribute-only verbs are not current print.
