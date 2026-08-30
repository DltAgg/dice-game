# Set craft (card designer)

Canon: `competitive_dice_game_agent_bible.md` §§1–3, 13, 19–20, 26–33.
Identities / exclusive verbs / kinds / costs: [design.md](design.md).
How forge currently plays: [`docs/RULEBOOK.md`](../../../docs/RULEBOOK.md) §11.
Print: [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md).

This sibling is **craft**. Do not paste it into the agent. Do not treat spec
`002` catalogue tables as live cards.

## Catalogue truth

**Live JSON** in `src/server/content/{cards,faces,creatures}/` is the set.
Grep and read it **before** choosing a slot.

- Hand cards after the reset are thin. Almost every `forge.faces` is **1**.
  Play-region `[Forge 2]` (Tempering Line, Tooling Order) is not the card’s
  own forge region occupying a Forge-2 slot.
- Naturals (`face-natural-*`) are empty `onRoll` / `onAbsorb` with one
  `symbol`. They do not generate a second attribute.
- Synthetics that generate (Cogtooth and peers) generate **the same**
  attribute they show. That slot is filled; do not reprint it.
- Spec `002` “Attribute bridge cards” (Bloodline Pact, Ichor Exchange, …)
  **JSON is gone**. That spend/generate table is a **failure mode**, not a
  pattern. Vanilla baselines in `002` are **rate anchors**, not competitive
  clones.

## Designer gates (Design 101, rewritten for dice)

Source orientation: Mark Rosewater, *Design 101* (2003). **Adapt, do not
copy Magic.** This is a dice engine-builder. A mechanic that never touches
roll / absorb / pile / forge / yield / overload is a miss.

1. **Too complicated.** Dice already carry state (six faces, overloads,
   pile, forge yield, synthetic bank). One focus per card. No flavor
   add-ons that never matter. Unreadable print and memory issues fail here
   faster than in a spell game.
2. **No synergy.** If a card has two halves, they must work together. Here
   the halves are **forge region** and **play region**, plus dice timing
   (`On roll` / `On absorb`). A forge that is a default `faces: 1` sticker
   unrelated to the effect fails this test.
3. **Ignores the pie / type rules.** Exclusive verbs and kinds live in
   [design.md](design.md). Check inside the box first.
4. **Doesn’t work in the rules.** Compose existing opcodes/hooks. If the
   proving card needs new vocabulary, brief `engine-developer` (do not
   fake). Dual-attribute generating faces may need engine if a single
   `symbol` field is insufficient — **design the card, then brief**. Do not
   silently skip the space.
5. **Power level last.** Least important. Uniqueness and dice-resonance
   come first. Do not “balance” a card into another Forge-1 Generate-same.

**Dice overlay (bible, not Magic):** the die is the protagonist. A
damage-only card that never touches the engine is usually a miss.
Engine-converted damage for Control is not a miss. Rulebook §11 own-die
**forge yield** and **synthetic forge bank** are baseline physics.
Designers treat those as the floor, then design **extra** forge payoffs —
not “forge has no pluses besides changing the face.”

## Uniqueness gate (stop circling)

Before authoring, grep/read live `src/server/content/{cards,faces,creatures}/`.

**Reject** a card that is a reskin of an existing slot: same kind + same
`forge.faces: 1` + same `[Spend]`/`[Generate]` converter **or** same
`On roll: [Generate 1 SameAttr]`.

Cycles (a small set that shares a theme) are OK only if **each member**
varies forge shape, timing, or payoff.

If the user asked for “another card,” still occupy a **new** slot or ask.
Do not copy vanilla `002` baselines into constructed.

## Dice resonance

Every mechanic must care about at least one of: roll, absorb, pile, forge,
yield, overload. Shared secondaries (tiny heal, draw, `[Discount]`,
`[Empower]`) still need a dice hook or a forge reason — they are not a
ninth pie.

## Forge development

`forge.faces: 1` + Natural (or Synthetic) of the card’s own attribute is
the **default sticker**. Stop using it unless that *is* the designed
choice and the play region sequences with it.

### Vary the region (slots — not cards to author now)

| Slot | What it occupies |
|---|---|
| `faces: 1` | The common install. Needs a **rider** or play-text synergy, or it is empty craft. |
| `faces: 2` | Count as the plus. Rare; costs and pie must justify two installs. |
| `faces: 3` | Exceptional. Ritual-scale or keyed engine piece, not a habit. |
| `kind: "natural"` | Free install + draw + yield. Identity face / density. Reason required. |
| `kind: "synthetic"` | Named special + synthetic bank. Reason required (the special, not “Mechanical cards forge synthetic”). |
| Named-face install | Play or rider names a **specific** special, not “any of this attribute.” |
| Forge rider | Extra generate, discount, draw, yield synergy, lock, or a trigger that cares the face was forged. |
| Play sequences with forge | Instant/reaction/equip that is better after you forged, or that sets up the next forge. |
| Overload that cares it was forged | Fires or scales on yield / synthetic bank / “this face was installed this game.” |
| Dual-pip face (below) | The install *is* the plus: two attributes from one slot. |

