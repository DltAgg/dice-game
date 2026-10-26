# 031 — Docs canon cleanup

Status: **DRAFT requirements**. Dispositions are not decided. Design and task breakdown are out of scope.

This spec records discrepancies, gaps, and cleanup requirements among the written game documents. It answers none of them.

## Intent

The written game documents describe more than one game in live text. A player or author who reads them cannot tell which description is current player-facing truth. This spec makes that problem checkable: a discrepancy register, the questions a player or author still cannot answer, and what “clean” has to mean before any later pass edits the docs.

Card text and card effects keep using the keyword glossary. AI instructions must enforce that use. This spec records whether `docs/KEYWORDS.md` is complete, contradictory, or split into current and leftover text. It does not design that enforcement.

## Why a separate spec

This is item 1 of 4. Later items depend on a user answer to which written description is current. Those later items are named here only so this spec stays inside its job:

- Spec 032 inventories AI artifacts.
- Spec 033 rewrites agents, skills, and rules, including any enforcement that card text uses the keyword glossary.
- Spec 034 is new AI suggestions.

None of those can treat a game document as the winner until the blocking questions below are answered or explicitly deferred. This spec does not start that work.

## Authority and non-authority

### Authority for this spec

These files were read in full. They are the corpus. `docs/*.md` in this repository is exactly the seven files below. `README.md` is at the repository root.

| Document | What this spec uses it for |
|---|---|
| `docs/RULEBOOK.md` | Player-facing how-it-plays text, including sections that teach different procedures |
| `docs/KEYWORDS.md` | Print vocabulary, including “Current print”, labeled leftover sections, and unlabeled operator tables |
| `docs/OPEN_DESIGN.md` | Status labels and design rows, including rows the file’s own introduction calls historical |
| `docs/MECHANIC_ARCHETYPES.md` | Mechanic, window, and archetype notes, including the era note and the later “print it there” rows |
| `docs/DEFERRED_CATALOGUE.md` | Clauses the file says are unfinished or intentionally not modelled |
| `docs/ARCHITECTURE.md` | The turn-phase description and the software layout only where it states play |
| `docs/AGENT_PROMPT.md` | The pasted task brief and the rules that brief states |
| `README.md` | How the game is described to a human. The “Cursor specialists” table is out of this reading |

HTML comments inside `docs/RULEBOOK.md` and `docs/KEYWORDS.md` are part of those files. `docs/KEYWORDS.md` says player sections render on the Rules tab and that HTML comments are stripped. Where a rule appears only in a comment, the register says so.

### Non-authority for this spec

The following are not authority for what the game is. A game document may cite them. That citation is a coupling risk. It is not a reason to change the game document so that it matches the citation.

- `.cursor/agents`, `.cursor/skills`, `.cursor/rules`
- `AGENTS.md`, `TOOLS.md`, and the specialist / routing sections of `README.md`
- `docs/specs/*`, including `028`, `029`, and `030`
- Source code

A filename search of this repository found no file whose name contains “bible”. `docs/OPEN_DESIGN.md` and `docs/AGENT_PROMPT.md` still cite “the bible” and bible section numbers. That absence is registered. It is not filled in.

## In scope / Out of scope

### In scope

- Doc-versus-doc discrepancies inside the authority corpus, including two headings of the same file.
- Agreement between documents, recorded as a finding.
- Questions a player or author cannot answer from the authority docs.
- Requirements for a later cleanup: one current description, historical sections labeled, no silent deletion.
- Open questions, with the blocking questions first.

### Out of scope

- Editing any game document, including deleting or relabeling a section.
- Choosing which document, section, or vocabulary wins.
- Inventing a missing rule (damage numbers, phases, costs, victory, or a deletion list).
- AI artifact inventory. That is spec 032.
- Rewriting agents, skills, or rules, including glossary enforcement. That is spec 033.
- New AI suggestions. That is spec 034.
- Design and task breakdown for the cleanup itself.

## Requirements

These are normative for a later design and tasks pass. This spec does not contain the answers.

1. Each discrepancy in the register is either answered by the user or explicitly deferred. The answer is a user disposition. This spec does not supply one.
2. Q1 is answered or explicitly deferred before any later spec in this series treats one game document as current player-facing truth. Q2 and Q3 are answered in **Decisions**.
3. Card text and card effects keep using the keyword glossary in `docs/KEYWORDS.md`. AI instructions must enforce that use. Enforcement belongs to spec 033. This spec records the state of the glossary and leaves it as questions where the file is unclear.
4. `docs/KEYWORDS.md` may be rewritten as a whole so the whole file is the card-text glossary for the new game version. Which operators that rewrite keeps stays unanswered until Q1 and the spec 033 open question are answered. Q15 records that.
5. A later cleanup has one current description of how a match plays. This spec does not name which existing description that is.
6. A later cleanup removes, from the game documents, text that solely describes a version that is no longer used (Q2, Q3). It does not remove a mixed passage, and it does not invent a replacement rule for the gap, until Q1 and Q25 and Q26 are answered.
7. A later cleanup leaves every missing-information item as a question until the user answers it. No damage number, phase, cost, victory condition, or deletion is invented to close it.
8. Where this spec records agreement, a later pass keeps that agreement visible. Agreement is not a finding that a spec, an agent file, or source code is wrong.
9. A citation from a game document to a spec, agent, skill, or rule file stays a coupling risk. It is not evidence that the cited file wins a row.
10. A section that already labels itself superseded, leftover, historical, archaeology, or no longer in play is cited with that label. It is not a contradiction with itself. It is a discrepancy when another live section still states that topic as current, or when the label and a live section disagree.

## Discrepancy register

Doc-versus-doc only. Kind classifies the gap. It is not a decision that one side is obsolete. Open-question text is in **Open questions**.

Count: **60**.

