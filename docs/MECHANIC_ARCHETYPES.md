# Mechanic–archetype catalogue

Living playtest tracker: **which mechanic, in which window, feels like which
deck style.** Use it to keep Aggro, Control, Tempo, Combo, Burn, and Support
readable, and to retarget leaks after playtests.

This is **not**:

| Doc | Owns |
|---|---|
| [`KEYWORDS.md`](./KEYWORDS.md) | Print verbs and tokens |
| [`.cursor/skills/author-content/design.md`](../.cursor/skills/author-content/design.md) | Attribute **exclusive** verbs (who may print Insight / Mill / Frenzy / …) |
| [`OPEN_DESIGN.md`](./OPEN_DESIGN.md) | Unresolved **rules** questions |
| [`RULEBOOK.md`](./RULEBOOK.md) | How the game currently plays |
| Live JSON | Catalogue truth (what is printed) |

A shared opcode can still be the wrong **feel**. `[Generate]` on a face’s
`On roll` is engine fuel. `[Generate]` of the same attribute an attack just
`[Spend]` is infinite combat. Same keyword, different archetype.

**Window** is the correlation. Always name it (attack follow-up, On roll, On
absorb, play region, ritual activate). Do not log “Generate = Aggro” without
the window.

## Archetypes (homes)

From spec `002` / `design.md`. Builtin lists today are Tempo and Control;
the others still have identity even when their JSON loadout is empty.

| Archetype | Attributes | Wins by (feel) |
|---|---|---|
| **Aggro** | Martial, Wild | Efficient creature combat: spend pile to swing, extra attacks (`[Frenzy]`), board pressure on the legendary. Cheap, repeatable **attacks**. |
| **Tempo** | Mechanical, Luminar | Sequence pile → forge → pressure. Engine density on the die; combat is real but paid. |
| **Control** | Arcane, Darkness | Stretch the game (Insight, mill, negate) and close with **engine-converted** damage, not infinite swings. |
| **Combo** | Luminar, Wild, Mechanical, Toxin | Chained engine damage. Extra attacks and Prevent are tools, not Control stall. |
| **Burn** | Toxin, Corruption | Continuous DoT onto the legendary. Not Control mill and not Aggro beatdown. |
| **Support** | Arcane, Luminar, Wild, Mechanical | Splashable utility. Not a ninth attribute; not 1-drop cycle. |

## Status

| Status | Meaning |
|---|---|
| `HOME` | Intended home, and playtests have not contradicted it. Print it there. |
| `LEAK` | Played on list A, **felt like** list B. Retarget or cut. |
| `WATCH` | Hypothesis. Log more playtests before locking. |
| `RETARGETED` | Leak closed in live JSON. Keep the row so we do not reintroduce it. |
| `ANTI` | Not an archetype identity. Do not author this shape. |

## How to update (after a playtest)

The **post-playtest** subagent (skill `review-playtest`) owns this update
after a session. Do it in the **same change** as the debrief; print/engine/list
fixes are separate slices.

1. Name **mechanic + window** (not just the keyword).
2. Name the **list that was played** and what it **felt like**.
3. Add a row or revise status / evidence. Cite creatures/cards by id.
4. If the fix is print → `card-designer`. If the fix is fuel physics →
   `engine-developer`. If the card is fine but the list is wrong →
   `deck-designer`.
5. Do not delete `RETARGETED` / `ANTI` rows. They are the memory.

Metrics dumps (`analyze-match-metrics`) that show “Control closed by
creature combat” or “infinite attack turns” belong as evidence here.

---

## Index

