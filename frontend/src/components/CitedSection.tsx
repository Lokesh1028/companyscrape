"use client";

import { useState } from "react";
import type { CitedPoint, EvidenceItem } from "@/types/research";

/** Citations are 1-based indices aligned with `evidence_snippets` order from the API. */
function evidenceForCitation(
  snippets: EvidenceItem[],
  citationIndex: number,
): EvidenceItem | undefined {
  if (!Number.isInteger(citationIndex) || citationIndex < 1) return undefined;
  return snippets[citationIndex - 1];
}

const accentRing: Record<string, string> = {
  rose: "ring-rose-500/20 dark:ring-rose-400/15",
  amber: "ring-amber-500/20 dark:ring-amber-400/15",
  emerald: "ring-emerald-500/20 dark:ring-emerald-400/15",
  indigo: "ring-indigo-500/20 dark:ring-indigo-400/15",
};

export function CitedSection({
  title,
  items,
  evidence,
  accent = "indigo",
}: {
  title: string;
  items: CitedPoint[];
  evidence: EvidenceItem[];
  accent?: "indigo" | "rose" | "amber" | "emerald";
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const ring = accentRing[accent] ?? accentRing.indigo;

  if (!items.length) {
    return (
      <section
        className={`rounded-2xl border border-zinc-200/90 bg-white/80 p-5 ring-1 ${ring} dark:border-zinc-800 dark:bg-zinc-950/50`}
      >
        <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Nothing in this section for this run.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-sm ring-1 ${ring} dark:border-zinc-800 dark:bg-zinc-950/60`}
    >
      <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {items.map((item, i) => (
          <li
            key={`${item.point.slice(0, 48)}-${i}`}
            className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50"
          >
            <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {item.point}
            </p>
            {item.citations?.length ? (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  aria-expanded={Boolean(open[i])}
                  onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
                >
                  {open[i] ? "Hide supporting evidence" : "View supporting evidence"}
                </button>
                {open[i] && (
                  <ul className="mt-3 space-y-3 border-t border-zinc-200/80 pt-3 dark:border-zinc-700/80">
                    {item.citations.map((ci) => {
                      const ev = evidenceForCitation(evidence, ci);
                      return (
                        <li
                          key={ci}
                          className="rounded-lg border border-zinc-200/60 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                              {ci}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {ev?.source_title || ev?.domain || "Source"}
                            </span>
                          </div>
                          {!ev && (
                            <p className="mt-2 text-amber-700 dark:text-amber-300">
                              No snippet at index {ci} (evidence list may be shorter than
                              citation indices).
                            </p>
                          )}
                          {ev?.snippet && (
                            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                              {ev.snippet}
                            </p>
                          )}
                          {ev?.extracted_text && (
                            <p className="mt-2 line-clamp-5 text-zinc-700 dark:text-zinc-300">
                              {ev.extracted_text}
                            </p>
                          )}
                          {ev?.source_url && (
                            <a
                              href={ev.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              Open source
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
