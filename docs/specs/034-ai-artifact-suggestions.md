# 034 — AI artifact suggestions

Status: **DRAFT suggestions**. Not approved. Not a commitment to build.

Nothing in this file is scope. Every item is a proposal the user must accept,
reject, or defer. Accepting one later means a **new spec**, then design, then
tasks. This file does not authorize implementation, new agents, new skills,
new rules, or new scripts.

---

## Intent

Suggest a small set of **new** AI artifacts that would help develop this
Dice Skirmish repo: harnesses an agent can run, content/design helpers, and
development helpers.

The priorities are:

1. Failures that let **keyword drift** happen (missing current keywords, or
   leftover keywords copied onto new cards).
2. Failures that let **docs, prompts, and print diverge** again after a
   cleanup.

These suggestions assume specs `031` (game docs are the authority; agents and
specs do not override them; conflicts are unanswered), `032` (inventory of
existing AI artifacts), and `033` (rewrite requirements, including: any AI
artifact that deals with card text or card effects must enforce
`docs/KEYWORDS.md`). Those specs are siblings, not this file.

---

## Why a separate spec

- **`031`** is canon policy for existing docs vs prompts vs specs.
- **`032`** is what to do with artifacts that already exist (delete / rewrite /
  use as-is / decompose).
- **`033`** is how those rewrites must behave, including keyword enforcement.
- **`034`** is only **new** things. It does not rewrite `card-designer`,
  `author-content`, `keywords.mdc`, or the glossary.

A second card-designer, a second engine owner, a per-fighter deck helper,
deckbuilding dice, or a new card type are out of bounds here.

---

## Depends on

| Spec | Why this file waits on it |
|---|---|
| `031` | Several suggestions stop on a docs/prompt conflict instead of picking a winner. If `031` later names a different authority, those suggestions stay valid only as “stop and ask,” not as “the tag-fighter model is settled.” |
| `032` | Do not invent a twin of an artifact `032` already marked rewrite or use-as-is. |
| `033` | Card-text and card-effect artifacts must enforce `docs/KEYWORDS.md`. New suggestions that touch print inherit that rule. |

None of `031`–`033` is treated as implemented by this file.

The user has since decided that new keywords and edited card text may use the whole of `docs/KEYWORDS.md`, and that the entire file may be rewritten for the new game’s card text. S1 and S2 still propose a Current-versus-leftover parse. That parse is not an approved contract. Those two suggestions stay proposals until the user accepts or rejects them against that decision.

---

## How to read this

Each suggestion is one section with the same fields.

**Accepting** a suggestion later means a new spec of its own, then design,
then tasks. This file does not authorize implementation.

**Harness** here means something an agent runs to check a failure mode (the
same idea as `src/architecture/engine-purity.test.ts` and
`src/architecture/module-budget.test.ts`). It is not a second game engine, not
`reduce()`, and not a new opcode.

**`docs/RULEBOOK.md` headings today** still follow the older skirmish
structure (symbols, absorption, forging costs, rituals, forging, overloads).
That is not the model these helpers are built to serve, and spec `030` is
not treated as settled canon either. Helpers are written so they stay useful
for a tag-fighter card/dice game **and** stay valid if the user later answers
`031` differently. Where a suggestion needs the tag-fighter model, the
**Assumption** field says so.

**`.cursor/rules/keywords.mdc`** already always-applies: read
`docs/KEYWORDS.md` first, prefer `[Mark]` / `[Strip]` / `[Modify]`, do not
mint Dose / Envenom / Brand / Contaminate, do not copy the glossary’s pile-era
`[Forge 1 Synthetic …]` lines or the attribute-exclusive table. This file
does **not** propose a second always-on rule that pastes the glossary again.
Where a suggestion is near that rule, it names the gap the current rule does
not close.

---

## Suggestions

### S1 — Glossary current/leftover lint

