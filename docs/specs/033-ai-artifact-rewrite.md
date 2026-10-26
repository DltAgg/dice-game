# 033 — AI artifact rewrite

Status: **DRAFT requirements**. Spec 032’s table is accepted. The rewrite set is every rewrite or decompose row. Spec 031’s source is `docs/GAME_STATE.md`. A rewrite teaches that game. The accepted spec 032 rewrite and decompose rows now point at `docs/GAME_STATE.md`, or the old rules text has been removed from the file. Use-as-is rows are unchanged.

This file is requirements only. It does not choose a mechanism, name tasks, or replace any prompt.

## Intent

After an inventory, every AI artifact proposed as rewrite or decompose is rewritten so later implementation has a correct AI base.

The game keeps using keywords the way it did before the pivot. The user could not recreate all keywords, or remove unused ones, after the pivot. The rewrite makes that failure hard to repeat: any artifact that deals with card text or card effects enforces [`docs/KEYWORDS.md`](../KEYWORDS.md), and a change whose glossary and print disagree is not done.

## Why a separate spec

Spec 032 records what is on disk and a proposed disposition per row. Spec 031 holds the canon questions where the living docs disagree. This spec states the outcomes a rewrite has to hit. It does not inventory files, decide canon, or author the replacement text. Specs 031 and 032 were drafted in parallel with this file, so this spec cites no inventory ids.

## Depends on

- **Spec 032** — [`docs/specs/032-ai-artifact-inventory.md`](032-ai-artifact-inventory.md) is on disk. This spec still cites no inventory ids, because the two drafts were written in parallel. The rewrite set is every row whose disposition is rewrite or decompose, after the user confirms or overrides that table.
- **Spec 031** — [`docs/specs/031-docs-canon-cleanup.md`](031-docs-canon-cleanup.md). Q1 is answered: one new file whose facts come from `src/server`. Where a rewrite would change which game a prompt teaches, it teaches that file once the file exists. This spec does not write that file and does not fill server gaps.
- **Keyword rule (already decided).** [`docs/KEYWORDS.md`](../KEYWORDS.md) and [`.cursor/rules/keywords.mdc`](../../.cursor/rules/keywords.mdc). The open question below is which region of the glossary is the allowed source. It is not whether keywords are enforced.
- **Allowed-region answer.** Keyword-touching rewrites that would add or drop operators from an artifact’s instructions are blocked on the open question in this spec as well as on 032 and, where the game would change, on 031.

## In scope / Out of scope

**In scope**

- Requirements for rewriting AI artifacts whose spec 032 disposition is rewrite or decompose: agents under `.cursor/agents/`, skills under `.cursor/skills/`, rules under `.cursor/rules/`, and the routing sections of `AGENTS.md`, `TOOLS.md`, and `README.md`.
- The keyword gate below, including gaps already visible in those files and in `docs/KEYWORDS.md`.
- Constraints the rewritten text must still carry when the concern is still in the file.

**Out of scope**

- Writing or editing the inventory, spec 031, the glossary, the rulebook, agent prompts, skills, or rules in this step.
- Game code, catalogue JSON, reducer behavior, and UI.
- Choosing the fail-closed mechanism (test, checklist, linter, or anything else).
- A task list or a sample of replacement prompt text.

## Requirements

### 1. Rewrite set

1.1. The rewrite set is every row in `docs/specs/032-ai-artifact-inventory.md` whose proposed disposition is **rewrite** or **decompose**, after the user confirms that table or names an override.

1.2. This spec defines no ids of its own. If a row is absent from the confirmed 032 table, it is not in the set, including files named later in this spec as evidence of gaps.

1.3. A gap named below is an input to rewriting a row only when that row is in the confirmed set. The outcome still applies to every in-set artifact that deals with card text or card effects, whether or not this spec used it as an example.

### 2. One artifact per change

2.1. Once implementation starts, each change rewrites one artifact. This spec does not require one commit that rewrites the whole set. Later tasks slice the work.

2.2. Routing lockstep that already exists for a rename (the same name updated in the agent file and the routing docs that point at it) stays a property of that one rename. It is not permission to rewrite every specialist in one change.

### 3. Verbatim user wording

3.1. When the user supplies wording, the rewritten artifact’s instructions keep that wording verbatim in the record of the request and in any print or persona text the user supplied.

3.2. A finished new or edited card does not ship print that silently replaces the user’s words with a paraphrase. If the supplied words are outside the allowed glossary region, the card is not finished as authored content, and the supplied words remain intact.

3.3. Existing coverage is narrower than 3.1 and is an input, not a finished state: `.cursor/skills/author-interactions/SKILL.md` requires verbatim wording for a persona or a rule; `.cursor/agents/card-designer.md` carries user print as “Print authority”; `.cursor/skills/standardize-card-effects/SKILL.md` says to capture print authority and not improve the meaning. The outcome applies to every in-set artifact that receives user wording, including card print.

