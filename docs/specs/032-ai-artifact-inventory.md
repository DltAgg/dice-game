# 032 — AI artifact inventory

Status: **ACCEPTED**. The user accepted every proposed disposition. Delete rows are removed. Rewrite and decompose rows now teach `docs/GAME_STATE.md`, or they no longer carry the old rules. Use-as-is rows are unchanged.

This spec lists AI, routing, and spec artifacts and proposes what should happen
to each one after the pivot to a 3v3 tag fighter. It does not rewrite them
and it does not delete them.

## Intent

Record, for every file in the inventory glob, the job the file claims, which
game model its instructions teach, and one proposed disposition. A later
design and task pass (specs 033 and 034) is what would change those files.

The comparison baseline is `docs/GAME_STATE.md`. `docs/RULEBOOK.md` and
`docs/KEYWORDS.md` now follow that file. A row that says a file teaches
forging, rituals, overloads, or pile fuel is describing that file, not the
current rulebook.

## Why a separate spec

Spec 031 owns disagreements among the game documents. Spec 033 will define
how rewrites happen, including how keyword enforcement is written into
prompts. Spec 034 will suggest new artifacts. Those passes need a complete
list of existing files and a proposed disposition for each one before anyone
edits them. Mixing that list into 031 would turn a canon question into a
file-deletion question.

## Depends on

Spec 031. The source file exists: `docs/GAME_STATE.md`. It does not replace `docs/RULEBOOK.md`. Suggestions A, B, and C are discarded. Spec 030 is not the source. This inventory does not re-classify its rows. The user accepted every proposed disposition. The earlier block “which document is canon” is closed by spec 031.

## In scope / Out of scope

In scope:

- Every file matched by the glob below. One row each. No invented paths.
- A proposed disposition and a blocked flag.
- A flag on every row that talks about card text, effects, print, or
  keywords. The flag records a requirement that is already decided. It does
  not design the check.

Out of scope:

- `docs/RULEBOOK.md`, `docs/KEYWORDS.md`, `docs/OPEN_DESIGN.md`,
  `docs/MECHANIC_ARCHETYPES.md`, `docs/DEFERRED_CATALOGUE.md`, and
  `docs/ARCHITECTURE.md` as rows. They are game documents under spec 031.
  They are cited only as the baseline this inventory was told not to
  override.
- Design, task breakdown, prompt rewrites, and deletions.
- Resolving which of those game documents wins when they disagree.

Glob (every file below is a row):

- `.cursor/agents/*.md`
- `.cursor/skills/**/*.md`
- `.cursor/rules/*.mdc`
- `AGENTS.md`
- `TOOLS.md`
- `README.md`
- `docs/AGENT_PROMPT.md`
- `docs/specs/*.md` (includes `docs/specs/016-attribute-pile-up.STATUS.md`
  and `docs/specs/_TEMPLATE.md`)

## Requirements

1. Dispositions in this spec are proposals. Accepting or overriding them is
   a later decision. Nothing in this spec authorizes an edit.
2. Exactly one proposed disposition per file, from this set:
   - **delete** — the file’s entire job is the abandoned game, or the file
     is a one-off prompt for a finished pile-era task. If any part is still
     a live concern (engine purity, module budget, networking, tests, or
     another concern that does not depend on the abandoned rules), delete
     is not the proposal.
   - **rewrite** — the same job is still needed, and the instructions
     describe the wrong game or the wrong card model, or they instruct card
     text without enforcing current print.
   - **use-as-is** — the job and the instructions already match a concern
     that does not depend on the abandoned rules, and they do not teach
     abandoned card text. Uncertainty is not use-as-is.
   - **decompose** — the file mixes a still-valid subset and an abandoned
     subset. The row names both subsets. It does not say how to split the
     file.
3. **Keyword enforcement (normative, already decided).** Whenever an
   artifact deals with card text or card effects, it must enforce the
   keyword glossary in `docs/KEYWORDS.md` (current print), and it must not
   let authors copy leftover keywords or skip keywords that are actually in
   use. This spec does not design that mechanism. Spec 033 owns the rewrite
   requirements. Here the requirement is a flag: every such artifact is
   proposed **rewrite** or **decompose**, and its id is listed under “Rows
   that touch card text or effects.” Proposed **delete** rows are not on
   that list; if a later decision keeps them, they are not authoring
   sources.
4. The canon choice among the old game documents is closed. The user accepted
   every disposition. Delete rows are removed. Rewrite and decompose rows
   wait for spec 033. Use-as-is rows stay as they are.
5. README play and status prose was updated in spec 031. This spec still
   gives `README.md` one row, because the file also routes specialists.
6. Specs are inventory rows because the user included them in the cleanup.
   A spec is not canon for this inventory. Pointing at spec 030, or at a
   spec the file itself marks obsolete, is evidence of what the file
   teaches, not a ruling.