| Field | Proposal |
|---|---|
| **ID** | S1 |
| **Name** | Glossary current/leftover lint |
| **Problem it addresses** | Keyword drift happened while agents were already told to read the glossary. `.cursor/rules/keywords.mdc` says “read `docs/KEYWORDS.md` first,” but that file still has **Current print** and several **leftover** headings (`Leftover catalogue print`, `Grammar and timing (leftover rows included)`, `Attribute exclusives (leftover — do not copy)`, `Quick reference (leftover catalogue — do not copy)`). The leftover tables still show `[Forge 1 Synthetic …]`, `[Requires]`, `[Spend]`, `[Generate]`, `[Convert N]`, `[Mark N Shield]`. There is no mechanical check that new or edited `rulesText` uses **Current print** and does not copy leftover rows. `TOOLS.md` “Tests that matter for content” lists `src/server/content/cardText.test.ts` (English type / forge / requirement printing) and does not list a leftover-keyword check. `src/client/ui/keywords/reminders.ts` still has stem rules for Forge, Generate, Overcharge, and Destroy Equipment/Ritual/Overload. `.cursor/skills/standardize-card-effects/examples.md` still offers leftover `On absorb` / `[Generate]` templates. |
| **Proposed kind** | harness/script |
| **Why it is not already owned** | Close call: **card-designer** + `author-content` + `standardize-card-effects` already say “read `KEYWORDS.md`.” That reminder did not stop leftover copy. Do **not** duplicate those specialists’ authoring job, uniqueness checks, or JSON writing. This is only a fail-the-diff check an agent runs. **prompt-engineer** owns prompts, not catalogue lint. |
| **Keyword interaction** | This *is* the enforcement: parse `docs/KEYWORDS.md` by **Current** vs **leftover** headings; fail leftover bracket verbs on new/edited print; fail a current-print verb that the glossary no longer lists. Applies to catalogue `rulesText` / face / Fighter print, and to card-text-touching prompt files (see `033`). Grandfathering of old JSON is an open question, not a decision here. |
| **Depends on** | `033` (must enforce `KEYWORDS.md`); `032` (which existing tests/prompts are rewrite vs use-as-is). `031` if Current vs leftover headings themselves conflict with `RULEBOOK.md`. |
| **Assumption** | model-agnostic |
| **Open question** | Should old catalogue JSON and leftover skill examples be grandfathered, listed as known leftovers, or excluded from the scan until `032` rewrites them? Should the harness parse today’s headings as-is, or does `KEYWORDS.md` need explicit markers before a parser is honest? |

### S2 — Shared keyword-enforcement skill

| Field | Proposal |
|---|---|
| **ID** | S2 |
| **Name** | Shared keyword-enforcement skill |
| **Problem it addresses** | Spec `033` requires every AI artifact that deals with card text or card effects to enforce `docs/KEYWORDS.md`. Today that procedure is reinvented, and the copies disagree. `card-designer` / `author-content` / `standardize-card-effects` say read the glossary and reuse `[Mark]` / `[Strip]` / `[Modify]`. `.cursor/agents/prompt-engineer.md` **Read first** does not include `docs/KEYWORDS.md` at all. `.cursor/skills/author-interactions/SKILL.md` “Content terminology” pins spec `030` leftover bans and does not say to parse **Current print** vs leftover headings. `keywords.mdc` hard-codes Dose / Envenom / Brand / Contaminate and `[Forge 1 Synthetic …]`, which is a subset of the leftover tables. If `033` rewrites several specialists without one shared procedure, each file will copy a slightly different leftover list — the same drift path. |
| **Proposed kind** | skill |
| **Why it is not already owned** | Close call: `keywords.mdc` (always-on) and `standardize-card-effects` (timing-prefixed print + effect mapping). Do **not** duplicate `standardize-card-effects` (it maps clauses to existing effects and parks deferred print). Do **not** paste the glossary into a new `alwaysApply` rule: `keywords.mdc` already always-applies, and its gap is that it does not parse Current vs leftover headings and does not apply a shared checklist when **prompt-engineer** rewrites a card-text artifact. This skill would be the procedure `033` rewrites load, not a second card-designer. |
| **Keyword interaction** | Full enforcement for any caller that touches `rulesText`, effects, tokens, or prompts about those: read Current print; leftover headings are not live verbs; new tokens join `[Mark]` / `[Strip]` X; run S1 if S1 is accepted. |
| **Depends on** | `033`; `032` (do not write this if `032` already decomposes `standardize-card-effects` into the same job). |
| **Assumption** | model-agnostic |
| **Open question** | Is a skill enough, or must `033` rewrites of `prompt-engineer` / `author-interactions` list `KEYWORDS.md` in Read first even without this skill? If S1 is rejected, does this skill still exist as a checklist with no harness? |