### 4. Ownership stays with the specialists that already exist

4.1. The rewrite adds no specialist that re-owns cards, the engine, the match UI, or loadouts.

4.2. The specialists already on disk stay the owners they already are:

| Path | Owns |
|---|---|
| `.cursor/agents/card-designer.md` | Catalogue placement and typed content for Fighters, named faces, Responses, and Modifies |
| `.cursor/agents/engine-developer.md` | Pure rules in `src/server` |
| `.cursor/agents/match-ui.md` | Lobby, board, deck builder, stores, PeerJS adapters |
| `.cursor/agents/deck-designer.md` | Shared deck lists |
| `.cursor/agents/post-playtest.md` | Playtest debrief |
| `.cursor/agents/prompt-engineer.md` | Agents, skills, rules, and routing text |

4.3. `.cursor/skills/author-interactions/SKILL.md` already lists “A new specialist that owns cards, reducer, MatchBoard, or loadouts” as an anti-pattern, and `.cursor/rules/dice-game-core.mdc` already routes human-to-AI text to prompt-engineer. A fail-closed keyword check is not a new owner of those lanes. This spec does not choose how the check runs.

### 5. Cited paths exist

5.1. Every path a rewritten artifact cites exists in the repo at the time that artifact is rewritten. A link to a missing spec, skill, or source file fails the change.

5.2. `.cursor/skills/author-interactions/SKILL.md` already forbids linking a spec or skill folder that does not exist, and `.cursor/agents/post-playtest.md` already says not to cite a spec, skill, or `src/` path that is not in the repo. The outcome applies to every in-set artifact.

### 6. No game code

6.1. The rewrite edits instructions (agents, skills, rules, routing docs). It does not add or edit game code under `src/server` or `src/client`, catalogue JSON, or schemas.

6.2. An artifact that tells an agent to update `docs/KEYWORDS.md` when that agent introduces a keyword is still an instruction. Performing that glossary edit during the rewrite program is out of scope for this spec.

### 7. Keyword gate

Applies to every in-set artifact that deals with card text, card effects, or both: authoring or editing `rulesText` or other print, effect data, proving-card print, or the glossary entry for a keyword. Artifacts that do not touch card text are under outcome 5 only.

The five outcomes are normative. The headings they refer to are the headings in `docs/KEYWORDS.md` today.

#### What the glossary and the keyword rule say today

Player-visible and agent-visible structure of `docs/KEYWORDS.md`:

| Heading | What it says about use |
|---|---|
| HTML comment above `## Keywords` (agent-only; Rules tab strips HTML comments, per `.cursor/rules/keywords.mdc`) | New content follows `docs/specs/030-offensive-control.md` and `.cursor/skills/author-content/design.md`. Reuse `[Mark]`, `[Strip]`, and `[Modify]`. Do not author from the sections marked leftover. |
| `### Current print (new Fighters, faces, and cards)` | Named-die inputs, Response and Modify, Meter, `[Replace]`, `[Tag out]`, `[Tag in]`, reuse of `[Mark N X]`, `[Strip N X]`, and `[Modify]`. Timing stays a prefix (`On roll:`, `On attack:`). Never “Whenever…”. |
| `### Leftover catalogue print (do not copy onto new content)` | `[Requires]` / `[Spend]` / `[Active when]`, `[Forge 1 Synthetic …]` and natural vs synthetic, `[Mark N Shield]` / `[Pierce]` as a Shield-resource line, Strike / Guard / Dodge / Counter as a showing face. |
| Unheaded block after that table, before `## Token operators` | Grammar / operators / physics table including `[Forge]`, `[Overcharge]`, Absorb, Retain, `[Requires]`, `[Spend]`, `[Generate N X]`, `[Negate X]`, `[Destroy X]`, `[Bounce X]`, `[Empower]`, `[Pierce]`, `[Reduce]`, `[Prevent]`, `[Silence]`, `[Convert N]`, `[Desynthesize]`. States that only Toxin may print `[Mark N Toxin]` and that the argument follows attribute exclusives. **No leftover heading.** |
| `## Token operators`, `### Mark`, `### Strip`, `### Not Mark` | Token rules, including Shield, Corruption on a synthetic face, Instant, Generate-as-pool, and attribute absorb. **No leftover heading.** |
| `## Other operators` | `[Generate]`, `[Forge]`, `[Reforge]`, `[Cross forge]`, `[Overcharge]`, `[Negate]` / Instant / Ritual, `[Destroy]` Equipment / Ritual / Overload, `[Bounce]`, `[Drain]`, and the synthetic first-forge waiver. **No leftover heading.** |
| `## Combat and turn` | Strike, Heal, Draw, Empower, Frenzy, Pierce, Reduce, Prevent, Silence, Desynthesize, Convert, Discount, Insight, Search, Recall, Mill, Reposition, Swap, Reforge, Cross forge, Stamp, Reroll, Double, Resonance (this row alone says catalogue leftover), Retain, plus attribute-exclusive sentences (Luminar, Arcane, Darkness, Mechanical, Wild). **No leftover heading.** |
| `## Grammar and timing (leftover rows included)` | Timing prefixes are still how a window is written. Rows that call Overload a card type, or that describe pile absorb, are leftover. The prefix row also lists `On absorb:`, `While showing:`, and other windows besides the two examples under Current print. |
| `## Attribute exclusives (leftover — do not copy)` | Previous attribute pie. New Fighters, faces, and cards do not use it. |
| `## Quick reference (leftover catalogue — do not copy)` | Says new print uses the Current print section, then tables both current-looking lines (`[Empower]`, `[Pierce]`, `[Reduce]`, `[Prevent]`, `[Mark N Toxin]`) and leftover lines (`[Requires]`, `[Spend]`, `[Generate]`, `[Forge 1 Synthetic …]`). |

