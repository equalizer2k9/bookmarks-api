/** Lower-cases tags and drops later duplicates, keeping first-occurrence order. */
export function normaliseTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.toLowerCase()))];
}
