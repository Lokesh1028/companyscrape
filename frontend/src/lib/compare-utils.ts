import type { ResearchResponse } from "@/types/research";

/** Themes that appear in both reports (case-insensitive on normalized keys). */
export function sharedRecurringThemes(
  a: ResearchResponse | null,
  b: ResearchResponse | null,
): string[] {
  if (!a?.recurring_themes?.length || !b?.recurring_themes?.length) return [];
  const setB = new Set(
    b.recurring_themes.map((t) => t.toLowerCase().trim()),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of a.recurring_themes) {
    const k = t.toLowerCase().trim();
    if (setB.has(k) && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}
