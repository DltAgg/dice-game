import type { ReactNode } from "react";
import { lookupKeywordReminders, splitBracketParts, type KeywordReminder } from "./reminders";

function KeywordReminderList({ entries }: { entries: readonly KeywordReminder[] }) {
  if (entries.length === 0) {
    return <p className="text-[0.7rem] text-stone-500">None on this card</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.token} className="border-t border-stone-800 pt-2 first:border-0 first:pt-0">
          <p className="font-[family-name:var(--font-card)] text-[0.7rem] font-semibold text-amber-100/90">
            {entry.token}
          </p>
          <p className="mt-0.5 text-[0.7rem] leading-snug text-stone-400">{entry.reminder}</p>
        </li>
      ))}
    </ul>
  );
}

/** Hover aside: Keywords heading + reminders for tokens on this print. */
export function KeywordRemindersTooltip({
  print,
  extra,
}: {
  print: string;
  extra?: ReactNode;
}) {
  const entries = lookupKeywordReminders(print);
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">Keywords</p>
      <div className="mt-2">
        <KeywordReminderList entries={entries} />
      </div>
      {extra}
    </>
  );
}

/** Deck-builder inspect dossier section. */
export function KeywordRemindersSection({ print }: { print: string }) {
  const entries = lookupKeywordReminders(print);
  return (
    <section>
      <h4 className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        Keywords
      </h4>
      <div className="rounded border border-stone-800/80 bg-black/30 px-3 py-2">
        <KeywordReminderList entries={entries} />
      </div>
    </section>
  );
}

/** Bold `[…]` tokens in tooltip / inspect print without changing catalogue text. */
export function KeywordRichText({ text }: { text: string }) {
  return (
    <>
      {splitBracketParts(text).map((part, index) =>
        part.keyword ? (
          <span
            key={`${part.text}:${String(index)}`}
            className="font-semibold text-amber-100/90"
          >
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}:${String(index)}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