### S3 — Game-docs conflict stopper

| Field | Proposal |
|---|---|
| **ID** | S3 |
| **Name** | Game-docs conflict stopper |
| **Problem it addresses** | Spec `031` says game docs are the authority, agents/specs do not override them, and conflicts are unanswered. Live prompts currently pick a winner. `AGENTS.md` and `.cursor/rules/dice-game-core.mdc` call spec `030` the confirmed content model. `docs/RULEBOOK.md` still has **§6 Symbols and the turn pool**, **§7 Absorption payoff**, **§8 Playing and forging costs**, **§9 Playing cards**, **§10 Rituals**, **§11 Forging**, **§12 Overloads**, plus a 40–50 tactics deck and a ≤12 face deck in **§2**. Agents following `AGENTS.md` author as if `030` settled those sections. Nothing in the six specialists owns “stop and ask” when `RULEBOOK.md` / `KEYWORDS.md` / `OPEN_DESIGN.md` disagree with a spec or an agent prompt. |
| **Proposed kind** | skill |
| **Why it is not already owned** | Close call: **prompt-engineer** will rewrite routing under `031`/`033`; **card-designer** already stops on open spec `030` questions. Do **not** duplicate prompt-engineer’s one-artifact inventory workflow, and do **not** duplicate card-designer’s JSON authoring. This is a reusable “conflict → unanswered” procedure any specialist can load so they do not resolve `031` by preferring `030`. |
| **Keyword interaction** | When the conflict is print vocabulary, `docs/KEYWORDS.md` Current vs leftover is one conflict class; leftover tables vs Current print in the same file is unanswered until the user says which heading is live. Do not teach leftover rows as the winner. |
| **Depends on** | `031`. `033` if the skill is how rewritten specialists obey canon. |
| **Assumption** | model-agnostic |
| **Open question** | If `031`/`033` already rewrite `AGENTS.md` and `dice-game-core.mdc` to “stop on conflict,” is a separate skill still wanted, or is that rewrite enough? Who may mark a conflict `DECIDED` — only the user? |

### S4 — Print-to-opcode lockstep check

| Field | Proposal |
|---|---|
| **ID** | S4 |
| **Name** | Print-to-opcode lockstep check |
| **Problem it addresses** | `keywords.mdc` step 6 says map print to AST opcodes (`mark`, `strip`, `modify`); new tokens are X arguments, not new opcodes. There is no check that a current-print verb has an opcode (or a deferred row), or that a leftover verb is not added as a new live opcode. `docs/KEYWORDS.md` HTML comments still map leftover lines to `generate-symbol`, `FORGE_CARD`, `grant-shield`. `src/server/ast/nodes.ts` still includes `forge` next to `mark` / `strip` / `modify`. `src/server/ast/compiler.ts` still compiles `grant-shield` / `apply-toxin` into `mark`. Agents can mint a verb in print, or revive `[Forge]` as if it were Current print, without failing DoD. |
| **Proposed kind** | harness/script |
| **Why it is not already owned** | Close call: **engine-developer** + `develop-engine` own new `IOpcodeHandler` classes and proving-card wires. Do **not** duplicate opcode implementation, reducer work, or proving-card identity. This only checks that glossary headings and opcode names did not drift. **card-designer** must not grow the AST from a lint failure. |
| **Keyword interaction** | Current-print operators must map to `mark` / `strip` / `modify` (or another opcode the glossary names as current). Leftover verbs must not appear as new current opcodes. A new token must not add a new opcode. |
| **Depends on** | `033`; `031` (which glossary heading is live when Current print and leftover tables name different verbs for the same engine comment). |
| **Assumption** | model-agnostic |
| **Open question** | Are leftover opcodes (`forge`, `generate-symbol`, shield-as-mark) allowed to remain as engine leftovers if Current print does not list them, as long as new print cannot call them? Who maintains the map — glossary comments, a dedicated table, or opcode metadata? |

