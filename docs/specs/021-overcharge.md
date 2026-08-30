# 021 — Tactic Overcharge (natural-forge spend)

Status: **IMPLEMENTED** (2026-08-30)

A master rule: a hand card whose forge region is **natural** (own-die) may be
spent once per turn to **Overcharge** an existing attribute face on your die,
instead of forging. The next time that slot shows after a roll, it also
`[Generate]`s 1 pip of the spent card’s attribute — the same on-roll generate
path as an overload.

Bible is silent. Assumptions are labelled `ASSUMED` in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md). Player wording lives in
[`RULEBOOK.md`](../RULEBOOK.md) §11 / Overcharge and [`KEYWORDS.md`](../KEYWORDS.md).

This is **not** spec `013`’s Mechanical face-marker Overcharge
(`optional-overcharge`, suppress inherent, `resolveNextFaceEffectTwice`). That
opcode stays for catalogue faces that still use it. Player-facing **Overcharge**
now means this master rule.

Proving card: **Scholar's Lien** (`card-scholars-lien`) — Arcane equipment,
`forge.kind: "natural"`, `forge.attribute: "arcane"`. No catalogue JSON change:
the rule keys off the forge region, not a new card field.

## Intent

Natural-forge tactics were only useful as face stickers. Overcharge lets you
keep a face you actually want to roll (Darkness Natural, Pyre of Names, …) and
piggyback the spent card’s attribute onto it, like a one-attribute on-roll
overload that does not occupy an overload slot.

## Rules

1. **Who.** During **actions**, the active player may Overcharge instead of
   playing or forging a hand card. Play, forge, and Overcharge are mutually
   exclusive on the same use (extends bible §19–20 “forge or play, never both”).
2. **Legal card.** The card is in hand, `forge.kind === "natural"`, and
   `forge.target === "own-die"`. Opponent-die natural forge (Corruption
   harassment) cannot Overcharge. Synthetic forge cannot Overcharge.
3. **Once per turn.** At most one Overcharge action per player per turn
   (`spentOncePerTurnKeys` key `"overcharge"`). Cleared on `END_TURN` with
   other player once-per-turn keys.
4. **Cost.** The card is consumed to the graveyard. No pile `[Spend]`. Natural
   forge is already free; Overcharge does not burn `playCost`, does not consume
   `forgeDiscountThisTurn`, and does **not** draw, set forge yield, or pay the
   synthetic forge bank.
5. **Target.** Choose one **physical slot** on **your** die whose showing face
   has an **attribute** symbol (natural or synthetic). Shield / untyped is
   illegal. Slot-based, not face-card-based: two copies of the same face do
   not share Overcharge pips. Stay/cannot-replace does not block Overcharge
   (you are not replacing the face).
6. **Pip.** That slot gains one Overcharge pip of the card’s **`forge.attribute`**
   (always +1, even if `forge.faces > 1`). Multiple Overcharges on the same
   slot stack (another turn, or after the once-per-turn window resets).
7. **On roll.** When that slot is showing after `ROLL_DICE` (including retain
   keep and actions-window reroll), generate 1 effect pip per Overcharge
   attribute on the slot — same `createSymbol(…, "available", "effect")` path
   as forge yield / overload `[Generate]`, then auto-bank. Fires even if
   `suppressInherentNextRoll` skipped the face’s `onRoll` (overloads still
   fire; Overcharge is that family). Does **not** fire immediately when you
   Overcharge a currently showing face; the pip waits for the next roll of
   that slot.
8. **Duration (`ASSUMED`).** Pips persist on the physical slot until the face
   is overwritten or peeled (`overwrittenSlot` / `ACTIVATE_FACE` / unforge),
   like `forgeYield`. Not a one-shot consume after the first roll — “next time
   you roll” in the design example is the first generate, not a clear trigger.
   Overloads are the persistence analogue.
9. **Reaction window.** Overcharge does **not** open a reaction window (same
   as `FORGE_CARD`).
10. **Print.** Master rule, not a line on every natural-forge card. Keyword
    `[Overcharge]`. Proving example: Scholar's Lien Overcharges Darkness
    Natural or Pyre of Names → that slot generates Darkness + Arcane when
    rolled.

## State Changes

| Field | Role |
|---|---|
| `DieSlot.overcharge` | `readonly Attribute[]` — one entry per spent card, in spend order. Omit or `[]` when none. Cleared on overwrite / peel. |
| `PlayerState.spentOncePerTurnKeys` | Include `"overcharge"` after a successful action. Existing field; do **not** add a `GameState` bag (`state.ts` is frozen). |

## Actions

```ts
{
  readonly type: "OVERCHARGE_CARD";
  readonly playerId: PlayerId;
  readonly cardInstanceId: CardInstanceId;
  readonly dieId: DieId;
  readonly slotIndex: number;
}
```