## Inventory

Kind is one of: agent, skill, skill-note, rule, routing, command-doc, spec,
one-off-prompt.

Game model is what the file teaches: tag fighter in the sense of the
KEYWORDS current-print section, pile skirmish in the sense of RULEBOOK
forging / rituals / overloads, a mix of those, or neither (process only).

### Agents

| ID | Path | Kind | Job it claims | Game model it teaches | Proposed disposition | Status | Why |
|---|---|---|---|---|---|---|---|
| A01 | `.cursor/agents/card-designer.md` | agent | Place a request on a die, Fighter, Response, Modify, Meter, Tag, or Assist, then author one JSON file | Mix. Mission and hard rules match KEYWORDS current print (Response / Modify, no pile fuel, no Shield resource, no defensive faces). It also says read RULEBOOK for shipped play and satisfy a leftover `forge` field | rewrite | accepted | Rewritten. The source is `docs/GAME_STATE.md`. Print is read from the whole glossary before effect data. Spec 030 does not win when `design.md` still names it |
| A02 | `.cursor/agents/deck-designer.md` | agent | Build one shared deck for three Fighters; critique orphans and play-check versus construction ban | Mix. List plan matches current print. It also says fill `faceDeck` / `startingDice` so the validator passes, and it treats RULEBOOK as loadout wording | rewrite | accepted | Shared-deck job is still needed. Face-deck filler and RULEBOOK loadout wording are the old construction model, and card-layer critique is print work |
| A03 | `.cursor/agents/engine-developer.md` | agent | Implement pure `src/server` rules: hooks, effects, reducer, resolution, proving cards | Mix. Pile banking is called obsolete and proving cards are pointed at KEYWORDS, but the phase text is ready rituals, Shield absorb, and reaction-type `[Prevent]`, and the layout still routes absorb, Overcharge, and spec 016 | decompose | accepted | Still-valid subset: purity, data effects, one opcode, module budget, no silent approximations. Abandoned subset: ritual activation, Shield absorb, reaction card type, and pile-era spec routes as the way to extend rules |
| A04 | `.cursor/agents/match-ui.md` | agent | Lobby, board, deck builder, stores, and PeerJS adapters; no rules in the UI | Mix. Host authority and “do not reimplement rules” do not depend on the pile. The mission board is roll, absorb, attack / play / forge / ritual, and the builder is tactics plus faces | decompose | accepted | Still-valid subset: Zustand to `advance()`, seat gate, host authority. Abandoned subset: the pile action surface and the tactics / face-deck builder |
| A05 | `.cursor/agents/post-playtest.md` | agent | Debrief a session into `MECHANIC_ARCHETYPES.md` and briefs; do not implement | Mix. Windows named are Simple Action, Technique, Response, Modify, Assist, Tag, and it forbids restoring pile card types. Metrics authority is still play-versus-forge, and the workflow greps attack fuel | decompose | accepted | Still-valid subset: debrief and handoff without editing catalogues. Abandoned subset: forge-mix and attack-fuel as how a session is scored. Print briefs are keyword work |
| A06 | `.cursor/agents/prompt-engineer.md` | agent | Create or tune agents, skills, rules, and routing docs; no game code | Neither (process) | use-as-is | accepted | Interaction workflow only. It names other specialists and does not teach card text, keywords, or pile play |

### Skills

