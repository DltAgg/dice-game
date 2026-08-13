# 009 — True prevent (damage buffers & attack prevents)

Status: **SPEC** (not yet implemented; depends on `008-reaction-chain`)

Replaces the Prismatic Barrier `grant-shield ×2` approximation with honest
prevention. Unlocks Luminar Judgement / Glimmer once prevent events exist.

Design cites: `docs/OPEN_DESIGN.md` — “Damage prevention” (DECIDED 2026-08-12),
reaction chain (attack links open windows; negate does not target attacks).

## Intent

Damage that would be dealt can be reduced or cancelled by prevention **before**
Shields and HP. Players respond to attack links with prevent reactions.
Prismatic Barrier builds a prevent-next-2-damage buffer on the ally under
attack.

## Rules

1. **Two prevent shapes** (both in vocabulary; cards pick one):
   - **Damage buffer** — “prevent next N damage” on a creature; consumes as
     damage is applied.
   - **Attack prevent** — “prevent N attacks” (whole attack instances); for
     later cards (not Barrier).
2. **Apply order:** prevention → Shield → HP. (`OPEN_DESIGN`.)
3. **Unused prevent expiry:** none for now; expiry policy must be data-driven
   (`GameRulesConfig` or equivalent) so it can change without a reducer
   rewrite. (`OPEN_DESIGN`.)
4. **Attack window.** Declaring an attack opens a reaction window (`008`).
   Prevent reactions may respond; negate may not.
5. **Prismatic Barrier** (`OPEN_DESIGN` DECIDED):
   - Played as a `reaction` during an open window whose **top link is an
     attack**.
   - On resolve: create a **prevent-next-2-damage buffer** on the **creature
     targeted by that attack** (the ally being attacked). No free retarget.
   - Migrates off `effect: grant-shield ×2`.
6. **Buffer consumption.** When damage would be dealt to a creature, reduce
   incoming amount by `min(damage, buffer)` first; reduce buffer by that much;
   then spend Shields; then apply HP damage. Emit distinct events so Glimmer /
   Judgement can key off true prevent.
7. **Luminar Judgement** (same slice or immediate follow-up once events exist):
   when an ally would take damage from an attack link, prevent that damage
   (full hit) and deal that much to the attacking creature — only if prevent
   actually removed damage.
8. **Glimmer:** when you prevent damage (buffer or Judgement-style), draw 2.
   Trigger after prevent amount &gt; 0 resolves.

## State Changes

| Field | Change |
|---|---|
| `CreatureState` (or side map) | `damagePreventBuffer: number` (and later `attackPreventCount` if needed). |
| `GameRulesConfig` | Optional `preventExpiry: "none" \| …` stub (`none` only in v1). |
| Events | Extend or add `damage-prevented` so source is `buffer` \| `shield` \| `effect` (keep shield path backward-compatible). |
| Barrier content | Remove shield approximation; wire prevent-buffer effect bound to attack-link target. |

## Actions

No new top-level actions beyond `008`. Playing Barrier uses `PLAY_CARD` during
`reaction-window` when top link kind is `attack`.

## Validation

- Barrier: priority seat; card in hand; subtype `reaction`; Energy paid; top
  link is `attack`; attack’s target is an ally of the Barrier controller (else
  illegal / no buffer — prefer reject play).
- Attack-prevent cards (later): top link `attack` (or as print requires).

## Resolution

```text
Attack link conducts (after Pass ×2, not negated — attacks are not negatable)
  → compute raw damage
  → apply damagePreventBuffer on target (reduce buffer)
  → apply Shields
  → apply HP / defeat checks
```

Barrier link resolves (LILO, typically above the attack): adds +2 to the
attack target’s buffer **before** the attack body runs (because Barrier was
chained in response and resolves first).

## Networking

Host authority; full state includes prevent buffers. No client-side rules.

## Persistence

None.

## UI

- Show prevent buffer on creatures when &gt; 0.
- During attack reaction window, enable Barrier (and later Judgement / Glimmer
  as wired).
- Stop presenting Barrier as a “grant shields” instant outside an attack
  window.

## Acceptance Criteria

- [ ] OPEN_DESIGN prevent + Barrier entries DECIDED and cited
- [ ] Damage apply path: prevention → shield → HP
- [ ] Prismatic Barrier wires buffer-on-attack-target; shield approx removed
- [ ] Unused buffer persists until consumed (no expiry); config hook present
- [ ] Events distinguish prevented-by-buffer vs shield
- [ ] Judgement / Glimmer either fully wired or still listed deferred with
      honest gaps (prefer wire if vocabulary ready in same PR)
- [ ] `DEFERRED_CATALOGUE.md` updated
- [ ] DoD green

## Tests

- [ ] Attack 3 into Barrier-2 → 1 through prevent then shields/HP as expected
- [ ] Buffer leftover: Attack 1 after Barrier-2 → 0 damage, buffer 1 remains
- [ ] Barrier illegal when top link is not `attack`
- [ ] Order: buffer then shields (e.g. buffer 1 + shield 1 vs damage 3)
- [ ] Regression: creatures with only shields still work
- [ ] Purity guard green

## Out of scope

- Full Judgement reflect edge cases if deferred to a tiny `009b`
- Face on-absorb prevent (Vital Spark) — Phase B/D
- Attack-prevent-N cards until a concrete print needs the counter
