/** Shared presentation helpers (DRY between report components). */

export function confidencePercent(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(1, Math.max(0, n)) * 100);
}

export function formatThemeLabel(theme: string): string {
  return theme
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function domainInitials(domain: string | null | undefined): string {
  if (!domain) return "?";
  const parts = domain.split(".").filter(Boolean);
  const head = parts[0] || domain;
  return head.slice(0, 2).toUpperCase();
}
