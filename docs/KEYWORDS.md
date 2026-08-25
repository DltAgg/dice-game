<!--
Agents: this file is print vocabulary for cards, hooks, tokens, and new
mechanics (`.cursor/rules/keywords.mdc`). Player sections render on the Rules
tab; HTML comments are stripped. Map print → existing EffectDefinition members
(do not add a generic mark-token AST just to match the glossary).
New/edited rulesText uses these keywords. Do not mass-rewrite old print unless
asked. New tokens join X on Mark/Strip. Do not mint Dose/Envenom/Brand/Contaminate.
-->

## Keywords

Bracketed words on cards — the same grammar as `[Forge]` and `[Requires]`.
Timing lines stay as prefixes. The keyword is the **clause after the colon**:

```text
On roll: [Empower 1].
On absorb: [Mark 1 Toxin].
```

Keyword the **verb** when it is a game operation. Parameterize the **noun**
when it is a token, symbol, card type, or target. A new token reuses
`[Mark]` / `[Strip]`; it does not get its own word.

Catalogue print uses these keywords. Rare unique sequences (Exterminate, Mind
Control, Aegis redirect, Instinct bonus attack, Overcharge, Lock/Suppress/Hex,
pack feeding until `[Feed]` ships) stay spelled. The meaning is the same.

Anyone may print `[Mark]`. Only Toxin may print `[Mark N Toxin]`. The verb is
shared; the argument follows attribute exclusives.

| Layer | What belongs here | Example |
|---|---|---|
| **Grammar** | Nouns the table already uses. Never synonym them. | `[Forge]`, Absorb, Retain, Energy, `[Requires]` |
| **Operators** | A few verbs that take a type. New tokens reuse these. | `[Mark N X]`, `[Strip N X]`, `[Generate N X]`, `[Negate X]`, `[Destroy X]` |
| **Physics** | Combat and turn math that is not “put a counter.” | `[Empower N]`, `[Pierce N]`, `[Prevent N]`, `[Convert N]` |

---

## Token operators

Creature counters, Shield, face markers, and future tokens are all **X**.
What each X *does* is a rule (Toxin ticks, Pestilence spreads, Corruption
marks a face). Cards only say **Mark** or **Strip**.

### Mark

Put N of token X on the printed target.

| Print | Means |
|---|---|
| `[Mark N X]` | Now, once |
| `[Mark N X on attacks]` | Until end of turn, each of **your** attacks Marks N X on the attack target |

| Print | Means |
|---|---|
| `[Mark 2 Toxin]` | Apply 2 Toxin markers |
| `[Mark 1 Toxin on attacks]` | Your attacks this turn apply 1 Toxin |
| `[Mark 1 Shield]` | Grant 1 Shield |
| `[Mark 1 Corruption]` | Put a Corruption marker on an opposing synthetic face |
| `[Mark 1 Pestilence]` | Put a Pestilence counter (spread is the token’s rule) |

Standing gear does **not** need `on attacks`. The timing prefix is the window:

```text
On deal damage: [Mark 1 Toxin].
On attack: [Mark 1 Toxin].
```

`on attacks` is for an Instant that grants that for the rest of the turn.

<!--
Engine: apply-toxin | arm-attack-toxin | grant-shield | add-corruption-marker |
add-pestilence-counter. Stun is DEFERRED — do not print [Mark N Stun].
-->

### Strip

Remove up to N of token X. Legal to resolve if none remain.

| Print | Means |
|---|---|
| `[Strip 3 Shield]` | That creature loses 3 Shield |
| `[Strip 1 Toxin]` | Remove 1 Toxin marker |
| `[Strip 1 Martial]` | Discard 1 Martial token from a creature |
| `[Strip any Toxin]. [Strike equal]` | Remove chosen Toxin; deal that much damage |

<!--
Engine: remove-shield | discard-attribute-tokens | remove-toxin-deal-damage
(pending). Do not mint Detonate / Rend as keywords.
-->

