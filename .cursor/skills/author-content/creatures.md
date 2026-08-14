# Creature cards

File: `src/game/content/creatures.ts`  
Spec: `docs/specs/003-creature-cards.md`

## Shape

```ts
export const EXAMPLE: CreatureDefinitionId =
  asCreatureDefinitionId("creature-example");

{
  id: EXAMPLE,
  name: "Example Beast",
  life: 10,
  attributes: ["martial"],
  passiveRulesText: "Ignore 1 [Shield] on the target.", // "" if none
  attacks: [
    {
      id: asAttackId("attack-example-strike"),
      name: "Strike",
      kind: "basic", // or "special"
      requires: { martial: 1 },
      // discards?: { martial: 1 },
      range: false,
      rulesText: "Deal 3 damage.",
      effect: {
        type: "damage",
        amount: 3,
        target: { kind: "declared-target" },
      },
    },
  ],
}
```

## Rules of thumb

- Attacks spend **absorbed attribute tokens on the creature**, not the shared pool.
- Always keep full English in `rulesText` / `passiveRulesText`.
- Omit `effect` on an attack when only a subset is modellable — document the gap
  in `docs/DEFERRED_CATALOGUE.md` (passives, reposition, pierce, etc.).
- Squad size for matches comes from setup / loadout (typically 3 creatures), not
  from stuffing every catalogue entry into the prototype squad.

## Population in `creatures.ts`

**Figma catalogue** — Slow-game-test creatures (print-first), including builtin
Aggro and Control squads.