| ID | Path | Kind | Job it claims | Game model it teaches | Proposed disposition | Status | Why |
|---|---|---|---|---|---|---|---|
| S01 | `.cursor/skills/analyze-match-metrics/SKILL.md` | skill | Read a metrics export for pace, stall, and lethality | Mix. The description diagnoses the pile-only game (forge, Overcharge, unpaid attacks, Shield). A later paragraph says not to brief new pile fuel and points at spec 030 | rewrite | accepted | The observer job is still needed. The diagnosis frame is RULEBOOK forging and Overcharge, which is effect vocabulary a later prompt could copy |
| S02 | `.cursor/skills/author-content/SKILL.md` | skill | Design then author Fighters, named faces, Response cards, and Modify cards | Mix. Hard rules match KEYWORDS current print. It also says satisfy leftover `forge`, `attacks`, and `face-natural\|synthetic\|untyped-` ids, and it points at RULEBOOK for shipped play | rewrite | accepted | Rewritten. The source is `docs/GAME_STATE.md`. The glossary is read before print. A schema `forge` or `attacks` field is satisfied and is not the design |
| S03 | `.cursor/skills/author-interactions/SKILL.md` | skill | Write and tune agents, skills, rules, and TOOLS.md | Mix. Most of the file is process. The content-terminology section states Die, Fighter, Response, Modify, Meter, Tag, Assist and forbids pile card types | rewrite | accepted | The tuning job is still needed. That terminology block is card-model instruction and does not enforce current-print keywords versus leftover ones |
| S04 | `.cursor/skills/develop-engine/SKILL.md` | skill | Extend effect vocabulary, reducer, resolution, phases, and tests | Mix. Proving cards are told to follow Response / Modify and KEYWORDS. The phases section is auto-absorb, Shield on a creature, forges, Overcharge, and ready rituals, matching RULEBOOK | decompose | accepted | Still-valid subset: purity, data opcodes, failures, host boundary. Abandoned subset: the actions window and the absorb / Overcharge layout as the engine to extend |
| S05 | `.cursor/skills/implement-hooks/SKILL.md` | skill | Add standing trigger hooks as shared events plus catalogue filters | Mix. Shared-event rules are process. `on-absorb` context is pile banking versus Shield on a creature, and hosts walked include equipment and continuous rituals, matching RULEBOOK | decompose | accepted | Still-valid subset: one hook per rules event, filters on data, no functions. Abandoned subset: equipment / ritual hosts and pile-bank absorb context |
| S06 | `.cursor/skills/match-ui/SKILL.md` | skill | Edit MatchBoard, lobby, deck UI, stores, and PeerJS from the client | Mix. Dispatch and seat-gating do not depend on the pile. The phase bar is “on the pile strip,” and the spec list is the pile-era board specs | decompose | accepted | Still-valid subset: no second rules engine, host and seat gate. Abandoned subset: pile-strip board and those spec pointers as the UI contract |
| S07 | `.cursor/skills/review-playtest/SKILL.md` | skill | Reconstruct a playtest, update the feel catalogue, brief owners | Mix. Owner table matches current-print layers and says not to restore the pile. Metrics input is forge versus Overcharge, and historical rows are `[Generate]` versus `[Spend]` | decompose | accepted | Still-valid subset: diagnosis and briefs, no JSON edits. Abandoned subset: forge / Overcharge / Spend as the leak frame. The brief template is print work |
| S08 | `.cursor/skills/slice-changes/SKILL.md` | skill | Break work into one layer and one owner | Tag fighter (KEYWORDS current print) for the routing table. Compose-lines name `mark` / `strip` / `modify` only | rewrite | accepted | Slicing is still needed. Print lines are keyword instruction and do not say which glossary sections are in use versus leftover, so enforcement can be skipped |
| S09 | `.cursor/skills/standardize-card-effects/SKILL.md` | skill | Turn Fighter, face, Response, and Modify print into timing-prefixed keywords and existing effects | Mix. The mapping matches KEYWORDS current print (Response effects, Modify subjects, no pile `[Spend]`). It also describes leftover `onRoll` / `onAbsorb` and equipment / overload / ritual hosts | rewrite | accepted | Standardization is still needed. The file is print instruction, and the leftover hosts are still in the procedure |

### Skill notes