`.cursor/rules/keywords.mdc` (always applied) today:

1. Read `docs/KEYWORDS.md` first when authoring cards, new mechanics, hooks, tokens, keywords, or other rules print.
2. Prefer an existing operator plus argument (`[Mark N X]`, `[Strip N X]`, `[Modify]`). Do not mint Dose / Envenom / Brand / Contaminate, or a verb for Block, Dodge, Counter, or Tag. Do not copy the glossary’s pile-era `[Forge 1 Synthetic …]` lines or the attribute-exclusive table onto new Fighters, faces, or cards.
3. A new token joins X on `[Mark]` / `[Strip]`. Shield is not authored as a resource.
4. Add a physics keyword (`[Empower]`, `[Pierce]`, `[Reduce]`, `[Prevent]`) only when the operation is not placing or removing a token. Those four names appear under `### Not Mark` and `## Combat and turn`, not under `### Current print`. The leftover catalogue table also lists `[Pierce]` on the Shield-resource row.
5. Timing prefixes stay prefixes. The example is `On roll: [Mark 1 Toxin].` Never “Whenever…”.
6. Same change: update `docs/KEYWORDS.md`. Map print to AST opcodes `mark`, `strip`, `modify`. New tokens are X arguments, not new opcodes. “New and edited print uses the glossary” — the file, not the Current print heading. Item 6 does not say the new keyword lands in `### Current print`, and it does not fail a change that leaves a current keyword with no current card.

`### Current print` names `[Replace]`, `[Tag out]`, `[Tag in]`, and `[Modify]`. The operator chapters do not define those four. The operator chapters name many verbs that `### Current print` does not list.

#### Outcomes

**K1. Read the glossary before print or effects.** The artifact’s instructions tell the agent to read `docs/KEYWORDS.md` before authoring or editing print or effect data.

**K2. New and edited print uses the whole glossary.** The user decided this. New keywords and edited card text may use the whole of `docs/KEYWORDS.md`, not only `### Current print`. The entire file may be rewritten so that the whole file is what card text needs for the new game version. Timing stays a prefix. The agent does not write “Whenever…”. The agent does not mint a new verb when an existing operator can carry the argument. A new token joins X on `[Mark]` / `[Strip]` and does not receive its own keyword. This spec does not perform that glossary rewrite and does not list which operators the rewritten file keeps. That list waits on spec 031’s Q1 and on the open question below.

**K3. After the glossary rewrite, the whole file is the source.** Spec 031 Q2 and Q3 remove text that solely describes an old unused version, including leftover text. The user’s glossary decision is how `docs/KEYWORDS.md` gets there: rewrite the whole file for the new game’s card text, then new and edited print uses that whole file. This spec does not say which of today’s leftover headings survive that rewrite. Until the rewrite, whether a new card may use an operator that today sits under one of these headings is the open question, not a decision. Those headings today are:

- `### Leftover catalogue print (do not copy onto new content)`
- `## Grammar and timing (leftover rows included)` — for the rows that heading itself calls leftover (Overload as a card type, pile absorb). The same heading says timing prefixes are still how a window is written; K2 still requires timing to stay a prefix.
- `## Attribute exclusives (leftover — do not copy)`
- `## Quick reference (leftover catalogue — do not copy)`

**K4. Glossary and print agree, or the work is not done.** An agent does not leave the glossary missing a keyword it just introduced. An agent does not leave a keyword in the current region that no current card uses, unless the user explicitly keeps that keyword. “Current card” is a Fighter, face, Response, or Modify that belongs to whichever model the user confirms in spec 031. A keyword that appears only on cards outside that model does not by itself justify a place in the current region.