Intent only. Host/`reduce()` derives the attribute from the card’s forge
region. Do not send the generated symbol from the client.

## Validation

| Failure | Error |
|---|---|
| Not actions / not active / pending | existing `INVALID_PHASE` / `NOT_ACTIVE_PLAYER` / `PENDING_DECISION` |
| Unknown card or die | `UNKNOWN_ENTITY` |
| Card not in actor’s hand | `CARD_NOT_AVAILABLE` |
| Forge is synthetic or opponent-die | `CARD_HAS_NO_EFFECT` (this card cannot Overcharge) |
| Already Overcharged this turn | `ALREADY_USED` (new code) **or** `INVALID_TARGET` if adding an error is refused — prefer a dedicated code |
| Die not owned by actor | `INVALID_TARGET` |
| Slot missing / untyped Shield / non-attribute | `INVALID_FACE` |

Queries for UI (pure, `src/server/rules/`):

- `canOvercharge(state, playerId, cardInstanceId): boolean`
- `legalOverchargeSlots(state, playerId): readonly { dieId, slotIndex }[]`

UI must call these. Do not copy legality into React.

## Resolution

New command module `src/server/reducer/commands/overcharge.ts` (do **not** grow
`forge.ts` / `resolution.ts` / frozen `state.ts`). Facade `reduce.ts` dispatches
`OVERCHARGE_CARD` only.

1. Validate as above.
2. Append `forge.attribute` to `DieSlot.overcharge`.
3. `markPlayerSpent(draft, playerId, "overcharge")`.
4. `moveCard` → graveyard.
5. Emit `face-overcharged` (playerId, cardInstanceId, dieId, slotIndex, attribute).

On `ROLL_DICE` / equivalent shown-face generate (next to `applyForgeYieldGenerate`
in `shownFace.ts`): for each attribute in `slot.overcharge`, `createSymbol`
1 pip of that attribute (`available`, `effect`) for the die owner.

`overwrittenSlot` and peel/activate paths clear `overcharge` the same way they
clear `forgeYield`.

## Networking

Host-only `reduce()`. `OVERCHARGE_CARD` is a JSON intent; no protocol change
beyond the action union. Clients send the action; they do not apply pips.

## Persistence

None (match state only).

## UI

Match-ui (hotseat + online), **do not implement in engine-developer**:

| Surface | Player sees / does |
|---|---|
| Hand card with legal natural own-die forge | **Overcharge** control next to Play / Forge, enabled iff `canOvercharge`. Disabled (do not hide) when once-per-turn is spent or no legal slot. |
| After clicking Overcharge | Pick one legal own-die slot (`legalOverchargeSlots`). Confirm dispatches `OVERCHARGE_CARD`. Cancel returns to idle. |
| Die face | Show Overcharge pips (attribute + count) on the physical slot, distinct from forge yield / Corruption / overload attachments. |
| Hint bar | “Choose a face on your die to Overcharge (+1 ⟨attribute⟩ on roll).” |
| Rules tab | Picks up `RULEBOOK.md` / `KEYWORDS.md` automatically. |

Do not grow `MatchBoard.tsx` past `module-budget.test.ts` — extract under
`intents/` / `board/` / `modals/`.

## Acceptance Criteria

- [x] Scholar's Lien from hand Overcharges own-die Darkness Natural: next
      `ROLL_DICE` showing that slot generates Darkness (inherent) **and**
      Arcane (Overcharge). Card is in graveyard. No pile spend. No forge-draw.
- [x] Same with Pyre of Names on the slot (synthetic keeper).
- [x] Second Overcharge the same turn is refused.
- [x] Synthetic-forge card (e.g. a Mechanical synthetic) cannot Overcharge.
- [x] Opponent-die natural forge cannot Overcharge.
- [x] Shield / untyped slot is illegal.
- [x] Overwrite / peel clears pips; a later roll of the new face does not
      generate the old Overcharge attribute.
- [x] Suppress inherent still generates Overcharge pips (overload family).
- [x] `docs/RULEBOOK.md` and `docs/KEYWORDS.md` updated in the same change.
- [x] No `GameState` field added (`state.ts` frozen). No rewrite of
      `resolution.ts`.

## Tests

- [x] `src/server/reducer/overcharge.test.ts` (proving Scholar's Lien +
      Darkness Natural + Pyre of Names; once-per-turn; illegal cards/slots;
      clear on overwrite; generate on retained/next roll).
- [x] `src/architecture/module-budget.test.ts` still green.

## Catalogue

No JSON edits. Do not print `[Overcharge]` on every natural-forge card.
Card-designer may add a `MECHANIC_ARCHETYPES.md` `WATCH` row only.