### S5 — Legacy print-fixture quarantine

| Field | Proposal |
|---|---|
| **ID** | S5 |
| **Name** | Legacy print-fixture quarantine |
| **Problem it addresses** | Agents copy house style from tests. `src/server/content/cardText.test.ts` asserts `[Forge] 1 face on your die`, `[Requires: 2 x Mechanical]`, `[Spend: Arcane]`, `[Active when: 2 x Arcane]`, and `[Modify / Instant]` as the correct English. `src/server/content/creatureText.test.ts` asserts `[Requires: Martial + Wild] [Spend: Martial]` on attack fuel. `src/server/content/onAbsorbPrintPolicy.test.ts` requires “once per turn” on every `On absorb` line. `src/client/ui/keywords/reminders.test.ts` includes `[Forge 1 Synthetic Mechanical]`. `TOOLS.md` points content work at `cardText.test.ts`. A parent thread grepping tests will re-learn leftover keywords as the print standard even after `keywords.mdc`. |
| **Proposed kind** | harness/script |
| **Why it is not already owned** | Close call: S1 scans live print; this scans **tests that require leftover print**. **card-designer** Verify already runs `cardText.test.ts` — that is the leak, not the fix. Do **not** rewrite formatters here (engine/content work) and do **not** duplicate S1’s glossary parse. |
| **Keyword interaction** | Tests that assert leftover glossary rows as required output must be marked leftover (or must not be the examples new work copies). New tests for card text/effects must use Current print. |
| **Depends on** | `032` (those tests may already be rewrite/delete); `033`. |
| **Assumption** | model-agnostic |
| **Open question** | Grandfather the fixtures with an explicit leftover tag, split them from the tests `TOOLS.md` tells agents to run, or wait for `032` to delete them? |

### S6 — Deferred-print honesty check

| Field | Proposal |
|---|---|
| **ID** | S6 |
| **Name** | Deferred-print honesty check |
| **Problem it addresses** | Catalogue rules already say: structured fields only when every printed clause is modelled; otherwise keep accurate English and row `docs/DEFERRED_CATALOGUE.md`. That is prompt-only. `docs/DEFERRED_CATALOGUE.md` “First-playtest gaps” is a manual table (Dodge miss opcode, Brace vs face/Technique prevent, Open Manual, sixth face, Assist cost). Nothing fails DoD when new `rulesText` has a clause with empty effects and no deferred row — the path that produced silent approximations (Barrier written as Shield is already an anti-pattern in `standardize-card-effects`). |
| **Proposed kind** | harness/script |
| **Why it is not already owned** | Close call: **card-designer** parks deferred clauses; **engine-developer** wires proving cards. Do **not** author JSON or grow `EffectDefinition` from this check. Do **not** duplicate `standardize-card-effects` mapping tables. The gap is a mechanical honesty gate, like `engine-purity.test.ts` for I/O. |
| **Keyword interaction** | If the unwired clause uses a leftover keyword as if it were current, fail on keywords first (S1/S2). Deferred rows must not introduce a new verb that Current print does not have. |
| **Depends on** | `033` when the clause is card text; none for the honesty idea itself. |
| **Assumption** | model-agnostic |
| **Open question** | How strict is “clause”? Bracket keywords only, or every English sentence? Are engine fixture cards (Guard faces called out in `DEFERRED_CATALOGUE.md`) in or out? |

### S7 — Layer-home lint for new print