This spec does not choose the mechanism. The later design picks a mechanism that fails closed: if the glossary and the print disagree, the work is not done. Failing closed covers both directions: a new keyword absent from the allowed region, and a keyword in the current region that no current card uses and that the user did not explicitly keep.

K4 does not require a mass rewrite of existing `rulesText`. `.cursor/rules/keywords.mdc` already says not to mass-rewrite existing `rulesText` unless asked. Agreement can be met by placing a new keyword in the allowed region, by removing an unused keyword from that region, or by an explicit user decision to keep it. It is not met by a silent mismatch.

**K5. Non-print artifacts do not grow a glossary.** Artifacts that do not touch card text (engine purity, networking, metrics, model routing, and any other in-set artifact whose job is not print or effects) must not gain a copy of the glossary tables. A one-line pointer that already sends print work to `docs/KEYWORDS.md` may stay a pointer. Match UI already says the Rules tab renders player sections of `docs/KEYWORDS.md` and not to fork a second glossary (`.cursor/agents/match-ui.md`, `.cursor/skills/match-ui/SKILL.md`). That limit stays. Telemetry names already used in `.cursor/skills/analyze-match-metrics/SKILL.md` stay telemetry names; that skill does not become a print glossary.

#### Gaps (inputs to the rewrite, not edits made here)

These are places a skill or rule can still treat non-current glossary text as authoring material. They are inputs when the owning row is in the confirmed 032 set.

1. **Unmarked middle of `docs/KEYWORDS.md`.** After `### Leftover catalogue print`, the unheaded grammar table, `## Token operators`, `## Other operators`, and `## Combat and turn` are not under a leftover heading. An instruction that says “use `docs/KEYWORDS.md`” or “use the glossary” can treat `[Forge]`, `[Generate]`, `[Requires]`, `[Spend]`, Shield-as-resource, Instant, and the attribute-exclusive sentences as allowed. `keywords.mdc` item 6’s phrase “uses the glossary” has that shape. `AGENTS.md`’s specs table describes the file as “Print keywords (`[Mark]`, `[Empower]`, …)”, and `[Empower]` is outside `### Current print`.

2. **`keywords.mdc` item 4 vs Current print vs the leftover Shield row.** Item 4 presents `[Empower]`, `[Pierce]`, `[Reduce]`, and `[Prevent]` as physics keywords an author may add. They are not listed under `### Current print`. `[Pierce]` is also on the Shield line of `### Leftover catalogue print`. An agent can satisfy item 4 and violate K3, or follow only Current print and violate item 4, with nothing failing.

3. **`keywords.mdc` item 6 is necessary and not sufficient for K4.** It requires a glossary update when vocabulary changes. It does not require the new keyword to sit in the current region, and it does not fail a current-region keyword that no current card uses.

4. **Quick reference is a mixed cheat sheet under a do-not-copy heading.** `## Quick reference (leftover catalogue — do not copy)` points authors at Current print and then lists leftover forge and pile lines in the same “If you mean…” table as Empower, Pierce, Reduce, Prevent, and Mark Toxin.

5. **`.cursor/skills/author-content/design.md` Print section** says new and edited print uses `docs/KEYWORDS.md`, and it names only the attribute-exclusives section and the `[Forge 1 Synthetic …]` quick reference as do-not-copy. It does not tell the agent to skip the unmarked operator chapters.

6. **`.cursor/agents/card-designer.md` Read first, item 5,** says read `docs/KEYWORDS.md` and not to copy pile-era exclusives or `[Forge 1 Synthetic …]`. It does not restrict the source to `### Current print`. The same file’s “Confirmed model” sentence cites spec 030; that model sentence is under “preserve unless 031 says otherwise” below, not a decision of this spec.

7. **`.cursor/skills/author-content/SKILL.md`** points at `docs/KEYWORDS.md` for `[Mark]`, `[Strip]`, and `[Modify]`, and workflow step 5 says timing prefixes plus the glossary. It does not name which headings are sources. Hard rule 13 bans live attribute-pile print, natural or synthetic face kinds, and Shield as a resource. That ban is keyword-gate aligned for those named leftovers. It does not by itself fence the unmarked chapters.

8. **`.cursor/skills/standardize-card-effects/SKILL.md`** says new and edited `rulesText` follows `docs/KEYWORDS.md` and not to mint a verb for Block, Dodge, or Counter. Its prefer-table still teaches `[Strike]`, `[Heal]`, `[Empower]`, `[Draw]` / `[Discard]`, and `[Prevent]` from the unmarked combat chapter. It does not say to skip `## Token operators`, `## Other operators`, or `## Combat and turn`.