| ID | Documents | What each side says | Kind | Open question ID |
|---|---|---|---|---|
| D1 | `docs/RULEBOOK.md` §§5–12 and the opening of §13; `docs/KEYWORDS.md` “Current print (new Fighters, faces, and cards)”; `README.md` opening paragraphs; `docs/OPEN_DESIGN.md` introduction and “Engine cleanup (2026) — no longer in play” | The rulebook’s roll, actions, turn pool, absorption, play/forge, rituals, and overloads are written as how the game plays today. Keywords “Current print” says dice are named inputs with a primary and a secondary effect; cards are Response or Modify; Meter is one shared pool; Tag is an operation; Assist is a Fighter ability. The README opening says the same Fighter, Response, Modify, Meter, Active, and Reserve description, and says attribute-pile fuel, natural/synthetic faces, Shield as a resource, and Instant / Reaction / Equipment / Overload / Ritual as card types are not the current model. Open Design’s introduction and engine-cleanup table say the same topics are historical or no longer in play. | contradiction | Q1, Q4 |
| D2 | `docs/RULEBOOK.md` §1 “Object of the game”, §3 “The table”, §13 “Combat”; same file §§5–12 | §1 and §13 describe three Fighters, Active and Reserve, hits and Techniques, strength and strike, Meter, Combo, Tag, and Assist as current play. §§5–12 describe absorption, a turn pool, forging, rituals, and overloads as current play. §17 “What this rulebook is not” removes attribute-pile banking, `[Requires]` / `[Spend]` enforcement, and legendary commander victory. It does not label forging, rituals, overloads, or the turn pool as removed. No heading marks §§5–12 as historical. | contradiction | Q2, Q4 |
| D3 | `docs/OPEN_DESIGN.md` “Engine cleanup (2026) — no longer in play”; same file rows still marked `DECIDED` and not `SUPERSEDED` | Engine cleanup says the attribute pile, legendary victory, exactly-one legendary loadout, and natural/synthetic faces and face decks are no longer in play. Later rows still say `DECIDED` for “Attribute pile-up”, “Legendary commander victory”, “Every symbol is attribute-typed”, “What a Shield face is”, “What costs playCost from the pile”, “Generic (`Any`) pile pips”, “Face deck and tactics deck are separate”, “Constructed opening dice”, “Forge yield and synthetic forge bank”, “Overloads attach to face cards”, “Rituals live on the engine field with an orientation”, “Damage prevention”, and “Each attribute owns one exclusive verb”. The introduction says sections that describe those topics are historical. Those rows do not carry a superseded label. | contradiction | Q2, Q3 |
| D4 | `docs/OPEN_DESIGN.md` rows labeled `SUPERSEDED` or “superseded by spec `030`”; `docs/KEYWORDS.md` sections labeled leftover; `docs/MECHANIC_ARCHETYPES.md` era note; `docs/RULEBOOK.md` §17 | These labels exist and are not self-contradictions: Open Design “Shared cost marker”, “Attacks are paid from attributes absorbed onto the attacking creature”, “Banked attributes have a payoff”, “Turn-pass pile grants”, “Composition of the starting dice”, “Attributes reachable only by forging”, “One deck, and every card carries both regions”, “Tactics deck size and copies”, “Opening hand and draw rate”, and “Running out of cards”; Keywords “Leftover catalogue print”, “Attribute exclusives (leftover — do not copy)”, and “Quick reference (leftover catalogue — do not copy)”; the archetype era note; rulebook §17’s removed list. Several of those bodies still state a procedure in the present tense. Other live rows state the same topics as current (D1–D3, D5–D8). | stale-looking | Q3 |
| D5 | `docs/RULEBOOK.md` §1 and §13 “Offensive control” and §17; `docs/OPEN_DESIGN.md` “Engine cleanup”, “Offensive control” / “Decided”, “Legendary commander victory”, “Deferred until the layers that need them” | Rulebook §1: the first player whose three Fighters are all defeated loses; a same-check wipe means the player whose turn it is loses; there is no deck-out loss. §13 and §17 agree that three KOed Fighters lose and that legendary commander victory is removed. Engine cleanup and Offensive control “Decided” agree that three KOed Fighters lose. “Legendary commander victory” is `DECIDED` and says defeating the legendary wins immediately, and that this is implemented in rulebook §1–§3. Those rulebook sections do not say that. “Deferred until the layers that need them” says the primary win is legendary defeat. | contradiction | Q9 |
| D6 | `docs/RULEBOOK.md` §1, §4 “Match start”, §9 “Playing cards”, §17; `docs/OPEN_DESIGN.md` “Running out of cards” | §1, §9, and §17 say there is no deck-out loss and an empty deck does not reshuffle. §9 also says empty-deck draws do nothing. §4 says drawing from an empty deck loses the match when deck-out is on. Open Design’s heading says the row is superseded by spec `030`. The body still says that with deck-out enabled (playtest true) a draw from an empty deck loses, and with it off the draw stops. | contradiction | Q10 |
| D7 | `docs/RULEBOOK.md` §2 “What you bring”, §4, §13 “Offensive control”; `README.md` “Status”; `docs/OPEN_DESIGN.md` “Tactics deck size and copies”, “Opening hand and draw rate”, “Prototype assumptions — 3v3 tag-fighter”, “Offensive control” / “Open / deferred” | Rulebook §2’s table says a tactics deck is 40–50 cards, at most 3 copies, and the opening hand is 5. §2 calls 5 a playtest knob. §4 says the fixed deck size is not chosen (`deckSize` null), the previous size range still applies, the turn player draws 1, and there is no hand limit. §13 says hand size, draw, and deckbuilding are not decided. The README status row says tactics 40–50 / at most 3 copies. Open Design’s deck-size and opening-hand rows say they are superseded by spec `030`, that 40–50 is the previous range and not the real-game size, and that 5 and draw 1 are playtest knobs. The 3v3 table says deck 10–24 and opening hand 4, and notes that the current engine hand is 5 and that 40–50 lists fail that maximum. Offensive control “Open / deferred” lists hand, draw, discard, and deckbuilding as open. | contradiction | Q10 |
| D8 | `docs/RULEBOOK.md` §2 and §3; `README.md` opening; `docs/KEYWORDS.md` “Current print”; `docs/OPEN_DESIGN.md` “Engine cleanup”, “Face deck and tactics deck are separate”, “Constructed opening dice”, “Prototype assumptions — 3v3 tag-fighter”; `docs/AGENT_PROMPT.md` “Design intent” and “Today” paragraph | README and rulebook §3 say one die per Fighter. Rulebook §2 says opening dice are 2 d6 (skirmish) or 3 d6 (Tag Skirmish: one die bound to each Fighter), plus a face deck of at most 12. Keywords “Current print” describes named inputs and does not describe a face deck. Engine cleanup says natural/synthetic faces and face decks are not the current die model and that named faces live on the Fighter’s base die. “Face deck and tactics deck are separate” and “Constructed opening dice” are `DECIDED` for two d6 layouts plus a face deck. The 3v3 table says 3 dice. The agent prompt says today both seats open on one shared symbol list and that deckbuilding includes two dice, with the face deck as the mid-game pool. | contradiction | Q8 |
| D9 | `docs/RULEBOOK.md` §2 opening-layout caps; `docs/OPEN_DESIGN.md` “Constructed opening dice” | The rulebook table counts, per die, faces with On roll, convert Choose one, or While showing, default 2, and calls the knobs `ASSUMED` unless noted. Open Design’s cap table says `startingMaxOnRollFacesPerDie` 2 counts non-empty `onRoll`, and also lists synthetic caps, a minimum of 0 shields per die (`DECIDED`), and a maximum of 4 of the same attribute per die (`DEFINED`). | contradiction | Q8 |
| D10 | `docs/RULEBOOK.md` §2; `docs/OPEN_DESIGN.md` “Constructed opening dice” | The rulebook says copying an already-installed face, including an opening face, remains legal. Open Design says copy-already-installed is kept, and also marks “copy from an opening synthetic” as `OPEN` (keep the cited bible section). The same Open Design passage and the rulebook agree that Forbidden Heritage, Pestilent Plague, and Arcane Echo are refused on starting dice and may sit in the face deck. | contradiction | Q8 |
| D11 | `docs/RULEBOOK.md` §6, §11, §13; `README.md` “Not the current model”; `docs/KEYWORDS.md` “Leftover catalogue print”, “Token operators”, “Not Mark”, “Other operators”, “Combat and turn”; `docs/OPEN_DESIGN.md` “What a Shield face is” and “Damage prevention”; `docs/AGENT_PROMPT.md` “Keep” | The rulebook says a face is not Shield, there is no Shield face and no Shield pip, and nothing between attack prevention and Life stops remaining damage. §11 says Desynthesize does not change the slot because there is no Shield face to peel to. The README says Shield as a resource is not the current model. Keywords’ leftover table says Shield is not a resource to design. The same file’s operator tables say `[Mark 1 Shield]` grants 1 Shield, `[Strip]` removes Shield, `[Pierce]` ignores Shield, `[Prevent]` and `[Reduce]` and `[Drain]` sit in a Shield step, and `[Generate]` can name Shield. Open Design “What a Shield face is” is `DECIDED`: Shield is an untyped face, one shield prevents 1 damage once, and shields stack and persist. “Damage prevention” orders attack-prevent, then Shield, then HP. The agent prompt says Shield is untyped, not an attribute, and never `[Requires]`. | contradiction | Q6 |
| D12 | `docs/RULEBOOK.md` §6; `docs/KEYWORDS.md` “Current print” and “Leftover catalogue print”; `README.md` opening; `docs/OPEN_DESIGN.md` “Engine cleanup” and “Every symbol is attribute-typed” | The rulebook says a face is not an attribute and not natural or synthetic, and that symbol names are pip labels, not face types. Keywords’ current and leftover lines say natural versus synthetic is not a face kind. The README says natural/synthetic faces are not the current model. Engine cleanup agrees. “Every symbol is attribute-typed” is `DECIDED`: every die face is tied to an attribute, with Shield as the exception. | contradiction | Q8 |
| D13 | `docs/RULEBOOK.md` §§5–8 and §17; `docs/KEYWORDS.md` “Leftover catalogue print” and “Grammar and timing”; `docs/OPEN_DESIGN.md` “Engine cleanup”, “Attribute pile-up”, “What costs playCost from the pile”, “Generic (`Any`) pile pips”, “Rituals live on the engine field”, “Reaction costs” under “Damage prevention” | The rulebook says usable pips auto-absorb, there is no persistent attribute pile, and printed `[Requires]`, `[Spend]`, `[Active when]`, and attack discards are not enforced. §8 says play and forge have no pile payment step. Keywords’ leftover and grammar rows agree those prints are not enforced. Engine cleanup says the attribute pile is not live fuel. “Attribute pile-up” is `DECIDED`: a persistent player pile pays attacks, ritual gates, and spends. “What costs playCost from the pile” says playing a tactic burns the header cost from that pile. “Generic (`Any`) pile pips” says Any costs are decided and applied. Rituals say Active-when checks the owner’s pile. Reaction costs say reactions pay `[Spend]` from the pile. | contradiction | Q5 |
| D14 | `docs/RULEBOOK.md` §5 and §11; `docs/KEYWORDS.md` example block and `[Reroll]`; `docs/OPEN_DESIGN.md` “Attribute pile-up” and “Only retain exists” | The rulebook’s Choose one is “absorb this die’s usable pips” or the payoff and do not absorb. Keywords’ example is “Bank this die’s pips” or do not bank, and `[Reroll]` says a usable attribute auto-banks. Open Design’s pile row says banking into the pile. Its retain row says attributes the player keeps are absorbed into the attribute pile. | contradiction | Q5 |
| D15 | `docs/RULEBOOK.md` §8; `docs/KEYWORDS.md` “Other operators”; `docs/OPEN_DESIGN.md` “What costs playCost from the pile” | The rulebook says forge does not distinguish face kinds and there is no first-forge waiver. Keywords says the first synthetic `FORGE_CARD` each turn is free, later synthetics pay header `[Spend]`, and a natural forge never consumes that waiver. Open Design’s play-cost row states the same first-synthetic waiver. | contradiction | Q13 |
| D16 | `docs/RULEBOOK.md` §11 “Forging”; `docs/OPEN_DESIGN.md` “Forge yield and synthetic forge bank”; `docs/MECHANIC_ARCHETYPES.md` MA-14 | The rulebook says own-die forge yield generates one extra pip for each of that face’s printed pips when the forged face is showing, unless the convert payoff is chosen. It does not describe an immediate bank into a pile. Open Design says the on-roll extra is `forgeYieldGenerate` (default 1) of that face’s attribute, and that a successful own-die synthetic forge also banks `forgeBankPerFace` (default 1) into the pile unless the install consumed a forge discount. MA-14 records that synthetic bank and the discount exception. | contradiction | Q13 |
| D17 | `docs/RULEBOOK.md` §11 “Desynthesis”; `docs/KEYWORDS.md` “Not Mark” and “Combat and turn”; `docs/OPEN_DESIGN.md` “Desynthesize (`[Desynthesize]`)” | The rulebook says there is no Shield face to peel to, so `[Desynthesize]` does not change the slot. Keywords says it replaces a synthetic attribute face on any die with that attribute’s natural. Open Design’s row is `DECIDED` and says the same replacement, and that it is not a forge. | contradiction | Q13 |
| D18 | `docs/RULEBOOK.md` §11 “Overcharge”; `docs/KEYWORDS.md` “Other operators”; `docs/OPEN_DESIGN.md` “Prototype assumptions — tactic Overcharge” | The rulebook says the face gains +1 of the first pip symbol in the spent card’s `playCost`. Keywords says every showing die generates +1 of the spent card’s attribute. Open Design says the pip is the spent card’s `attribute`, regardless of `forge.faces`. All three say the spend is any hand card, once per turn, onto a face card, with no reaction window and no forge draw. | contradiction | Q13 |
| D19 | `docs/RULEBOOK.md` §13 “Combat”; `docs/KEYWORDS.md` “Not Mark” and “Combat and turn” | The rulebook says While showing `[Empower N]` adds N to the controller’s attacks for as long as the face is showing, and that this is every attack, not next-attack-once. Keywords’ combat table says `[Empower N]` means the next attack this turn deals +N. Keywords’ “Not Mark” row says an Instant arms the next attack once, and While showing `[Empower N]` is every attack while the face is showing. | contradiction | Q13 |
| D20 | `docs/RULEBOOK.md` §13 and §14 “Damage extras”; `docs/KEYWORDS.md` “Not Mark” and “Combat and turn”; `docs/OPEN_DESIGN.md` “Damage prevention” and “Prototype assumptions — deferred vocabulary” | The rulebook orders `[Reduce]`, then attack prevention, then Life, and says there is no Shield step. Keywords orders Reduce before `[Prevent]` and Shield, Pierce as ignore N Shield after Prevent, and Drain as Prevent, then Shield, then HP. Open Design “Damage prevention” orders attack-prevent, then Shield, then HP, and does not mention Reduce. The deferred-vocabulary pierce row orders prevent buffers, then skip up to N Shield, then remaining shields, then HP. | contradiction | Q6, Q13 |
| D21 | `README.md` opening; `docs/KEYWORDS.md` “Current print” and “Grammar and timing”; `docs/OPEN_DESIGN.md` introduction, “Overloads attach to face cards”, “Rituals live on the engine field”, “Equipment and opponent forging”; `docs/RULEBOOK.md` §2, §3, §9, §§10–12 | README, Keywords “Current print”, and the Open Design introduction say cards are Response or Modify, and that Instant, Reaction, Equipment, Overload, and Ritual are not the card kinds to author. The rulebook §9 table names Modify and Response, and says a Modify may attach equipment, overload a face, or place a ritual. §2 says tactics cards always have a play region and a forge region. §3 lists equipment, overloads, and rituals on the table. §§10–12 give rituals, forging, and overloads their own procedures. Keywords’ grammar table says Overload is a card type, in a section that also says leftover rows are included. Open Design’s overload, ritual, and equipment rows are `DECIDED` and describe those objects as implemented. | contradiction | Q7 |
| D22 | `docs/RULEBOOK.md` §15 “Reaction chain” and §13 “Offensive control” and §13 “Tag Skirmish”; `docs/OPEN_DESIGN.md` “Reactions use a Yu-Gi-Oh style chain”, “Offensive control” / “Decided”, “Prototype assumptions — 3v3 tag-fighter” | Rulebook §15 and Open Design’s chain row agree with each other: after a link is added, priority passes to the opponent; a window opens for a tactic effect, ritual place, ritual activate, equipment, overload, and an attack; forge does not; responders are hand `reaction` cards and ready ritual-reactions; negate does not answer an attack. Rulebook §13 “Offensive control” and Open Design “Decided” agree with each other: the declarer has priority first; adding a response or modify does not yield priority; two passes in a row resolve last-in, first-out; Response and Modify are the chain objects. Rulebook §13 says Tag is a chain object and can be responded to or modified. The 3v3 table says TAG / ASSIST have no reaction window. | contradiction | Q11 |
| D23 | `docs/RULEBOOK.md` §3 and §9 and §13; `docs/KEYWORDS.md` “Current print”; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter”, “Offensive control” / “Decided” and “Open / deferred”, “NOT DECIDED (spec `029`)”; `docs/DEFERRED_CATALOGUE.md` “First-playtest gaps” | The rulebook says Meter is 0–8, Tag does not spend it, a conducted sequence hit grants 2, 3, or 4 by strength to the player who declared it and 1 to the player who owns the Fighter it was declared against, a negated hit grants nothing, and that hit does not also grant 1 Meter per HP lost. Assist spends Meter when that Fighter’s exceptional Assist cost is greater than 0. §9 says a card’s play cost is the Meter spent to play it. Keywords “Current print” agrees that the printed play cost is Meter and that rules text does not repeat that same spend. The 3v3 table says 1 Meter per HP actually lost on an attack Strike, Tag costs 2 unless the Active die shows `tag`, and Assist costs 1 unless that Reserve’s die shows `assist`. Offensive control “Decided” says you gain Meter when you deal damage, when you take damage, or from an effect, with no Combo Meter and no card-mana curve, and that normal Assist does not cost Meter. “Open / deferred” says Meter amounts are open. “NOT DECIDED” says whether the 3v3 Meter knobs stay is not decided. Deferred catalogue says omitting the exceptional Assist field charges 1 unless the Reserve is showing technique `assist`, that the named Fighters set the field to 0, and that there is no Assist face. | contradiction | Q12 |
| D24 | `docs/RULEBOOK.md` §3 and §13; `docs/OPEN_DESIGN.md` “Offensive control” / “Decided” and “Prototype assumptions — 3v3 tag-fighter” | The rulebook and Offensive control “Decided” agree: Combo rises by 1 for each successful starter, extender, and finisher; a negated link does not count; Combo resets on Tag, KO, and end of turn. The 3v3 table says Combo increments on an Active attack declare only, and resets on TAG, KO-promote, and end of turn. | contradiction | Q12 |
| D25 | `docs/RULEBOOK.md` §13 opening bullets and “Tag Skirmish”; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter” | The rulebook’s combat opening says each living creature may attack once per turn unless an effect grants extra attacks (`[Frenzy]`). The Tag Skirmish lines say each Fighter may attack twice per turn in this preset. The 3v3 table says `attacksPerCreaturePerCombat` is 2 and that the current default is 1. | contradiction | Q4 |
| D26 | `docs/RULEBOOK.md` §3 and §1 and §13; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter” | Rulebook §3 says a non-Range attack may hit a back-row creature only if that player has no living frontline, Range ignores this, and technique-gated native attacks always target the opponent’s Active Fighter. §1 and §13 say hits and Techniques target the opponent’s Active Fighter. The 3v3 table says the attack target is the opponent’s Active only, Reserve is not a legal target, and Range does not hit the bench in this prototype. | contradiction | Q19 |
| D27 | `docs/RULEBOOK.md` §1; `docs/OPEN_DESIGN.md` “Battlefield capacity”, “Legendary commander victory”, “Prototype assumptions — 3v3 tag-fighter” | The rulebook says index 0 opens Active, tag-fighter matches use one frontline (Active) and two Reserve, and skirmish defaults still place two frontline then back. “Battlefield capacity” is `DECIDED` for two frontline slots plus a back row. “Legendary commander victory” says the legendary opens in the back. The 3v3 table says one Active and two Reserve, with index 0 Active. | contradiction | Q19 |
| D28 | `docs/RULEBOOK.md` §13 “Offensive control”; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter” | The rulebook says if your Active Fighter was KOed and you have a living Reserve, you must choose one to become Active, and that choice does not spend Tag or Meter. The 3v3 table says KO-promote is the lowest-index living Reserve. The same 3v3 note says a historical auto-pick is replaced by the owner choosing a living Reserve. Offensive control “Decided” says the sequence ends and initiative passes, and does not say who chooses the replacement. | contradiction | Q19 |
| D29 | `docs/KEYWORDS.md` “Current print”; `docs/RULEBOOK.md` §13 “Tag Skirmish”; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter” | Keywords says Tag is an operation, not a face and not a card type. The rulebook says Tag does not ask for a Tag face and does not spend Meter. The 3v3 table says TAG is free if the Active die shows `tag`, otherwise it costs 2. | contradiction | Q12 |
| D30 | `docs/RULEBOOK.md` §13 “Named faces and Fighter techniques” and “Offensive control”; `docs/OPEN_DESIGN.md` “Prototype assumptions — Fighter combat core” and “Offensive control” / “Decided” and “To test” | The rulebook says using a face does not spend it, and that repeating the same Action in one sequence is the model under test. It also says a current build can still mark a used face, and that this spend is leftover behavior, not the rule. Fighter combat says die consumption is withdrawn. Offensive control “Decided” says rolled faces are not consumed. “To test” says the same Action cannot be used twice in one sequence. | contradiction | Q4 |
| D31 | `docs/RULEBOOK.md` §13, §14, §15; `docs/KEYWORDS.md` “Current print”; `docs/DEFERRED_CATALOGUE.md` “First-playtest gaps” | The rulebook says Prevent may answer an attack declaration and negate may not, and that `[Prevent]` cancels the next attack against that creature. It also says Counter ends the sequence when it resolves, and ending the sequence ends the turn. Keywords “Current print” says Block, Dodge, Counter, prevent, and redirect are effects on a Response, not types, and does not define Dodge or Block. Deferred catalogue says Dodge is a miss and is not `[Prevent]` and not a reflected hit, that no miss opcode exists, that `[Prevent]` only arms a link of kind `attack`, and that face and Technique hits are `combat-action` and are not stopped by that prevent. It says Block a face or Technique is parked, and that Brace’s `[Prevent]` is the Attack action, not a sequence face or Technique. | contradiction | Q20 |
| D32 | `docs/RULEBOOK.md` §9 and §13; `docs/DEFERRED_CATALOGUE.md` “First-playtest gaps” | The rulebook says a Modify may change a hit, and that Counter ends the sequence. Deferred catalogue says changing an Action’s damage, sequence role, or whether it ends the sequence is parked, and that a Moveset card adds a new Technique and does not rewrite a printed one. | contradiction | Q20 |
| D33 | `docs/KEYWORDS.md` “Current print”, “Leftover catalogue print”, “Token operators” through “Combat and turn”, “Grammar and timing (leftover rows included)” | “Current print” is a short authoring section. The leftover heading and the quick-reference heading say do not copy those rows. The token, operator, combat, and grammar sections are not under the leftover heading. They define pile costs, Shield, forge kinds, and exclusives. The grammar heading says rows that call Overload a card type, or that describe pile absorb, are leftover, and the table still prints those rows. “Current print” does not define the sequence-role, strength, strike, Combo, or hit-target words the rulebook uses. An HTML comment above the player text tells agents not to author from leftover sections; the file says that comment is stripped from the Rules tab. | contradiction | Q15 |
| D34 | `docs/KEYWORDS.md` “Attribute exclusives” and “Combat and turn”; `docs/RULEBOOK.md` §13; `docs/OPEN_DESIGN.md` “Each attribute owns one exclusive verb”; `docs/MECHANIC_ARCHETYPES.md` era note and archetype table | Keywords labels the exclusive table leftover and says do not copy it. The combat table, which is not under that heading, still says Wild, Luminar, Arcane, Darkness, and Mechanical exclusives. The rulebook says `[Frenzy]` is Wild exclusive and ally reposition is Martial exclusive. Open Design’s exclusive-verb row is `DECIDED` and lists one verb per attribute. The archetype era note says those attribute homes are not the current deck model. Later rows still say `HOME` and “Print it there.” | contradiction | Q14 |
| D35 | `docs/MECHANIC_ARCHETYPES.md` era note, “Status”, “How to update”, “By archetype” | The era note says the rows are the previous pile-fuel skirmish, tells the reader not to author new Fighters, faces, cards, or decks to match them, and says to use the file only as historical feel archaeology. “Status” says `HOME` means print it there. “How to update” still tells a playtest pass to add rows. “By archetype” still says what to print and what not to steal. | contradiction | Q3, Q18 |
| D36 | `docs/AGENT_PROMPT.md` opening and “Design intent”; `docs/RULEBOOK.md` §2; `docs/OPEN_DESIGN.md` “Constructed opening dice” and “Prototype assumptions — 3v3 tag-fighter” | The prompt calls itself a paste-ready brief and says today both seats open with the same Martial, Wild, Arcane, Luminar, Shield, Shield dice, and that the 12-card face deck is only a forge pool. Its design intent says deckbuilding includes two dice and the face deck is the mid-game pool, and says to keep 2 dice and 6 slots. The rulebook and “Constructed opening dice” describe per-loadout starting dice rather than one global symbol list. The rulebook’s Tag Skirmish line and the 3v3 table describe three dice. | stale-looking | Q18 |
| D37 | `docs/OPEN_DESIGN.md` status vocabulary and bible citations throughout; `docs/AGENT_PROMPT.md` “Read first” and “Keep” | Open Design says `DEFINED` means stated outright in the bible. Many rows cite bible section numbers as the source of a rule. The agent prompt cites bible §§9–13 and §35 and says to keep 2 dice, 6 slots, max 4 of the same attribute per die, and face-card XOR. No bible file is in the authority corpus, and a filename search found none. | missing | Q16 |
| D38 | `docs/KEYWORDS.md` “Combat and turn” `[Resonance]`; `docs/OPEN_DESIGN.md` “Prototype assumptions — deferred vocabulary” | Keywords says `[Resonance]` is catalogue leftover, was a pile wildcard, and is not enforced. Open Design’s requirement-wildcard row is `ASSUMED` and says a matching pool symbol may pay any `[Requires]` or ritual Active-when attribute this turn, naming Resonance absorb. | contradiction | Q5 |
| D39 | `docs/KEYWORDS.md` “Not Mark” `[Generate]`; `docs/RULEBOOK.md` §§5–6 | Keywords says `[Generate N X]` is a pool symbol for this turn and expires at end of turn. The rulebook says rolled and effect-generated usable pips auto-absorb, there is no cross-turn attribute bank, and unabsorbed turn-pool symbols expire at end of turn. | contradiction | Q5 |
| D40 | `docs/KEYWORDS.md` “Combat and turn” `[Convert N]` and the example block; `docs/RULEBOOK.md` §5 and §6 | Keywords says `[Convert N]` converts up to N pool symbols into Natural attributes, and that convert faces are Choose one rather than `[Convert N]`. The rulebook teaches the Choose one absorb-or-payoff and says there is no cross-turn bank. It does not teach `[Convert N]`. | missing | Q13, Q15 |
| D41 | `docs/RULEBOOK.md` §8; `docs/KEYWORDS.md` “Combat and turn” `[Discount]`; `docs/MECHANIC_ARCHETYPES.md` MA-11 | The rulebook says discounts may still arm and do not spend a pile. Keywords says `[Discount N]` makes the next matching play cost N fewer pile tokens, and describes which pips it reduces. MA-11 treats that pile discount as the mechanic’s home. | contradiction | Q5 |
| D42 | `docs/RULEBOOK.md` §5 `[Reroll]` and §13 “Offensive control”; `docs/KEYWORDS.md` `[Reroll]`; `docs/OPEN_DESIGN.md` “Offensive control” / “Decided” | Rulebook §13 and Open Design “Decided” agree: immediately after the opening roll, you may reroll any number of your dice once, or keep them. Rulebook §5 and Keywords describe a different printed `[Reroll]`: roll that one die again during actions, fire On roll for the new face, then auto-absorb or auto-bank unless the new face offers convert Choose one. The corpus does not say whether both procedures exist together. | missing | Q21 |
| D43 | `docs/ARCHITECTURE.md` “Turn phases”; `docs/RULEBOOK.md` §5 and §13 | Architecture and rulebook §5 agree that the phase order is roll then actions, that there is no dedicated absorb phase, and that end turn is an action. Architecture says absorb, `[Requires]` spend, attack, play, forge, and ready-ritual activate share actions. It does not mention Tag, Assist, Meter, sequence roles, or the chain described in rulebook §13. | missing | Q4 |
| D44 | `docs/RULEBOOK.md` §15, §8, and §9 | §15 says costs are paid when the link is built. §8 says printed `[Spend]` and `[Requires]` are not enforced. §9 says the card’s play cost is Meter. The rulebook does not say which of those §15’s “costs” are. | missing | Q11 |
| D45 | `docs/OPEN_DESIGN.md` “Offensive control” / “Open / deferred”; `docs/RULEBOOK.md` §13 “Offensive control” | Open Design lists as open: what moves Neutral into Open, where the Tag windows sit inside roll / actions, a given Assist’s timing, who starts as Aggressor, and which dice are inputs. The rulebook uses Aggressor, Defender, and the word Open, and it states two Tag windows, without defining Neutral or who starts as Aggressor. | missing | Q22 |
| D46 | `docs/RULEBOOK.md` §1 and §13; `docs/OPEN_DESIGN.md` “Offensive control” / “Open / deferred” | The rulebook says every hit and every Technique has a strength (light, medium, or heavy) and a strike (kick or punch), and it states Meter from that strength. It does not state HP damage for a strength. A Technique “such as `[Strike 3]`” is an example of printed text. Open Design says Meter amounts are open and does not state HP by strength. | missing | Q23 |
| D47 | `docs/RULEBOOK.md` §1; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter” and “Offensive control” / “Decided” | The rulebook and the 3v3 table agree that if both squads are defeated in the same check, the player whose turn it is loses. Offensive control “Decided” says three KOed Fighters loses the game and does not mention the same-check case. | missing | Q9 |
| D48 | `README.md` opening paragraphs and “Status” | The opening says a 3v3 tag fighter with Response and Modify cards and one Meter pool, and lists attribute-pile fuel, natural/synthetic faces, Shield as a resource, and the older card kinds as not the current model. The status table says the game engine is dice, symbols, absorb / On absorb, shields, combat, cards (play/forge), face deck, phases, and chain. | contradiction | Q1 |
| D49 | `README.md` “Design questions”; `docs/RULEBOOK.md` opening comment and §17; `docs/MECHANIC_ARCHETYPES.md` “This is not” | README says how the game currently plays is the rulebook, print keywords are the glossary, and open and deferred rules live in Open Design. The rulebook’s opening comment says the same about itself, Open Design, and the deferred catalogue. The archetype file assigns the rulebook “how the game currently plays” and Open Design “unresolved rules questions.” The bodies registered in D1–D3 contain more than one live description, and Open Design contains many `DECIDED` rows as well as `OPEN` rows. | contradiction | Q1, Q2 |
| D50 | `docs/OPEN_DESIGN.md` “Two phases: Roll and Actions” | The same `ASSUMED` paragraph about `rolled` versus `available` as provenance, not a phase gate, is printed twice in a row. | duplicate | Q3 |
| D51 | `docs/RULEBOOK.md` §3 and §13 | Meter’s 2 / 3 / 4 grant, the 1 to the Fighter’s owner, Combo’s +1 per successful starter, extender, and finisher, and the Tag / KO / end-of-turn reset are stated in §3 and restated in §13. The restatements agree with each other. Differences between those passages and other documents are D23 and D24, not differences between §3 and §13. | duplicate | Q3 |
| D52 | `docs/KEYWORDS.md` “Combat and turn” `[Strike]`; `docs/RULEBOOK.md` §1 and §13 | Keywords says `[Strike N]` deals N damage, default a chosen enemy, unless the print names another target. The rulebook says a hit and a Technique target the opponent’s Active Fighter. | contradiction | Q20 |
| D53 | `docs/KEYWORDS.md` “Current print”; `docs/RULEBOOK.md` §1 and §13 | The rulebook’s current-looking combat text uses starter, extender, finisher, strength, strike, Combo, hit, and Technique. “Current print” does not define those words. It does define Response, Modify, Meter, Tag, Assist, `[Replace]`, and `[Tag out]`, which the rulebook also uses. | missing | Q15 |
| D54 | `docs/DEFERRED_CATALOGUE.md` “Catalogue reset (2026-10-03)” and “First-playtest gaps”; `docs/RULEBOOK.md` §2; `docs/OPEN_DESIGN.md` “Engine cleanup” | Deferred catalogue names a playable team and says a sixth distinct face on each die does not fit a face deck of 12, so each die repeats names. The rulebook states the 12-card face-deck cap. Engine cleanup says face decks are not the current die model. The other authority docs do not say whether that sixth face is a current rule. | missing | Q8, Q17 |
| D55 | `docs/DEFERRED_CATALOGUE.md` “First-playtest gaps” Open Manual row | The file says the Technique the card adds is not printed yet, and the card cannot be played until that Technique is authored. No authority doc prints that Technique. | missing | Q17, Q23 |
| D56 | `docs/KEYWORDS.md` “Current print”; `docs/RULEBOOK.md` §13; `docs/DEFERRED_CATALOGUE.md` “First-playtest gaps” | Keywords names Dodge and Block as effects on a Response. The rulebook states a result called Counter and does not state a Dodge procedure or a Block procedure. Deferred catalogue says both are parked and that the printed cards do not claim those clauses. | missing | Q15, Q20 |
| D57 | `docs/OPEN_DESIGN.md` “First-player advantage”; `docs/RULEBOOK.md` §4 | Open Design records an observation that the player who moves first wins about 65% of a stated sample, and says this is not yet a question anyone has to answer. The rulebook states that the first player in `playerOrder` takes turn 1 at roll, with no extra first-player draw, and does not mention that rate. | missing | Q24 |
| D58 | `docs/RULEBOOK.md` §13 “Tag Skirmish” and “Offensive control”; `docs/KEYWORDS.md` “Current print” and “Leftover catalogue print” | Tag Skirmish says in-match dice evolution is still `[Forge]` onto the bound die, a persistent face change, with no temporary face replacement. Offensive control and Keywords “Current print” say `[Replace]` writes a named face onto a slot for the rest of the match. The leftover table says in-match die writes are Modify subject `die`. | contradiction | Q7 |
| D59 | `docs/RULEBOOK.md` §13; `docs/KEYWORDS.md` “Combat and turn”; `docs/OPEN_DESIGN.md` “Prototype assumptions — deferred vocabulary” and “Battlefield capacity” and “Prototype assumptions — 3v3 tag-fighter” | The rulebook and Keywords say `[Reposition]` / `[Swap]` move an ally between frontline and back, and the rulebook says swap if the frontline is full. Open Design’s reposition assumption uses a frontline capacity of 2. Battlefield capacity is two frontline slots. The 3v3 table and the rulebook’s tag lines say one frontline. None of these passages say how reposition works when there is one Active. | missing | Q19 |
| D60 | `docs/OPEN_DESIGN.md` “Printed 1-token playCost is exceptional”; `docs/MECHANIC_ARCHETYPES.md` MA-10; `docs/RULEBOOK.md` §9; `docs/KEYWORDS.md` “Current print” | Open Design says do not author a printed cost of 1 pile token as the default cheap band. MA-10 says a header `playCost` totaling 1 pile token is `ANTI` as a band. The rulebook and Keywords “Current print” say the number on the card is Meter, a card with no play cost is free, and Meter is not printed as mana on every strong card. | contradiction | Q12 |

