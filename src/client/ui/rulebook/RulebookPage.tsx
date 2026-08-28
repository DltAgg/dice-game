import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import keywordsSource from "../../../../docs/KEYWORDS.md?raw";
import rulebookSource from "../../../../docs/RULEBOOK.md?raw";
import { headingSlug, playerRulesMarkdown, rulebookToc } from "./playerMarkdown.js";

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textFromNode((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

export function RulebookPage() {
  const markdown = playerRulesMarkdown(rulebookSource, keywordsSource);
  const toc = rulebookToc(markdown);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
      <nav
        aria-label="Rulebook sections"
        className="lg:sticky lg:top-20 lg:w-56 lg:shrink-0"
      >
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Rules
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          How Dice Skirmish plays today, including the keyword glossary.
          This is the same living rulebook the engine is kept against — not a
          second copy of the rules.
        </p>
        <ol className="mt-6 hidden space-y-1 lg:block">
          {toc.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className="text-sm text-stone-400 hover:text-[var(--accent)]"
              >
                {entry.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-stone-300">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-4 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                {children}
              </h1>
            ),
            h2: ({ children }) => {
              const id = headingSlug(textFromNode(children));
              return (
                <h2
                  id={id}
                  className="mt-10 scroll-mt-24 border-b border-stone-800 pb-2 font-[family-name:var(--font-display)] text-2xl text-[var(--accent)]"
                >
                  {children}
                </h2>
              );
            },
            h3: ({ children }) => (
              <h3 className="mt-6 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="mt-3">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold text-[var(--ink)]">{children}</strong>
            ),
            em: ({ children }) => <em className="text-stone-200">{children}</em>,
            ul: ({ children }) => (
              <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            hr: () => <hr className="my-8 border-stone-800" />,
            a: ({ href, children }) => (
              <a href={href} className="text-[var(--accent)] underline-offset-2 hover:underline">
                {children}
              </a>
            ),
            code: ({ children, className }) => {
              const block = className?.includes("language-") || String(children).includes("\n");
              if (block) {
                return (
                  <code className="block overflow-x-auto rounded border border-stone-800 bg-black/30 p-3 font-mono text-sm text-amber-100/90">
                    {children}
                  </code>
                );
              }
              return (
                <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.85em] text-amber-100/90">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <pre className="mt-4 overflow-x-auto">{children}</pre>,
            table: ({ children }) => (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-stone-700 text-[var(--ink)]">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 font-semibold whitespace-nowrap">{children}</th>
            ),
            td: ({ children }) => (
              <td className="border-t border-stone-800 px-3 py-2 align-top">{children}</td>
            ),
            blockquote: ({ children }) => (
              <blockquote className="mt-3 border-l-2 border-[var(--accent)] pl-4 text-stone-400">
                {children}
              </blockquote>
            ),
          }}
        >
          {markdown}
        </Markdown>
      </article>
    </main>
  );
}
