/** Primary and Secondary each start on their own line. */
export function faceRulesLines(rulesText: string): readonly string[] {
  if (rulesText.length === 0) return [];
  return rulesText
    .split("\n")
    .flatMap((line) => line.split(/(?=(?:Primary|Secondary):)/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
