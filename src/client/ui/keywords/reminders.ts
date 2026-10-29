import {
  formatEffectRegion,
  formatTypeLine,
  type CardDefinition,
  type FaceCardDefinition,
} from "@server";

/** One row in the hover aside / inspect Keywords list. */
export interface KeywordReminder {
  readonly token: string;
  readonly reminder: string;
}

const BRACKET_TOKEN = /\[[^\]]+\]/g;

const TOKEN_X_REMINDERS: Readonly<Record<string, string>> = {
  Toxin: "Ticks 1 damage per counter at that creature's owner's turn start.",
  Shield: "Prevents 1 damage then is spent.",
  Corruption: "Marker on an opposing synthetic face.",
  Pestilence: "Spreads per the token's rule.",
};

type StemRule = {
  readonly test: (body: string) => boolean;
  readonly reminder: string;
  /** Label in the keyword list. One label, even when the card prints it twice. */
  readonly display: string | ((body: string) => string);
};

/** First matching rule wins. Order matters (e.g. Mark-on-attacks before Mark). */
const STEM_RULES: readonly StemRule[] = [
  {
    test: (body) => /^Mark\b/i.test(body) && /\bon attacks$/i.test(body),
    reminder: "Until end of turn, each of your attacks Marks N X on the attack target.",
    display: "[Mark N X on attacks]",
  },
  {
    test: (body) => /^Mark\b/i.test(body),
    reminder: "Put N of token X on the printed target, now.",
    display: "[Mark N X]",
  },
  {
    test: (body) => /^Strip\b/i.test(body),
    reminder: "Remove up to N of token X. Legal if none remain.",
    display: "[Strip N X]",
  },
  {
    test: (body) => /^Generate\b/i.test(body),
    reminder: "Add N of symbol X to your pool this turn.",
    display: "[Generate N X]",
  },
  {
    test: (body) => /^Forge\b/i.test(body),
    reminder: "Install matching faces (your or opponent's die as printed).",
    display: "[Forge]",
  },
  {
    test: (body) => /^Overcharge$/i.test(body),
    reminder:
      "Spend a hand card onto an attribute face card; all dice showing it Generate +1 of the spent card's attribute.",
    display: "[Overcharge]",
  },
  {
    test: (body) => /^Negate(?:\s+(?:Instant|Ritual))?$/i.test(body),
    reminder: "Negate top matching card chain link.",
    display: "[Negate]",
  },
  {
    test: (body) => /^Destroy\s+(?:Equipment|Ritual|Overload)$/i.test(body),
    reminder: "Send one matching field card to GY.",
    display: "[Destroy]",
  },
  {
    test: (body) => /^Bounce(?:\s+(?:Ritual|Equipment|Overload))?$/i.test(body),
    reminder: "Return one matching field card to its owner's hand.",
    display: "[Bounce]",
  },
  {
    test: (body) => /^Strike(?:\s+\d+)?$/i.test(body),
    reminder: "Deal N damage (default chosen enemy).",
    display: "[Strike N]",
  },
  {
    test: (body) => /^Heal(?:\s+\d+)?$/i.test(body),
    reminder: "Heal N.",
    display: "[Heal N]",
  },
  {
    test: (body) => /^Draw(?:\s+\d+)?$/i.test(body),
    reminder: "Draw N.",
    display: "[Draw N]",
  },
  {
    test: (body) => /^Discard(?:\s+\d+)?$/i.test(body),
    reminder: "Discard N.",
    display: "[Discard N]",
  },
  {
    test: (body) => /^Empower(?:\s+\d+)?$/i.test(body),
    reminder: "Next attack this turn deals +N.",
    display: "[Empower N]",
  },
  {
    test: (body) => /^Frenzy(?:\s+\d+)?$/i.test(body),
    reminder: "May declare N extra attacks this turn (default 1).",
    display: "[Frenzy N]",
  },
  {
    test: (body) => /^Pierce(?:\s+\d+)?$/i.test(body),
    reminder: "Ignore N Shield after Prevent.",
    display: "[Pierce N]",
  },
  {
    test: (body) => /^Reduce(?:\s+\d+)?$/i.test(body),
    reminder: "That incoming hit deals N less (min 0), before Prevent and Shield.",
    display: "[Reduce N]",
  },
  {
    test: (body) => /^Prevent(?:\s+\d+)?$/i.test(body),
    reminder: "Prevent the next attack against the creature under attack (before Shield). Reaction only.",
    display: "[Prevent N]",
  },
  {
    test: (body) => /^Silence$/i.test(body),
    reminder:
      "Chosen opposing creature, field ritual, or die slot cannot fire until the start of your next turn.",
    display: "[Silence]",
  },
  {
    test: (body) => /^Desynthesize$/i.test(body),
    reminder: "Replace a synthetic attribute face on any die with that attribute's natural.",
    display: "[Desynthesize]",
  },
  {
    test: (body) => /^Drain(?:\s+\d+)?$/i.test(body),
    reminder: "Deal up to N to a chosen enemy; heal your most-damaged ally for HP lost.",
    display: "[Drain N]",
  },
  {
    test: (body) => /^Convert(?:\s+\d+)?$/i.test(body),
    reminder: "Convert up to N pool symbols into Naturals.",
    display: "[Convert N]",
  },
  {
    test: (body) => /^Discount(?:\s+\d+)?$/i.test(body),
    reminder: "Next matching play/forge costs N less (min 0).",
    display: "[Discount N]",
  },
  {
    test: (body) => /^Insight(?:\s+\d+)?$/i.test(body),
    reminder: "Top N; 1 to hand, rest bottom.",
    display: "[Insight N]",
  },
  {
    test: (body) => /^Search(?:\s+\d+)?$/i.test(body),
    reminder: "Search deck; add up to N printed types; shuffle.",
    display: "[Search N]",
  },
  {
    test: (body) => /^Recall(?:\s+\d+)?$/i.test(body),
    reminder: "GY → hand up to N.",
    display: "[Recall N]",
  },
  {
    test: (body) => /^Mill(?:\s+\d+)?$/i.test(body),
    reminder: "Deck → GY.",
    display: "[Mill N]",
  },
  {
    test: (body) => /^(?:Reposition|Swap)$/i.test(body),
    reminder: "Ally frontline↔back / swap.",
    display: (body) => (/^swap$/i.test(body) ? "[Swap]" : "[Reposition]"),
  },
  {
    test: (body) => /^Reforge(?:\s+\d+)?(?:\s+[A-Za-z]+)?$/i.test(body),
    reminder:
      "On one of your dice, replace any N faces with N synthetic faces of that attribute from your pool (no forge-draw).",
    display: "[Reforge N X]",
  },
  {
    test: (body) => /^Cross forge(?:\s+\d+)?(?:\s+[A-Za-z]+\s*\/\s*[A-Za-z]+)?$/i.test(body),
    reminder:
      "On one of your dice, replace N faces of attribute Y with N synthetic Z faces from your pool (no forge-draw).",
    display: "[Cross forge N Y / Z]",
  },
  {
    test: (body) => /^Stamp$/i.test(body),
    reminder: "Re-fire showing face roll effects (no new rolled pip).",
    display: "[Stamp]",
  },
  {
    test: (body) => /^Double$/i.test(body),
    reminder: "Next face-sourced effect resolves twice.",
    display: "[Double]",
  },
  {
    test: (body) => /^Resonance$/i.test(body),
    reminder: "Pool symbol may pay any Spend / Requires / Active-when.",
    display: "[Resonance]",
  },
  {
    test: (body) => /^Reroll$/i.test(body),
    reminder: "May reroll a rolled die.",
    display: "[Reroll]",
  },
  {
    test: (body) => /^Retain$/i.test(body),
    reminder: "Keep retainable die across next roll.",
    display: "[Retain]",
  },
  {
    test: (body) => /^Choose face$/i.test(body),
    reminder: "Choose one of your dice, then a face on that die that is not already showing.",
    display: "[Choose face]",
  },
  {
    test: (body) => /^Block(?:\s+\d+)?$/i.test(body),
    reminder: "Lowers the next damage by N and does not cancel the hit.",
    display: "[Block N]",
  },
  {
    test: (body) => /^Counter$/i.test(body),
    reminder:
      "Negates the previous chain card and does not end the sequence. Does not negate a hit. Not legal when the top object is an EX card.",
    display: "[Counter]",
  },
  {
    test: (body) => /^Parry$/i.test(body),
    reminder:
      "Negates a hit, including a hit an EX card replaced. Leaves you offensive and ends the sequence.",
    display: "[Parry]",
  },
  {
    test: (body) => /^Replace$/i.test(body),
    reminder: "Writes a named face onto a slot of that Fighter's die for the rest of the match.",
    display: "[Replace]",
  },
  {
    test: (body) => /^Moveset(?:\s+.+)?$/i.test(body),
    reminder: "Attaches that moveset to the Fighter. The card stays in the equipment zone.",
    display: "[Moveset X]",
  },
  {
    test: (body) => /^Tag out$/i.test(body),
    reminder:
      "The opponent's Active Fighter leaves. They choose a Reserve. That Fighter is not defeated, and Tag is not spent.",
    display: "[Tag out]",
  },
  {
    test: (body) => /^Tag in$/i.test(body),
    reminder:
      "A Reserve Fighter comes in. When the line says a Fighter cannot Tag in, that Fighter cannot be Tagged in until the end of its next turn.",
    display: "[Tag in]",
  },
  {
    test: (body) => /^Redirect(?:\s+\d+)?$/i.test(body),
    reminder:
      "Sends N of the next attack damage in this Chain to the named Fighter. Damage above N stays on the Fighter who was hit. Ends when that Chain ends.",
    display: "[Redirect N]",
  },
  {
    test: (body) => /^Requires:/i.test(body),
    reminder: "Pile must hold this. Not spent.",
    display: "[Requires: X]",
  },
  {
    test: (body) => /^Spend:/i.test(body),
    reminder: "Burn this from your pile.",
    display: "[Spend: X]",
  },
  {
    test: (body) => /^Active when:/i.test(body),
    reminder: "Ritual gate vs your pile.",
    display: "[Active when: X]",
  },
];

