# 011 — Token strip & ritual destroy

Status: **IMPLEMENTED**

Control interaction vocabulary for Siphon Sigil and Dispel Circle. Negate-ritual
lives in `008` (Seal the Rite). Design cites: bible §20 (strip fuel example),
§25 (resource denial before creature destruction); `OPEN_DESIGN.md` fuel-cap
row (strip **DECIDED**; cap remains **OPEN**).

## Intent

Effects can deny opposing fuel (attribute tokens) and remove opposing field
rituals without creature destruction.

## Rules

1. **`discard-attribute-tokens`.** Choose an enemy creature (existing
   `choose-enemy` pending). Discard up to `amount` tokens in fixed
   `ATTRIBUTES` order (`martial` → … → `darkness`). Controller does **not**
   pick attributes. If fewer tokens remain than `amount`, discard all remaining.
   Zero tokens is a legal whiff (card still spends). Emit
   `attribute-tokens-discarded` with the discarded requirement shape.
2. **No token cap** in this slice — per-creature / per-attribute caps stay
   `OPEN` in `OPEN_DESIGN.md`.
3. **`destroy-ritual`.** Choose one opposing card in `zone === "ritual"`
   (preparing, ready, or exhausted). Move it to its owner's graveyard;
   orientation / progress clear via `moveCard`. Emit `ritual-destroyed`.
4. **No opposing ritual** → legal whiff (no pending choice). Own rituals are
   never legal targets for `choose-opponent-ritual`.
5. **Not negate.** Destroying a field ritual does not touch the chain; that is
   `negate-ritual` (`008`).

## State Changes

| Field | Change |
|---|---|
| `CreatureState.attributeTokens` | Reduced by strip effects. |
| Ritual card instance | Leaves `ritual` → `graveyard`. |
| `pendingDecision` | May be `choose-creature` (enemy) or `choose-ritual` (opponent). |

## Actions

| Action | Role |
|---|---|
| `RESOLVE_CHOOSE_CREATURE` | Existing — Siphon Sigil target. |
| `RESOLVE_CHOOSE_RITUAL` | Completes `choose-ritual`; stamps `declaredTargetCardInstanceId`. |

## Validation

- `RESOLVE_CHOOSE_RITUAL`: controller matches pending; card is in `ritual` zone;
  for `filter: "opponent"`, owner is not the controller.

## Resolution

See `resolution.ts` (`discard-attribute-tokens`, `destroy-ritual`) and
`zones.destroyRitual`.

## Networking

Host authority unchanged: clients send `RESOLVE_CHOOSE_RITUAL` intents; host
binds `playerId` by seat.

## Persistence

None.

## UI

Match-ui must:

- Prompt enemy creature choice for Siphon Sigil (reuse choose-creature UI).
- Prompt opposing ritual choice when `pendingDecision.type === "choose-ritual"`
  (list opponent's preparing / ready / exhausted rituals; send
  `RESOLVE_CHOOSE_RITUAL`).
- Surface `attribute-tokens-discarded` and `ritual-destroyed` in the log /
  feedback if other destroy events are shown.

## Acceptance Criteria

- [x] Siphon Sigil strips tokens in `ATTRIBUTES` order; partial / empty whiff
- [x] Dispel Circle chooses and GYs an opposing ritual; empty field whiffs
- [x] Focused reducer tests; DoD green

## Tests

- [x] `src/game/reducer/controlEffects.test.ts`
