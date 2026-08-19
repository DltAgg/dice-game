# Agent prompt — Asymmetric start (constructed opening dice)

Paste-ready brief for a parallel agent in this worktree. Do not implement
Energy surcharge, forge-riders, or a full tactics rebalance here.

---

# Task: Asymmetric start — construct opening dice in deckbuilding; face deck is the mid-game swap pool

You are in the Dice Skirmish repo. Read first:

- `AGENTS.md`, `TOOLS.md`, `docs/ARCHITECTURE.md`
- `docs/OPEN_DESIGN.md` — especially **Composition of the starting dice**,
  **Attributes reachable only by forging**, **Face deck and tactics deck are
  separate**, ledger XOR
- Bible §§9–13, §35 (simple opening engines → later specialization)
- `docs/specs/004-face-cards.md`, `006-deck-persistence.md`, `007-peerjs.md`
- `.cursor/skills/develop-engine/SKILL.md`
- `.cursor/skills/match-ui/SKILL.md`
- `.cursor/agents/deck-designer.md` (builtin loadouts)
- `.cursor/rules/engine-purity.mdc`

Today both seats open with identical dice (`STARTING_DIE_SYMBOLS`: Martial,
Wild, Arcane, Luminar, Shield, Shield). The 12-card face deck is only a
**forge pool**. Playtests then spend many turns forging just to *become* a
deck. This task makes **engine identity a deckbuilding choice** and keeps the
face deck as **in-match diversity** (swap / forge from leftover pool).

Delegate:

| Layer | Owner |
|---|---|
| Loadout shape, `validateLoadout`, `createMatch`, face ledger, forge eligibility | **engine-developer** (`src/game` only) |
| Deck builder dice painter, saved-deck schema, lobby/Play, protocol loadout JSON | **match-ui** (no second rules engine) |
| Builtin Aggro / Control / Tempo / Combo Mechanical opening layouts + leftover pools | **deck-designer** |
| New face print | **card-designer** only if a proving face is missing — do not author a catalogue pass |

Do not commit unless the user asks. DoD: `npm run typecheck && npm test && npm run lint`.

---

## Out of scope

- Energy surcharge / split header costs
- Forge-rider negate split
- Removing draw-on-forge
- Same-turn absorb → attack
- Stun; push / enemy move
- Rebalancing all tactics/rituals (only fix cards that become illegal or
  whose forge region cannot name a pool face the new builtins actually pack)
- “Fixing” first-player win rate (`OPEN_DESIGN`) in this change

---

## Design intent (non-negotiable)

1. **Deckbuilding includes two dice.** Each player chooses the 6 faces on
   each of their 2d6 **before** the match, as part of the loadout (alongside
   squad + tactics + face deck).
2. **The face deck is the mid-game option pool.** Cards in the face deck that
   are **not** sitting on the opening dice start in `facePool`. Forging /
   `forge-faces` still installs from that pool (or copy — see below). That is
   how engines **diverge further** during play, not how they get a first
   identity.
3. **Matches must still open as simple engines** (bible §35.1–2). Constructed
   dice are not allowed to be two fully-synth on-roll engines. Constraints
   below are the replacement for “everyone shares the same bland dice.”
4. **Prototype assumptions stay labelled** in `OPEN_DESIGN.md` (`DECIDED` for
   the model; `ASSUMED` only for numeric caps you cannot prove from the bible).

Supersede (do not leave contradictory DECIDED text):

- Identical `STARTING_DIE_SYMBOLS` for all seats
- “Toxin / Mechanical / Corruption / Darkness reachable **only** by forging”
  — those attributes may appear on **opening** dice if the player put legal
  named specials there (and paid for them with the face deck; see ledger)
- “Starting naturals sit outside the 12 and nothing about opening dice varies”

Keep:

- 2 dice, 6 slots, max 4 same attribute per **die** (bible §9.1)
- Face card in pool **XOR** installed (bible §12)
- Opponent-die forges still use the **forger’s** pool; `faceCardOwnerId` stays
  the forger
- Tactics 50–60 / ≤4 copies; squad of 3
- Shield is untyped, not an attribute, never `[Requires]`

---

## Recommended model (implement this unless a labelled OPEN blocks you)

### Loadout

```ts
// conceptual — names yours, keep FaceCardId[]
startingDice: readonly [
  readonly [FaceCardId, FaceCardId, FaceCardId, FaceCardId, FaceCardId, FaceCardId],
  readonly [FaceCardId, FaceCardId, FaceCardId, FaceCardId, FaceCardId, FaceCardId],
];
faceDeck: readonly FaceCardId[]; // ≤ faceDeckMaxCards, ≤3 per attribute
```