/** Unique `[…]` tokens in print order. */
export function extractBracketTokens(print: string): readonly string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const match of print.matchAll(BRACKET_TOKEN)) {
    const token = match[0];
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

/** Split print so `[Keyword]` spans can render distinctly from surrounding English. */
export function splitBracketParts(
  text: string,
): readonly { readonly text: string; readonly keyword: boolean }[] {
  const parts: { text: string; keyword: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(BRACKET_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index), keyword: false });
    parts.push({ text: match[0], keyword: true });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), keyword: false });
  return parts.length > 0 ? parts : [{ text, keyword: false }];
}

function innerBody(token: string): string {
  return token.slice(1, -1).trim();
}

function matchBracket(token: string): { readonly display: string; readonly reminder: string } | null {
  const body = innerBody(token);
  for (const rule of STEM_RULES) {
    if (!rule.test(body)) continue;
    const display = typeof rule.display === "function" ? rule.display(body) : rule.display;
    return { display, reminder: rule.reminder };
  }
  return null;
}

/** Token X on `[Mark …]` / `[Strip …]` (Toxin, Shield, …), or null. */
function markStripTokenX(token: string): string | null {
  const body = innerBody(token);
  const match = /^(?:Mark|Strip)(?:\s+(?:\d+|any))?\s+([A-Za-z]+)/i.exec(body);
  if (match === null || match[1] === undefined) return null;
  const raw = match[1];
  const canonical = `${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()}`;
  return canonical in TOKEN_X_REMINDERS ? canonical : null;
}

