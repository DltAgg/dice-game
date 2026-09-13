---
name: author-interactions
description: >-
  Create or improve Dice Skirmish Cursor subagents, skills, rules, and
  TOOLS.md so human-to-AI routing stays accurate. Use when adding a
  specialist, rewriting a prompt, fine-tuning a skill or .mdc rule, or when
  the user mentions agents, skills, AGENTS.md, or prompt engineering.
---

# Author human-to-AI interactions

Used by the **prompt-engineer** subagent. Parent threads may load this skill
for a one-file tune; new specialists still go through `.cursor/agents/prompt-engineer.md`.

This skill is the path for **agents, skills, rules, and tool docs** — not
for game rules or catalogue data. Design canon and play stay with the
specialists listed in `AGENTS.md`.

## Inventory (this repo)

| Kind | Path | Peers to copy |
|---|---|---|
| Subagent | `.cursor/agents/<name>.md` | `card-designer.md`, `engine-developer.md`, `match-ui.md`, `deck-designer.md` |
| Skill | `.cursor/skills/<name>/SKILL.md` | `author-content/SKILL.md`, `develop-engine/SKILL.md` |
| Skill extras | same folder, one level deep | `author-content/design.md`, `implement-hooks/reference.md` |
| Always-on rule | `.cursor/rules/*.mdc` | `dice-game-core.mdc` |
| Glob rule | `.cursor/rules/*.mdc` | `content-catalogues.mdc`, `metrics-layer.mdc` |
| Routing | `AGENTS.md`, `README.md` | existing specialist tables |
| Commands | `TOOLS.md` | current tables only |

Glob those directories before you write a path. **Do not cite a file that is
not in the repo.**

## Classify

| Request looks like | Artifact |
|---|---|
| “New agent”, specialist persona, “use the X subagent” | `.cursor/agents/<name>.md` |
| Checklist, layout cheat sheet, “how to do X” | `.cursor/skills/<name>/SKILL.md` |
| Persistent constraint on every chat or on a glob | `.cursor/rules/<name>.mdc` |
| Commands / DoD / test map agents should run | `TOOLS.md` |
| When to launch whom | `AGENTS.md` + `README.md` + `dice-game-core.mdc` + `slice-changes` |

Prefer a **skill** for steps and a **short agent** for identity/scope. Do not
paste the same essay into both.

## Agent shape (copy a peer)

YAML frontmatter:

- `name`: kebab-case, matches filename without `.md`
- `description`: third person; WHAT + WHEN; **Use proactively…** / **Do not use for…** naming the other specialists

Body, in this order (see `card-designer.md`):

1. Identity (“You are…”)
2. Scope (one concern; slice)
3. Read first (every invocation) — real paths only
4. Mission
5. Hard rules
6. Handoff / out of scope table
7. Workflow checklist
8. Verify (commands from `TOOLS.md` if the specialist touches `src/`)
9. When done (what to report; what to ask)

## Skill shape (copy a peer)

- `name` + `description` (WHAT + WHEN, trigger terms, third person)
- Keep `SKILL.md` short. Extra detail goes to a sibling `.md` linked from
  the skill (one level deep), like `author-content/tactics.md`
- Tables for paths that exist; checklists for workflows
- Point at the owning subagent; do not re-teach engine purity or print voice

## Rule shape (copy a peer)

```markdown
---
description: One-line purpose
globs: src/server/content/**/*   # omit if always-on
alwaysApply: false
---
```

- One concern. Keep it short.
- `alwaysApply: true` only for routing every session needs (`dice-game-core.mdc`).
- File-scoped work uses `globs` (`content-catalogues.mdc`, `engine-purity.mdc`,
  `metrics-layer.mdc`, `rulebook.mdc`, `keywords.mdc`).

## Create vs improve

**Create:** pick the closest peer, clone its sections, fill only this
specialist’s lane, wire routing.

**Improve:** read the current file. Tighten description, do-not-use, stale
paths, missing handoffs. Do not mass-rewrite other specialists in the same
change.

If the user gives exact wording for the persona or a rule, put it in the
artifact **verbatim**.

## Routing lockstep

When you **add or rename** a subagent, update all of:

1. `.cursor/agents/<name>.md`
2. `AGENTS.md` — Content vs engine row + Subagents table
3. `README.md` — Cursor specialists table
4. `.cursor/rules/dice-game-core.mdc` — one routing bullet
5. `.cursor/skills/slice-changes/SKILL.md` — Decide-in-30-seconds row if parents must route there

A new skill used by an existing agent is enough to mention in that agent’s
Read first list. Do not add a fifth always-on rule for it.

## Anti-patterns

- Implementing `src/server` or `src/client` from this skill
- Linking `docs/specs/999-…` or a skill folder that does not exist
- A new specialist that owns cards, reducer, MatchBoard, or loadouts
- A new `alwaysApply` rule that restates `AGENTS.md`
- Rewriting every `.cursor/agents/*.md` in one change
- Putting functions, closures, or game effects into a prompt instead of
  briefing `engine-developer` / `card-designer`

## Workflow

```text
- [ ] 1. Classify the artifact
- [ ] 2. Glob + read the closest peer and the file being edited
- [ ] 3. Author or patch one artifact
- [ ] 4. Wire routing if names changed
- [ ] 5. Grep cited paths against the repo
- [ ] 6. Hand domain work to the owning subagent
```