9. **`.cursor/skills/standardize-card-effects/examples.md`** is titled leftover catalogue shapes and says not to copy them onto new content, then says the Revelation / Instinct / Primordial Fury blocks “are the house style for timing lines” and shows `[Generate]`, Luminar, On absorb, and a wiring row from `[Generate 1 X]` to `generate-symbol`. An agent standardizing print can copy that house style onto a new Fighter, face, Response, or Modify.

10. **`.cursor/skills/standardize-card-effects/reference.md`** is titled leftover hooks, then states ally swap / reposition “are legal” and lists `grant-shield`, `generate-symbol`, `arm-forge-discount`, and `destroy-equipment` among effect-union members to map toward. The ritual timing section says not to author `type: "ritual"` and still explains Instant vs Reaction. Engine facts about existing members are not, by themselves, permission to print those members on new cards. The rewrite’s instructions have to keep that distinction. This spec does not delete the engine notes.

11. **`.cursor/skills/implement-hooks/SKILL.md`** cites `docs/KEYWORDS.md` and the example `On deal damage: [Mark 1 Toxin].` (the same shape as `keywords.mdc` item 5). Its context checklist also teaches pile banking (`{ kind: "player" }` when banking into the pile), Shield absorb, a Natural filter, Corruption on `On roll`, and equipment plus continuous-ritual hosts. Those checklist rows are existing-engine teaching. Whether they stay is “preserve unless 031 says otherwise”. They are a gap if an agent treats them as the print source for a new card. K1–K3 still apply to proving-card print in this skill.

12. **`.cursor/agents/engine-developer.md`** tells proving-card print to follow `docs/KEYWORDS.md` and `[Mark]` / `[Strip]`. It also says proving cards for `[Prevent]` use `type: "reaction"`, and it discusses a 1-cost vs 2+ cost proving card. `### Current print` describes cards as Response or Modify. This spec does not pick which of those sentences the rewrite keeps. Model sentences stay until spec 031. Print the skill or agent still authors remains under K1–K4.

13. **`.cursor/skills/develop-engine/SKILL.md`** says proving-card print uses `docs/KEYWORDS.md` and follows spec 030 (Response or Modify, not pile `playCost`, not a new card type). Its phases section also describes forges, Overcharge, ready rituals, auto-absorb, and Shield absorb as the actions window. The “do not extend pile absorb, natural/synthetic forge, or ritual types” sentence is a limit on extension. It is not a heading in the glossary. Preserve the phase description unless 031 says otherwise. New proving-card print still follows K1–K4.

14. **`.cursor/rules/content-catalogues.mdc`** says `rulesText` uses `docs/KEYWORDS.md` and not to copy pile-era `[Forge 1 Synthetic …]` or attribute exclusives, and it also sets the content model to `docs/specs/030-offensive-control.md` and `design.md`. The model citation is preserve-unless-031. The keyword sentences are under this gate.

15. **`TOOLS.md` Agent skills row** for `author-content` still reads “uniqueness / forge / dice-resonance”. The standardize row reads “On roll / On absorb”. The deck-designer row reads “orphan / attribute-identity critique”. Those are routing blurbs. If that file is in the rewrite set, a blurb that teaches leftover print as the job of the skill is an input to K3. Replacing the blurb with a different game is blocked on spec 031.

16. **`.cursor/skills/author-interactions/SKILL.md` Content terminology** tells a prompt edit to use one model, `docs/specs/030-offensive-control.md`, and names Die, Fighter, Response, Modify, Meter, Tag, Assist. Its inventory table lists `.cursor/skills/implement-hooks/reference.md` as a peer to copy. Copying that peer can reproduce gap 10. The 030 paragraph is preserve-unless-031. The keyword gate still applies when this skill tunes an artifact that deals with card text: it points at `docs/KEYWORDS.md` and the allowed region, and it does not paste the glossary into a non-print artifact (K5). The skill already says not to re-teach print voice inside a rule that only points at the owning subagent.

17. **Agent-only HTML comment in `docs/KEYWORDS.md`.** It tells agents that new content follows spec 030. Any artifact whose instructions are “read `docs/KEYWORDS.md`” also loads that comment. The comment is not spec 031. A rewrite does not treat it as the canon decision. If 032 later dispositions `docs/KEYWORDS.md` itself as rewrite or decompose, that row is in the set; this requirements spec still does not edit the glossary.

18. **Read-order gap.** `keywords.mdc` says read the glossary first for print work. Several skills mention the file later (author-content workflow step 5, implement-hooks workflow step 7, card-designer Read first item 5 after schemas and the standardize skill). K1 is the outcome that the in-set instructions put the read before authoring or editing print or effect data. Mentioning the filename somewhere in the file is not by itself K1.

### 8. Disagreement about the game is spec 031’s

8.1. Where `docs/specs/030-offensive-control.md` or `docs/RULEBOOK.md` and `docs/KEYWORDS.md` disagree, a rewritten artifact does not pick the spec or the rulebook as the winner over the glossary. It teaches whichever model the user confirms in spec 031, and it still applies K1–K5.