### Agreements (findings, not decisions)

These passages agree with each other. Agreement does not decide a row in the register, and it does not decide that another layer is wrong.

| ID | Documents | What they agree |
|---|---|---|
| A1 | `docs/RULEBOOK.md` §5; `docs/ARCHITECTURE.md` “Turn phases”; `docs/OPEN_DESIGN.md` “Two phases: Roll and Actions” | The phase list is roll, then actions. End turn is an action. There is no separate absorb phase. What a player may do in actions is D1, D13, and D43. |
| A2 | `docs/RULEBOOK.md` §2; `docs/OPEN_DESIGN.md` “No mulligan” | There is no mulligan. The opening hand of five is stated as the hand that is dealt. Whether that number is settled is D7. |
| A3 | `docs/RULEBOOK.md` §5 and §9; `docs/OPEN_DESIGN.md` “Discard from hand is a player choice” and “Optional you may choices” | Discard-from-hand draws first, then the player names the cards. Print that says you may can be declined, and declining skips that effect and any “if you do” rider. A mandatory target is named when one exists. |
| A4 | `docs/RULEBOOK.md` §6, §16, and §17; `docs/OPEN_DESIGN.md` “Only retain exists” and “Retaining a die”; `docs/KEYWORDS.md` `[Retain]` | Storing a symbol is dropped. Retain keeps a die for the owner’s next roll phase, survives the opponent’s shared roll, and then clears. Stunned dice cannot be retained. Whether stun is ever applied is A7. |
| A5 | `docs/RULEBOOK.md` §14 “Toxin”; `docs/OPEN_DESIGN.md` “Toxin counters” | Toxin markers have a soft maximum of 3. At the end of that creature’s owner’s turn the creature takes damage equal to its markers, then the markers clear. |
| A6 | `docs/RULEBOOK.md` §10 and §14; `docs/KEYWORDS.md` “Other operators” and “Combat and turn”; `docs/OPEN_DESIGN.md` “Silence” and “Bounce” | `[Silence]` names an opposing creature, field ritual, or die slot and lasts until the start of the silencer’s next turn. Pips still generate. Attacks may still be declared. `[Bounce]` returns an opposing ritual, equipment, or overload to its owner’s hand. `[Destroy]` of those same cards sends one to the graveyard. Neither is negate. An empty set whiffs. Shield inside the damage order is D20, not this agreement. |
| A7 | `docs/RULEBOOK.md` §14 “Stun”; `docs/OPEN_DESIGN.md` “Stun”; `docs/DEFERRED_CATALOGUE.md` “Intentionally not modelled” | Stun application is deferred. The docs say nothing applies it. |
| A8 | `docs/RULEBOOK.md` §13; `docs/OPEN_DESIGN.md` “Optional you may choices”; `docs/DEFERRED_CATALOGUE.md` “Intentionally not modelled”; `docs/KEYWORDS.md` Martial row | An effect that moves an enemy creature is banned. Ally reposition is described as Martial’s verb. Whether that exclusive is current print is D34. How reposition works with one frontline is D59. |
| A9 | `docs/RULEBOOK.md` §1 and §13; `docs/OPEN_DESIGN.md` “Engine cleanup” and “Offensive control” / “Decided” | These passages agree that the match is lost when all three of that player’s Fighters are KOed. D5 records other passages that state legendary defeat instead. |
| A10 | `docs/KEYWORDS.md` “Current print”; `docs/RULEBOOK.md` §13 “Offensive control” | `[Replace]` writes a named face onto a slot of that Fighter’s die for the rest of the match. `[Tag out]` makes the opponent’s Active Fighter leave; they choose a living Reserve; that Fighter is not KOed; their Tag is not spent; with no living Reserve, nothing happens. A “cannot Tag in until the end of its next turn” line locks Tag-in for that controller’s next turn and does not lock Assist or a KO replacement. Which operation writes the die is D58. |
| A11 | `docs/RULEBOOK.md` §3 and §13; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter” and “Offensive control” / “Decided” | Meter’s cap is 8, and the pool stays across turns and across Tag. How Meter is gained and spent is D23. |
| A12 | `docs/RULEBOOK.md` §9; `docs/KEYWORDS.md` “Current print” | The number shown on the card is the play cost. Rules text does not repeat that same spend. A card with no play cost is free. Meter that is not the only way to play the card stays in the rules text. Which resource that number spends is D23 and D60. |
| A13 | `docs/RULEBOOK.md` §3 and §13; `docs/KEYWORDS.md` “Current print”; `docs/OPEN_DESIGN.md` “Offensive control” / “Open / deferred” | Changing the roll does not rewrite the die. An in-match face write lasts for the rest of the match. The next match starts from the base die. There is no temporary die change. The verb that performs the write is D58. |
| A14 | `docs/RULEBOOK.md` §5 and §11; `docs/KEYWORDS.md` example block; `docs/MECHANIC_ARCHETYPES.md` MA-17 | A convert face offers a choice: take this die’s pips, or take the printed payoff and do not take those pips. The verb is “absorb” in the rulebook and “bank” in the glossary example (D14). |
| A15 | `docs/RULEBOOK.md` §5; `docs/KEYWORDS.md` “Grammar and timing”; `docs/MECHANIC_ARCHETYPES.md` MA-18 | While showing is a continuous stance on the showing face, including retain. It is not a second On-roll trigger. Both sides’ showing faces refresh when dice are rolled. |
| A16 | `docs/RULEBOOK.md` §5; `docs/KEYWORDS.md` “Grammar and timing”; `docs/MECHANIC_ARCHETYPES.md` MA-02 | On each roll phase, both players’ dice are rolled. Each owner’s On roll resolves on the opponent’s turn as well as on their own. |
| A17 | `docs/RULEBOOK.md` §11; `docs/OPEN_DESIGN.md` “Forging draws a card” | Forging draws one card per face installed, on the forger’s die or an opponent’s die. An empty deck does not reshuffle. Whether forging is current play is D1 and D21. |
| A18 | `docs/RULEBOOK.md` §10; `docs/OPEN_DESIGN.md` “Rituals live on the engine field”; `docs/MECHANIC_ARCHETYPES.md` MA-16 | Ritual / Instant is described as retired from play. A leftover instant-subtype ritual leaves for the graveyard after one activation. Whether rituals remain a zone is D21. |
| A19 | `docs/DEFERRED_CATALOGUE.md` “Intentionally not modelled”; `docs/OPEN_DESIGN.md` “Special face inherent-effect text” | Great Spark and Rekindle have empty print. There are no clauses in the authority docs to wire. |
| A20 | `docs/RULEBOOK.md` §13 “Tag Skirmish” and “Offensive control”; `docs/OPEN_DESIGN.md` “Offensive control” / “Decided” | These passages agree that a KOed Fighter cannot Tag and can still Assist, and that a resolved finisher ends the turn. Tag-cost and Assist-cost numbers are D23. |
| A21 | `docs/RULEBOOK.md` §13; `docs/OPEN_DESIGN.md` “Fighter combat core” and “Offensive control” / “Decided” | These passages agree that a used face is not spent. Whether the same Action can be used twice in one sequence is D30. |
| A22 | `docs/RULEBOOK.md` §1; `docs/OPEN_DESIGN.md` “Prototype assumptions — 3v3 tag-fighter” | Index 0 opens Active in the tag-fighter setup these passages describe. The two-frontline placement is D27. |
| A23 | `docs/RULEBOOK.md` §2; `docs/OPEN_DESIGN.md` “Constructed opening dice” | Both refuse Forbidden Heritage, Pestilent Plague, and Arcane Echo on starting dice, and both allow them in the face deck for later. Whether a face deck is current is D8. Whether copy is settled is D10. |