| ID | Path | Kind | Job it claims | Game model it teaches | Proposed disposition | Status | Why |
|---|---|---|---|---|---|---|---|
| N01 | `.cursor/skills/author-content/creatures.md` | skill-note | How to author a Fighter JSON file | Mix. Identity matches current print (base die, Techniques, Assist). Schema section still requires an `attacks` array and tells the author to keep a smallest legal attack with no `[Requires]` / `[Spend]` | rewrite | accepted | Fighter authoring is still needed. The note instructs print and keeps a pile attack record in the recipe |
| N02 | `.cursor/skills/author-content/csv-tactics.md` | skill-note | Translate a spreadsheet row into a catalogue file; no ingest | Mix. Old columns are called the previous game and mapped to Response, Modify, face, or Fighter. It still describes pile `playCost`, Instant/Ritual, and Forge-1 stickers as the input language | rewrite | accepted | The translation job is still needed only while sheets arrive. The note is print instruction and can preserve leftover keywords if the mapping is loose |
| N03 | `.cursor/skills/author-content/design.md` | skill-note | Content model: layers, legality, lifecycle, wrong-layer redirects | Tag fighter (KEYWORDS current print). Authority order also says spec 030, then the living rulebook for what is already shipped | rewrite | accepted | The layer model matches current print and is print instruction. It still names spec 030 ahead of `docs/GAME_STATE.md` |
| N04 | `.cursor/skills/author-content/design-craft.md` | skill-note | Uniqueness and anti-patterns for a new slot | Tag fighter (KEYWORDS current print). It rejects pile-era spec tables, forge stickers, and equipment / overload / ritual regions as slots | rewrite | accepted | Craft gates match current print and still instruct print. The glossary they must enforce is the rewritten `docs/KEYWORDS.md` |
| N05 | `.cursor/skills/author-content/faces.md` | skill-note | How to author a named face | Mix. Name, type, primary, and secondary match current print, and generic defense is refused. The shape still sets `onAbsorb`, `maxOverloads`, and `forgeRestriction`, and ids may still be `face-natural-` | rewrite | accepted | Named-face authoring is still needed. The JSON recipe still teaches pile face fields |
| N06 | `.cursor/skills/author-content/tactics.md` | skill-note | How to author a Response or Modify | Mix. Types match current print. The sample JSON includes a `forge` object, the example `rulesText` is `Block.`, and lifecycle text says equipment, overload, and continuous rituals stay | rewrite | accepted | Response / Modify authoring is still needed. The sample teaches a forge object and a non-keyword rules line |
| N07 | `.cursor/skills/implement-hooks/examples.md` | skill-note | Before/after shapes for standing triggers | Pile skirmish (RULEBOOK forge / rituals / overloads). Examples are equipment on-attack, Shield strip, `generate-symbol`, and a continuous ritual with pile `activeWhen` | rewrite | accepted | Hook examples are still a useful job. These examples are the old hosts and the old effect vocabulary |
| N08 | `.cursor/skills/implement-hooks/reference.md` | skill-note | Hook catalogue and proving-card wiring | Pile skirmish (RULEBOOK forge / rituals / overloads). Hosts are equipment, creature passives, and continuous rituals. Absorb notes cite RULEBOOK §7 and Shield versus attribute bank. Proving names are pile-era cards | rewrite | accepted | A hook catalogue is still needed. This one teaches equipment, rituals, and pile absorb as the hosts |
| N09 | `.cursor/skills/standardize-card-effects/examples.md` | skill-note | Worked print shapes, marked as leftover | Pile skirmish, with a header that says not to copy them. Bodies are On absorb faces, equipment, overload, synthetic faces, and `tactic` \| `ritual` classification | rewrite | accepted | Worked examples are still needed. The bodies are leftover print, which is how authors copy keywords the header forbids |
| N10 | `.cursor/skills/standardize-card-effects/reference.md` | skill-note | Tables of existing hosts and effect members | Mix. Header says new content does not author those kinds or bank a pile. Tables are equipment and overload absorb, `arm-forge-discount`, ritual subtypes, and Instant versus Reaction | rewrite | accepted | A host table is still useful. The table is the pile effect vocabulary, including keywords current print says not to copy |

### Rules

| ID | Path | Kind | Job it claims | Game model it teaches | Proposed disposition | Status | Why |
|---|---|---|---|---|---|---|---|
| R01 | `.cursor/rules/content-catalogues.mdc` | rule | Conventions when editing Fighter, face, or card JSON | Mix. Kind rules match KEYWORDS current print. It also says schemas may still require `forge` or `attacks`, and print must use KEYWORDS without stating in-use versus leftover | rewrite | accepted | Catalogue edits are still needed. The rule is print instruction and still tells authors to satisfy forge fields |
| R02 | `.cursor/rules/dice-game-core.mdc` | rule | Always-on architecture, routing, and content-model constraints | Mix. Routing and purity do not name a board. The content-model bullets match KEYWORDS current print and also name RULEBOOK as shipped play, plus a spec index that includes pile-era specs | decompose | accepted | Still-valid subset: layer split, `reduce()` only, slice, DoD, specialist routing. Card-text subset: keyword and card-type hard rules and the spec index |
| R03 | `.cursor/rules/engine-purity.mdc` | rule | Keep `src/server` free of I/O, UI, and networking | Neither (process) | use-as-is | accepted | Import and RNG boundary only. It does not teach card text or pile play |
| R04 | `.cursor/rules/keywords.mdc` | rule | Use `docs/KEYWORDS.md` for print, tokens, hooks, and new mechanics | Mix. It forbids copying pile-era `[Forge 1 Synthetic …]` lines and Shield-as-resource, which matches the current-print ban. It also licenses physics keywords (`[Empower]`, `[Pierce]`, `[Reduce]`, `[Prevent]`) that the glossary’s later tables still list beside leftover rows, and it does not say to skip the leftover sections | rewrite | accepted | Rewritten. The rule reads the whole glossary, refuses the old operators, and the change is not done when print and the glossary disagree |
| R05 | `.cursor/rules/metrics-layer.mdc` | rule | Keep the match-metrics collector outside the engine | Neither (process) | use-as-is | accepted | Observer boundary only. It does not teach card text or pile actions |
| R06 | `.cursor/rules/model-routing.mdc` | rule | Which model family may implement, and which may only orchestrate | Neither (process) | use-as-is | accepted | Model-choice policy only. No game model and no card text |
| R07 | `.cursor/rules/rulebook.mdc` | rule | Update `docs/RULEBOOK.md` in the same change when play changes | Mix. The duty is “the living rulebook is how it plays.” Examples that require an edit are pile spend, absorb versus spend, and attack fuel, which match RULEBOOK. It also points keyword edits at KEYWORDS | decompose | accepted | Still-valid subset: update the living rulebook when play changes, and do not write an open question as fact. Abandoned subset: the examples treat pile spend and attack fuel as the play being documented. Keyword edits are print work |
| R08 | `.cursor/rules/scope-and-modules.mdc` | rule | Keep changes small; module budget; OOP / DRY / KISS / YAGNI | Neither for the budget. The DRY bullet teaches `[Mark]` / `[Strip]` / `[Modify]` and forbids Dose-style verbs | rewrite | accepted | Module budget is still needed. Those print sentences are keyword instruction and name only three verbs, so leftover and in-use keywords can both be missed |

