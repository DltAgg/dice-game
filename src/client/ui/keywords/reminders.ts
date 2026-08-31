import {
  formatEffectRegion,
  formatForgeLine,
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
};

/** First matching rule wins. Order matters (e.g. Mark-on-attacks before Mark). */
const STEM_RULES: readonly StemRule[] = [
  {
    test: (body) => /^Mark\b/i.test(body) && /\bon attacks$/i.test(body),
    reminder: "Until end of turn, each of your attacks Marks N X on the attack target.",
  },
  {
    test: (body) => /^Mark\b/i.test(body),
    reminder: "Put N of token X on the printed target, now.",
  },
  {
    test: (body) => /^Strip\b/i.test(body),
    reminder: "Remove up to N of token X. Legal if none remain.",
  },
  {
    test: (body) => /^Generate\b/i.test(body),
    reminder: "Add N of symbol X to your pool this turn.",
  },
  {
    test: (body) => /^Forge\b/i.test(body),
    reminder: "Install matching faces (your or opponent's die as printed).",
  },
  {
    test: (body) => /^Overcharge$/i.test(body),
    reminder:
      "Spend a natural own-die forge card onto an attribute face card; all dice showing it Generate +1 of the spent card's attribute.",
  },
  {
    test: (body) => /^Negate(?:\s+(?:Instant|Ritual))?$/i.test(body),
    reminder: "Negate top matching card chain link.",
  },
  {
    test: (body) => /^Destroy\s+(?:Equipment|Ritual)$/i.test(body),
    reminder: "Send one matching field card to GY.",
  },
  {
    test: (body) => /^Strike(?:\s+\d+)?$/i.test(body),
    reminder: "Deal N damage (default chosen enemy).",
  },
  {
    test: (body) => /^Heal(?:\s+\d+)?$/i.test(body),
    reminder: "Heal N.",
  },
  {
    test: (body) => /^(?:Draw|Discard)(?:\s+\d+)?$/i.test(body),
    reminder: "Draw / discard N.",
  },
  {
    test: (body) => /^Empower(?:\s+\d+)?$/i.test(body),
    reminder: "Next attack this turn deals +N.",
  },
  {
    test: (body) => /^Frenzy(?:\s+\d+)?$/i.test(body),
    reminder: "May declare N extra attacks this turn (default 1).",
  },
  {
    test: (body) => /^Pierce(?:\s+\d+)?$/i.test(body),
    reminder: "Ignore N Shield after Prevent.",
  },
  {
    test: (body) => /^Prevent(?:\s+\d+)?$/i.test(body),
    reminder: "Prevent the next attack against the creature under attack (before Shield). Reaction only.",
  },
  {
    test: (body) => /^Drain(?:\s+\d+)?$/i.test(body),
    reminder: "Deal up to N to a chosen enemy; heal your most-damaged ally for HP lost.",
  },
  {
    test: (body) => /^Convert(?:\s+\d+)?$/i.test(body),
    reminder: "Convert up to N pool symbols into Naturals.",
  },
  {
    test: (body) => /^Discount(?:\s+\d+)?$/i.test(body),
    reminder: "Next matching play/forge costs N less (min 0).",
  },
  {
    test: (body) => /^Insight(?:\s+\d+)?$/i.test(body),
    reminder: "Top N; 1 to hand, rest bottom.",
  },
  {
    test: (body) => /^Search(?:\s+\d+)?$/i.test(body),
    reminder: "Search deck; add up to N printed types; shuffle.",
  },
  {
    test: (body) => /^Recall(?:\s+\d+)?$/i.test(body),
    reminder: "GY → hand up to N.",
  },
  {
    test: (body) => /^Mill(?:\s+\d+)?$/i.test(body),
    reminder: "Deck → GY.",
  },
  {
    test: (body) => /^(?:Reposition|Swap)$/i.test(body),
    reminder: "Ally frontline↔back / swap.",
  },
  {
    test: (body) => /^Reforge$/i.test(body),
    reminder: "Replace matching synthetic (no forge-draw).",
  },
  {
    test: (body) => /^Stamp$/i.test(body),
    reminder: "Re-fire showing face roll effects (no new rolled pip).",
  },
  {
    test: (body) => /^Double$/i.test(body),
    reminder: "Next face-sourced effect resolves twice.",
  },
  {
    test: (body) => /^Resonance$/i.test(body),
    reminder: "Pool symbol may pay any Spend / Requires / Active-when.",
  },
  {
    test: (body) => /^Reroll$/i.test(body),
    reminder: "May reroll a rolled die.",
  },
  {
    test: (body) => /^Retain$/i.test(body),
    reminder: "Keep retainable die across next roll.",
  },
  {
    test: (body) => /^Requires:/i.test(body),
    reminder: "Pile must hold this. Not spent.",
  },
  {
    test: (body) => /^Spend:/i.test(body),
    reminder: "Burn this from your pile.",
  },
  {
    test: (body) => /^Active when:/i.test(body),
    reminder: "Ritual gate vs your pile.",
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

function reminderForBracket(token: string): string | null {
  const body = innerBody(token);
  for (const rule of STEM_RULES) {
    if (rule.test(body)) return rule.reminder;
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
  const seenX = new Set<string>();

  for (const token of extractBracketTokens(print)) {
    const reminder = reminderForBracket(token);
    if (reminder === null) continue;
    rows.push({ token, reminder });
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

/** Catalogue print the hover aside should scan (type, forge, effect). */
export function tacticPrintText(card: CardDefinition): string {
  return [formatTypeLine(card), formatForgeLine(card.forge), ...formatEffectRegion(card)].join(
    "\n",
  );
}

/** Face-card rules text the hover aside should scan. */
export function facePrintText(face: Pick<FaceCardDefinition, "rulesText">): string {
  return face.rulesText;
}