### Coupling risks

A game document names a spec, an agent, a skill, or a rule file. This list is not a finding that the named file is true. It is a risk that a later reader will treat the citation as the winner of a row above.

- `docs/RULEBOOK.md` cites specs `002`, `003`, `004`, and `008`–`015` in comments, and specs `028`, `029`, and `030` in §13. It cites `.cursor/rules/rulebook.mdc` and `src/server/model/config.ts`.
- `docs/KEYWORDS.md` cites spec `030` and `.cursor/skills/author-content/design.md` in the HTML comment, and cites specs `011`, `012`, `013`, `021`, `022`, `023`, and `024` beside operator rows.
- `docs/OPEN_DESIGN.md` tells content authors to follow spec `030` and the same design skill. Rows cite specs `008`, `009`, `011`, `012`, `013`, `016`, `021`, `022`, `023`, `024`, `025`, `028`, `029`, and `030`. Several status lines say “when spec `030` says.”
- `docs/MECHANIC_ARCHETYPES.md` cites spec `030`, the author-content design skill, and the post-playtest subagent.
- `docs/DEFERRED_CATALOGUE.md` cites specs `002`, `003`, `004`, `008`–`013`, `029`, and `030` as sources or as the wanted behavior.
- `docs/ARCHITECTURE.md` cites specs `020`, `026`, and `027`.
- `docs/AGENT_PROMPT.md` cites `AGENTS.md`, `TOOLS.md`, specs `004`, `006`, and `007`, engine and match-ui skills, the deck-designer agent, and an engine-purity rule.
- `README.md` cites spec `030` as the confirmed content model and the rulebook as shipped play. Its specialist table is outside the human game description this spec uses, and it points at agents, skills, `AGENTS.md`, `TOOLS.md`, and `.cursor/rules`.