`PlayerSetup` / `LoadoutInput` / `SavedDeck` / PeerJS loadout message all
carry `startingDice`. Bump `DECK_SCHEMA_VERSION` (currently 1). Unknown
versions still refused. Migrate or refuse old saves without layouts; do not
silently fill `STARTING_DIE_SYMBOLS` for new games once this ships — tests
and builtins must pass explicit layouts. A **dev/test helper** may still
expand the old six-symbol layout into FaceCardIds for engine tests.

### Two construction palettes

**A. Basics (do not consume the face deck):** dual-kind **naturals** (Martial,
Wild, Arcane, Luminar) and **Shield**. Any number of opening slots may use
these, subject to the 4-per-attribute-per-die cap (Shield is not an
attribute). Basics may appear on opening dice without being listed in
`faceDeck`.

**B. Named specials (consume the face deck):** a synthetic (or any
non-basic) on an opening slot **must** be an id present in `faceDeck`. At
`createMatch`, that card starts **installed** (not in `facePool`). Ledger:
one face-deck row cannot be both pooled and installed.

If `faceDeck` is unique ids (today: a list of up to 12 ids, duplicates only
limited by per-attribute count): **you cannot start with Crush and also
have Crush in the pool** unless the deck list contains two Crush ids. Keep
that unless you explicitly add a copies-per-face-id rule — do not invent
copies without documenting it. Prefer **unique ids** still: choosing Crush
as an opening face means Crush is **not** a mid-game pool option; you swap
**other** specials in later. That is the diversity the user asked for.

### Match start

- Build each seat’s dice from `startingDice` (not `STARTING_DIE_SYMBOLS`).
- `facePool` = `faceDeck` minus every id currently installed on **that
  player’s** opening dice (installed copies they own). Opponent dice never
  steal your pool at setup.
- Overloads start empty. Stay/forge-lock: if an opening face has
  `stayPolicy` (Heritage / Pestilent Plague), apply the same slot flags as a
  normal install would at match start (ASSUMED: lock remaining = catalogue
  turns, as if just installed). Tests required.

### Mid-game swap (unchanged action, new inventory)

`FORGE_CARD` / `forge-faces` still replace a slot using the forger’s pool
(or copy). The **pool is whatever they did not pre-install**. That is the
only intended mid-game diversity valve.

**Copy-already-installed (bible §13):** KEEP, but it interacts with
constructed starts (you could stamp an opening Crush across a die without
the pool).

ASSUMED (implement and label): copy is still legal. Soften explosion via
**opening-synth caps** below, not by deleting §13. If tests show opening
Crush + copy is absurd, stop and ask before changing copy; do not silently
delete it.

### Opening-engine caps (ASSUMED — put numbers in `GameRulesConfig`)

Bible is silent on constructed layouts. Use config, not hardcoded UI:

| Knob | Suggested default | Why |
|---|---|---|
| `startingMinShieldsPerDie` | 1 | Keep absorb-or-engine tension; Shield is the untyped baseline |
| `startingMaxSyntheticsPerPlayer` | 2 | Across both dice; rest must be basics. Stops a 12-synth opener |
| `startingMaxSyntheticsPerDie` | 1 | Spread identity; second die stays mostly natural |
| `startingMaxOnRollFacesPerDie` | 1 | Count slots whose face def has non-empty `onRoll`. Limits explosive engines |
| `maxFacesOfSameAttributePerDie` | 4 | Already DEFINED |

Refuse loadouts that break these (`validateLoadout` / `validateStartingDice`).
`createMatch` must not throw for illegal player layouts — validation returns
`LoadoutValidation` like tactics. Tests that currently `throw` inside
`validateStartingLayout` for the global constant should move to loadout
tests.

Illegal opening content:

- Natural faces of synthetic-only attributes (still no `face-natural-toxin`)
- Unknown ids; Shield forged mid-game still illegal (untyped not forgeable)
  — opening Shield is the exception for **setup only**
- Arcane Echo on an opening slot: allowed only if the loadout could forge it
  (`forgeRestriction: "echo-cards"`). ASSUMED: **opening Echo is illegal**
  unless you also want Echo in constructed starts — default **refuse Echo on
  starting dice** (it is an Echo-tactic payoff). Pool may still contain Echo
  for mid-game Echo forges
- Attribute cap per die

