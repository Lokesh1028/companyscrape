"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Searching the web",
  "Collecting sources",
  "Extracting evidence",
  "Synthesizing report",
] as const;

export function ResearchStages({ active }: { active: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % STAGES.length);
    }, 1200);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;

  return (
    <div className="mt-6 rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-50/90 to-white px-5 py-4 dark:border-indigo-500/20 dark:from-indigo-950/40 dark:to-zinc-950/80">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
        </span>
        <p className="font-display text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {STAGES[idx]}
        </p>
      </div>
      <ol className="mt-3 grid gap-1 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={
              i === idx
                ? "font-semibold text-indigo-700 dark:text-indigo-300"
                : ""
            }
          >
            <span className="tabular-nums text-zinc-400 dark:text-zinc-600">
              {i + 1}.
            </span>{" "}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