| Id | Mechanic | Window | Intended home | Playtest feel | Status |
|---|---|---|---|---|---|
| [MA-01](#ma-01-attack-spend-refund) | `[Generate]` same attr as attack `[Spend]` | Creature attack follow-up | None (Aggro-shaped if anywhere) | Aggro (infinite swings) on Control | `RETARGETED` |
| [MA-02](#ma-02-on-roll-generate-same) | `[Generate]` same attr as the face | On roll (face / overload) | Tempo / Combo engine; Control overloads that bank for **cards** | Engine density, not combat | `HOME` |
| [MA-03](#ma-03-spend-generate-converter) | `[Spend] X, [Generate] Y` | Play region | — | Fake bridge / glue | `ANTI` |
| [MA-04](#ma-04-paid-creature-attacks) | Strike while pile actually drains | Creature attack | Aggro/Tempo: higher Strike; Control: modest Strike + pie rider | Control with refunds felt Aggro | `HOME` (after MA-01) |
| [MA-05](#ma-05-frenzy-extra-attacks) | `[Frenzy]` | Extra attack grant | Aggro, Combo (Wild exclusive) | More swings | `HOME` |
| [MA-06](#ma-06-engine-converted-damage) | Drain / consume / delayed / ritual damage | Cards, faces, rituals — not cheap attacks | Control, Combo, Burn closers | Valid lethality; not Aggro | `HOME` |
| [MA-07](#ma-07-insight-mill-riders) | `[Insight]` / `[Mill]` | Paid attack rider or absorb | Control | Control, if the attack still spends | `HOME` |
| [MA-08](#ma-08-dot-ticks) | Toxin markers / Corruption DoT | Standing / turn-start / on-roll ticks | Burn | Burn. Leak if Control’s clock | `HOME` |
| [MA-09](#ma-09-prevent-reactions) | `[Prevent]` | Attack-chain **reaction** only | Combo / Support (Luminar) | Interaction, not Control mill | `HOME` |
| [MA-10](#ma-10-one-token-playcost) | `playCost` totaling 1 | Header | Exceptional niche | Cheap cycle / Aggro 1-drops | `ANTI` (as a band) |
| [MA-11](#ma-11-discount) | `[Discount]` | Next forge / play | Tempo, Support, Control sequencing | Makes 2+ cards playable; not Aggro refund | `HOME` |
| [MA-12](#ma-12-combat-reforge-stamp) | `[Reforge]` / `[Stamp]` on a **paid** attack | Creature special | Tempo (Mechanical exclusive) | Engine during combat, not pile refund | `HOME` |
| [MA-13](#ma-13-legendary-strike-band) | Strike 3 vs Strike 2 on legendaries | Creature attack | Tempo hits harder; Control chips | Tempo closer vs Control engine | `WATCH` |
| [MA-14](#ma-14-discount-plus-synthetic-bank) | `[Discount]` + synthetic forge bank of the spent attr | Same `FORGE_CARD` | Tempo discount **or** bank, not both | Twin Cam + Torque Wright: pile unchanged | `RETARGETED` |
| [MA-15](#ma-15-tactic-overcharge) | `[Overcharge]` any hand card | Actions, once per turn (not play, not forge) | Tempo keep-a-face splash; Control (Scholar's Lien → Darkness keeper) | Untested | `WATCH` |
| [MA-16](#ma-16-instant-rituals) | Ritual / Instant (place → Active-when → activate → GY) | Ritual place + activate | None as a band | Worthless vs equipment / overload / continuous | `RETARGETED` |

---

## Entries

### MA-01 Attack spend refund

**Mechanic:** Attack `discards` attribute X, then `followUpEffects` `[Generate N X]`
(or any effect that returns the spent tokens before the next attack).

**Window:** Creature attack resolution.

**Intended home:** None. Extra swings in-pie are `[Frenzy]` (MA-05), not a
refund. Efficient Aggro attacks still **spend**.

**Playtest feel:** **Aggro** — infinite resources for attacks. Control
(Arcane/Darkness) with this printed on the squad played like a beatdown deck.

**Why:** Net-zero pile. Every swing that should have been a fuel decision
becomes “always attack.” Control’s spend is supposed to tax combat so the
engine (cards / mill / Insight) is the plan.

**Evidence:** 2026-08-30 playtest. Live offenders (since retargeted):

- `creature-gravemarrow-shade` Grave Reach — Spend Darkness, Generate Darkness
- `creature-riftscribe-adept` Ley Surge — Spend Arcane, Generate Arcane
  (dual-requires did **not** save it; the spent pip came back)

**Status:** `RETARGETED` · 2026-08-30

- Grave Reach → `[Strike 2]. Your opponent [Mill 2].` (still Spend Darkness)
- Ley Surge → `[Strike 2]. [Insight 2].` (still Requires Arcane+Darkness, Spend Arcane)
- Duskthrone Oracle already spent without refund; kept.

**Do not:** Reprint Strike + Generate-same on Control (or Tempo/Burn) bodies.
`.cursor/skills/author-content/creatures.md` already forbids that reskin.

### MA-02 On-roll Generate same

**Mechanic:** Face or overload `On roll: [Generate 1 SameAttr]`.

**Window:** Die resolution / overload on roll — **not** attack follow-up.

**Intended home:** Tempo and Combo die density (Cogtooth and peers). Control
overloads that bank for **spells** (Runewatch Lens, Nightglass Rune) are the
same engine, not MA-01.

**Playtest feel:** Rolling into more pile, then choosing absorb vs pool. Does
not by itself create infinite **attacks**.

**Status:** `HOME`. Distinct from MA-01. Do not “fix” Control overloads by
deleting on-roll generate because attacks refunded.

### MA-03 Spend-Generate converter

**Mechanic:** Play region `[Spend] X, [Generate] Y` as a “bridge.”

**Window:** Instant / ritual play.

**Intended home:** None. Real bridges spend **both** identities or install a
dual-pip face (`design-craft.md`).

**Playtest feel:** Glue, not a deck style. Spec `002` converter table is a
failure mode; those JSON files are gone.

**Status:** `ANTI`.

### MA-04 Paid creature attacks

**Mechanic:** `[Strike N]` while `discards` actually leaves the pile smaller.

**Window:** Creature attack.

**Intended home:**

- Aggro / Tempo: combat is a win path; Strike can be higher (Lodestar Strike 3).
- Control: modest Strike + pie rider (Insight / mill). Lethality on the engine
  (MA-06). Weak attacks are OK; **free** attacks are not.

**Playtest feel:** Control with MA-01 refunds felt like Aggro. After retarget,
spend is the Control tax.

**Status:** `HOME` once MA-01 stays closed.

### MA-05 Frenzy extra attacks

**Mechanic:** `[Frenzy]` / `grant-extra-attack`.

**Window:** Wild exclusive (see `design.md`). Absorb, Spend, or combat trick.

**Intended home:** Aggro, Combo.

**Playtest feel:** More attacks per turn — the honest Aggro/Combo “I swing
again” lever. Not a Control tool.

**Status:** `HOME`. Do not fake Frenzy with MA-01 refunds.

### MA-06 Engine-converted damage

**Mechanic:** Damage from rituals, faces, Drain, consume, delayed/conditional
hits — not from cheap repeated creature attacks.

**Window:** Cards / faces / standing — bible §§4, 27; `OPEN_DESIGN.md`
“Damage is not reserved for creature attacks.”

**Intended home:** Control, Combo, Burn closers.

**Playtest feel:** Valid clock. Distinct from Aggro beatdown. A Control list
with only 1-damage attacks and no engine damage has **no clock** (that is a
different leak: missing MA-06, not extra MA-01).

**Status:** `HOME`.

### MA-07 Insight mill riders

**Mechanic:** `[Insight N]` or `[Mill N]` on an attack that still `[Spend]`s.

**Window:** Attack follow-up or On absorb (once per turn).

**Intended home:** Control (Arcane exclusive Insight, Darkness exclusive mill).

**Playtest feel:** Control, **if** MA-01 is closed. Absorb Mill 2 → paid Grave
Reach Mill 2 → Ebb Mill 3 is a mill clock, not a combat engine.

**Status:** `HOME` · 2026-08-30 retarget used this as the replacement riders.

### MA-08 DoT ticks

**Mechanic:** Toxin counters; Corruption continuous burn.

**Window:** Markers, turn-start, on-roll / on-absorb pings.

**Intended home:** Burn. Not Control’s mill clock, not Aggro’s attacks.

**Status:** `HOME`. Corruption is not Control’s future manabase (`design.md`).

### MA-09 Prevent on reactions

**Mechanic:** `[Prevent]` / `grant-attack-prevent`.

**Window:** Luminar **reaction** on a living attack chain only (spec `009`).

**Intended home:** Combo / Support. Proactive Shield/Heal is not Prevent.

**Status:** `HOME`. Not Control’s identity (Control answers with Insight /
negate / mill).

### MA-10 One-token playCost

**Mechanic:** Header `playCost` totaling 1 pile token as the cheap band.

**Window:** Playing a tactic.

**Intended home:** Exceptional niche only. Cheaper plays come from `[Discount]`
(MA-11).

**Playtest feel:** Aggro/Support 1-drop cycle; makes 2+ cards look worse.

**Status:** `ANTI` as a roster. Remaining 1-costs are not a license to add more.

### MA-11 Discount

**Mechanic:** `[Discount]` next forge or play.

**Window:** Absorb, attack rider, instant, On roll.

**Intended home:** Tempo (Torque Wright absorb), Control (Oracle's Margin),
Support sequencing.

**Playtest feel:** Engine — you still spend, just less next time. Not MA-01.

**Status:** `HOME`.

### MA-12 Combat Reforge Stamp

**Mechanic:** `[Reforge]` / `[Stamp]` as a **paid** attack follow-up.
Play-region `[Reforge N Attr]` / `[Cross forge N Y / Z]` (Recast, Alloy Shift)
are the same Mechanical exclusive, not this combat window.

**Window:** Tempo specials (`creature-torque-wright` Retool, `creature-lodestar-artificer` Overdrive). Mechanical exclusive.

**Intended home:** Tempo. Engine during combat, pile still drains.

**Status:** `HOME`. Do not “balance” this by adding Generate-same.

### MA-13 Legendary Strike band

**Mechanic:** Legendary basic/special Strike number.

**Window:** Creature attack.

**Intended home:** Tempo legendary (Lodestar) Strike 3; Control legendary
(Duskthrone) Strike 2 + Drain on the special.

**Playtest feel:** Unconfirmed whether Control Drain-2 special plays as a
closer (MA-06) or as Aggro combat (MA-04). Special still **spends** Darkness.

**Status:** `WATCH`. Revisit if Control still feels like beatdown after MA-01.

### MA-14 Discount plus synthetic bank

**Mechanic:** `[Discount N]` forge (Torque Wright / Shim Kit / …) on the same
own-die synthetic `FORGE_CARD` as the immediate synthetic forge bank
(`forgeBankPerFace`).

**Window:** One `FORGE_CARD` install.

**Intended home:** Tempo gets **either** the cheaper header **or** the bank,
not both on the same card.

**Playtest feel:** Twin Cam (`playCost` 2 Mechanical, synthetic forge) with
Torque Wright Discount 1 and 1 Mechanical in the pile: spend 1, bank 1, pile
unchanged — looked like the token was never spent (same-action refund, MA-01
shape).

**Why:** Discounted remainder equals the bank of the same attribute.

**Evidence:** 2026-08-30 playtest · Tempo · `card-twin-cam` +
`creature-torque-wright`.

**Status:** `RETARGETED` · engine: skip synthetic bank when the install
consumed `forgeDiscountThisTurn`. Undiscounted synthetic still banks.

### MA-15 Tactic Overcharge

**Mechanic:** `[Overcharge]` — spend **any** hand card onto one attribute
**face card**; every die showing that face `[Generate]`s +1 of the spent
card’s attribute on roll (overload-style host, persists until the last owned
copy leaves). Spec `021`.

**Window:** Actions, once per turn, instead of play or forge. Not On roll
print and not an attack follow-up.

**Intended home:** Tempo (keep a dense synthetic, splash another attribute —
including from a synthetic or opponent-die card you do not want to forge)
and Control (Scholar's Lien piggybacks Arcane onto Darkness Natural /
Pyre of Names instead of installing a blank Arcane natural).

**Playtest feel:** Untested.

**Why:** A card you would rather not play or forge can still splash its
attribute onto a kept face. This is not MA-02 (the face’s own On roll
`[Generate]` of the same attribute) and not MA-03 (`[Spend] X, [Generate] Y`
in the play region — `ANTI`). Forge kind does not gate the spend.

**Evidence:** Design example 2026-08-30 · Control · `card-scholars-lien` +
`face-natural-darkness` / `face-synthetic-pyre-of-names`. Any-card retarget
2026-08-31 · Tempo · `card-twin-cam`.

**Status:** `WATCH`

**Follow-up:** post-playtest after a session that actually Overcharges; do
not reprint `[Overcharge]` on every card.

### MA-16 Instant rituals

**Mechanic:** Ritual / Instant — pay to place, wait for Active-when, spend
again (often), resolve once, GY.

**Window:** Ritual place + activate (not hand Instant, not Continuous OPT
activate).

**Intended home:** None as a band. Engines belong on Continuous (activate
body, exhaust = once per turn). Closers and paradox one-shots belong on
hand Instant.

**Playtest feel:** Worthless. Players never chose them over equipment,
overload, or standing continuous rituals.

**Why:** Double tax (playCost then Active-when / Spend) plus a one-shot
leave made the slot strictly worse than a Continuous engine or a hand
Instant dump.

**Evidence:** 2026-08-31 playtest.

- Engines → Continuous, keep activate body: `card-archivists-summons`,
  `card-tempering-line`, `card-graven-summons`, `card-daybreak-rite`
- Closers / paradox → hand Instant: `card-lightless-verdict`,
  `card-echo-of-the-buried`

**Status:** `RETARGETED` · 2026-08-31

**Do not:** Author new Ritual / Instant one-shots. Recurring Strike or free
GY replay as Continuous activate is warped.

**Follow-up:** none (catalogue conversion). Deck-designer places copies.

---

## By archetype (what to print / what leaks)

| Archetype | Signature feel to protect | Do not steal |
|---|---|---|
| Aggro | Paid efficient attacks, `[Frenzy]`, Martial movement | Control mill/Insight as the **plan**; Burn ticks; infinite refunds are a **leak even here** if they erase the spend decision |
| Tempo | Forge sequencing, on-roll generate, Reforge/Stamp, Discount | Attack refunds (MA-01); Discount + synthetic bank on the same install (MA-14); Control stall as the win |
| Control | Insight, mill, negate, engine damage, **attacks that tax pile** | MA-01 refunds; Frenzy; Toxin/Corruption DoT; Strike-3 beatstick legendary |
| Combo | Chains, Frenzy, Prevent reactions, Mechanical reconstruction | Cheap Aggro without a combo; Control “no clock” |
| Burn | Toxin + Corruption ticks onto the legendary | Creature beatdown; Arcane negate as the identity |
| Support | Discount, Shield, splashable utility (not exclusive verbs) | 1-drop cycle (MA-10); a ninth colorless attribute |

---

## Template (paste a new id)

```markdown
### MA-XX Short name

**Mechanic:**
**Window:**
**Intended home:**
**Playtest feel:**
**Why:**
**Evidence:** YYYY-MM-DD · list · card/creature ids
**Status:** WATCH | HOME | LEAK | RETARGETED | ANTI
**Follow-up:** card-designer / engine-developer / deck-designer / none
```
