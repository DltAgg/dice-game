# 008 — Reaction chain & negate card

Status: **IMPLEMENTED**

Phase A foundation for the deferred-catalogue campaign. Unlocks honest
negation for Runic Nullification and Arcane Silence. True prevent
(Prismatic Barrier, Luminar Judgement, Glimmer) is a follow-up spec (`009`).

Design cites: `docs/OPEN_DESIGN.md` — “Reactions use a Yu-Gi-Oh style chain”
and “Damage prevention” (DECIDED / partial 2026-08-12). Bible §37, §43.

## Intent

Players can respond on a last-in, first-out chain before card plays, attaches,
ritual activations, and attacks fully resolve. Negate answers **card-sourced**
links (top only), filtered by `negate-card.cardTypes`. Attacks open the same
window but are answered with **prevention** (vocabulary in `009`), not negate.
Costs are paid when the link is built; once both seats pass and a link
conducts, its body cannot be interrupted.

## Rules

1. **Chain = LILO.** Links stack and resolve last-in, first-out.
   (`OPEN_DESIGN`; seed: `GameState.resolutionStack`.)
2. **Turn player starts.** Priority to open a chain; after a link is added,
   priority passes to the opposing seat; seats alternate; a seat may add
   another link after the opponent passes. (`OPEN_DESIGN` 2026-08-12.)
3. **Explicit pass.** Resolve only after both seats `PASS_PRIORITY` in
   succession. (`OPEN_DESIGN` 2026-08-12.)
4. **Window timing.** Open **after** costs for that link are paid and
   **before** the body runs. After a link starts conducting, it runs to
   completion. (`OPEN_DESIGN`; bible §43.)
5. **What opens a window** (after costs, before body):
   - Tactic effect play (instant / reaction from hand);
   - Ritual placement onto the engine field;
   - Ritual activation (including ritual-reactions);
   - Equipment attach;
   - Overload attach;
   - Attack declaration.
6. **What does not open a window:** `FORGE_CARD` only.
7. **Legal responders:** hand `reaction` cards, and ready ritual-reactions.
8. **Response kinds:**
   - **Negate** — `negate-card`: legal only when the **top** link is a
     card-sourced link (effect / ritual place / ritual activate / equip /
     overload) whose source card matches the effect's `cardTypes` filter
     (`"any"` or listed main types). Illegal against an **attack** link.
     `FORGE_CARD` never opens a window, so forge is out of scope for negate.
   - **Negate ritual** — `negate-ritual`: legal only when the **top** link is
     `ritual-place` or `ritual-activate` (and not already negated). Against a
     non-ritual top, play is refused (`INVALID_CHAIN_TARGET`); if somehow
     resolved against a non-ritual top, the effect whiffs. Seal the Rite.
   - **Prevent** — response path for attack / damage (`009`; not required to
     ship negate in this slice, but attack links must still open the window
     so prevent can plug in).
9. **Negate** targets the **top** chain link only. (`OPEN_DESIGN`; print:
   Runic Nullification, Arcane Silence, Fade — `002`; Seal the Rite — ritual-only.)
10. **Runic Nullification.** Place as ritual (`playCost` 2 Arcane). `[Active when:
    Arcane + Arcane]` → ready. Activation pays **`[Spend: 2 x Arcane]`**, then
    negates the top link if its source card is an **Instant**
    (`negate-card` / `cardTypes: ["instant"]`).
11. **Arcane Silence.** Hand reaction; header cost 3; negate top card link
    (`negate-card` / `cardTypes: "any"`).
11b. **Seal the Rite.** Hand reaction; header cost 3; `negate-ritual` only.
11c. **Fade.** Hand reaction; header cost 3; `negate-card` / `cardTypes: "any"`.
12. **No mid-conduct reactions.** While `pendingDecision` is `search-deck`,
    `search-graveyard`, `discard-cards`, `choose-creature`, or `choose-ritual`,
    no reaction window — those choices are part of conducting.
13. **Negated card link.** Costs stay paid; body skipped. Ritual place:
    card never sits preparing (ends in GY). Equip/overload: attach does not
    land. Ritual activate: continuous and reaction rituals stay and exhaust;
    leftover instant-subtype rituals leave for the graveyard after resolving.
    apply after the activation attempt (costs paid).

## State Changes

| Field | Change |
|---|---|
| Chain / `resolutionStack` | Links with: controller, source card/attack ref, payload, `negated`, **kind** (`tactic-effect` \| `ritual-place` \| `ritual-activate` \| `equip-attach` \| `overload-attach` \| `attack`). |
| `pendingDecision` | `reaction-window`: `priorityPlayerId`, pass tracking. Priority seat may Pass, play legal reaction, or activate legal ritual-reaction. |
| Events | `chain-link-added`, `reaction-window-opened`, `priority-passed`, `chain-link-negated`, `chain-link-resolved` (names flexible). |

