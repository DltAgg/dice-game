# Examples — shared-event hooks

## Prefer relation filter over coupled type

**Avoid:**
```ts
{ type: "on-ally-attack", effects: [...] }
{ type: "on-opponent-roll-symbol", symbol: "corruption", effects: [...] }
```

**Prefer:**
```ts
// Varcolac — two Varcolacs still buff each other (different CreatureId, same owner)
{
  type: "on-attack",
  attackerRelation: "ally-other",
  effects: [
    { type: "grant-next-attack-bonus", amount: 1, target: { kind: "source-creature" } },
  ],
}

// Corrupting Elder
{
  type: "on-roll-symbol",
  symbol: "corruption",
  rollingPlayer: "opponent",
  effects: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
}

// Black Plague (explicit; "controller" is also the default)
{
  type: "on-roll-symbol",
  symbol: "corruption",
  rollingPlayer: "controller",
  effects: [{ type: "damage", amount: 1, target: { kind: "source-creature" } }],
}
```

## Equipment on-attack (self + kind)

```ts
// Twin Blades — strip Shield on basic
{
  type: "on-attack",
  attackerRelation: "self",
  attackKinds: ["basic"],
  effects: [
    { type: "remove-shield", amount: 1, target: { kind: "declared-target" } },
  ],
}

// Alpha's Hide — only if print maps fully to pool generate
{
  type: "on-attack",
  attackKinds: ["special"],
  effects: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
}
```

## Take-damage `[Reduce N]` (in-event modifier)

Print: `On take damage, once per turn: [Reduce 1].`

```ts
// Hunting Armour / Prism Mantle
{
  type: "on-take-damage",
  reduceBy: 1,
  oncePerTurn: true,
}
```

Handled inside `dealDamage` **before** prevent buffer / Shields. Do not queue a
heal-after-the-fact approximation.

## Continuous ritual standing

```ts
ritual: {
  activeWhen: { arcane: 1, darkness: 1 },
  effects: [],
  standingAbilities: [
    {
      type: "on-discard",
      discardingPlayer: "controller",
      effects: [{ type: "generate-symbol", symbol: "darkness", amount: 1 }],
    },
  ],
},
```

Only while the ritual is `ready` on the field.