Mechanical still owns extra own-die reconstruction (`[Reforge]`, `[Stamp]`,
extra forge as the **exclusive verb**). Other attributes may still have
interesting **forge regions** (count, riders, dual-pip faces) without
stealing that verb. Opponent-die forge remains Corruption.

**Baseline physics are not “the plus”:** draw 1 per install; own-die yield
(+1 pip of the showing face’s attribute); synthetic own-die `FORGE_CARD`
banks 1 of the forged attribute per face. Layer on top of that.

## Dual-attribute generating faces (first-class hole)

The set has **no** Natural that produces two attributes and **no**
Synthetic that produces two attributes. Do not fill this with another
Cogtooth (`On roll: [Generate 1 SameAttr]`).

`FaceCardDefinition` has **one** `symbol` (`src/server/model/dice.ts`).
Prefer composing **today**:

```text
symbol: martial
On roll: [Generate 1 Wild].
```

The face still shows Martial (yield is Martial). Absorb/on-roll Generate
supplies the partner. Same pattern for a Synthetic that shows Arcane and
generates Darkness (or any pair that a constructed home actually wants).

If the proving print needs **two inherent pips** or a second `symbol`
field, write the card, then brief `engine-developer` with the standard
proving-card brief. Do not abandon the slot because the model has one
`symbol`.

## Bridges vs converters

A real bridge **plays like both identities at once** (gate 2, synergy).

**Bridges (do these):**

- Dual `playCost` that both attributes actually use (AND both; not a
  second pip the effect ignores).
- Ritual `[Active when]` / `[Spend]` that needs **both** and a payoff that
  is pie-legal for the pair.
- Equipment / overload that cares about both (timing, gate, or both
  symbols).
- A dual-pip face that *is* the bridge.
- Combined verb that stays in-pie: e.g. Martial+Wild might **move a body**
  *and* grant a payoff that needs the extra attack (Empower / “if it
  already attacked”) — or a face that generates both and an effect that
  **spends both**. Martial still does not print `[Frenzy]`; Wild still does
  not print swap.

**Converters (anti-pattern):** `[Spend] X, [Generate] Y` glue for
“stranded pile tokens.” Spec `002` listed Bloodline Pact / Ichor Exchange
/ etc. as that glue. Those files are gone; **do not recreate them**. Pile
fuel in [attribute-pile.md](attribute-pile.md) is for gates and spends,
not a converter license.

`playCost` today is AND of listed attributes. An OR-cost (“pay Martial
*or* Wild”) is missing vocabulary — design the card, then brief
`engine-developer`. Do not fake OR as AND or as Spend/Generate.

## Generic reach (not a ninth attribute)

Do **not** invent White / colorless as a 9th attribute.

**True generic reach:** splashable glue **any constructed list** could
maindeck — analogous to Magic artifacts / generic-cost cards (the user
analog “white cards” means “usable by any attribute,” not a White pie).
Cost and effect a Martial, Arcane, or Darkness list could all run:
untyped / Shield-adjacent tools, `[Discount]` / draw / retain / small
`[Mark N Shield]` that does not require a specific pile color, faces any
deck can pack.

Generic still must **touch the dice engine** (forge, roll, absorb, yield).
Generic does **not** mean ignore dice, and does **not** mean every
attribute’s exclusive verb.

**Not the same as Support-colored.** [design.md](design.md) Support =
Arcane / Luminar / Wild / Mechanical (utility may splash). Those cards
still have an attribute identity. True generic reach has **no** pile-color
requirement and no exclusive verb.

## Slot checklist (before print)

- [ ] Grepped live cards / faces / creatures for the same kind + forge + payoff
- [ ] Forge region is a designed choice (`faces`, kind, rider), not a sticker
- [ ] Play region and forge region (or On roll / On absorb) work together
- [ ] One focus; exclusive verb stays on its owner
- [ ] Touches roll / absorb / pile / forge / yield / overload
- [ ] Window × feel checked in [`docs/MECHANIC_ARCHETYPES.md`](../../../docs/MECHANIC_ARCHETYPES.md)
      (do not reprint a `RETARGETED` / `ANTI` leak)
- [ ] Bridge = both identities at once, not Spend/Generate
- [ ] Generic reach ≠ Support-colored ≠ ninth attribute
- [ ] Missing vocabulary → proving-card brief, not a skipped hole