| Field | Proposal |
|---|---|
| **ID** | S7 |
| **Name** | Layer-home lint for new print |
| **Problem it addresses** | Prompts already refuse a Guard/Block/Dodge/Counter **face**, a Tag **card type**, a per-fighter deck, and deckbuilding dice. New JSON can still copy those shapes because the catalogue and tests still contain them. `src/server/content/faces/face-natural-grappler-guard.json` and `face-natural-technique-guard.json` still exist (`DEFERRED_CATALOGUE.md` says they stay for engine fixtures). `src/server/content/cards.consistency.test.ts` still requires every card to have `forge.faces > 0` and a die target — so a new Response/Modify must wear a leftover forge region to pass the test the designer is told to run. That is a repeated failure mode: leftover fixtures plus leftover validators teach the old layer as required. |
| **Proposed kind** | harness/script |
| **Why it is not already owned** | Close call: **card-designer** + `author-content/design.md` already name layers and refuse wrong-layer requests. Do **not** duplicate uniqueness (`design-craft.md`), list construction (**deck-designer**), or engine legality numbers (**engine-developer** / `loadout.ts`). This only flags *new* files that occupy a refused layer. |
| **Keyword interaction** | Defense words on a face vs `[Block]` / `[Dodge]` / `[Counter]` as Response effects follow `docs/KEYWORDS.md` Current print. Leftover face names in fixture JSON are not a template. |
| **Depends on** | `031` (if the user later answers that `RULEBOOK.md` §10–§12 rituals/forging/overloads are still how it plays, this lint is wrong); `032` (fixture Guard faces may stay). |
| **Assumption** | **tag-fighter** — only useful if new content is still Die / Fighter / Response / Modify / Meter / Tag-as-operation / Assist-on-Fighter. If `031` keeps the old skirmish card uses as live, reject this suggestion. |
| **Open question** | How does the harness tell engine-fixture faces from new content without a new card type or a parallel catalogue? Is `cards.consistency.test.ts` requiring `forge` on every card in `032`’s rewrite pile, so this lint should wait? |

### S8 — New-mechanic docs lockstep check

| Field | Proposal |
|---|---|
| **ID** | S8 |
| **Name** | New-mechanic docs lockstep check |
| **Problem it addresses** | `.cursor/rules/rulebook.mdc` and `keywords.mdc` already require `docs/RULEBOOK.md` / `docs/KEYWORDS.md` updates in the same change as play or print vocabulary. That is prompt DoD. It did not stop leftover verbs living in `KEYWORDS.md` **Combat and turn** (`[Resonance]` marked leftover in a table that also lists live physics) while Current print and spec `030` say not to author them. New opcode files exist (`src/server/ast/opcodes/silence.ts`, `bounce.ts`, `desynthesize.ts`) with matching specs `022`–`024` — that pattern is manual. An agent can add an opcode or a token and ship DoD (`typecheck` / `test` / `lint`) without a Current-print row, so prompts and print diverge again. |
| **Proposed kind** | harness/script |
| **Why it is not already owned** | Close call: **engine-developer** When done already lists RULEBOOK / KEYWORDS / DEFERRED / spec updates; `rulebook.mdc` is always-on. Do **not** duplicate engine implementation or a second always-on glossary rule. The gap is the same class as engine purity: the reminder exists; a mechanical gate does not. **match-ui** already renders RULEBOOK + player KEYWORDS and must not fork a third glossary (`reminders.ts` is the existing fork — S1). |
| **Keyword interaction** | A new token or operator must land in `docs/KEYWORDS.md` **Current print** (not only in a leftover table). Leftover-only rows are not “documented” for new print. If play changed, `RULEBOOK.md` in the same change, or `OPEN_DESIGN.md` if still `OPEN` / `DEFERRED` — do not write an unanswered rule as fact (`031`). |
| **Depends on** | `031` (do not let a spec win over RULEBOOK/KEYWORDS); `033`. |
| **Assumption** | model-agnostic |
| **Open question** | Does “new mechanic” mean a new file under `src/server/ast/opcodes/`, a new `nodes.ts` union member, a new token name on `mark`/`strip`, or any `src/server` play change? Should `OPEN_DESIGN.md` rows count as docs lockstep, or only RULEBOOK + KEYWORDS? |

