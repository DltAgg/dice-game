# Face ids

## Intent

Face files and ids still carry the leftover `natural` token and, on kit
faces, the Fighter’s name (`face-` + `natural-magnus-power-grab`). Those tokens
are not kinds and not part of the move. A face id is the move:
`face-power-grab`. Future face files follow that shape.

The player-facing `name` is already the move (“Power Grab”, “Jab”). Do not
rename the move. Do not change Strike, strength, role, or effects except
where a file already differs from HEAD in this worktree.

## Rules

This change does not change how a hit, a Technique, or Meter plays. It
changes the id contract and the authoring rule.

Id shape: `face-` plus the move slug. No `natural`, `synthetic`, or
`untyped` segment. No Fighter name (`magnus`, `vega`, `ryu`, or any later
Fighter) in the id or the file name.

Current renames:

| From | To |
|---|---|
| `face-` + `natural-jab` | `face-jab` |
| `face-` + `natural-grab` | `face-grab` |
| `face-` + `natural-magnus-power-grab` | `face-power-grab` |
| `face-` + `natural-vega-quick-grab` | `face-quick-grab` |
| `face-` + `natural-magnus-boot-kick` | `face-boot-kick` |
| `face-` + `natural-vega-flash-kick` | `face-flash-kick` |
| `face-` + `natural-kick` | `face-kick` |
| `face-` + `natural-ryu-forward-rush` | `face-forward-rush` |
| `face-` + `natural-vega-blitz-rush` | `face-blitz-rush` |
| `face-` + `natural-magnus-bull-rush` | `face-bull-rush` |
| `face-` + `natural-rush` | `face-rush` |
| every other `face-` + `natural-<move>` | `face-<move>` |

`face-` + `natural-vega-quick-grab.json` in this worktree is already a light
punch with Strike 1 and secondary +1. Keep those numbers on `face-quick-grab`.
Do not restore the committed medium / Strike 2 text.

Update the schema pattern, id constants, catalogue references, tests, and
docs that cite the old ids. Update the authoring rule so a new face file
cannot reintroduce `natural` or a Fighter name. The rule lives with the
face authoring skill and the catalogue rule agents already read. One
sentence in `AGENTS.md` is enough if that file still tells agents the old
prefix is required.

## State Changes

None. Ids are definition identity. In-progress matches are not migrated.

## Actions

None.

## Acceptance

- No content, test, or doc path still contains a face id with a kind token
  (`natural`, `synthetic`, or `untyped`) as its own segment.
- No face id or face file name contains `magnus`, `vega`, or `ryu`.
- Schema accepts `face-jab` and rejects an id that inserts a kind token
  before the move.
- Quick Grab stays light, Strike 1, secondary +1.
- Authoring docs tell the next face file to use `face-<move>` with no
  kind token and no Fighter name.
- `npm run typecheck && npm test && npm run lint` pass.

No game code belongs in this spec.
