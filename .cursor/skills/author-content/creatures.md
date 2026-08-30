# Creature cards

File: `src/server/content/creatures/<creature-id>.json` (add the id constant in `creatures.ts`)  
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

- Attacks use the **owner’s attribute pile** (`requires` = gate, `discards` = Spend).
  Same-turn banking can enable an attack that needs that attribute.
- Always keep full English in `rulesText` / `passiveRulesText`. Passives and
  attack text use holder voice: **you** is this creature’s controller;
  **opponent** is their opponent.
- Attribute identity: [design.md](design.md). Aggro/midrange creatures convert
  the engine into board pressure. Control creatures may keep weak attacks;
  lethality for those lists lives on cards / rituals / faces (bible §27). They
  should not steal Toxin/Corruption’s continuous-burn job.
- Omit `effect` on an attack when only a subset is modellable — document the gap
  in `docs/DEFERRED_CATALOGUE.md` (passives, pierce, multi-target riders, etc.).
- Squad size for matches comes from setup / loadout (typically 3 creatures), not
  from stuffing every catalogue entry into the prototype squad.

## Population in `creatures.ts`

**Figma catalogue** — Slow-game-test creatures (print-first), including builtin
Aggro and Control squads.
