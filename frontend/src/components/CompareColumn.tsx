import Link from "next/link";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { SentimentBadge } from "@/components/SentimentBadge";
import { formatThemeLabel } from "@/lib/format";
import type { ResearchResponse } from "@/types/research";

export function CompareColumn({
  label,
  companyName,
  report,
  missingCache,
  researchHref,
  pros,
  cons,
}: {
  label: string;
  companyName: string;
  report: ResearchResponse | null;
  missingCache: boolean;
  researchHref: string;
  pros: string[];
  cons: string[];
}) {
  if (missingCache || !report) {
    return (
      <div className="flex flex-col rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 dark:border-zinc-600 dark:bg-zinc-900/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <h2 className="mt-2 font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {companyName || "—"}
        </h2>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          No cached report found within the server freshness window. Run research
          for this company first (results are cached automatically).
        </p>
        {companyName ? (
          <Link
            href={researchHref}
            className="mt-4 inline-flex w-fit rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
          >
            Open research →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200/90 bg-card p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        {label}
      </p>
      <h2 className="mt-2 font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {report.company_name}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SentimentBadge value={report.overall_sentiment} />
        {report.cached && (
          <span className="text-xs text-muted">Cached</span>
        )}
      </div>
      <ConfidenceBar value={report.confidence_score} />
      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Culture (excerpt)
        </h3>
        <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {report.culture_summary || "—"}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Pros
          </h3>
          <ul className="mt-1 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
            {pros.map((p, i) => (
              <li key={i} className="line-clamp-2">
                {p}
              </li>
            ))}
            {!pros.length && (
              <li className="list-none text-muted">—</li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-400">
            Cons
          </h3>
          <ul className="mt-1 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
            {cons.map((p, i) => (
              <li key={i} className="line-clamp-2">
                {p}
              </li>
            ))}
            {!cons.length && (
              <li className="list-none text-muted">—</li>
            )}
          </ul>
        </div>
      </div>
      {!!report.recurring_themes?.length && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-muted">Themes</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.recurring_themes.slice(0, 8).map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {formatThemeLabel(t)}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">
        {report.sources.length} sources · {report.evidence_snippets.length} evidence
        rows
      </p>
      <Link
        href={researchHref}
        className="mt-3 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
      >
        Full report →
      </Link>
    </div>
  );
}
