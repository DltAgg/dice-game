/** Drop HTML comments so agent-only notes stay in the markdown source, not the UI. */
export function stripHtmlComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Player Rules tab: living rulebook plus the keyword glossary. */
export function playerRulesMarkdown(rulebook: string, keywords: string): string {
  return `${stripHtmlComments(rulebook)}\n\n---\n\n${stripHtmlComments(keywords)}`;
}

export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function rulebookToc(markdown: string): readonly { id: string; label: string }[] {
  const entries: { id: string; label: string }[] = [];
  for (const match of markdown.matchAll(/^## (.+)$/gm)) {
    const label = match[1] ?? "";
    entries.push({ id: headingSlug(label), label });
  }
  return entries;
}