## Missing information

Each item is a question. None of them proposes a rule.

1. Which single description a new player should follow when the rulebook, the glossary’s current section, and Open Design all contain live text (D1, D2, D49). Q1, Q2.
2. Whether a persistent pile, a turn pool, both, or neither is part of play, and what auto-absorb does with a generated symbol (D13, D14, D39). Q5.
3. Whether Shield exists as a face, a token, a damage step, or in none of those roles (D11, D20). Q6.
4. What a card is, and which of Modify, Response, tactic, equipment, overload, ritual, and forge region a player can use (D21). Q7.
5. How many dice a player brings, whether a face deck exists, and what the opening caps count (D8, D9, D10, D54). Q8.
6. How a match ends when the three-Fighter wipe text and the legendary-defeat text are both present, including a same-check wipe (D5, D47). Q9.
7. What the deck size, copy limit, opening hand, draw, hand limit, and empty-deck result are, as settled rules rather than as knobs the docs also call undecided (D6, D7). Q10.
8. Which chain procedure is in force, which objects open it, and which costs are paid when a link is built (D22, D44). Q11.
9. How Meter is gained and spent, including Tag, Assist, and a printed card cost (D23, D29, D60). Q12.
10. What Combo counts, and whether that count is the same event as an attack declare (D24). Q12.
11. What `[Empower]`, `[Pierce]`, `[Reduce]`, `[Prevent]`, `[Desynthesize]`, forge yield, the first-forge waiver, Overcharge’s pip, and `[Convert N]` do (D15–D20, D40). Q13.
12. Whether attribute-exclusive verbs are current print (D34). Q14.
13. Which sections of the glossary a card author must follow, and which words that author still cannot look up (D33, D53, D56). Q15.
14. Where the bible text cited as `DEFINED` can be read, or whether those citations have no source in the corpus (D37). Q16.
15. What Dodge, Block, a miss, and a change to an Action’s damage, role, or ending do, given the deferred catalogue says they are unwired and the other docs name them (D31, D32, D56). Q17, Q20.
16. What the Open Manual Technique is (D55). Q17, Q23.
17. How much HP a light, medium, or heavy hit deals when the face does not print a number (D46). Q23.
18. Who starts as Aggressor, what Neutral and Open mean, and where Tag windows sit inside roll and actions (D45). Q22.
19. Whether the post-opening reroll of any number of dice and the actions-phase `[Reroll]` of one die are both play, and whether the opening roll absorbs pips (D42). Q21.
20. How Range, back-row hits, Reposition, and the KO replacement choice work when one passage says one frontline and another says two (D26, D27, D28, D59). Q19.
21. Whether repeating the same Action in one sequence is allowed (D30). Q4.
22. What to do with the archetype catalogue and the agent prompt, which label themselves as archaeology and as a task brief while still giving authoring and implementation instructions (D35, D36). Q18.
23. Whether the first-player win-rate observation is still an open product question (D57). Q24.
24. Whether a sixth distinct face on a die is a rule, a catalogue wish, or neither (D54). Q8, Q17.

