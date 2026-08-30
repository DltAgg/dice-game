# Attribute pile (spec `016`)

Canonical rules: [`docs/specs/016-attribute-pile-up.md`](../../../docs/specs/016-attribute-pile-up.md) ·
player wording: [`docs/RULEBOOK.md`](../../../docs/RULEBOOK.md) §§6–8 ·
print grammar: [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md).

Content migration notes (faces / rituals / equipment): [`docs/specs/016-content-migration.md`](../../../docs/specs/016-content-migration.md).

## Two pools (do not conflate)

| Pool | Where | Lifetime | Used for |
|---|---|---|---|
| **Turn symbol pool** | `GameState.symbols` | Current turn; unbanked pips expire at EOT | Roll display, manual absorb of leftovers, Shield absorb target selection |
| **Attribute pile** | `PlayerState.attributePool` | Persists across turns until spent or removed | `[Requires]`, `[Active when]`, `[Spend]`, attack `requires` / `discards`, header `playCost` (play + synthetic forge) |

Usable attribute pips from a **roll** or **effect** **auto-bank** into the pile
after on-roll effects resolve. Manual `ABSORB_SYMBOL` on a leftover turn-pool
pip also banks. Shield stays in the turn pool until absorbed onto a **living
owned creature** (grants Shield counters — not pile fuel).

## Print vocabulary

| Printed | Engine | Notes |
|---|---|---|
| Absorb (attribute) | Bank into **your attribute pile** | Keep prefix **`On absorb:`** — do not invent `On bank:` |
| `[Requires: …]` | Gate vs pile (must hold; not spent) | Attacks, some card gates |
| `[Spend: …]` | Burn from pile | Header `playCost` (play + synthetic forge), `effect.requires`, ritual `spend`, attack `discards` |
| `[Active when: …]` | Ritual gate vs **owner’s** pile | Not in `rulesText` — UI prints it from `ritual.activeWhen` |
| Ritual `spend` | Optional pile burn on `ACTIVATE_RITUAL` | Often equals `activeWhen` on high-swing instants |
| Header `playCost` | `CardDefinition.playCost` | Place/play cost. Natural forge does **not** burn it; synthetic forge does (`docs/RULEBOOK.md` §8) |

Wildcards (`[Resonance]`) may cover shortfall on gates and spends for the turn.

## Rituals (pile gates — no progress counters)

1. `PLAY_CARD` → `preparing`.
2. Ritual becomes **`ready`** when the owner’s pile meets `activeWhen` (or
   immediately if omitted).
3. `ACTIVATE_RITUAL` checks the gate again, burns optional `ritual.spend`,
   resolves `ritual.effects`.
4. Do not bank pips onto the ritual card — the gate is the owner’s pile.

Standing `on-absorb` on continuous rituals fires when the **owner banks** a
matching attribute (see below).

## On absorb hooks (bank semantics)

**Attribute bank:** absorber is `{ kind: "player", id }`. Face / overload
`onAbsorb` and standing `on-absorb` fire when that pip enters the pile (roll
auto-bank, effect generate, or manual absorb).

**Shield absorb:** absorber is `{ kind: "creature", id }` (the shield target).

### Standing `on-absorb` filters

Default `absorberRelation: "self"` **never matches** a player pile bank
(creature/gear/ritual host is not the absorber). For “when **you** bank X” on
equipment, creature passives, or continuous rituals, use **`ally`** (owner
banks → matches hosts on that player’s field).

| Intent | `absorberRelation` |
|---|---|
| When the host creature absorbs Shield | `self` (creature absorber only) |
| When **you** bank Martial / Wild / … | `ally` |
| When any bank on your side counts | `ally` or `any` (+ symbol filter) |
| Retired: “the absorbing creature” for attributes | Retarget to `choose-ally` / player-scoped Empower — no creature-local fuel |

Do not use `source-creature` on attribute-bank effects unless the effect means
“a creature you choose” — there is no attribute absorber creature.

## `[Prevent]` (reaction-exclusive — not pile fuel)

Luminar **`[Prevent]`** / `grant-attack-prevent` is **reaction-only** (spec
`009`, `OPEN_DESIGN` 2026-08-29): `type: "reaction"` cards during a living
attack chain, onto that attack’s target. No attack on the chain → whiff. Do not
author `[Prevent]` on faces, On absorb, instants, equipment, or standing
passives. Proactive Luminar mitigation → `[Mark N Shield]` / `[Heal]`.

## Authoring checklist (card-designer)

- [ ] Header / attack costs use pile grammar (`requires` gate vs `discards` spend)
- [ ] Ritual `activeWhen` is a pile gate; add `spend` only when activate should burn fuel
- [ ] `On absorb:` clauses assume **bank**, not “put token on creature”
- [ ] Equipment / continuous ritual `on-absorb` uses `ally` when the clause is “when you bank”
- [ ] Wild splash uses `[Frenzy]`, `[Generate]`, or `[Drain]`
- [ ] `[Prevent]` only on Luminar **reactions** — not faces, absorb, or standing
- [ ] Creature attack print says “in your pile” if editing English (not “absorbed on creature”)
- [ ] Dual-attribute fuel is for gates/spends that **play both identities**, not
      `[Spend] X, [Generate] Y` converters ([design-craft.md](design-craft.md))

## Deck-designer checklist

- [ ] List can **bank** enough of each attribute (dice plan + face deck) to meet
  its rituals’ `[Active when]` / `[Spend]` and tactic `[Requires]` / forge costs
- [ ] Burn lists do not assume Control manabase for Corruption installs
- [ ] Wild identity cards grant **`[Frenzy]`**, not token sharing

## Engine-developer touchpoints

| Area | Path |
|---|---|
| Pile bank + On absorb | `src/server/reducer/attributeBank.ts` |
| Roll auto-bank | `src/server/reducer/rollBank.ts` |
| Manual absorb | `src/server/reducer/commands/absorb.ts` |
| Ritual ready / spend | `src/server/reducer/zones.ts` (`refreshRitualOrientations`) |
| Attack fuel | `src/server/rules/cards.ts` / attack declare in `reduce.ts` |
| Absorb triggers | `src/server/reducer/triggers.ts` (`AbsorbAbsorber`, `queueAbsorbTriggers`) |
| State | `PlayerState.attributePool` in `src/server/model/state.ts` |

Rule or hook changes that players notice → same-change
[`docs/RULEBOOK.md`](../../../docs/RULEBOOK.md). Print vocabulary →
[`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md).
