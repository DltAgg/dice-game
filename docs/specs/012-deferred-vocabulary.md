# 012 — Deferred catalogue vocabulary

Status: **IMPLEMENTED** (2026-08-14)

Grow `EffectDefinition` / standing abilities / pending decisions so printed
clauses in `002` / `003` / `004` resolve as data. Assumptions live in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md) (ASSUMED, 2026-08-14). Still parked:
[`DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md) (stun, empty print).
Face markers / Instinct absorb: [`013-face-markers.md`](./013-face-markers.md).

Design cites: bible §6 (frontline), §7 (absorb / retain), §16 (phases),
§18 (Energy track), §19–20 (play vs forge). Push / enemy move **banned**; ally
swap/reposition modelled. Stun stays `DEFERRED`.

## Intent

Catalogue cards keep English `rulesText`. Structured fields fill only when the
engine can resolve the clause honestly. Movers always go through
`setCreaturePosition` so `on-change-position` listeners fire.

## Rules

### Movers

- **Reposition 1 space** = toggle `frontline` ↔ `back`. Frontline overflow
  (`config.frontlineSlots`) opens a required swap with a living frontline ally.
  Optional (`may`) choices may be declined.
- **Swap** = two `setCreaturePosition` calls (or `swapCreaturePositions`).
  Never patch `position` directly. Same-position swap is a no-op.
- **Not push.** Enemy move is banned. Former Twin Blades / Hunt / Impact /
  Command absorb push print was rewritten to non-move effects.

### Cost discounts

- `energy-cost-discount` standing ability on creatures and equipment.
- Applies to `PLAY_CARD` (effect, ritual place, equip, overload). **Not**
  `FORGE_CARD`.
- Filters: `cardTypes`, `subtypes`, `attributes`. `oncePerTurn` spends a host
  key. Min cost 0. Stacking is additive (Archmage + Tome).
- Gear absorb `arm-forge-discount` reduces the **next** `FORGE_CARD` this turn.

### GY replay (Paradox)

- `replay-graveyard-tactic`: choose a GY Instant (`effect`) or Ritual
  (`ritual`) with playable effects.
- Resolve those effects immediately. Ignore `[Requires]` / Active-when. Do not
  pay that card’s Energy. Card stays in GY.

### Pierce / ignore Shield

- Attack damage order: Aegis redirect → incoming bonus → `on-take-damage`
  reduce → prevent buffer (`009`) → skip up to N Shield (**not spent**) →
  remaining Shield (spent) → HP.
- Sources: creature `ignore-shield` standing; Rust `arm-ignore-shield` turn
  buffer.

### Attack follow-ups

- `AttackDefinition.followUpEffects` runs after the damage link.
- Blade Rain: next attack this turn opens `split-damage` among living enemies
  in range of the attacker (assignments must sum to the damage amount).

### Energy track riders

- `lose-energy` / `transfer-energy`: opponent-held value only; no-op at 0.
- `draw-cards.player`: `"controller"` (default) or `"opponent"`.

### Faces

- `ACTIVATE_FACE` (actions): pay `energyBase + energyPerCorruptionOnDie ×`
  synthetic Corruption faces on that die; strip the showing Corruption face
  back to pool; slot becomes natural Shield. Not a forge (no draw).
- Pestilent Plague: +1 counter on roll; at `pestilenceSpreadAt` (2), reset and
  try adjacent-slot install of another Plague from the spreading slot’s
  `faceCardOwnerId` (corrupter) pool / copies. Adjacent slots that
  `slotCannotBeReplacedByForge` are skipped.
- Stay-on-slot: `stayPolicy` on the face definition. Heritage never yields to a
  forge overwrite. Plague uses `DieSlot.forgeLockRemaining` (catalogue `turns: 4`,
  ticked on the **die owner’s** turn finish). Installing Plague onto a die
  resets remaining lock to 4 on every Plague slot of **that die**.
- `replace-synthetic-face` (Reforge): pending choice of an owned die slot whose
  installed face matches `kind`+`attribute` (Synthetic Mechanical), return that
  face to the pool (last-copy overload detach applies), then install a
  **different** matching face from the pool onto the same slot. Not a forge —
  no forge-draw. Whiffs when no legal complete choice exists.

## State Changes

| Field | Role |
|---|---|
| `PlayerState.spentOncePerTurnKeys` | Adrenaline reroll, etc. |
| `CreatureState.redirectDamageThisTurn` | Aegis |
| `CreatureState.nextIncomingDamageBonus` | Venom absorb |
| `DieSlot.pestilenceCounters` | Pestilent Plague |
| `DieSlot.forgeLockRemaining` | Pestilent Plague forge-lock |
| `FaceCardDefinition.stayPolicy` / `pestilenceSpreadAt` | Heritage never-replace; Plague lock + spread |
| `GameState.ignoreShieldThisTurn` | Rust |
| `GameState.forgeDiscountThisTurn` | Gear absorb |
| `GameState.requirementWildcardsThisTurn` | Resonance |
| `GameState.bladeRainArmed` | Blade Rain |
| `PendingEffect.ignoreShield` / `sourceDieId` / `sourceSlotIndex` | Pierce + face context |
| `AttackDefinition.followUpEffects` | Creature riders |
| `FaceCardDefinition.activated` | Heritage / Plague |

## Actions

| Action | When |
|---|---|
| `RESOLVE_CHOOSE_CREATURE` (`creatureId` may be `null`) | Optional decline |
| `RESOLVE_CHOOSE_DIE` | Retain / convert source / Extermination die |
| `RESOLVE_CONVERT_SYMBOLS` | Collapse, Conversion, Rupture |
| `RESOLVE_COPY_POOL_SYMBOL` | Mirrored Rune |
| `RESOLVE_REPLAY_GRAVEYARD` | Paradox |
| `RESOLVE_LOOK_TOP_DECK` | Insight absorb (keep one, other to bottom) |
| `RESOLVE_PEEK_DECK` | Revelation roll |
| `RESOLVE_DARK_PACT` | Two different-attribute Rituals from deck → GY |
| `RESOLVE_MIND_CONTROL` | Strip overloads (one face all, or one each of up to two) |
| `RESOLVE_SPLIT_DAMAGE` | Blade Rain / Extermination |
| `RESOLVE_OPTIONAL_REROLL` | Adrenaline (same-face ally damage); Rethrow (choose a rolled die, no punishment) |
| `RESOLVE_REPLACE_SYNTHETIC_FACE` | Reforge (`replace-synthetic-face`) |
| `ACTIVATE_FACE` | Heritage / Plague activated ability |

Illegal moves return `GameError` + original state.

## Validation

- Pending resolve actions: only the matching `controllerId`, matching pending
  type, while `status === "in-progress"`. The controller may resolve even when
  they are not `activePlayerId`. Every other player — including the turn
  player — is refused with `PENDING_DECISION` (not `NOT_ACTIVE_PLAYER`).
  Reaction windows still use `NOT_PRIORITY_PLAYER` / the priority allow-list
  (`008`).
- `ACTIVATE_FACE`: actions phase, owned die, showing slot, face has
  `activated`, holder has Energy for the computed cost.
- Convert replacements: eligible ids, Natural attributes, count ≤ pending
  amount.
- Split-damage assignments: living legal targets, sum equals `amount`.
- Dark Pact: exactly two Rituals from the controller’s deck with **different**
  attributes.
- Mind Control: opposing faces that actually have overloads. `strip-one-face`
  removes every overload on that face (print: “every Overload”).
  `strip-one-each` names one attached instance per chosen face; when a face
  has 2+ overloads the controller must send `overloadInstanceIds` (no
  earliest-id silent pick).

## Resolution

`resolution.ts` switch on `EffectDefinition`. Movers call
`setCreaturePosition` / `swapCreaturePositions`. `reduce.ts` play paths call
`discountedPlayCost`. Attack path adds pierce + `followUpEffects` + Blade Rain
split. `finishTurn` / `clearTurnTriggerState` clears turn maps and redirect /
incoming bonus.

## Networking

Host owns `reduce()`. Clients send the new `GameAction` variants as JSON
intents only. No new protocol types beyond the action union. Do not run
`ACTIVATE_FACE` or pending resolves on the client.

## Persistence

None. In-match only.

## UI

Match-ui must render these pendings (hotseat + online):

| Pending | Player sees / does |
|---|---|
| `choose-creature` (`optional`, new filters) | Pick a legal creature; **Decline** when `optional` |
| `choose-die` | Pick a legal die (or decline if optional) |
| `convert-symbols` | Pick up to N eligible symbols + Natural replacements (or pass empty) |
| `copy-pool-symbol` | Pick another available symbol type to copy |
| `replay-graveyard-tactic` | Pick a GY Instant or Ritual with playable effects |
| `look-top-deck` | Show top 2; pick 1 to hand (other to bottom) |
| `peek-deck` | Show top; keep or put on bottom |
| `dark-pact` | Pick 2 different-attribute Rituals from deck |
| `mind-control` | Mode + 1 or 2 opposing face cards; `strip-one-each` also names the overload instance when a face has 2+ |
| `split-damage` | Assign integer damage that sums to `amount` |
| `optional-reroll` | Accept or decline reroll of that die (Adrenaline may then deal same-face ally damage; Rethrow does not) |
| `replace-synthetic-face` | Pick owned Synthetic Mechanical slot + different matching pool face |

Also: **Activate** control on a showing Forbidden Heritage / Pestilent Plague
face during actions (`ACTIVATE_FACE`). Display Energy cost
`2 + Corruption faces on that die`. Show pestilence counters **and remaining
forge-lock** on Plague slots. Surface **cannot-replace-by-forge** on Heritage
and on Plague while lock > 0 (forbid targeting those slots for
`FORGE_CARD` / `forge-faces` / Reforge). Peel stays available.
Show optional reposition / swap prompts after Dive / War Charge /
Instinct.

`choose-creature` already has a Decline path for optional filters.
`replace-synthetic-face` is wired in MatchBoard (slot → pool face →
`RESOLVE_REPLACE_SYNTHETIC_FACE`). Other pending types above that are still
missing a chooser will leave the engine sitting on `pendingDecision` until the
UI dispatches the matching resolve.

## Acceptance Criteria

- [x] Reposition/swap uses `setCreaturePosition` (`on-change-position` fires)
- [x] Archmage / Tome discount first matching play; forge not discounted; stack
- [x] Paradox replays a GY Instant/Ritual without paying Requires/Energy; card stays GY
- [x] Minotaur pierce ignores 1 Shield without spending it
- [x] Attack follow-ups (Burst draw, Overload shields, Bombardment strip Shield, …)
- [x] Push clauses remain unwired with accurate print
- [x] Stay-on-slot: Heritage cannot-replace; Plague lock / reset / spread at 2; corrupter-owned copy

## Tests

- [x] `src/game/reducer/movers.test.ts`
- [x] `src/game/reducer/discounts.test.ts`
- [x] `src/game/reducer/replay.test.ts`
- [x] `src/game/reducer/pierce.test.ts`
- [x] `src/game/reducer/replaceSyntheticFace.test.ts` (Reforge)
- [x] `src/game/reducer/stayOnSlot.test.ts` (Heritage / Plague stay + spread)
- [x] Existing combat / prevent / playcard / triggers / autoplay suites