/**
 * Keywords actually present on this print, plus a token-X reminder when
 * Mark/Strip names Toxin, Shield, Corruption, or Pestilence.
 * Unknown `[…]` tokens are skipped.
 */
export function lookupKeywordReminders(print: string): readonly KeywordReminder[] {
  const rows: KeywordReminder[] = [];
  const tokenXs: string[] = [];
  const seen = new Set<string>();
  const seenX = new Set<string>();

  for (const token of extractBracketTokens(print)) {
    const match = matchBracket(token);
    if (match === null || seen.has(match.display)) continue;
    seen.add(match.display);
    rows.push({ token: match.display, reminder: match.reminder });
    const x = markStripTokenX(token);
    if (x !== null && !seenX.has(x)) {
      seenX.add(x);
      tokenXs.push(x);
    }
  }

  for (const x of tokenXs) {
    const reminder = TOKEN_X_REMINDERS[x];
    if (reminder === undefined) continue;
    rows.push({ token: x, reminder });
  }

  return rows;
}

/** Catalogue print the hover aside should scan (type and effect). */
export function tacticPrintText(card: CardDefinition): string {
  return [formatTypeLine(card), ...formatEffectRegion(card)].join("\n");
}

/** Face-card rules text the hover aside should scan. */
export function facePrintText(face: Pick<FaceCardDefinition, "rulesText">): string {
  return face.rulesText;
}