### Routing and command docs

| ID | Path | Kind | Job it claims | Game model it teaches | Proposed disposition | Status | Why |
|---|---|---|---|---|---|---|---|
| G01 | `AGENTS.md` | routing | Where to start, which specialist owns which layer, hard rules for agents | Mix. Specialist table and hard rules match KEYWORDS current print (Response / Modify, no pile card types). It also says RULEBOOK is player-facing truth for shipped play, and the spec index still sends readers to pile-era specs as historical or live | decompose | accepted | Still-valid subset: specialist routing, layer split, DoD. Card-text subset: the content-model hard rules, keyword rules, and spec index. The source those rules should name is `docs/GAME_STATE.md` |
| G02 | `README.md` | routing | Project front door, including the Cursor specialists table | Mix. The opening and the status table now follow `docs/GAME_STATE.md`. The specialists table is unchanged, and the post-playtest row still points at `docs/MECHANIC_ARCHETYPES.md` | decompose | accepted | Still-valid subset: the specialists table. The post-playtest pointer still treats the old feel file as a live update target |
| C01 | `TOOLS.md` | command-doc | Commands, DoD, path map, and which skill or subagent to run | Mix. DoD and smoke steps are process. The path map says “Tactic catalogue,” content tests check forge / requirement printing and deck 40–50, and author-content is described as uniqueness / forge / dice-resonance | decompose | accepted | Still-valid subset: install, typecheck, test, lint, online smoke. Abandoned subset: tactic / forge / 40–50 descriptions. The keyword path and `cardText` test line are print work |
| P01 | `docs/AGENT_PROMPT.md` | one-off-prompt | Paste-ready brief: constructed opening dice, face deck as the mid-game forge pool | Pile skirmish (RULEBOOK forge / rituals / overloads). The task is face-deck construction, forge eligibility, and tactics that forge synthetics | delete | accepted | Removed. The face deck is not current online play |

### Specs