Turn end is evaluated only after the chain (and nested choices) fully finish.
Voluntary `END_TURN` or effect-driven turn end is unchanged.


## Actions

| Action | Role |
|---|---|
| `PLAY_CARD` | After costs: for effect / ritual-place / equip / overload → push link of the matching kind, open `reaction-window` (priority → opponent). |
| `ACTIVATE_RITUAL` | After activation costs (Nullification +3) → push `ritual-activate` link, open window. |
| `ATTACK` | After attack costs / legality → push `attack` link (damage not applied yet), open window. Negate effects targeting this link fail validation. |
| `FORGE_CARD` | Unchanged; no window. |
| `PASS_PRIORITY` | **New.** Priority seat only. Both seats passed in succession → close window and drain chain per resolution rules. |
| Resolve helpers | `RESOLVE_*` unchanged; exclusive while their decision is pending. |

## Validation

- `PASS_PRIORITY`: actor is priority seat; reaction window open.
- Hand reaction / ritual-reaction: priority seat; card legal; costs met.
- `negate-card`: top link exists, kind is negatable card kind, source card
  matches `cardTypes` (`"any"` or listed main types), not already negated —
  **not** `attack`.
- `negate-ritual`: top link exists, kind is `ritual-place` or
  `ritual-activate`, not already negated.
- No respond/pass while a non-reaction `pendingDecision` is set.
- While a reaction window is open, a non-priority seat is refused with
  `NOT_PRIORITY_PLAYER` (not `PENDING_DECISION` / `NOT_ACTIVE_PLAYER`).
- `FORGE_CARD` never opens a reaction window.

## Resolution

```text
Eligible play / activate / attach / attack
  → pay costs (mandatory; kept even if later negated)
  → push chain link (body not applied yet)
  → pendingDecision = reaction-window (priority = opponent)
  → … PASS / respond loop …
  → both passed in succession
  → drain remaining chain LILO without reopening windows between links
      (ASSUMED — see below)
      for each link: if negated → skip body; else conduct body
```

**v1 chain drain (ASSUMED):** Once both seats pass, resolve the entire
remaining chain LILO without reopening windows between links. New windows
only when a **new** link is added during an open window.

Attack link body (when not prevented away in `009`): apply attack damage via
existing combat path. Until `009`, attack links still open/close windows so
priority Pass lets the attack conduct as today after double-pass.

## Networking

Host authority unchanged (`007`). Clients send `PLAY_CARD`, `ACTIVATE_RITUAL`,
`ATTACK`, and `PASS_PRIORITY` intents. Host broadcasts full `GameState`
including chain + `reaction-window`.

## Persistence

None.

## UI

- Show open chain (top link kind + summary) when `reaction-window` is set.
- Show whose priority; **Pass priority** for that seat.
- Enable legal hand reactions / ready ritual-reactions for the priority seat.
- Disable `negate-card` affordances when top link is `attack` (prevent UI in `009`).
- Enable `negate-ritual` (Seal the Rite) only when top is `ritual-place` or
  `ritual-activate`.

## Acceptance Criteria

- [ ] Spec + OPEN_DESIGN DECIDED entries are source of truth
- [ ] `PASS_PRIORITY` + `reaction-window` in engine
- [ ] Effect play, ritual place/activate, equip, overload, attack open windows
- [ ] Forge does not
- [ ] Double pass resolves LILO; negated tactic link skips body
- [ ] Negate illegal against top `attack` link
- [ ] Runic Nullification + Arcane Silence fully wired and tested
- [ ] No reaction mid search / discard / choose-creature / choose-ritual
- [ ] Host broadcasts chain state
- [ ] DoD green; `DEFERRED_CATALOGUE.md` updated for chain + negate + those two cards

## Tests

- [ ] Instant play → Pass ×2 → effect resolves
- [ ] Nullification negates top tactic link; pile spend accounted
- [ ] Silence from hand negates top tactic link
- [ ] Negate rejected when top is `attack`
- [ ] Seal the Rite negates ritual place / activate; refused against tactic top
- [ ] Attack opens window; Pass ×2 → damage applies (pre-`009`)
- [ ] Equip / overload / ritual place open window; negate cancels attach/place
- [ ] FORGE_CARD leaves no reaction window
- [ ] Search pending blocks Pass / Silence
- [ ] Purity guard green

## Out of scope

- Prevent buffers / prevent-N-attacks / Barrier migration (`009`)
- Phase B trigger hooks
- Choose-any-link negate; per-link windows during drain
- Attack negate
- Engine ability activations as chain links (not decided)