`docs/OPEN_DESIGN.md` “Whether a creature’s fuel is capped” says the cap is `OPEN` and the decision is TBD. `docs/RULEBOOK.md` §17 says a fuel cap on absorbed tokens is not in play. Those sentences agree that no cap is stated as a current rule. They do not state whether the open question remains. That remainder is Q5.

## Cleanup requirements

“Clean” is a property of the corpus after a later pass. This section does not name the description that survives.

- A reader can follow one current description of a match from setup through victory without meeting a second unlabeled description of setup, turns, costs, combat, or victory.
- Every section that is not that current description is visibly labeled. The labels already used in the corpus (superseded, leftover, historical, archaeology, no longer in play, deferred, assumed, open, decided) are candidates only. Q3 chooses the label. This spec does not.
- A section that stays is not removed on the way to that label. Silent deletion is a failed cleanup.
- A section that is already labeled keeps that fact visible. The label is not treated as permission to ignore a second live section that still states the topic as current. Those pairs stay in the register until the user answers them.
- Repeated passages that agree (D50, D51) are either one passage or are explicitly marked as a restatement. They are not deleted on the grounds that they agree.
- Cross-references that name a heading are checked against that heading’s text. A reference that names the wrong heading is listed. It is corrected only after the user answers the related question. “Legendary commander victory” pointing at rulebook §1–§3 is one such reference (D5).
- The keyword glossary distinguishes current print from leftover print in a way a Rules-tab reader can see, because the file says HTML comments are stripped from that tab (D33). Card text and card effects still use the glossary. Completeness of the glossary is Q15. How AI instructions enforce it is spec 033.
- Status words in Open Design (`DEFINED`, `DECIDED`, `ASSUMED`, `OPEN`, `DEFERRED`, `SUPERSEDED`) match the relationship the user assigns between that row and the current description. This spec does not re-status any row.
- Playtest knobs and settled rules are distinguishable because the document says which is which. Stating a number and also saying the number is not decided, without saying which sentence the player follows, fails this (D7).
- A citation to a spec, agent, skill, rule file, or bible is labeled as a citation. The player rule it points at also lives in the current description, or the citation is marked as not a player rule. This spec does not move those rules.
- `docs/AGENT_PROMPT.md` and `docs/MECHANIC_ARCHETYPES.md` are either part of the current description, labeled as not current, or left in place under Q18. This spec does not archive them.

## Decisions

Recorded from the user. These are not suggestions.