8.2. Observed surfaces, stated so the later design can see the disagreement. This spec does not resolve them:

- `docs/RULEBOOK.md` opens as how the game plays today and describes three Fighters, Meter, Tag, and Assist (`## 1. Object of the game`). It also describes current procedures under `## 6. Symbols and the turn pool`, `## 7. Absorption payoff`, `## 8. Playing and forging costs`, `## 10. Rituals`, `## 11. Forging`, `## 12. Overloads`, and `## 15. Reaction chain`. `## 17. What this rulebook is not` says attribute-pile enforcement is not current play. Forging in `## 11` is written as play, not as a retired heading.
- `### Current print` describes Response, Modify, Meter, Tag, `[Replace]`, and `[Mark]` / `[Strip]` / `[Modify]`, and does not list `[Forge]` as a current authoring verb.
- Several artifacts call spec 030 the confirmed content model (`.cursor/agents/card-designer.md`, `.cursor/skills/author-content/SKILL.md`, `.cursor/skills/author-content/design-craft.md`, `.cursor/rules/content-catalogues.mdc`, `.cursor/rules/dice-game-core.mdc`, `.cursor/skills/develop-engine/SKILL.md`, `.cursor/skills/author-interactions/SKILL.md`, and the HTML comment in `docs/KEYWORDS.md`).
- `.cursor/agents/card-designer.md` and `.cursor/agents/post-playtest.md` call `docs/MECHANIC_ARCHETYPES.md` pile-era archaeology. `.cursor/agents/engine-developer.md` says to read and update that file when a fuel, attack, or generate change would shift deck feel. Those instructions disagree. The rewrite does not pick which one is right.

8.3. Describing an engine behavior that is already implemented (so an agent does not invent a second reducer) is different from using a leftover glossary section as the source of a new Fighter, face, Response, or Modify. K3 binds the second. The first stays until spec 031 says otherwise (see Rewrite constraints).

## Rewrite constraints

Every rewritten artifact keeps the following when that concern is still in the file and does not depend on which game is canon.

**Preserve (architecture and workflow already in the files):**

- Only `reduce()` / `advance()` change game rules state. Stated in `AGENTS.md`, `.cursor/rules/dice-game-core.mdc`, `.cursor/agents/engine-developer.md`, `.cursor/agents/match-ui.md`, and `.cursor/skills/develop-engine/SKILL.md`.
- `src/server` stays pure: no React, Zustand, PeerJS, nanoid, DOM, storage, network, clock, or `Math.random`. Randomness is the injected RNG. Illegal player moves return the original state. Stated in `.cursor/rules/engine-purity.mdc` and `.cursor/agents/engine-developer.md`.
- Effects and abilities are data, not functions. Stated in `AGENTS.md`, `.cursor/rules/dice-game-core.mdc`, `.cursor/rules/scope-and-modules.mdc`, and the engine skills.
- Slice discipline: one concern per change; do not one-shot `resolution.ts`, MatchBoard, or a catalogue; module budget in `src/architecture/module-budget.test.ts`. Stated in `.cursor/rules/scope-and-modules.mdc` and `.cursor/skills/slice-changes/SKILL.md`.
- Layer split: rules in `src/server`, client as store, decks, networking, metrics, and UI. No rules implemented in UI or networking. Stated in `AGENTS.md`, `.cursor/rules/dice-game-core.mdc`, `.cursor/agents/match-ui.md`, and `.cursor/skills/develop-engine/SKILL.md` (networking boundary).
- Incomplete printed clauses stay accurate in print and go to `docs/DEFERRED_CATALOGUE.md` rather than a silent approximate effect. Stated in `AGENTS.md`, `.cursor/rules/dice-game-core.mdc`, `.cursor/agents/card-designer.md`, and `.cursor/skills/standardize-card-effects/SKILL.md`.
- Player-facing how-it-plays updates `docs/RULEBOOK.md` in the same change as a rules edit that changes play (`.cursor/rules/rulebook.mdc`). That duty is the living rulebook’s update rule. It does not make the rulebook the winner over `docs/KEYWORDS.md` when they disagree (requirement 8).
- Print voice is the holder (`you` / `your` is the player who has the card or face; `opponent` is their opponent, including after a hand-off). Stated in `.cursor/rules/dice-game-core.mdc`, `.cursor/agents/card-designer.md`, `.cursor/skills/author-content/SKILL.md`, and `.cursor/skills/standardize-card-effects/SKILL.md`. This voice rule is not a pile-vs-tag choice. Keep it.
- Existing specialist handoffs in requirement 4. `.cursor/skills/author-interactions/SKILL.md` already says to author or patch one artifact and not to mass-rewrite other specialists in the same change. That matches requirement 2.
- Model routing in `.cursor/rules/model-routing.mdc` and the matching `AGENTS.md` hard rule, when the rewritten file contains it.
- Metrics stay an adapter: `.cursor/rules/metrics-layer.mdc` does not import into `src/server` and does not call `reduce()` / `advance()` from the collector. Do not add glossary tables there (K5).
- Schema leftovers that the content skills already distinguish from design: satisfy a validator that still requires `forge`, `attacks`, or a `face-natural|synthetic|untyped-` id prefix; do not design the card around those fields; do not invent a parallel id scheme. Stated in `.cursor/skills/author-content/SKILL.md`, `.cursor/skills/author-content/faces.md` (`## Id prefix`, `## Schema` notes on `onAbsorb` / `maxOverloads` / `forgeRestriction`), `.cursor/skills/author-content/creatures.md` (`## Schema leftovers`), and `.cursor/rules/content-catalogues.mdc`. Keeping “satisfy the validator” does not make those fields a print source (K3).

