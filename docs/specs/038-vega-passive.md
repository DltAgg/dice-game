# Vega passive

## Intent

Vega’s printed passive does nothing. When an opponent’s effect would end
her sequence, she starts a new one instead, if she still can.

The new sequence follows the normal sequence rules. It opens, so the next
hit must be a starter. Hits and Techniques already used in the sequence
that just ended stay used, including the hit the opponent just stopped.
They cannot be declared again.

Her own finisher and her own choice to end the sequence still end the
turn. This passive answers an opponent’s effect only.

## Rules

The source is `docs/GAME_STATE.md`. Player-facing wording goes in
`docs/RULEBOOK.md` in the same change. Do not mint a verb. Do not hardcode
`creature-vega`. Put a definition flag on the Fighter and set it on Vega.

**Whose sequence.** The passive belongs to the aggressor’s Active Fighter.
Vega must be that Active Fighter and must not be defeated. A sequence
while she is Reserve does not restart.

**What ends it.** An opponent’s non-combat effect that would hand off the
sequence. Parry is the catalogue case: it negates the hit and
`endsSequence` hands the turn over after the Chain. Vega’s finisher,
`END_SEQUENCE`, a KO’s normal handoff, and her own extra actions phase
are not this trigger.

**Restart.** When that handoff would happen and a legal starter still
exists, do not hand off the turn and do not clear the spent sequence
actions.

- `offensiveState` becomes `open`.
- The aggressor stays the same player. The active player stays.
- `comboCount` for that new sequence starts at 0.
- `usedSequenceActionIds` keeps every hit and Technique already spent in
  the ended sequence. Add the action the opponent just stopped, even
  though that hit was negated, so it cannot open the new sequence.
- The next declared action must be a starter. Extenders and finishers
  stay illegal until a starter hits. An already spent starter, face, or
  Technique is illegal. Meter already gained stays gained. The negated
  hit still deals no damage.

**If it is not possible.** A legal starter is a face hit, a Technique, or
a hit Assist the aggressor can declare under the existing rules once the
state is `open` and the spent ids above are recorded. If none exists,
the handoff happens as it does today, including Parry passing the turn.

## State Changes

- `CreatureDefinition` gains an optional flag for this restart. Vega’s
  JSON sets it. No other Fighter sets it.
- No new `GameState` bag. Reuse `offensiveState`, `aggressorPlayerId`,
  `comboCount`, and `usedSequenceActionIds`.
- `src/server/reducer/offensive.ts` is not frozen. Prefer a small helper
  over growing it past the module budget. Do not rewrite `resolution.ts`.

## Actions

No new `GameAction`. The opponent plays the existing effect. Vega’s next
starter is an existing face, Technique, or hit Assist declaration.

## Acceptance

Tests can check, with catalogue Vega as the Active Fighter:

- After she has used a starter and the opponent Parries the next hit,
  the turn stays hers, the sequence is `open`, combo is 0, and the
  Parried action and the earlier starter are both spent.
- She can declare a different unused starter. That starter is legal and
  deals its printed damage.
- She cannot declare the spent starter, and she cannot declare an
  extender or a finisher while the new sequence is `open`.
- If no unused starter remains, Parry hands the turn over as it does now.
- Her own finisher still hands the turn over. `END_SEQUENCE` still hands
  the turn over.
- The same Parry against a sequence whose Active Fighter is not Vega
  still hands the turn over.
- `passiveRulesText` states the restart in holder voice. `docs/RULEBOOK.md`
  and `docs/GAME_STATE.md` describe the same timing.

No game code belongs in this spec beyond the fields already named.
