# 021 — Tactic Overcharge (hand-card spend)

Status: **IMPLEMENTED** (2026-08-30) · **retargeted to face card** (2026-08-30)
· **any hand card** (2026-08-31)

A master rule: **any** hand card may be spent once per turn to **Overcharge**
an existing attribute **face card** on your dice, instead of playing or
forging. The next time **any** of your dice show that face after a roll, each
showing die also `[Generate]`s 1 pip of the spent card’s attribute — the same
on-roll generate path as an overload.

Bible is silent. Assumptions are labelled `ASSUMED` in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md). Player wording lives in
[`RULEBOOK.md`](../RULEBOOK.md) §11 / Overcharge and [`KEYWORDS.md`](../KEYWORDS.md).

This is **not** spec `013`’s Mechanical face-marker Overcharge
(`optional-overcharge`, suppress inherent, `resolveNextFaceEffectTwice`). That
opcode stays for catalogue faces that still use it. Player-facing **Overcharge**
now means this master rule.

Proving cards: **Scholar's Lien** (`card-scholars-lien`, Arcane, natural forge)
and **Twin Cam** (`card-twin-cam`, Mechanical, synthetic forge). No catalogue
JSON change: the rule keys off the card being in hand, not the forge region.

## Intent

Hand cards that you would rather not play or forge can still splash their
attribute onto a face you actually want to roll (Darkness Natural, Pyre of
Names, …), like a one-attribute on-roll overload that does not occupy an
overload slot. Target is the **face card**, not a physical slot: one spend
covers every die that shows that face. Forge kind and target do not gate
this spend.

## Rules

1. **Who.** During **actions**, the active player may Overcharge instead of
   playing or forging a hand card. Play, forge, and Overcharge are mutually
   exclusive on the same use (extends bible §19–20 “forge or play, never both”).
2. **Legal card.** The card is in the actor’s hand. Forge kind (natural vs
   synthetic) and forge target (own-die vs opponent-die) do **not** gate
   Overcharge.
3. **Once per turn.** At most one Overcharge action per player per turn
   (`spentOncePerTurnKeys` key `"overcharge"`). Cleared on `END_TURN` with
   other player once-per-turn keys.
4. **Cost.** The card is consumed to the graveyard. No pile `[Spend]`.
   Overcharge does not burn `playCost`, does not consume
   `forgeDiscountThisTurn`, and does **not** draw, set forge yield, or pay the
   synthetic forge bank.
5. **Target.** Choose one **face card** installed on **your** dice whose
   definition has an **attribute** symbol (natural or synthetic). Shield /
   untyped is illegal. Stay/cannot-replace does not block Overcharge (you are
   not replacing). An opponent’s copy of the same face id is not a legal
   target and does not share your pips.
6. **Pip.** That face card (player-scoped) gains one Overcharge pip of the
   spent card’s **`attribute`** (always +1, even if `forge.faces > 1`). Copies
   of the same face on your dice **share** the pips. Multiple Overcharges on
   the same face stack (another turn, or after the once-per-turn window
   resets).
7. **On roll.** When a die **you own** shows that `faceCardId` after
   `ROLL_DICE` (including retain keep and actions-window reroll), generate 1
   effect pip per Overcharge attribute on **your**
   `overchargeByFace[faceCardId]` — same `createSymbol(…, "available",
   "effect")` path as forge yield / overload `[Generate]`, then auto-bank.
   Fires **once per showing die**, like overloads. Fires even if
   `suppressInherentNextRoll` skipped the face’s `onRoll`. Does **not** fire
   immediately when you Overcharge a currently showing face; the pip waits
   for the next roll of a die that shows that face. Look up `die.ownerId`.
8. **Duration (`ASSUMED`).** Pips persist on the player map until the last
   installed copy of that face card **owned by that player** leaves the dice
   (`countInstalledCopies === 0`), then `clearOverchargeOnFace` deletes the
   key — the same moment as `clearOverloadsOnFace`. Overwriting **one** of
   two copies keeps the Overcharge. Not a one-shot consume after the first
   roll.
9. **Reaction window.** Overcharge does **not** open a reaction window (same
   as `FORGE_CARD`).
10. **Print.** Master rule, not a line on every card. Keyword
    `[Overcharge]`. Proving example: Scholar's Lien Overcharges Darkness
    Natural while it is on both of your dice → each die that shows it
    generates Darkness + Arcane. Twin Cam Overcharges the same way with
    Mechanical.

## State Changes

| Field | Role |
|---|---|
| `PlayerState.overchargeByFace` | `Readonly<Record<string, readonly Attribute[]>>` — keyed by face card; one entry per spent card, in spend order. `{}` when none. Cleared when last owned copy leaves. **Not** `DieSlot.overcharge`. |
| `PlayerState.spentOncePerTurnKeys` | Include `"overcharge"` after a successful action. Existing field; do **not** add a `GameState` bag (`state.ts` is frozen). |

## Actions

```ts
{
  readonly type: "OVERCHARGE_CARD";
  readonly playerId: PlayerId;
  readonly cardInstanceId: CardInstanceId;
  readonly faceCardId: FaceCardId;
}
```

