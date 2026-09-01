# 022 — Silence

Status: **IMPLEMENTED** (2026-09-01)

`[Silence]` is a physics keyword (spec this document). It is **not** stun
(`OPEN_DESIGN.md` stays `DEFERRED`), **not** Arcane Silence / `negate-card`
(`[Negate]` reaction), and **not** spec `013` `suppressInherentNextRoll`
(inherent onRoll only; overloads still fire).

Related: [`018-ast-engine.md`](./018-ast-engine.md),
[`KEYWORDS.md`](../KEYWORDS.md), [`RULEBOOK.md`](../RULEBOOK.md) §14,
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md) (DECIDED + ASSUMED).

Proving card: **Stilled Verse** (`card-stilled-verse`) — Arcane instant,
`playCost` 2 Arcane, mixed hosts `creature | ritual | face`. Not in builtin
loadouts.

## Intent

A Silence effect from instants, rituals, and overloads that names an opposing
creature, field ritual, die slot, or a mix. The chosen host cannot activate or
fire its effects, including inherited ones, until the start of the silencer’s
next turn.

## Rules

Bible is silent. User **DECIDED** and labelled **ASSUMED** rows live in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md). Player wording is
[`RULEBOOK.md`](../RULEBOOK.md) §14 and [`KEYWORDS.md`](../KEYWORDS.md)
`[Silence]`.

1. **Opcode.** `{ type: "silence", target, hosts }` compiles to `{ op: "silence", target, hosts }`.
   `hosts` is a non-empty unique subset of `"creature" | "ritual" | "face"`.
2. **Sources.** Tactic instant `effect`, ritual activate `effects`, overload
   `onRoll` / `onAbsorb`. Same opcode.
3. **Targets.** Default **opposing** hosts only. Mixed chooser
   `choose-opponent-silence-host` unions living opposing creatures, opposing
   field rituals, and opposing die slots that have a face. Always prompt when
   ≥1 eligible (including exactly one). Empty legal set is a legal **whiff**.
4. **Rewrite.** After the pick, `target` becomes `declared-target` /
   `declared-ritual` / `declared-die-slot` so the deferred effect does not
   re-open the prompt. Action: `RESOLVE_CHOOSE_SILENCE_HOST` with a tagged
   `choice`. Illegal → `GameError` + original state.
5. **Expiry (ASSUMED).** `silenceExpiresOnTurn = state.turn + 2`. Host is
   silenced while `state.turn < silenceExpiresOnTurn`. `GameState.turn`
   increments every `END_TURN`.
6. **Storage (ASSUMED).** Creature field, ritual `CardInstance` field (zone
   `ritual`), face **per physical slot** on `DieSlot`.
7. **Skip.** Queries in `src/server/rules/silence.ts`. Do not copy checks.
   - `collectHosts` / `filterSilencedHosts`: creature passives and equipment
     if the bearer is silenced; ritual hosts if the ritual is silenced.
   - Direct equipment walks (`fireOnDealDamage`, on-take-damage) gate on the
     bearer.
   - `ACTIVATE_RITUAL` → `CARD_NOT_AVAILABLE` when the ritual is silenced.
   - Showing-slot silence: skip face onRoll, overloads, Overcharge generate,
     forge-yield extras. **Still create the rolled pip.**
   - Face/overload onAbsorb skip when the source slot is silenced.
   - While-attached modifiers from a silenced creature’s equipment or a
     silenced continuous ritual do not apply.
   - Stamp / reapply / copy-face skip a silenced showing slot’s inherited
     + inherent effects.
   - Silenced creature may still declare attacks. Strike / Prevent / Shield
     still happen. Skip `followUpEffects` when the attacker is silenced.
8. **Not targets.** Equipment via host creature. Overloads via showing slot.
   Do not silence hand, deck, or unattached cards.
9. **vs suppress inherent.** Either skips face onRoll. Silence also skips
   overloads; `suppressInherentNextRoll` does not.

## State Changes

- `CreatureState.silenceExpiresOnTurn?: number`
- `CardInstance.silenceExpiresOnTurn?: number` (meaningful in zone `ritual`)
- `DieSlot.silenceExpiresOnTurn?: number`
- `PendingDecision` variant `choose-silence-host`
- Log: `choose-silence-host-started` / `choose-silence-host-resolved` /
  `host-silenced`

## Actions

`RESOLVE_CHOOSE_SILENCE_HOST` `{ playerId, choice }` where `choice` is
`{ host: "creature", creatureId }` | `{ host: "ritual", cardInstanceId }` |
`{ host: "face", dieId, slotIndex }`.

## Validation

Legal only while `pendingDecision.type === "choose-silence-host"` for that
controller, and `choice` is in the current legal union for `pending.hosts`.

## Resolution

`tryOpenSilenceChoice` pauses or whiffs. After resolve, `applySilence` stamps
`silenceExpiresOnTurn = turn + 2` on the declared host. Opcode handler
`SilenceHandler` (`op: "silence"`) applies declared targets.

## Networking

Host authority. Clients send `RESOLVE_CHOOSE_SILENCE_HOST` intent only. The
new action is JSON-serializable. Do not put skip rules in the client.

## Persistence

None. Silence is match state only.

## UI

Instructions for **match-ui** (do not implement in this change):

- Show a **Silenced** badge on the creature, field ritual, and die slot until
  `GameState.turn >= silenceExpiresOnTurn`.
- Mixed chooser: **one** prompt listing legal creatures, rituals, and faces
  (`dieId` + `slotIndex`). Always show when ≥1 eligible.
- Disable ritual **Activate** when `isRitualSilenced`.
- Attacks from a silenced creature stay legal (Strike still deals).

## Acceptance Criteria

- [x] Instant silence on opposing creature: standing / equipment skip; Strike still deals
- [x] Instant silence on opposing ritual: `ACTIVATE_RITUAL` illegal; continuous standing skipped
- [x] Instant silence on opposing face slot: pip still generates; onRoll/overloads skip; other slot with the same face id is unaffected
- [x] Duration: silenced on the opponent’s next turn; cleared at silencer’s next turn (`turn + 2`)
- [x] Mixed chooser opens when ≥1 host; whiffs when none
- [x] Overload-sourced silence uses the same opcode (injected)
- [x] Does not use stun markers
- [x] `docs/RULEBOOK.md` / `docs/KEYWORDS.md` / `OPEN_DESIGN.md` updated

## Tests

- [x] `src/server/reducer/silence.test.ts`
- [x] `src/server/ast/compiler.test.ts` compile mapping
- [x] Catalogue schema / consistency for `card-stilled-verse`
