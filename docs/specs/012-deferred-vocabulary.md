# 012 — Deferred catalogue vocabulary

Status: **IMPLEMENTED** (2026-08-14)

Grow `EffectDefinition` / standing abilities / pending decisions so printed
clauses in `002` / `003` / `004` resolve as data. Assumptions live in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md) (ASSUMED, 2026-08-14). Still parked:
[`DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md) (push, stun, empty print,
face-marker systems).

Design cites: bible §6 (frontline), §7 (absorb / retain), §16 (phases),
§18 (Energy track), §19–20 (play vs forge). Push **DECIDED no**. Stun stays
`DEFERRED`.

## Intent

Catalogue cards keep English `rulesText`. Structured fields fill only when the
engine can resolve the clause honestly. Movers always go through
`setCreaturePosition` so Hunter’s Collar (`on-change-position`) fires.

## Rules

### Movers

- **Reposition 1 space** = toggle `frontline` ↔ `back`. Frontline overflow
  (`config.frontlineSlots`) opens a required swap with a living frontline ally.
  Optional (`may`) choices may be declined.
- **Swap** = two `setCreaturePosition` calls (or `swapCreaturePositions`).
  Never patch `position` directly. Same-position swap is a no-op.
- **Not push.** Twin Blades / Coordinated Hunt / Impact On-roll stay print-only
  for the push clause.

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
- Pestilent Plague: +1 counter on roll; at 5, reset and try adjacent-slot
  install of another Plague.

## State Changes

| Field | Role |
|---|---|
| `PlayerState.spentOncePerTurnKeys` | Adrenaline reroll, etc. |
| `CreatureState.redirectDamageThisTurn` | Aegis |
| `CreatureState.nextIncomingDamageBonus` | Venom absorb |
| `DieSlot.pestilenceCounters` | Pestilent Plague |
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
| `RESOLVE_OPTIONAL_REROLL` | Adrenaline |
| `ACTIVATE_FACE` | Heritage / Plague activated ability |

Illegal moves return `GameError` + original state.

## Validation

- Pending resolve actions: only the matching `controllerId`, matching pending
  type, while `status === "in-progress"`.
- `ACTIVATE_FACE`: actions phase, owned die, showing slot, face has
  `activated`, holder has Energy for the computed cost.
- Convert replacements: eligible ids, Natural attributes, count ≤ pending
  amount.
- Split-damage assignments: living legal targets, sum equals `amount`.
- Dark Pact: exactly two Rituals from the controller’s deck with **different**
  attributes.
- Mind Control: opposing faces that actually have overloads.

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
| `mind-control` | Mode + 1 or 2 opposing face cards |
| `split-damage` | Assign integer damage that sums to `amount` |
| `optional-reroll` | Accept or decline reroll of that die |

Also: **Activate** control on a showing Forbidden Heritage / Pestilent Plague
face during actions (`ACTIVATE_FACE`). Display Energy cost
`2 + Corruption faces on that die`. Show pestilence counters on Plague slots.
Show optional reposition / swap prompts after Dive / Poisoned Charge /
Instinct.

`choose-creature` already has a Decline path for optional filters. The other
pending types above are **not** in MatchBoard yet — the engine will sit on
`pendingDecision` until the UI dispatches the matching resolve.

## Acceptance Criteria

- [x] Reposition/swap uses `setCreaturePosition`; Hunter’s Collar still fires
- [x] Archmage / Tome discount first matching play; forge not discounted; stack
- [x] Paradox replays a GY Instant/Ritual without paying Requires/Energy; card stays GY
- [x] Minotaur pierce ignores 1 Shield without spending it
- [x] Attack follow-ups (Burst draw, Overload shields, Bombardment toxin, …)
- [x] Push clauses remain unwired with accurate print
- [x] Stun not applied

## Tests

- [x] `src/game/reducer/movers.test.ts`
- [x] `src/game/reducer/discounts.test.ts`
- [x] `src/game/reducer/replay.test.ts`
- [x] `src/game/reducer/pierce.test.ts`
- [x] Existing combat / prevent / playcard / triggers / autoplay suites
