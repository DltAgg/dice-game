# Creature cards

File: `src/server/content/creatures/<creature-id>.json` (add the id constant in `creatures.ts`)  
Spec: `docs/specs/003-creature-cards.md` · attack gate: `docs/specs/028-showing-face-combat.md`  
Craft: [design-craft.md](design-craft.md) — uniqueness still applies

**Do not reprint** Strike 2 + `[Generate 1]` of the creature’s own attribute
on every body (`docs/MECHANIC_ARCHETYPES.md` MA-01 — that shape **feels Aggro**
even on Control). Audit live `src/server/content/creatures/` first. Dual-attribute
`unlock` on a special (Riftscribe Adept Ley Surge: Arcane+Darkness) is closer
to a bridge than `[Spend] X, [Generate] Y`. Creatures still obey exclusive
verbs in [design.md](design.md).

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
      unlock: { martial: 1 },
      range: false,
      rulesText: "[Strike 3].",
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

- Attacks use `[Unlock]` against the **owner’s showing faces** (spec `028`).
  They do **not** `[Requires]` / `[Spend]` `attributePool`. Named attributes
  only (no `any`). `[Resonance]` / `[Discount]` do not apply. Print
  `[Unlock: Mechanical]`, `[Unlock: 2 x Mechanical]`, or
  `[Unlock: Mechanical + Luminar]` via `formatAttackFuel`. Engine query:
  `attackIsUnlocked`. Do not author attack `requires` / `discards`.
- Single-attribute specials typically need **both** dice showing that
  attribute (`{ mechanical: 2 }`). Dual-color specials need one showing
  face of each named attribute. Dual-attribute basics name **one** of the
  creature’s attributes.
- Always keep full English in `rulesText` / `passiveRulesText`. Passives and
  attack text use holder voice: **you** is this creature’s controller;
  **opponent** is their opponent.
- Attribute identity: [design.md](design.md). Aggro/midrange creatures convert
  the engine into board pressure. Control creatures may keep weak attacks;
  lethality for those lists lives on cards / rituals / faces (bible §27). They
  should not steal Toxin/Corruption’s continuous-burn job. Vary `unlock`
  (one showing face vs both dice vs dual-attribute) — do not clone the last
  creature’s Strike + Generate-same.
- Omit `effect` on an attack when only a subset is modellable — document the gap
  in `docs/DEFERRED_CATALOGUE.md` (passives, pierce, multi-target riders, etc.).
- Squad size for matches comes from setup / loadout (typically 3 creatures), not
  from stuffing every catalogue entry into the prototype squad.

## Population in `creatures.ts`

**Figma catalogue** — Slow-game-test creatures (print-first), including builtin
Aggro and Control squads.
