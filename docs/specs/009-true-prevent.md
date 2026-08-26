# 009 — True prevent (next attack)

Status: **IMPLEMENTED**

Replaces damage-prevent buffers with **attack-instance prevent**. Unlocks
Luminar Judgement / Glimmer once prevent events exist.

Design cites: `docs/OPEN_DESIGN.md` — “Damage prevention”; reaction chain
(attack links open windows; negate does not target attacks).

## Intent

Players respond to attack links with prevent reactions. `[Prevent]` cancels
the **next attack** against that creature (the whole instance), before Shield
and HP. Prismatic Barrier / Sidestep grant one such charge on the ally under
attack.

## Rules

1. **Attack prevent** — “prevent the next N attacks” on a creature
   (`grant-attack-prevent`, usually N = 1). Consumed when **attack** damage
   would be applied; the whole remaining amount of that application is 0.
2. **Not a damage buffer.** There is no prevent-next-N-damage counter.
   Shield remains the 1-for-1 absorb after prevent.
3. **Non-attack damage** (toxin ticks, face `[Strike]`, other effect damage)
   does not consume `attackPreventCount`.
4. **Apply order:** attack-prevent → Shield → HP.
5. **Unused prevent expiry:** none for now; unused charges persist until
   consumed (`preventExpiry: "none"` on `GameRulesConfig`).
6. **Attack window.** Declaring an attack opens a reaction window (`008`).
   Prevent reactions may respond; negate may not.
7. **Prismatic Barrier / Sidestep:** reaction while top link is an **attack**;
   on resolve, grant **1** attack-prevent on the creature targeted by that
   attack (`chain-attack-target`). Print: `[Prevent]`.
8. **Luminar Judgement:** when an ally would take damage from an attack link,
   prevent that damage (full hit) and deal that much to the attacker
   (`prevent-attack-reflect`).
9. **Glimmer:** when you prevent damage (attack-prevent or Judgement-style),
   draw 2. Trigger after prevent amount &gt; 0 resolves.

## State Changes

| Field | Change |
|---|---|
| `CreatureState` | `attackPreventCount: number` (was `damagePreventBuffer`). |
| `GameRulesConfig` | `preventExpiry: "none"` stub. |
| Events | `damage-prevented` source is `attack-prevent` \| `shield` \| `effect`. |
| Barrier / Sidestep | `grant-attack-prevent` 1 on `chain-attack-target`. |

## Actions

No new top-level actions beyond `008`. Playing Barrier uses `PLAY_CARD` during
`reaction-window` when top link kind is `attack`.

## Validation

- Barrier: priority seat; card in hand; subtype `reaction`; Energy paid; top
  link is `attack`; attack’s target is an ally of the Barrier controller.
- `grant-attack-prevent` and `prevent-attack-reflect` are prevent reactions.

## Resolution

```text
Attack link conducts (after Pass ×2, not negated — attacks are not negatable)
  → compute raw damage
  → if target.attackPreventCount > 0: consume 1, remaining = 0 (emit
    damage-prevented source attack-prevent; fire Glimmer)
  → apply Shields
  → apply HP / defeat checks
```

Barrier link resolves (LILO, typically above the attack): adds +1 to the
attack target’s `attackPreventCount` **before** the attack body runs.

## Networking

Host authority; full state includes `attackPreventCount`. No client-side rules.

## Persistence

None.

## UI

- Show `Prevent N` on creatures when `attackPreventCount > 0`.
- During attack reaction window, enable Barrier / Sidestep / Judgement /
  Glimmer as wired.
- Stop presenting Barrier as a “grant shields” or leftover-buffer instant.

## Acceptance Criteria

- [x] OPEN_DESIGN prevent + Barrier entries DECIDED and cited
- [x] Damage apply path: attack-prevent → shield → HP
- [x] Prismatic Barrier wires prevent-on-attack-target; no damage buffer
- [x] Unused prevent persists until consumed (no expiry); config hook present
- [x] Events distinguish prevented-by-attack-prevent vs shield
- [x] Judgement / Glimmer wired
- [x] DoD green

## Tests

- [x] Prevent next attack → whole attack deals 0; later attack without remaining prevent hits
- [x] Barrier illegal when top link is not `attack`
- [x] Order: attack-prevent then shields (prevented attack leaves Shield unspent)
- [x] Regression: creatures with only shields still work
- [x] Purity guard green

## Out of scope

- Stun
- Expiry other than `none`