**Preserve unless spec 031 says otherwise** (on disk, and this spec cannot tell whether the concern is abandoned):

- Any sentence that names `docs/specs/030-offensive-control.md` as the confirmed content model, including the HTML comment at the top of `docs/KEYWORDS.md` if that file is in the rewrite set.
- Response / Modify versus Instant, Reaction, Equipment, Overload, or Ritual as the card kind a prompt teaches, including engine-developer’s `type: "reaction"` proving-card line for `[Prevent]`.
- Meter versus pile `[Spend]` / `[Requires]`, and 1-cost versus 2+ cost proving cards (`.cursor/agents/engine-developer.md`). “Attribute-identity” as a routing frame is the `TOOLS.md` deck-designer row. `.cursor/agents/deck-designer.md` still names pile-era homes in `docs/MECHANIC_ARCHETYPES.md` and a pile cost as a layer break; it also says the agent may not redesign `rulesText` except by briefing card-designer. Leave those sentences until spec 031. K5 applies while this agent does not edit print.
- Tag as an operation, Assist on the Fighter, named dice as inputs, no Shield resource, no natural/synthetic face kinds, no per-fighter decks, no deckbuilding dice — wherever an artifact states them as the model. `### Current print` also states several of these. Enforcing the allowed glossary region is K2–K3. Deleting or rewriting the model sentence ahead of spec 031 is not.
- Phase and action teaching that still names forge, Overcharge, rituals, overloads, auto-absorb, Shield absorb, or the reaction chain: `.cursor/skills/develop-engine/SKILL.md` Phases, `.cursor/skills/implement-hooks/SKILL.md` context checklist, `.cursor/agents/match-ui.md` mission line (“roll, absorb, actions (attack / play / forge / ritual)”), and `docs/RULEBOOK.md` headings listed in requirement 8.2 when an artifact tells the agent to follow the rulebook.
- Whether `docs/MECHANIC_ARCHETYPES.md` is archaeology or a live update target (the disagreement in requirement 8.2). Keep both instructions in the artifacts that have them until spec 031 says otherwise.
- `TOOLS.md` blurbs that still say forge, dice-resonance, On absorb, or attribute-identity. Leave the game they name until spec 031; do not let them act as a print glossary (K3, K5).
- `.cursor/skills/author-content/csv-tactics.md` says old sheets that mean pile `playCost`, Instant/Ritual, or “Forge 1 Synthetic …” are the previous game and to translate each row into the current model or stop and ask. “Previous game” versus “current model” waits on spec 031 for which model the translation targets. K3 still forbids using leftover glossary sections as the print of the translated row. User-supplied sheet text stays verbatim in the record (requirement 3).

Do not drop a preserve-unless-031 concern because this spec suspects it is leftover.

## Failure to prevent

The failure is keyword drift after the pivot: agents could not recreate the keyword set, and could not remove keywords no current card uses.

In this repo that failure looks like the following. The rewrite is done only when these are hard to repeat.

1. An author reads “use `docs/KEYWORDS.md`” and prints a new Fighter, face, Response, or Modify from the unmarked chapters or from a leftover heading: `[Forge]`, `[Generate]` as pool fuel, `[Requires]` / `[Spend]`, `[Mark N Shield]` as a resource, an attribute-exclusive verb, Instant / Ritual / Equipment / Overload as the card type, or “Whenever…”.
2. A standardize pass copies `.cursor/skills/standardize-card-effects/examples.md` “house style” (`[Generate]`, On absorb, attribute names) onto new print because the file also contains real timing-prefix shape.
3. A new verb is minted (Dose, Envenom, Brand, Contaminate, or a verb whose only job is Block, Dodge, Counter, or Tag) when `[Mark N X]`, `[Strip N X]`, or `[Modify]` can carry the argument, or a new token gets its own keyword instead of joining X.
4. A card introduces a keyword and `docs/KEYWORDS.md` does not gain it in the allowed region, or the keyword is written only into an engine HTML comment, the quick-reference leftover table, or an unmarked chapter, and the change still counts as done.
5. A keyword remains in the region agents treat as current after no current card (spec 031’s model) uses it, and the user did not explicitly keep it. `keywords.mdc` item 6 does not catch this today.
6. A purity, networking, or metrics artifact grows its own operator tables, and that copy drifts from `docs/KEYWORDS.md`.
7. User-supplied print is paraphrased into a different sentence so the glossary looks satisfied. Requirement 3 forbids that. The card stays unfinished if the supplied print is outside the allowed region.