**Q1.** Do not crown `docs/RULEBOOK.md`, `docs/KEYWORDS.md`, `docs/OPEN_DESIGN.md`, `README.md`, or `docs/specs/030-offensive-control.md` as the current game state. Suggestions A, B, and C are discarded. Create one new file. Its facts come from `src/server`. Where the server is missing or inconclusive, ask the user. Do not fill the gap from the old documents.

**Q2.** `docs/RULEBOOK.md`, the “Current print” section of `docs/KEYWORDS.md`, and `docs/OPEN_DESIGN.md` are updated to match the current game state. Text that solely refers to old versions and is no longer used is removed. The current game state for that update is the new file from Q1, once the server questions below are answered.

**Q3.** Leftover text does not stay in the game documents. It is removed so it cannot be confused with current text. Labeling it and leaving it in place does not satisfy this decision.

**Glossary (spec 033).** New keywords and edited card text may use the whole of `docs/KEYWORDS.md`. The entire file may be rewritten so the whole file fulfills card text for the new game version. Which operators that rewrite keeps follows the server comparison in Q25, including the renames in Q29 and Q30.

**Q27.** The new file does not replace `docs/RULEBOOK.md`. It is the source that `docs/RULEBOOK.md`, `docs/KEYWORDS.md`, and `docs/OPEN_DESIGN.md` are later updated from. The file is `docs/GAME_STATE.md`.

**Q28.** Ritual behavior still in `src/server` is dead code, kept to avoid rewiring code that will not be used. The new file omits it. Presence in the server is not by itself current play.

**Q29.** Forge and Replace are the same operation. The engine has two names. Forge already lasts for the rest of the match. The new word is Replace. The engine names (`ForgeRegion`, `FORGE_CARD`, `replaceFaceId`) are stated as the current engine names for that one operation.

**Q30.** Block and engine `reduce` are the same operation. The new word is Block. The engine name is `reduce` (`src/server/model/dice.ts`).

**Q31.** Equipment zone, as an attached card on a Fighter, is current: a moveset Modify moves the card to zone `"equipment"` and attaches it (`src/server/reducer/cardModify.ts`). The equipment play path is not currently used and may be useful later. Overload is no longer used; the new file omits it. Faces and face cards stay; they are still useful and will be used later. Ritual is omitted (Q28). Forge is the engine name of Replace (Q29).

**Q32.** The source file is [`docs/GAME_STATE.md`](../GAME_STATE.md), at the root of `docs/`. It does not replace `docs/RULEBOOK.md`.

**Q33.** The source file describes Equipment as the server uses it: a card can be attached to a Fighter in zone `"equipment"`. Card types stay `modify` and `response`. A Modify that attaches may be called Equipment. The unused equipment play path is not described as current play.

**Q34.** Anchor (`src/server/content/cards/card-anchor.json`) is a Modify that attaches. Calling it Equipment is acceptable. Its current print does not suit the game’s principles. The user will rewrite that card. The principle is Q35. This spec does not contain the replacement print.

**Q35.** A draw effect is not attached to a Fighter, and a draw effect does not trigger more than once without a restriction or a condition.

**Q36.** “Tied to a Fighter” means attached to a Fighter. Examples of a restriction or a condition: discarding cards, a Meter cost, a specific action, or a specific condition such as a specific Technique being played or a certain pattern. The list is not closed. “Pattern” is not defined.

**Q37.** An attached draw is acceptable when it is part of a Technique or part of an Assist. Those are examples.

**Q38.** An attached draw that is not part of a Technique or an Assist is also acceptable when it has a restriction or a condition. Examples: draw 2 and discard 1; pay X Meter to draw that many cards. “And so on” keeps the list open. This spec does not set X and does not treat 2 and 1 as the only legal amounts.

**Q45.** Counter and Parry are separate, and this file treats that split as already in place. Counter negates the previous chain card. Parry negates an attack and leaves you offensive. This spec does not name a new engine effect for the split.

**Q46.** Only Parry ends the sequence. Counter does not. Parry is `grant-attack-prevent` with `endsSequence`. Counter is `negate-card`.

**Q47.** Parry hands the turn to the other player because it ends the sequence. Counter does not end the sequence, so it does not hand the turn.

**Q48.** The difference between ending a sequence and ending a turn is not decided. Until it is, whenever a sequence ends, the turn is handed to the opponent.

**Q11.** Answered from the server and written in `docs/GAME_STATE.md` under Chain. A face action, a Technique, a hit Assist, Tag, a Response, and a Modify enter the Chain and open a reaction window. The player who added the object keeps priority. Two passes in a row resolve the Chain from the top down, with no new window between objects. During the window the priority player may pass, play a Response, play a Modify that names a subject, or declare an Assist that is not a hit. Card Meter is spent when the card is played. A sequence hit’s Meter is spent when the hit resolves and is not negated.

**Q23.** Answered for the number. Light, medium, and heavy do not have an HP value. They set the Meter grant (2, 3, and 4). The damage is the printed `[Strike N]`. Open Manual’s Technique is not printed. This spec does not invent it.

**Q4.** Answered from the server comparison already recorded. Absorption, rituals, overloads, and the turn pool are omitted. The current play is the Fighter, Response, Modify, Meter, Tag, Assist, and named-die text in `docs/GAME_STATE.md`. `attacksPerCreaturePerCombat` caps the old attack action. It does not cap a sequence hit. The same face id and the same Technique id cannot be declared again while that id is on the Chain or in `usedSequenceActionIds`.

**Q5.** Answered. Neither a persistent attribute pile nor a turn pool is current play. `[Requires]`, `[Spend]`, ritual Active-when, Resonance, `[Generate]`, `[Discount]`, and absorbing pips are not current play. End-of-turn symbol deletion is omitted (Q40).

**Q6.** Answered. Shield is absent (Q43).

**Q7.** Answered. Card types are `modify` and `response`. A moveset Modify attaches in the equipment zone. The unused equipment play path, Overload, and Ritual are not current play. Replace writes a face onto a die for the rest of the match (Q29).

**Q8.** Answered. Each player brings 3 dice. The face deck is not current play (Q42). The opening hand is 5. Copying an already-installed face is the old forge-pool rule and is not current play.

**Q9.** Answered. A player whose every Fighter is defeated loses. If both are in that state, the active player loses. Defeating a legendary Fighter does not by itself end the match. Drawing from an empty deck loses.

**Q10.** Answered. The shared deck has 10 to 24 cards, at most 3 copies, an opening hand of 5, and a draw of 1. There is no maximum hand size. Drawing from an empty deck loses. Milling an empty or short deck does not.

**Q12.** Answered. Meter gain and spend are the Meter section of `docs/GAME_STATE.md`. A Tag switch does not spend Meter. An Assist spends `exceptionalAssistMeter` only when that number is greater than 0. No face in the current squad is a tag face or an assist face. A successful hit that does not end the sequence adds 1 to combo.

**Q19.** Answered. The board is one Active Fighter on `frontline` and two Reserve Fighters on `back` (`frontlineSlots` is 1). The Board section of `docs/GAME_STATE.md` records the KO replacement. Range and Reposition are not used by the current list.

**Q20.** Answered. A face hit and a Technique are the hits a Parry or a Block answers. Counter refuses a hit. Block lowers damage and does not cancel the hit. Dodge is not a current effect. `[Strike]`’s default target is the opponent’s Active Fighter.

**Q21.** Answered. After the opening roll, the active player may reroll one or more of their own dice once. There is no second reroll. The opening roll does not absorb symbols.

**Q22.** Answered. Entering `actions` makes the active player the Aggressor and sets the state to `open`. The engine states that are set are `open` and `combo`. There is no Neutral state. Tag’s opening and closing windows are the Tag section of `docs/GAME_STATE.md`.

**Q13.** Answered. The damage order is the Damage section of `docs/GAME_STATE.md`. Reduce is Block (Q30). Empower, Pierce, Desynthesize, Convert, forge yield, forge bank, the first synthetic forge, and Overcharge’s pip source are not current play. No card in the current list uses them.

**Q14.** Answered. Attribute-exclusive verbs are leftover print. They are not current print and are not used on a new card.

**Q15.** Answered. The operators current play uses are the keyword table in `docs/GAME_STATE.md`. An operator that only describes the old game is not used on a new card. The glossary may still be rewritten. Dodge is named in `docs/KEYWORDS.md` and is not a current effect, so that rewrite does not keep it as current print.

**Q16.** Answered. No bible file is in the repository. Citations to it are leftover. They are not a player rule and are not filled in.

**Q17.** Answered. Dodge is not current play. Block is current: Brace is `[Block 2]`. Changing a printed Action’s damage, role, or sequence end is not current play. A Moveset adds a Technique. Open Manual’s Technique is not printed. A sixth distinct face is not a current rule. An Assist with `exceptionalAssistMeter` omitted spends 0. The config value `assistMeterCost` of 1 is not what `assist.ts` spends.

**Q18.** Answered. `docs/AGENT_PROMPT.md` is the old opening-dice task. `docs/MECHANIC_ARCHETYPES.md` records the previous pile-fuel skirmish. Neither is a source for the current game. Under Q3, text that only describes that old game is removed when the game documents are cleaned. This answer does not delete those files and does not crown spec 030.

**Q24.** Answered. The recorded first-player win rate is an old observation. It is not a rule. `docs/GAME_STATE.md` does not state a win rate. Turn 1 is the first player in the setup list.

## Suggestions for Q1

Discarded. The user rejected choosing among existing documents. The decision is in **Decisions**. The three options are kept here so the rejection is visible.

Offered earlier, then discarded:

