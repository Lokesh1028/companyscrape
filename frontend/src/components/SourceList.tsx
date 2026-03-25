"use client";

import { useMemo, useState } from "react";
import type { SourceCard } from "@/types/research";
import { domainInitials } from "@/lib/format";

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function SourceList({ sources }: { sources: SourceCard[] }) {
  const domains = useMemo(() => {
    const d = new Set<string>();
    sources.forEach((s) => {
      if (s.domain) d.add(s.domain);
      else {
        try {
          d.add(safeHost(s.url));
        } catch {
          /* skip */
        }
      }
    });
    return Array.from(d).sort();
  }, [sources]);

  const [filter, setFilter] = useState<string>("");

  const filtered = useMemo(() => {
    if (!filter) return sources;
    return sources.filter((s) => (s.domain || safeHost(s.url)) === filter);
  }, [sources, filter]);

  if (!sources.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No sources recorded
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Search may have returned no URLs, or scraping was blocked for all pages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {domains.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Domain
          </span>
          <button
            type="button"
            onClick={() => setFilter("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !filter
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFilter(d)}
              className={`max-w-[200px] truncate rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === d
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => {
          const host = s.domain || safeHost(s.url);
          const initials = domainInitials(host);
          const trust =
            s.trust_score != null
              ? Math.round(Math.min(1, Math.max(0, s.trust_score)) * 100)
              : null;
          return (
            <article
              key={s.url}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/80 dark:hover:border-indigo-500/30"
            >
              <div className="flex gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-inner"
                  aria-hidden
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-[15px] font-semibold leading-snug text-zinc-900 line-clamp-2 dark:text-zinc-50">
                    {s.title || host}
                  </h4>
                  <p className="mt-0.5 truncate text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {host}
                  </p>
                </div>
              </div>
              {s.snippet && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {s.snippet}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {trust != null && (
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    Trust {trust}%
                  </span>
                )}
                {s.category_hint && (
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200">
                    {s.category_hint}
                  </span>
                )}
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:text-indigo-500 dark:text-indigo-400"
              >
                Open source
                <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