## Decisions

**Glossary region.** New keywords and edited card text may use the whole of `docs/KEYWORDS.md`. That file has been rewritten from `docs/GAME_STATE.md`. The whole file is the allowed region. Dodge is not current print.

**What a rewrite teaches.** Spec 031 has answered the preserve-unless-031 list. The game is `docs/GAME_STATE.md`, stated for players in `docs/RULEBOOK.md` and for print in `docs/KEYWORDS.md`. Spec 030 is not the content model. `docs/MECHANIC_ARCHETYPES.md` is not a source. Forge, ritual, overload, absorb, Shield, and pile spend are not the play a prompt teaches.

Keyword enforcement itself stays decided. Replace is the word for forge. Block is the word for `reduce`.

## Open questions

Whether a keyword that the server still implements is current play, or dead code the new file omits, is answered for the cases in spec 031 Q28–Q31. Ritual and overload are omitted. Replace is the new word for forge. Block is the new word for `reduce`. The equipment zone used by a moveset Modify is current. A Modify that attaches may be called Equipment. Anchor is that kind of Modify. Its current print is not the target: it attaches and draws at the start of the turn, and that draw is not part of a Technique or an Assist. An attached draw is acceptable when it is part of a Technique or part of an Assist, and also when a restriction or a condition is present outside those, such as draw 2 and discard 1, or pay X Meter to draw that many cards (spec 031 Q37, Q38). X is not set. The user will rewrite the card. An implementation does not rewrite `card-anchor.json` from this spec.

What counts as a current card for K4 follows the model confirmed in spec 031. If spec 031 names a model and does not say which catalogue files are current, that file set is part of the 031 confirmation, not a second keyword-policy question.

## Acceptance criteria

- [ ] The implemented rewrite set is exactly the confirmed spec 032 rows whose disposition is rewrite or decompose, including any user override, and includes no ids invented by this spec.
- [ ] Each implementation change touches one artifact.
- [ ] Every in-set artifact that authors or edits print or effect data tells the agent to read `docs/KEYWORDS.md` before that work (K1).
- [ ] New and edited print uses the whole of `docs/KEYWORDS.md` after that file is rewritten for the new game’s card text (K2). Timing stays a prefix. No new verb is minted when an existing operator can carry the argument. A new token joins `[Mark]` / `[Strip]`.
- [ ] The glossary rewrite removes text that solely describes an old unused version (spec 031 Q2 and Q3). Which of today’s operators remain is not chosen in this spec (K3).
- [ ] A change that introduces a keyword is not done while that keyword is missing from the allowed region (K4).
- [ ] A keyword in the current region that no current card of the spec 031 model uses is not left there unless the user explicitly keeps it (K4).
- [ ] The later design names a mechanism that fails closed when the glossary and the print disagree. This requirements spec does not name that mechanism.
- [ ] K4 does not depend on a mass rewrite of existing `rulesText`.
- [ ] In-set artifacts that do not touch card text do not gain a copy of the glossary tables (K5).
- [ ] User-supplied wording stays verbatim (requirement 3).
- [ ] No new specialist re-owns cards, the engine, the match UI, or loadouts (requirement 4).
- [ ] Every path a rewritten artifact cites exists (requirement 5).
- [ ] The rewrite contains no game code (requirement 6).
- [ ] Architecture and workflow constraints listed as preserve are still present in each rewritten artifact that had them.
- [ ] Every concern listed as preserve-unless-031 is still present unless spec 031 says otherwise.
- [ ] Where spec 030 or `docs/RULEBOOK.md` and `docs/KEYWORDS.md` disagree, the rewritten artifact does not pick the spec or the rulebook over the glossary; the game it teaches is the one spec 031 confirms, and K1–K5 still hold.
- [ ] The gaps in requirement 7 are treated as inputs to those outcomes. This requirements document is not the edit that fixes them.

## Not in this spec

No design. No task list. No rewritten prompts, sample agent markdown, or replacement skill text. No edit to `docs/KEYWORDS.md`, `docs/RULEBOOK.md`, spec 030, spec 031, or spec 032. No choice of test, checklist, or linter for K4.