**A. Split the jobs across the passages that already agree on a 3v3 tag fighter.** How the game plays would be the tag-fighter sentences in `docs/RULEBOOK.md` §1, the opening of `README.md`, and `docs/OPEN_DESIGN.md` “Engine cleanup (2026) — no longer in play” plus “Offensive control” / “Decided”, and only where those passages agree. Card text would be `docs/KEYWORDS.md` “Current print” after leftover headings are removed. Unsettled rules would stay in Open Design after old-only rows are removed. This option leaves deck size, damage numbers, Meter amounts, and the chain as Q4–Q24. It also leaves a clash inside that set: rulebook §1 still describes Combo, and Open Design “Offensive control” says “No Combo Meter.”

**B. Use `docs/specs/030-offensive-control.md` as the source of the current design, then rewrite the rulebook, the glossary, and Open Design to it.** `README.md` and the Open Design introduction already point content authors at that spec. Open Design “Offensive control” says the 2026-10-03 build follows its Decided list. The spec’s own status line says **DESIGN**. Choosing this option makes a spec the authority for the game documents. Spec 031 did not treat specs as authority until the user says so.

**C. Use shipped play in `src/server` as the current game state, then rewrite the game documents to match what a match actually does, and remove doc text that only describes behavior the engine no longer has.** The audit that produced this spec did not read the engine as authority. This option is the user choosing that source. This spec does not claim what the engine currently does.

`docs/KEYWORDS.md` “Current print” is not offered as the answer to Q1. It is print vocabulary. It does not state the turn, victory procedure, or costs that “how the game plays” needs. The whole of `docs/RULEBOOK.md` as it stands is not offered either: §§5–12 and §1 describe different games, and Q2 removes text that solely refers to an old version.

## Open questions

Numbered for the register. No recommended answer. Q1–Q48 are answered above. Q48 is a working assumption, not a closed distinction. Q23’s Open Manual Technique is still not printed. The numbered questions in this list are answered. The discrepancy rows D1–D60 are not each closed by a separate edit of the old documents. That cleanup follows Q2 and Q3 and uses `docs/GAME_STATE.md` as the source.

Q1. Answered. See **Decisions**. Suggestions A, B, and C are discarded.

Q2. Answered. See **Decisions**.

Q3. Answered. See **Decisions**.

Q25. Answered. All three groups are leftover candidates: headings that already say leftover, historical, superseded, archaeology, or no longer in play; the unlabeled chapters of `docs/KEYWORDS.md`; and `docs/RULEBOOK.md` §§5–12. Each candidate is compared to `src/server` before it is removed, because some names are renames, some keywords are reused, and some sections are already rewritten. The user’s examples: forge is becoming replace, reduce is becoming block, rulebook §9 is already rewritten for the new game, and ritual cards are no longer part of the game. The comparison still has to be confirmed where the server and that description disagree (Q28–Q31).

Q26. Answered. A mixed passage is handled from the server’s current behavior. The new text uses the new game’s verbiage and states the name the engine uses now. The passage is rewritten in place, or deleted and replaced by a new version that teaches the new game.

Q27. Answered. The new file is the source that the rulebook, the glossary, and Open Design are later updated from. It does not replace `docs/RULEBOOK.md`. Path and title are Q32.

Q28. Answered. Ritual code still in the server is dead, kept to avoid rewiring, and will not be used. The new file omits it.

Q29. Answered. Forge and Replace are one operation. Forge already lasts for the rest of the match. The two engine names are wording, not two operations.

Q30. Answered. Block is the new word for engine `reduce`. One operation, same pattern as Replace and forge.

Q31. Answered. The equipment zone used by moveset cards, attaching a card to a Fighter, is current. The equipment play path is not currently used and may be useful later (Q33). Overload is no longer used and is omitted. Faces and face cards stay. Ritual is omitted. Forge is Q29.

Q32. Answered. The source file is `docs/GAME_STATE.md`.

Q33. Answered. Describe Equipment as it is used. Card types stay `modify` and `response`. A Modify that attaches may be called Equipment.

Q34. Answered. Anchor is a Modify that attaches. Calling that attachment Equipment is acceptable. The user will rewrite the card because the current print does not suit the game’s principles. The replacement print is not in this spec.

Q35. Answered. A draw effect is not tied to a Fighter, and a draw effect does not trigger more than once without a restriction or a condition. Anchor’s current print does both: it attaches to a Fighter and draws 1 at the start of each of your turns. The user will rewrite the card. This spec does not contain the replacement print.

Q36. Answered. “Tied to a Fighter” means attached to a Fighter. Examples of a restriction or a condition: discarding cards, a Meter cost, a specific action, or a specific condition such as a specific Technique being played or a certain pattern. The list is not recorded as closed. “Pattern” is not defined here.

Q37. Answered. An attached draw is acceptable when it is part of a Technique or part of an Assist. The user gave those as examples.

Q38. Answered. Discarding cards, a Meter cost, or a specific action can make an attached draw legal when that draw is not part of a Technique and not part of an Assist. Examples: draw 2 and discard 1; pay X Meter to draw that many cards. The list stays open. X is not set.

Q39. Answered. The current preset is `TAG_FIGHTER_RULES`. Drawing from an empty deck is a loss.

Q40. Answered. End-of-turn symbol deletion is leftover that still runs. `docs/GAME_STATE.md` omits it.

Q41. Answered. The per-HP Meter grant is leftover from an older Meter implementation. `docs/GAME_STATE.md` omits it.

Q42. Answered. The face deck is not current play. It is the future physical representation of a face after Replace. Ryu Form writes Form onto Ryu’s die and has no separate face card today. In the physical game that card comes from the face deck. The online game does not need it.

Q43. Answered. Shield is leftover. `docs/GAME_STATE.md` omits it.

Q44. Answered. Brace is `[Block 2]` and its effect is `reduce-damage`. Block is `reduce` and `reduce-damage`: it lowers damage and does not cancel the hit. Attack prevention was described as counter or parry, distinct from Block. Q45 and Q46 record Counter and Parry.

Q45. Answered. Counter and Parry are separate, and the source file treats that split as already in place. Counter negates the previous chain card. Parry negates an attack and leaves you offensive. The spec does not name a new engine effect for the split.

Q46. Answered. Only Parry ends the sequence. Counter does not. Parry is `grant-attack-prevent` with `endsSequence`. Counter is `negate-card`.

Q47. Answered. Parry hands the turn to the other player because it ends the sequence. Counter does not end the sequence, so it does not hand the turn.

Q48. Answered as a working assumption. The difference between ending a sequence and ending a turn is not decided. Until it is, whenever a sequence ends, the turn is handed to the opponent.

Q4. Answered. See **Decisions**.

Q5. Answered. See **Decisions**.

Q6. Answered. Shield is absent (Q43).

Q7. Answered. See **Decisions**.

Q8. Answered. See **Decisions**.

Q9. Answered. See **Decisions**.

Q10. Answered. See **Decisions**.

Q11. Answered. See **Decisions**. The procedure is the Chain section of `docs/GAME_STATE.md`.

Q12. Answered. See **Decisions**.

Q13. Answered. See **Decisions**.

Q14. Answered. See **Decisions**.

Q15. Answered. See **Decisions**. The glossary file may still be rewritten. Dodge is not current print.

Q16. Answered. See **Decisions**.

Q17. Answered. See **Decisions**.

Q18. Answered. See **Decisions**.

Q19. Answered. See **Decisions**. The board is the Board section of `docs/GAME_STATE.md`.

Q20. Answered. See **Decisions**.

Q21. Answered. See **Decisions**.

Q22. Answered. See **Decisions**.

Q23. Answered for the number. See **Decisions**. Light, medium, and heavy have no HP value. Open Manual’s Technique is not printed.

Q24. Answered. See **Decisions**. The observation is not a rule.

## Acceptance criteria

For a future design and tasks pass. Empty of implementation steps.

- [ ] Q1 is answered by the user or explicitly deferred before specs 032, 033, and 034 treat any game document as the winner. Q2 and Q3 are answered in **Decisions**.
- [ ] Every register row D1–D60 is answered by the user or explicitly deferred. No row is closed inside the requirements spec.
- [ ] No row is closed by treating a spec, agent, skill, rule file, or source file as authority over the corpus.
- [ ] The keyword-glossary requirement is still in force: card text and card effects use `docs/KEYWORDS.md`, and AI enforcement of that use is left to spec 033.
- [ ] Q15 is answered or explicitly deferred, including whether the glossary is complete and which sections are current versus leftover.
- [ ] Cleanup uses the “Cleanup requirements” section only after the related questions have answers. The surviving description is the user’s answer, not a choice made in this spec.
- [ ] Removal follows Q2 and Q3: text that solely describes an old, unused version is removed from the game documents. Mixed passages stay until Q26 is answered. Nothing is deleted before Q1 and Q25 are answered.
- [ ] Agreements A1–A23 remain recorded as agreements.
- [ ] Missing-information questions remain unanswered until the user answers them. No damage number, phase, cost, victory rule, or deletion list is added to fill them.
- [ ] Coupling risks remain citations. A later pass that follows a cited spec says so as a user decision, not as a finding of this spec.
- [ ] This file stays requirements-only until that later pass. Design and task breakdown are a separate change.

## Not in this spec

- No design.
- No task list.
- No file edits besides this spec.
- Q2 and Q3 are recorded as answered. Q1 and Q4–Q26 are not resolved here.
- No chosen winner among suggestions A, B, and C.
- No inventory of agents, skills, or rules (spec 032’s job begins at inventory; spec 033 rewrites them).
- No new AI workflow (spec 034).