| ID | Path | Kind | Job it claims | Game model it teaches | Proposed disposition | Status | Why |
|---|---|---|---|---|---|---|---|
| SP001 | `docs/specs/001-vertical-slice.md` | spec | A two-player match played to the end through the pure reducer | Pile skirmish. Three creatures, two customizable dice, absorb onto creatures or rituals, `[Requires]` spend, forge, Shield tokens | decompose | accepted | Still-valid subset: a match that advances only through the reducer, with no UI in the call stack. Abandoned subset: the pile turn rules |
| SP002 | `docs/specs/002-card-layer.md` | spec | The card grammar from the tactic layout | Pile skirmish. The keyword it centers is Forge; templates are tactics with natural or synthetic forge lines and token `playCost` | rewrite | accepted | A card-layer spec is still a job. This one is the old tactic grammar and is print |
| SP003 | `docs/specs/003-creature-cards.md` | spec | Creature card grammar, passives, and attacks | Pile skirmish. Legendary win, attribute header, basic/special attacks paid with `[Requires]` / `[Spend]` from the attribute pile, absorb triggers when the owner banks | rewrite | accepted | A fighter/creature spec is still a job. This one teaches pile attacks and is print |
| SP004 | `docs/specs/004-face-cards.md` | spec | Face cards plus a separate face deck and constructed opening dice | Pile skirmish. 12-card face deck, naturals, Shield basics, forge from the leftover pool | decompose | accepted | Still-valid subset: face definitions that back die faces. Abandoned subset: the face deck, opening-dice ledger, and natural/synthetic forge rules. The catalogue tables are print |
| SP005 | `docs/specs/005-local-match-ui.md` | spec | Hotseat match UI through Zustand to `advance()` | Mix. The stack diagram is process. Scope lists attribute pile, absorb / forge / activate ritual, face decks, and `replace-synthetic-face` | decompose | accepted | Still-valid subset: hotseat store, one `advance()` path, sticky errors. Abandoned subset: the pile board and forge prompts |
| SP006 | `docs/specs/006-deck-persistence.md` | spec | Validate a loadout locally and start a match from it | Pile skirmish. Tactics deck 40–50, face deck of 12, exactly one legendary, opening dice with Shield and synthetic caps | decompose | accepted | Still-valid subset: local save, schema version, validate then create match. Abandoned subset: those construction numbers and the face deck |
| SP007 | `docs/specs/007-peerjs.md` | spec | Online play where the host alone runs `advance()` | Neither (process). Loadouts are opaque seated payloads. It does not state forge, ritual, or card-type rules | use-as-is | accepted | Host authority, seats, spectators, and resync. It does not teach abandoned card text |
| SP008 | `docs/specs/008-reaction-chain.md` | spec | Last-in, first-out chain and negate | Mix. Chain order and explicit pass are a timing system. Windows listed are tactic instant/reaction, ritual place and activate, equipment attach, and overload attach; forge does not open a window | decompose | accepted | Still-valid subset: a LIFO chain and priority passes. Abandoned subset: windows and negate filters tied to those card types. This is effect text |
| SP009 | `docs/specs/009-true-prevent.md` | spec | Attack-instance prevent on the chain | Mix. `[Prevent]` cancels the next attack before Shield and HP, and grants are reaction-exclusive. Current print calls prevent an effect on a Response and says Shield is not a resource to design | rewrite | accepted | A prevent effect may still be a job. The spec teaches reaction cards and Shield-after-prevent, which is the old card model |
| SP010 | `docs/specs/010-trigger-hooks.md` | spec | Shared standing triggers for catalogue hosts | Mix. “One event, filters on data” is process. Hosts are equipment, continuous rituals, overloads, and faces; on-absorb is banking into the pile, and Shield absorb also fires | decompose | accepted | Still-valid subset: shared events and catalogue filters. Abandoned subset: those hosts and pile-bank absorb. This is effect text |
| SP011 | `docs/specs/011-token-strip-ritual-destroy.md` | spec | Drain life, and destroy rituals, equipment, and overloads | Mix. `drain-life` is a life transfer through Prevent then Shield. The rest is destroy ritual / equipment / overload, and it says piles are spent with `[Spend]`, not Strip | decompose | accepted | Still-valid subset: a life-drain effect, if that effect remains. Abandoned subset: destroying those card types and the pile-spend note. Print keywords are in the spec |
| SP012 | `docs/specs/012-deferred-vocabulary.md` | spec | Grow effect vocabulary so specs 002–004 resolve as data | Mix. “Do not fake unwired print” and “movers go through one position helper” are process. Rules are frontline, play-cost discounts on equipment and overloads, and discounts that do not apply to forge | decompose | accepted | Still-valid subset: honest structured fields and one position writer. Abandoned subset: the pile cost and forge rules it exists to implement |
| SP013 | `docs/specs/013-face-markers.md` | spec | Face markers, suppress, resource lock, and Instinct absorb | Pile skirmish. Corruption on synthetic slots, Instinct’s optional basic after absorb, Overcharge suppress, resource lock on the turn pool | rewrite | accepted | Slot state might still be a job. The spec as written is synthetic faces, absorb, and Overcharge, and it is print |
| SP014 | `docs/specs/014-match-metrics.md` | spec | An observer that records pace and exports it; no rules changes | Mix. The collector boundary is process. Idle, stall, and setup turns are defined with absorb, play, forge, and ritual | decompose | accepted | Still-valid subset: observer, no `reduce()`, export. Abandoned subset: pace flags whose meaningful actions are the pile turn |
| SP015 | `docs/specs/015-mill.md` | spec | Mill the top of a deck to the graveyard | Pile skirmish naming. The intent is “Darkness mill” of the tactics deck. The operation itself is deck to graveyard | rewrite | accepted | A mill effect can still be a job. “Darkness” and “tactics deck” are the old card layer’s attribute and deck names |
| SP016 | `docs/specs/016-attribute-pile-up.md` | spec | The persistent player attribute pile, banking, and pile gates | Pile skirmish. The header calls that system obsolete and points at RULEBOOK for current play. The rules body is the pile | delete | accepted | The file’s entire job is the attribute pile. That pile is not current play. Removed. |
| SP016a | `docs/specs/016-content-migration.md` | spec | Catalogue guidance for moving print onto the attribute pile | Pile skirmish. On absorb means banking; ritual `activeWhen` and attack `requires` / `discards` are pile gates. Header says archaeology only | delete | accepted | The entire job is pile-era catalogue migration. That pile is not current play. Removed. |
| SP016b | `docs/specs/016-attribute-pile-up.STATUS.md` | spec | Checklist that the pile shipped across engine, catalogue, and UI | Pile skirmish. Header says the checklist is archival. The status line says engine, catalogue, and UI all use the player pile | delete | accepted | The entire job is the pile rollout checklist. That pile is not current play. Removed. |
| SP017 | `docs/specs/017-layer-split.md` | spec | Split `src/server` from `src/client` without changing play | Neither (process). Rules are purity, import direction, and who calls `advance()` | use-as-is | accepted | Import and purity boundary. It names `hasLegalReactionOffer` as an existing query and does not teach reaction or ritual card text |
| SP018 | `docs/specs/018-ast-engine.md` | spec | Validate, compile, and execute effect JSON | Mix. The pipeline and “effects are data” do not depend on the pile. The opcode table includes `forge`, destroy equipment / ritual / overload, `[Silence]` on a ritual, `[Bounce]` of ritual / equipment / overload, and Shield as a Mark token | decompose | accepted | Still-valid subset: validator, compiler, executor, no functions on state. Abandoned subset: that opcode and token catalogue. The file cites KEYWORDS and is effect text |
| SP019 | `docs/specs/019-content-json.md` | spec | One JSON file per card, creature, face, and builtin loadout | Mix. One file per entity is packaging. Card rules say `type` locks the play region to effect / equipment / overload / ritual | rewrite | accepted | JSON catalogues are still needed. The type-to-region rules are the old card model and are print structure |
| SP020 | `docs/specs/020-module-split.md` | spec | Split the reducer and MatchBoard into smaller modules; behavior unchanged | Mix. The budget and facade are process. The command table is absorb, play (equip / overload / ritual), forge, Overcharge, and ritual activate | decompose | accepted | Still-valid subset: facade, file budget, no rules in UI. Abandoned subset: the command inventory that defines play as those pile actions |
| SP021 | `docs/specs/021-overcharge.md` | spec | Spend any hand card to Overcharge an attribute face | Pile skirmish. It is the master rule for forging’s alternate, generating a pip of the card’s attribute, and it cites RULEBOOK Overcharge and KEYWORDS | delete | accepted | The entire job is tactic Overcharge of attribute faces. That rule is not current play. Removed. |
| SP022 | `docs/specs/022-silence.md` | spec | `[Silence]` on an opposing creature, field ritual, or die slot | Mix. Silence is a duration on a host. Legal sources are tactic instants, ritual activate, and overload on-roll / on-absorb, and it cites RULEBOOK §14 and KEYWORDS | rewrite | accepted | A silence effect may still be a job. The spec teaches instant, ritual, and overload as the sources, which is the old card model |
| SP023 | `docs/specs/023-bounce.md` | spec | `[Bounce]` an opposing ritual, equipment, or overload to hand | Pile skirmish. Hosts are only those three types. Sources are instants, rituals, and overloads. It cites RULEBOOK §10 and KEYWORDS | delete | accepted | The entire job is bouncing ritual, equipment, and overload. Those are not current play. Removed. |
| SP024 | `docs/specs/024-desynthesize.md` | spec | `[Desynthesize]` a synthetic attribute face back to the natural identity face | Pile skirmish. The operation exists only for natural versus synthetic kinds. It cites RULEBOOK §11 and KEYWORDS | delete | accepted | The entire job is the natural/synthetic face-kind operation. That operation is not current play. Removed. |
| SP025 | `docs/specs/025-face-roll-physics.md` | spec | Inherent pips, convert Choose one, While showing, and on-roll geometry | Mix. Inherent pips and Choose one appear in the KEYWORDS glossary’s physics examples. The rules also auto-bank into the pile, stack forge yield and Overcharge, and treat Shield pips as the untyped case, matching RULEBOOK | decompose | accepted | Still-valid subset: inherent pips, convert Choose one, While showing, if those stay physics. Abandoned subset: pile banking, forge yield, Overcharge, and Shield pips. This is print |
| SP026 | `docs/specs/026-ai-playtest.md` | spec | Two headless policies play a match through `advance()` only | Mix. Layout and “policy is not rules” are process. The eval scores shields and pile | decompose | accepted | Still-valid subset: `src/ai` outside the engine, server must not import it, illegal intents do not mutate. Abandoned subset: scoring pile and shields as the position |
| SP027 | `docs/specs/027-local-vs-ai.md` | spec | Lobby Play versus AI: one human seat, one policy seat | Neither (process). It says play rules are unchanged and adds no `GameAction` | use-as-is | accepted | Store and lobby adapter only. It does not teach card text or pile actions |
| SP028 | `docs/specs/028-tag-fighter-prototype.md` | spec | First 3v3 tag prototype: Active / Reserve, bound dice, Meter, Tag, Assist | Mix. Squad shape is a tag fighter. Technique enum includes guard, dodge, counter, tag, and assist as faces; `symbol` stays attribute or shield for absorb; printed pile `[Requires]` / `[Spend]` stay unenforced | rewrite | accepted | A tag-fighter rules spec may still be a job. This one teaches defensive and Tag faces plus Shield absorb, which current print refuses, and it is not the RULEBOOK forging chapters either |
| SP029 | `docs/specs/029-fighter-combat-core.md` | spec | Named faces, primary and secondary effects, simple actions, ordered techniques, generic Meter | Mix. It defers the act loop to spec 030 and withdraws face consumption. Face types still include `guard` and `tag`, and the older `Technique` enum still includes guard | rewrite | accepted | Named faces and techniques are still a job. Guard and tag as face types contradict KEYWORDS current print. Several rows are labelled assumed against OPEN_DESIGN |
| SP030 | `docs/specs/030-offensive-control.md` | spec | Offensive control: dice as inputs, Response and Modify, one Meter pool, Tag and Assist | Tag fighter (KEYWORDS current print) for vocabulary and card kinds. It also disagrees with spec 008 on who has priority first, and agents are told elsewhere that this DESIGN spec is the confirmed model | rewrite | accepted | The vocabulary matches current print and is card text. Spec 031 does not crown this file as the source. The source is `docs/GAME_STATE.md` |
| SPTPL | `docs/specs/_TEMPLATE.md` | spec | Blank feature spec: intent, rules, state, actions, acceptance | Mix. It says cite the bible, fold player wording into RULEBOOK, and put print in KEYWORDS, preferring `[Mark N X]` over a new verb | rewrite | accepted | A spec template is still needed. Spec 031 Q16 says bible citations are not filled in. The template should point at `docs/GAME_STATE.md`, `docs/RULEBOOK.md`, and `docs/KEYWORDS.md` |

