# 016 STATUS — Attribute pile-up

Living checklist for [`016-attribute-pile-up.md`](./016-attribute-pile-up.md).
Update this file when a phase lands or a catalogue row converts / defers.

**Branch:** `feat/attribute-pile-up`  
**Goal:** Full conversion. **Cadence:** ship playable faces + rituals + creatures
first (Phases 1–5); equipment / overload / pack-feed tracked as Phase 6 so we
keep flexibility without silent empty effects.

**Content handoff:** [`016-content-migration.md`](./016-content-migration.md)
(design notes for Phases 3–6; written while engine Phases 1–2 land).

---

## Phase checklist

| Phase | Owner | Status | Notes |
|---|---|---|---|
| 0 Spec + OPEN_DESIGN | parent | **done** | Spec 016 + STATUS + OPEN_DESIGN SUPERSEDED/DECIDED |
| 1 Engine core (pile, bank absorb, attacks) | engine-developer | **done** | `attributePool`; bank absorb; attack fuel from pile |
| 2 Ritual engine (`spend`, drop ritual progress) | engine-developer | **done** | `RitualRegion.spend`; Active-when vs pile; no ritual absorb |
| 3 Faces content (On absorb = bank) | card-designer | **done** | Pack Share → Generate; absorber `source-creature` retargets; Hexbrand/Nightwell pile print |
| 4 Rituals content (Active-when + Spend) | card-designer | **done** | Instant/reaction spend = Active-when; continuous gate-only; Paradox none |
| 5 Creatures content | card-designer | **done** | Attack pile fuel; standing `on-absorb` → `absorberRelation: "ally"` |
| 6 Equipment / overload / pack-feed | card-designer | **done** | Standing on-absorb → `ally`; Share/Den pile rewrite; overloads verified |
| 7 Match UI | match-ui | **done** | Seat pile under face cards (bottom half); rolled attrs auto-bank; Shield needs creature |

---

## Phase 6 park list (equipment / overload / pack-feed)

Convert or explicitly DEFER — never leave wired On absorb that assumed
creature-local attribute tokens.

### Standing `on-absorb` on tactics (equipment / continuous)

Default `absorberRelation: "self"` **no-ops** on pile bank. Convert to
`ally` (or retarget effects) — concrete ids:

- [x] `card-mirrored-rune` — On absorb Arcane: copy pool symbol (`ally`)
- [x] `card-archmages-grimoire` — On absorb Arcane/Darkness: draw+discard (`ally`)
- [x] `card-predators-claws` — On absorb Martial: optional Reposition bearer (`ally`)
- [x] `card-hunters-collar` — On absorb Wild: generate Martial (`ally`)
- [x] `card-wild-carapace` — On absorb Wild: Heal bearer (`ally`)
- [x] `card-servomotor` — On absorb Mechanical, once/turn: generate Mechanical (`ally`)
- [x] `card-umbral-brand` — On absorb Darkness, once/turn: Strike 1 (`ally`)
- [x] `card-warding-charm` — On absorb, once/turn: Mark Shield bearer (`ally`)
- [x] `card-grave-whisper` — On absorb Darkness, once/turn: Mill 1 (`ally`)
- [x] `card-venom-font` — On absorb Toxin: Mark Toxin (`ally`)
- [x] `card-den-share` — On absorb Wild, once/turn: Empower another ally (`ally`)
- [x] Foundry / Pack Law — Phase 4 (`absorberRelation: "ally"`)

### Overload `onAbsorb` regions

Face/overload path still fires on bank — review print / creature-local riders:

- [x] `card-mutant-spores`, `card-wild-echo`, `card-rust`, `card-ratchet` — no `source-creature`; pile-safe
- [x] `card-transmission`, `card-ichor-sheath` — no `source-creature`; pile-safe

### Pack feeding / token move effects

- [x] `card-share-the-kill` — rewritten to `[Drain 1]` (life transfer)
- [x] `card-den-share` — rewritten to `[Frenzy]` another allied creature
- [x] Pack Share face — Phase 3 `[Generate 1 Wild]` on absorb
- [x] Engine: `transfer` / `copy` stubs **removed**; Wild exclusive is `[Frenzy]`
  (`grant-extra-attack`) — Instinct, Pounce, Den Share

See also `docs/DEFERRED_CATALOGUE.md` § Attribute pile-up Phase 6.

---

## Catalogue conversion ticks

### Faces (Phase 3)

Tick when print + `onAbsorb` data match pile banking (no creature-local fuel).

- [x] Naturals + Shield (no onAbsorb — footer still correct)
- [x] Named synthetics with `onAbsorb` (~41) — pile-safe targets / print
- [x] Pack Share → `On absorb: [Generate 1 Wild]` (pack-feed retired)

### Rituals (Phase 4)

| Ritual | Active-when | Spend on activate? | Status |
|---|---|---|---|
| Runic Nullification | Arcane×2 | yes (= gate) | **done** |
| Living Library | Arcane×2 | yes (= gate) | **done** |
| Great Contamination | Corruption×2 | yes (= gate) | **done** |
| Extermination | Corruption×3 | yes (= gate) | **done** |
| Eternal Darkness | Darkness×2 | yes (= gate) | **done** |
| Assembly Line | Mechanical×2 | yes (= gate) | **done** |
| Call to Arms | Martial×2 | yes (= gate) | **done** |
| Virulent Rite | Toxin×2 | yes (= gate) | **done** |
| Rift Collapse | Arcane+Darkness | yes (= gate) | **done** |
| Foundry | Mechanical×2 | no (standing On absorb) | **done** |
| Pack Law | Wild×2 | no (standing On absorb) | **done** |
| Serrated Stinger | Wild+Toxin | no (standing) | **done** |
| Abyssal Sacrifice | Arcane+Darkness | no (standing) | **done** |
| Clockwork | Mechanical×1 | no (standing) | **done** |
| Battle Hymn | Martial×2 | no (standing) | **done** |
| Slow Burn | Toxin×2 | no (standing) | **done** |
| Smolder | Corruption×2 | no (standing) | **done** |
| Paradox | none | none | **done** |

Print: `[Active when]` / `[Spend]` via `formatEffectRegion` + `docs/KEYWORDS.md`.

### Creatures (Phase 5)

- [x] All attack `requires` / `discards` validated against pile semantics
- [x] Standing `on-absorb` → `absorberRelation: "ally"` (Void Summoner, Prism
  Herald, Cogwork Driver, Lens Choir, Nightbound Adept, Servo Assembly, Ichor
  Hydra); Nightbound / Siphon print → attribute pile
- [x] Spec `003` notes updated

---

## Docs touch list

| Doc | When |
|---|---|
| `docs/RULEBOOK.md` | Phase 1–2 (same change as engine) |
| `docs/KEYWORDS.md` | Phase 1 Absorb + Phase 4 `[Spend]` |
| `docs/OPEN_DESIGN.md` | Phase 0 (SUPERSEDED + DECIDED) |
| `docs/specs/002`, `003`, `004` | As content phases land |
| `docs/DEFERRED_CATALOGUE.md` | Phase 6 parks |

---

## Playtest gate

Builtin loadouts must typecheck and play after **Phase 5**. Phase 6 catalogue
conversion is **done** (no silent creature-token transfer/copy on printed cards).