Intent only. Host/`reduce()` derives the attribute from the spent card’s
`attribute`. Do not send the generated symbol from the client. There is no
`dieId` / `slotIndex`.

## Validation

| Failure | Error |
|---|---|
| Not actions / not active / pending | existing `INVALID_PHASE` / `NOT_ACTIVE_PLAYER` / `PENDING_DECISION` |
| Unknown card | `UNKNOWN_ENTITY` |
| Card not in actor’s hand | `CARD_NOT_AVAILABLE` |
| Already Overcharged this turn | `ALREADY_USED` |
| Face not installed on actor’s own dice | `INVALID_TARGET` |
| Unknown / untyped Shield / non-attribute face | `INVALID_FACE` |

Queries for UI (pure, `src/server/rules/`):

- `canOvercharge(state, playerId, cardInstanceId): boolean`
- `legalOverchargeFaces(state, playerId): readonly FaceCardId[]`

UI must call these. Do not copy legality into React.

## Resolution

Command module `src/server/reducer/commands/overcharge.ts` (do **not** grow
`forge.ts` / `resolution.ts` / frozen `state.ts` past budget). Facade
`reduce.ts` dispatches `OVERCHARGE_CARD` only.

1. Validate as above.
2. Append the card’s `attribute` to `players[playerId].overchargeByFace[faceCardId]`.
3. `markPlayerSpent(draft, playerId, "overcharge")`.
4. `moveCard` → graveyard.
5. Emit `face-overcharged` (playerId, cardInstanceId, faceCardId, attribute).

On `ROLL_DICE` / equivalent shown-face generate (next to `applyForgeYieldGenerate`
in `shownFace.ts`): look up `draft.players[die.ownerId].overchargeByFace[faceCardId]`;
for each attribute, `createSymbol` 1 pip (`available`, `effect`) for the die
owner. Once per showing die.

`clearOverchargeOnFace` sits next to `clearOverloadsOnFace` at orphan sites
(forge, peel/activate, resolution, pending resolvers). Do not clear on
`overwrittenSlot` — pips are not slot-local.

## Networking

Host-only `reduce()`. `OVERCHARGE_CARD` is a JSON intent; no protocol change
beyond the action union. Clients send the action; they do not apply pips.

## Persistence

None (match state only).

## UI

Match-ui (hotseat + online), **do not implement in engine-developer**:

| Surface | Player sees / does |
|---|---|
| Hand card | **Overcharge** control next to Play / Forge, enabled iff `canOvercharge`. Disabled (do not hide) when once-per-turn is spent or no legal face. |
| After clicking Overcharge | Pick one legal **face card** (`legalOverchargeFaces`). **Reuse the overload face-picker shape.** Confirm dispatches `OVERCHARGE_CARD` with `faceCardId` (not die/slot). Cancel returns to idle. |
| Face tile | Show Overcharge pips (attribute + count) on the **unique face card** tile, not per physical slot, distinct from forge yield / Corruption / overload attachments. Shared across copies of that face. |
| Hint bar | “Choose a face card on your dice to Overcharge (+1 ⟨attribute⟩ on roll).” |
| Rules tab | Picks up `RULEBOOK.md` / `KEYWORDS.md` automatically. |

Do not grow `MatchBoard.tsx` past `module-budget.test.ts` — extract under
`intents/` / `board/` / `modals/`.

## Acceptance Criteria

- [x] Scholar's Lien from hand Overcharges own-die Darkness Natural **face
      card**: next `ROLL_DICE` showing it generates Darkness (inherent) **and**
      Arcane (Overcharge). Card is in graveyard. No pile spend. No forge-draw.
      `players[P1].overchargeByFace[darknessNatural] === ["arcane"]` (not a
      slot field).
- [x] Same with Pyre of Names (synthetic keeper).
- [x] Two copies of Darkness Natural on P1’s dice; one Overcharge; both dice
      show that face → two Arcane banks (one per die).
- [x] Overwrite **one** of two copies: Overcharge remains; remaining copy
      still generates Arcane.
- [x] Overwrite the **last** copy: Overcharge key cleared; rolling the new
      face does not generate Arcane.
- [x] Second Overcharge the same turn is refused.
- [x] Twin Cam (synthetic Mechanical) from hand Overcharges Darkness Natural:
      next roll generates Darkness **and** Mechanical.
- [x] Shield / untyped face is illegal.
- [x] Opponent’s face card (not installed on your dice) is illegal.
- [x] Suppress inherent still generates Overcharge pips (overload family).
- [x] `docs/RULEBOOK.md` and `docs/KEYWORDS.md` updated in the same change.
- [x] No `GameState` field added (`state.ts` frozen). No rewrite of
      `resolution.ts`.

## Tests

- [x] `src/server/reducer/overcharge.test.ts` (proving Scholar's Lien +
      Darkness Natural + Pyre of Names; Twin Cam synthetic; two-copy share /
      orphan; once-per-turn; illegal faces; generate on retained/next roll).
- [x] `src/architecture/module-budget.test.ts` still green.

## Catalogue

No JSON edits. Do not print `[Overcharge]` on every card.
Card-designer may add a `MECHANIC_ARCHETYPES.md` `WATCH` row only.