---

## Rejected duplicates

Ideas that looked useful and are already owned. Do not accept these as `034`
work.

| Almost suggested | Already covered by |
|---|---|
| A second card-designer / set-craft agent | `.cursor/agents/card-designer.md` + `author-content` |
| A second engine / reducer owner | `.cursor/agents/engine-developer.md` + `develop-engine` / `implement-hooks` |
| Another always-on rule that pastes `docs/KEYWORDS.md` | `.cursor/rules/keywords.mdc` (alwaysApply). The gap is leftover-heading parse + a harness, not a longer reminder. |
| A second `standardize-card-effects` for timing prefixes / holder voice | `.cursor/skills/standardize-card-effects/SKILL.md` |
| A second layer table (Die / Fighter / Response / Modify / Meter / Tag / Assist) | `author-content/design.md` (tag-fighter assumption; not settled canon under `031`) |
| CSV / spreadsheet ingest | `author-content/csv-tactics.md` (notes only; no ingest) |
| Per-fighter decks or deckbuilding dice | Refused by card-designer, deck-designer, `author-content`, `dice-game-core.mdc` |
| A new card type (Tag card, Assist card, Instant, Equipment, …) | Refused by the same set |
| “Does this card have a home?” / copy counts | `.cursor/agents/deck-designer.md` |
| Playtest debrief / feel catalogue | `post-playtest` + `review-playtest` |
| Metrics-only pace dump | `analyze-match-metrics` (pile-era lens; `032` inventory, not a new twin) |
| Slice engine+UI+catalogue | `slice-changes` + `scope-and-modules.mdc` |
| A third glossary in React | `match-ui`: Rules tab renders `RULEBOOK.md` + player `KEYWORDS.md`; do not fork. `reminders.ts` is a leak for S1, not a new UI specialist. |
| Rewriting `AGENTS.md` so game docs win | Spec `031` / `033`, not a new agent |
| Rewriting existing specialists to mention KEYWORDS | Spec `032` / `033`, except the **shared** skill in S2 |

---

## Open questions

These apply to the whole set. None of them is answered here.

1. How many new artifacts does the user want in a later pass (this file does
   not recommend a count as a decision)?
2. If a suggestion is accepted, does it become its own spec immediately, or
   wait until `031`–`033` are accepted or rejected?
3. Should accepted harnesses join `npm test` DoD (like `engine-purity.test.ts`)
   or stay agent-run commands listed in `TOOLS.md` only?
4. When `RULEBOOK.md` (old skirmish headings) disagrees with spec `030` or
   with `KEYWORDS.md` Current print, does `031` leave that unanswered for
   every suggestion here, including S7?
5. Are leftover catalogue JSON, leftover tests, and leftover skill examples
   in scope for new harnesses, or only files created after acceptance?
6. Should `docs/KEYWORDS.md` heading structure (Current vs leftover) become
   a parse contract, or must a later spec add markers before S1/S4/S8 can be
   honest?
7. If `032` marks `standardize-card-effects` or `keywords.mdc` for rewrite,
   do S1–S2 still ship as new artifacts, or fold into that rewrite?

---

## Acceptance criteria

For a later pass, **the user** marks each suggestion **accepted**,
**rejected**, or **deferred**.

Only **accepted** suggestions become their own specs. Rejected and deferred
items stay non-scope. This file remains suggestions until that pass.

---

## Not in this spec

- No design.
- No task breakdown.
- No new files besides this spec.
- No agents, skills, rules, harnesses, or scripts created here.
- No commits.
- No rewrite of existing specialists (that is `032` / `033`).
- No approval of spec `030` as canon, and no treatment of current
  `RULEBOOK.md` headings as the helper model.
- Nothing here is approved scope.