OPEN (do not guess if you hit it): whether Pestilent Plague / Forbidden
Heritage may be **opening** faces. Default **refuse** them on `startingDice`
(stay/lock/peel are match weapons, not a turn-0 board). They remain legal in
`faceDeck` for mid-game.

### Forge regions vs constructed dice

Tactics still forge a **kind + attribute**, naming a special from the pool.
A Martial-aggro player who opened with 3 Martial naturals still needs
**Martial specials in the leftover pool** (or copy) to forge synthetics.
Deck-designer must pack builtins so each archetype’s tactics can actually
hit the pool (don’t leave Aggro with only Corruption specials in the 12
after installing Crush on a die).

`eligibleFacesForForge` / tests that assume identical opening naturals must
be updated. Engine tests may use a helper `legacyStartingLayout()` for
minimal fixtures.

---

## Docs

`OPEN_DESIGN.md`:

- DECIDED: opening dice are per-loadout; face deck leftover = pool
- SUPERSEDED: identical starting symbols; forge-only access to Toxin/Mech/
  Corruption/Darkness
- ASSUMED table: the config caps above
- OPEN: Heritage/Plague on start (default refuse); Echo on start (default
  refuse); copy-from-opening-synth (keep §13)

Update `004`, `006` (loadout includes layouts), `002` one line if forge copy
text needs it. `createMatch` comments. `author-content/faces.md` /
`deck-designer.md` (naturals **may** go in the face deck if the player wants
mid-game **density swaps**; they are no longer “omit always because they
cannot be pooled” — pooling naturals is **in scope** for diversity: e.g.
start Shield-heavy, forge Natural Martial from pool later).

If pooling naturals requires them to appear in `faceDeck` and the 3-per-
attribute cap: a deck of 3 Natural Martial + 9 specials is legal. Opening
naturals that are **not** in the face deck do **not** count toward the 12.

---

## Implementation order

1. **Engine:** config knobs; `LoadoutInput.startingDice`; `validateStartingDice`;
   `validateLoadout`; `createMatch` builds dice + pool; ledger tests (installed
   special not in pool; leftover specials in pool; basics don’t consume deck).
   Forge still works with a non-empty leftover pool. Purity test green.
2. **Fixtures:** replace `STARTING_DIE_SYMBOLS` as the match opener; keep the
   constant as `DEFAULT_BASIC_LAYOUT` for tests/helpers only.
3. **Persistence / protocol:** `SavedDeck` + `DECK_SCHEMA_VERSION`; host/guest
   loadout in `src/networking/protocol.ts` + hostSession tests.
4. **match-ui:** Deck builder — two dice (6 slots each), click to assign
   basic vs face-deck special; live `validateLoadout` reason; show leftover
   pool. Play/lobby refuse illegal layouts. Match board: dice already differ
   at turn 1 (no rules in React).
5. **deck-designer:** each builtin (`PROTOTYPE_*`, Control, Tempo, Combo
   Mechanical) gets an opening layout that matches squad attack attributes
   **and** a leftover pool those tactics can forge. Keep ≤2 synthetics per
   player (or whatever you set). Update `src/decks/prototype.ts` snapshots
   and `loadout.test.ts`.
6. DoD. Summary: model, caps, builtin layouts (6+6 faces + remaining pool
   ids), UI/protocol notes.

---

## Tests that will break (update, don’t skip)

- `createMatch.test.ts` (identical layouts, `STARTING_DIE_SYMBOLS`)
- `loadout.test.ts` / `src/decks/validate.ts`
- `hostLoadout.test.ts` / `hostSession.test.ts`
- Any reducer test that assumes slot 0 is always Martial on both seats
- Face ledger / forge eligibility / stay-on-slot if opening Plague is
  refused (keep using `FORGE_CARD` in tests to install Plague)

Add tests:

- Two seats, different layouts, different pools
- Installing a face-deck special at setup removes it from pool
- Forging a leftover pool special still draws (if draw-on-forge still exists)
- Illegal: 3 synthetics when cap is 2; 0 shields if min is 1; Echo/Plague on
  start if refused; 5 Martial on one die
- Unique Crush cannot be both on a die and in pool

---

## Done when

- No live match uses a global identical opening layout (except an explicit
  test helper).
- Loadout = squad + tactics + **startingDice** + faceDeck.
- Mid-game forge inventory is the **uninstalled** face-deck remainder.
- Builtins are legal and archetypal (Aggro can attack on turn 3-ish without
  forging a first identity; Control/Corruption still have pool tools).
- Deck builder can construct dice and see pool leftovers.
- OPEN_DESIGN + 004/006 match the code. DoD green.