## Counts

| Proposed disposition | Count |
|---|---|
| delete | 7 |
| rewrite | 31 |
| use-as-is | 7 |
| decompose | 25 |
| accepted | 70 |

Row total: 70. Every row is accepted. The 7 delete rows are removed from the tree. The 31 rewrite rows and 25 decompose rows are the spec 033 set. The 7 use-as-is rows stay.

Delete ids: P01, SP016, SP016a, SP016b, SP021, SP023, SP024.

Use-as-is ids: A06, R03, R05, R06, SP007, SP017, SP027.

## Rows that touch card text or effects

These ids are proposed rewrite or decompose so keyword enforcement cannot be
skipped. Spec 033 requires a fail-closed outcome and leaves the mechanism to
a later design. This list does not contain new prompt text.

Agents: A01, A02, A03, A04, A05.

Skills: S01, S02, S03, S04, S05, S06, S07, S08, S09.

Skill notes: N01, N02, N03, N04, N05, N06, N07, N08, N09, N10.

Rules: R01, R02, R04, R07, R08.

Routing and command docs: G01, G02, C01.

Specs: SP001, SP002, SP003, SP004, SP005, SP006, SP008, SP009, SP010, SP011,
SP012, SP013, SP014, SP015, SP018, SP019, SP020, SP022, SP025, SP026, SP028,
SP029, SP030, SPTPL.

