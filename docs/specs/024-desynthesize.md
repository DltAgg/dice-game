# 024 — Desynthesize

Status: **IMPLEMENTED** (2026-09-01)

`[Desynthesize]` is a physics keyword. It peels a **Synthetic** attribute
face on **any die** back to that attribute’s **natural** identity face. It is
**not** `[Reforge]` (`replace-synthetic-face`: swap to a different synthetic
from pool, owned die only, blocked by stay / forge-lock, Mechanical exclusive).

Related: [`018-ast-engine.md`](./018-ast-engine.md),
[`KEYWORDS.md`](../KEYWORDS.md), [`RULEBOOK.md`](../RULEBOOK.md) §11,
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md) (DECIDED + ASSUMED).

Proving card: **Anneal** (`card-anneal`) — Mechanical instant, `playCost` 2
Mechanical. Not in builtin loadouts. Instant source for the proving card;
the reducer does not hard-ban other sources.

## Intent

A Desynthesize effect that names a synthetic face **slot** on your die or
the opponent’s die and installs the natural counterpart of the same
attribute on that physical slot.

## Rules

Bible is silent. User **DECIDED** and labelled **ASSUMED** rows live in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md). Player wording is
[`RULEBOOK.md`](../RULEBOOK.md) §11 and [`KEYWORDS.md`](../KEYWORDS.md)
`[Desynthesize]`.

1. **Opcode.** `{ type: "desynthesize", target }` compiles to
   `{ op: "desynthesize", target }`. Catalogue target
   `choose-any-synthetic-slot` opens existing `choose-die-slot` with filter
   `any-synthetic`. After the pick, `target` becomes `declared-die-slot`.
2. **Legal slots.** `getFaceCard(slot).kind === "synthetic"` and `symbol` is
   an `Attribute`. Untyped / non-attribute synthetics are not legal. Named
   **natural** specials (e.g. Dawnwright) are not synthetic — illegal.
3. **Either player’s dice.** Per **physical slot**. Other slots with the same
   synthetic id stay until orphaned-copy rules return the card to pool.
4. **Counterpart.** Install `naturalFaceId(symbol)` on that slot.
   `faceCardOwnerId` of the **natural** = **die owner**. Do **not** take the
   natural from anyone’s face pool (basics are identity faces).
5. **Displaced synthetic.** `returnFaceToPoolIfOrphaned` to
   `slot.faceCardOwnerId`. If last copy of that `faceCardId`+owner is gone,
   `clearOverloadsOnFace` + `clearOverchargeOnFace` (same as reforge / forge
   overwrite).
6. **Not a forge.** No forge-draw. **Not blocked** by
   `slotCannotBeReplacedByForge` / forge-lock / cannot-replace-by-forge
   (peel-class, like `ACTIVATE_FACE` / consume). Lock / pestilence /
   corruption / silence / suppress / forgeYield on that slot **clear**
   because the face changed.
7. **Attribute cap.** Synthetic X → natural X keeps the same attribute on
   the slot — legal even at the 4-pip cap.
8. **Showing slot.** Do **not** rewrite the already-generated unabsorbed pip.
   Next roll uses the natural.
9. **Chooser.** Always prompt when ≥1 legal synthetic slot exists (any
   player’s dice). Empty = legal whiff. Not optional (decline is illegal).
10. Reuses `RESOLVE_CHOOSE_DIE_SLOT`. Does **not** use
    `replace-synthetic-face`.

## State Changes

- Target `DieSlot.faceCardId` / `faceCardOwnerId` become the natural identity
  of that attribute, owned by the die owner.
- Slot-local markers (forge-lock, pestilence, corruption, silence, suppress,
  forge yield, resource lock) clear.
- Orphaned synthetic may return to its owner’s `facePool`; overloads and
  Overcharge on that face card clear when the last copy leaves.
- Log: `face-desynthesized`

## Actions

Existing `RESOLVE_CHOOSE_DIE_SLOT` `{ playerId, dieId, slotIndex }`.
`dieId` / `slotIndex` null is **illegal** for desynthesize (not optional).

## Validation

Legal only while `pendingDecision.type === "choose-die-slot"` with
`filter: "any-synthetic"` for that controller, the deferred effect is
`desynthesize`, and the named slot is a synthetic attribute face.

## Resolution

`tryOpenDesynthesizeChoice` pauses or whiffs. After resolve,
`desynthesizeSlot` peels to natural. Opcode handler `DesynthesizeHandler`
(`op: "desynthesize"`) applies `declared-die-slot`.

## Networking

Host authority. Clients send `RESOLVE_CHOOSE_DIE_SLOT` intent only.

## Persistence

None.

## UI

Instructions for **match-ui** (do not implement in this change):

- Die-slot picker for **any synthetic** on **both** players’ dice. Label
  whose die the slot belongs to.
- Dispatch existing `RESOLVE_CHOOSE_DIE_SLOT`. Do not open the Reforge
  (`replace-synthetic-face`) chooser.
- After resolve, the slot’s face print is the **natural** of that attribute
  (optional label that it is now natural). Overloads on an orphaned face
  leave as they do on overwrite.

## Acceptance Criteria

- [x] Own-die Cogtooth → `naturalFaceId("mechanical")`; synthetic returns to pool when last copy gone
- [x] Opponent-die synthetic → natural of that attribute; die owner owns the natural; synthetic returns to the forger’s pool
- [x] Overloads on that face GY/clear when last copy leaves
- [x] Forge-lock slot can still be desynthesized
- [x] Showing slot: pip still present; face id now natural
- [x] Whiff when no synthetics on any die
- [x] Does not use `replace-synthetic-face` pending
- [x] `docs/RULEBOOK.md` / `docs/KEYWORDS.md` / `OPEN_DESIGN.md` updated

## Tests

- [x] `src/server/reducer/desynthesize.test.ts`
- [x] `src/server/ast/compiler.test.ts` compile mapping
- [x] Catalogue schema / consistency for `card-anneal`