### Not Mark

| Print | Why it is a different word |
|---|---|
| `[Generate N Toxin]` | A **pool symbol**, not a creature/face token. Expires at end of turn. |
| Absorb Toxin | Banks a pool pip into your attribute pile. Grammar, not an effect keyword. |
| `[Prevent N]` | Combat step before Shield. Luminar exclusive. Not a token you Mark. |
| `[Empower N]` | Extra damage on an attack. Not a token. |
| `[Pierce N]` | Ignore N Shield. Does not spend or place Shield. |

---

## Other operators

Same idea, different nouns.

| Print | X is | Means |
|---|---|---|
| `[Generate N X]` | A symbol (Martial, Shield, …) | Add N of X to your pool this turn |
| `[Forge N]` | Face kind + attribute; **your die** or **the opponent’s die** | Install N matching faces |
| `[Negate]` / `[Negate Instant]` / `[Negate Ritual]` | Chain-link type | Negate the top matching card link |
| `[Destroy Equipment]` / `[Destroy Ritual]` | A card on the field | Send one to its owner’s graveyard |
| `[Gain N Energy]` / `[Lose N Energy]` | You / the opponent | Move the shared Energy marker |
| `[Move N Energy]` | — | Opponent’s Energy toward you |

**Forge** already names a target. `[Forge 1 Synthetic Corruption]` on the
opponent’s die is Corruption’s exclusive (their die). Mechanical forges
**your** die.

`[Negate Ritual]` answers a ritual on the chain. `[Destroy Ritual]` answers a
ritual already on the field.

<!--
Engine: generate-symbol | FORGE_CARD / forge-faces | negate-card / negate-ritual |
destroy-equipment / destroy-ritual | gain-energy / lose-energy | transfer-energy.
No Contaminate / Seal / Disarm / Unmake / Drain / Siphon keywords.
-->

---

## Combat and turn

These are not tokens.

| Print | Means |
|---|---|
| `[Strike N]` | Deal N damage (default: a chosen enemy; name any other target) |
| `[Heal N]` | Heal N |
| `[Draw N]` / `[Discard N]` | Draw / discard. “Up to” and extra clauses stay English. |
| `[Empower N]` | The next attack this turn deals +N. Name the creature if it is not yours. |
| `[Pierce N]` | Ignore N Shield after Prevent |
| `[Prevent N]` | Prevent the next N damage (before Shield). Luminar exclusive. |
| `[Convert N]` | Convert up to N pool symbols into Natural attributes |
| `[Discount N]` | The next matching play or forge costs N less Energy (minimum 0) |
| `[Insight N]` | Look at the top N of your deck; put 1 in hand, rest on the bottom. Arcane exclusive. |
| `[Search N]` | Look through your deck; add up to N cards of the printed types; shuffle. Arcane exclusive. |
| `[Recall N]` | Return up to N cards from your graveyard to your hand |
| `[Mill N]` | Put cards from a deck into a graveyard. Darkness exclusive. |
| `[Reposition]` / `[Swap]` | Move an ally frontline ↔ back / swap with an ally. Martial exclusive. |
| `[Reforge]` | Replace one of your matching synthetic faces (no forge-draw). Mechanical exclusive. |
| `[Stamp]` | Re-fire a showing face’s On roll and its overloads. Mechanical exclusive. |
| `[Double]` | The next face-sourced effect you resolve this turn happens twice. Mechanical exclusive. |
| `[Resonance]` | A pool symbol may pay any `[Requires]` / `[Active when]` attribute this turn |
| `[Reroll]` | You may reroll a rolled die |
| `[Retain]` | Keep a retainable die across the next roll |

