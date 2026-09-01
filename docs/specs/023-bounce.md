# 023 — Bounce

Status: **IMPLEMENTED** (2026-09-01)

`[Bounce]` is an operator keyword (like `[Destroy]`), parameterized by card
type. It returns the chosen card to its **owner’s hand**. It is **not**
`[Destroy Ritual]` / `[Destroy Equipment]` / `[Destroy Overload]` (graveyard),
**not** discard, and **not** negate.

Related: [`018-ast-engine.md`](./018-ast-engine.md),
[`KEYWORDS.md`](../KEYWORDS.md), [`RULEBOOK.md`](../RULEBOOK.md) §10,
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md) (DECIDED + ASSUMED).

Proving card: **Homeward Seal** (`card-homeward-seal`) — Arcane instant,
`playCost` 2 Arcane, mixed hosts `ritual | equipment | overload`. Not in
builtin loadouts.

## Intent

A Bounce effect from instants, rituals, and overloads that names an opposing
field ritual, attached equipment, attached overload, or a mix. The chosen
card detaches and returns to its owner’s hand.

## Rules

Bible is silent. User **DECIDED** and labelled **ASSUMED** rows live in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md). Player wording is
[`RULEBOOK.md`](../RULEBOOK.md) §10 and [`KEYWORDS.md`](../KEYWORDS.md)
`[Bounce]`.

1. **Opcode.** `{ type: "bounce", target, hosts }` compiles to
   `{ op: "bounce", target, hosts }`. `hosts` is a non-empty unique subset of
   `"ritual" | "equipment" | "overload"`. `[Bounce]` with no type = all three.
2. **Sources.** Tactic instant `effect`, ritual activate `effects`, overload
   `onRoll` / `onAbsorb`. Same opcode.
3. **Targets.** **Opposing** hosts only. Mixed chooser
   `choose-opponent-bounce-card` unions opposing field rituals (preparing /
   ready / exhausted), opposing attached equipment, and opposing attached
   overloads per `hosts`. Always prompt when ≥1 eligible (including exactly
   one). Empty legal set is a legal **whiff**. Own-field cards are never legal.
4. **Rewrite.** After the pick, `target` becomes `declared-ritual` /
   `declared-equipment` / `declared-overload`. Action:
   `RESOLVE_CHOOSE_BOUNCE_CARD` with a tagged `choice`. Illegal → `GameError`
   + original state.
5. **Destination.** Owner’s hand. Detach first (equipment off the creature,
   overload off the face, ritual off the field), then `moveCard(..., "hand")`.
   No hand-size cap.
6. **Not discard.** Do not fire `on-discard`. Not destroy: do not emit
   `*-destroyed` as the primary event; emit `card-bounced` (zone left +
   `cardInstanceId`).
7. **Silence.** Clear `silenceExpiresOnTurn` on the instance; field status
   does not follow into hand.
8. **Chain.** Bounce does not touch the reaction chain (not negate).

## State Changes

- Chosen `CardInstance` moves to zone `hand`; attachment fields and ritual
  orientation clear.
- Creature `equipmentIds` drop the bounced equipment before the move.
- `PendingDecision` variant `choose-bounce-card`
- Log: `choose-bounce-card-started` / `choose-bounce-card-resolved` /
  `card-bounced`

## Actions

`RESOLVE_CHOOSE_BOUNCE_CARD` `{ playerId, choice }` where `choice` is
`{ host: "ritual", cardInstanceId }` |
`{ host: "equipment", cardInstanceId }` |
`{ host: "overload", cardInstanceId }`.

## Validation

Legal only while `pendingDecision.type === "choose-bounce-card"` for that
controller, and `choice` is in the current legal union for `pending.hosts`.

## Resolution

`tryOpenBounceChoice` pauses or whiffs. After resolve, `bounceCardToOwnerHand`
detaches and `moveCard`s to hand. Opcode handler `BounceHandler`
(`op: "bounce"`) applies declared targets.

## Networking

Host authority. Clients send `RESOLVE_CHOOSE_BOUNCE_CARD` intent only. The
new action is JSON-serializable. Do not put legality in the client.

## Persistence

None. Bounce is match state only.

## UI

Instructions for **match-ui** (do not implement in this change):

- Mixed chooser: **one** prompt listing legal opposing rituals, equipment,
  and overloads. Always show when ≥1 eligible. Label host kind.
- Dispatch `RESOLVE_CHOOSE_BOUNCE_CARD` with the tagged choice.
- Animate to the **owner’s hand**, not the graveyard. No GY animation.
- After bounce, the card is a normal hand card (orientation cleared).

## Acceptance Criteria

- [x] Bounce opposing ritual → owner’s hand, not GY; orientation cleared
- [x] Bounce opposing equipment → detached from creature, in owner’s hand
- [x] Bounce opposing overload → detached from face, in owner’s hand; face still installed
- [x] Mixed chooser opens when ≥1; whiff when none
- [x] Overload-sourced bounce uses the same opcode (injected)
- [x] Does not fire on-discard
- [x] `docs/RULEBOOK.md` / `docs/KEYWORDS.md` / `OPEN_DESIGN.md` updated

## Tests

- [x] `src/server/reducer/bounce.test.ts`
- [x] `src/server/ast/compiler.test.ts` compile mapping
- [x] Catalogue schema / consistency for `card-homeward-seal`