Not on this list: A06, R03, R05, R06, SP007, SP017, SP027 (process only), and
the proposed-delete rows P01, SP016, SP016a, SP016b, SP021, SP023, SP024.
Those delete rows do teach pile print. They are omitted here because the
proposal is to remove the job, not to rewrite it. If they are kept, they are
not authoring sources. Those seven files are removed.

## Decisions

**Historical specs leave the tree.** After a disposition is accepted, a spec
that is historical is removed from `docs/specs`. It is not kept as a labeled
archive. Leaving the file in the tree would let it be used as a source.

**Accepted table.** The user accepted every proposed disposition. These files
are removed: `docs/AGENT_PROMPT.md`, `docs/specs/016-attribute-pile-up.md`,
`docs/specs/016-content-migration.md`, `docs/specs/016-attribute-pile-up.STATUS.md`,
`docs/specs/021-overcharge.md`, `docs/specs/023-bounce.md`, and
`docs/specs/024-desynthesize.md`. Spec 031 Q18 had kept the agent-prompt stub
until this acceptance. Rewrite and decompose rows are not edited here.

## Open questions

These are the questions this inventory cannot answer. No recommended answer.

1. Answered. Historical specs leave the tree. See **Decisions**.
2. Answered in spec 031. The source is `docs/GAME_STATE.md`. `docs/RULEBOOK.md`
   and `docs/KEYWORDS.md` follow it. Spec 030 is not the source. This
   inventory does not re-ask how forging, rituals, overloads, absorb, or
   Shield play.
3. Answered in spec 031 Q16. No bible file is in the repository. Those
   citations are not a player rule and are not filled in.
4. Answered in spec 031. `README.md` play and status prose now follows
   `docs/GAME_STATE.md`. The specialists table is unchanged.

## Acceptance criteria

For a later design and task pass:

- The user accepted every proposed disposition.
- No file from the glob is missing a disposition.
- Delete rows are removed. Rewrite and decompose rows are not edited here.
- Keyword-enforcement mechanism and prompt text are still absent here and
  still belong to spec 033.
- New artifact suggestions are still absent here and still belong to spec
  034.
- Spec 031’s source is recorded here as `docs/GAME_STATE.md`.

## Not in this spec

No design. No task list. No rewrites of the rewrite or decompose rows. No new
agents, skills, rules, or specs besides this document. No edits to game documents.