<!--
Engine: damage | heal | draw-cards | discard-cards | next-attack-bonus |
grant-next-attack-bonus | ignore-shield / arm-ignore-shield | grant-damage-prevent |
convert-symbols | energy-cost-discount / arm-forge-discount | look-top-deck /
peek-deck-optional-bottom | search-deck | search-graveyard | dark-pact |
reposition-creature | swap-positions | replace-synthetic-face |
reapply-die-modifiers | arm-resolve-next-face-effect-twice |
arm-requirement-wildcard / arm-wildcard-from-synthetic-pool | optional-reroll-die |
retain-die.
[Feed] is Wild exclusive pack feeding — no engine yet; do not print as live.
Peek is [Insight 1]. Prime is [Empower N] on that creature.
Spell until they recur: Aegis, Rain, Expose, Tough, Might, Lock, Suppress, Hex,
Copy Face, Mirror, Overcharge, Instinct, Exterminate, Mind Control.
Push is banned. Stun and Scale are deferred — do not print.
-->

---

## Grammar and timing

These are not effect replacements.

| Print | Role |
|---|---|
| `[Forge]` | Play/forge region **and** the install verb |
| `[Requires: …]` | Extra pool-symbol cost |
| `[Active when: …]` | Ritual gate vs owner’s attribute pile (not repeated in the effect box) |
| `[Spend: …]` | Optional burn from the owner’s attribute pile on ritual activate |
| Absorb | Bank an attribute into your pile (rolled and effect-generated usable attributes auto-bank; On absorb fires), or grant Shield onto a creature |
| Overload | Card type. Gates stay `Can only overload…` |
| Energy | Shared marker |
| `On roll:` `On absorb:` `On deal damage:` `On toxin damage:` `On attack:` / `On basic attack:` / `On special attack:` `On take damage:` `On discard:` `On change position:` `On start of turn:` `On prevent damage:` | Timing prefixes. Never “Whenever…” |

---

## Attribute exclusives

The verb may be shared. The **argument** is exclusive.

| Attribute | May print | Must not print |
|---|---|---|
| **Arcane** | `[Insight]`, `[Search]` | `[Mill]`; treating `[Recall]` as exclusive |
| **Darkness** | `[Mill N]` | `[Insight]`; discard from hand as mill |
| **Luminar** | `[Prevent]`, prevent-and-reflect, `On prevent damage:` | `[Mark N Shield]` as if it were Prevent; `[Heal]` as Prevent |
| **Corruption** | `[Forge]` on **their** die; `[Mark N Corruption]` | `[Mark N Toxin]`; opponent-die forge on Mechanical |
| **Toxin** | `[Mark N Toxin]` and `on attacks` | Corruption face marks; delayed damage with no Toxin token |
| **Martial** | `[Reposition]`, `[Swap]` | Enemy push; `[Feed]` |
| **Mechanical** | `[Reforge]`, `[Stamp]`, `[Double]`, own-die `[Forge]` | Opponent-die Forge; `[Insight]` |
| **Wild** | `[Feed]` when that rule exists | `[Reposition]`; `[Mark N Toxin]` / `[Mark N Corruption]` |

Shared on purpose: Strike, Heal, Draw, Generate, Empower, Pierce, Discount,
Mark/Strip of **Shield**, Absorb, Retain, Reroll.

---

## Quick reference

| If you mean… | Print |
|---|---|
| Apply Toxin now | `[Mark N Toxin]` |
| Attacks this turn apply Toxin | `[Mark N Toxin on attacks]` |
| Gear that toxins on hit | `On deal damage: [Mark N Toxin].` |
| Grant Shield | `[Mark N Shield]` |
| Strip Shield | `[Strip N Shield]` |
| Next attack +N | `[Empower N]` |
| Ignore Shield | `[Pierce N]` |
| Stop damage (Luminar) | `[Prevent N]` |
| Pool pip | `[Generate N Arcane]` |
| Install faces | `[Forge 1 Synthetic Mechanical]` on your die |
| Install on them | `[Forge 1 Synthetic Corruption]` on the opponent’s die |
| Extra attack damage | `[Empower]`, never `[Mark N Damage]` |
| Unique consume/split closer | Spell it |

When a new token is added to the rules, it gets a name and joins X. It does
**not** get a new verb.
