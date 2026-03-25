"use client";

import Link from "next/link";
import type { ResearchHistoryItem } from "@/types/research";

export function HistorySidebar({
  items,
  onPick,
  variant = "desktop",
}: {
  items: ResearchHistoryItem[];
  onPick?: (name: string) => void;
  variant?: "desktop" | "drawer";
}) {
  const shell =
    variant === "desktop"
      ? "print-hidden hidden w-64 shrink-0 border-r border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/80 lg:block"
      : "print-hidden w-full border-0 bg-transparent p-0";

  return (
    <aside className={shell}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Recent searches
      </h2>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-muted">No history yet.</li>
        )}
        {items.map((h) => (
          <li key={h.report_id}>
            {onPick ? (
              <button
                type="button"
                onClick={() => onPick(h.company_name)}
                className="w-full rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <div className="font-medium">{h.company_name}</div>
                <div className="text-xs text-muted">
                  {h.overall_sentiment || "—"} ·{" "}
                  {h.confidence_score != null
                    ? `${Math.round(h.confidence_score * 100)}%`
                    : "—"}
                </div>
              </button>
            ) : (
              <Link
                href={`/report?q=${encodeURIComponent(h.company_name)}`}
                className="block rounded-lg px-2 py-2 text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <div className="font-medium">{h.company_name}</div>
                <div className="text-xs text-muted">
                  {h.overall_sentiment || "—"}
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
