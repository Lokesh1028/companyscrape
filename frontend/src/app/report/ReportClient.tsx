"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CitedSection } from "@/components/CitedSection";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { ErrorPanel, errorMessage, errorMeta } from "@/components/ErrorPanel";
import { HistorySidebar } from "@/components/HistorySidebar";
import { ReportSkeleton } from "@/components/ReportSkeleton";
import { ResearchStages } from "@/components/ResearchStages";
import { SentimentBadge } from "@/components/SentimentBadge";
import { SourceList } from "@/components/SourceList";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  checkApiReachable,
  fetchResearchHistory,
  loadMockReport,
  postResearch,
} from "@/lib/api";
import { formatThemeLabel } from "@/lib/format";
import type { ResearchHistoryItem, ResearchResponse } from "@/types/research";

type TabKey =
  | "overview"
  | "culture"
  | "sentiment"
  | "pros"
  | "cons"
  | "flags"
  | "signals"
  | "sources"
  | "evidence";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "culture", label: "Culture" },
  { key: "sentiment", label: "Sentiment" },
  { key: "pros", label: "Pros" },
  { key: "cons", label: "Cons" },
  { key: "flags", label: "Red flags" },
  { key: "signals", label: "Recent signals" },
  { key: "sources", label: "Sources" },
  { key: "evidence", label: "Evidence" },
];

export function ReportClient() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q")?.trim() || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [report, setReport] = useState<ResearchResponse | null>(null);
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [mobileHistory, setMobileHistory] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshHistory = useCallback(async () => {
    setHistory(await fetchResearchHistory(25));
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await checkApiReachable();
      if (alive) setApiOnline(ok);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback(
    async (name: string, opts?: { mock?: boolean }) => {
      if (!name) return;
      setLoading(true);
      setError(null);
      setReport(null);
      try {
        let data: ResearchResponse;
        if (opts?.mock) {
          data = await loadMockReport();
          data = { ...data, company_name: name };
        } else {
          data = await postResearch({
            company_name: name,
            force_refresh: forceRefresh,
          });
        }
        setReport(data);
        try {
          sessionStorage.setItem("last_report_json", JSON.stringify(data));
        } catch {
          /* quota / private mode */
        }
        await refreshHistory();
        setApiOnline(true);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [forceRefresh, refreshHistory],
  );

  useEffect(() => {
    if (q) void run(q);
  }, [q, run]);

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("company") || "").trim();
    if (!name) return;
    router.push(`/report?q=${encodeURIComponent(name)}`);
  };

  const errMsg = error ? errorMessage(error) : "";
  const errM = error ? errorMeta(error) : {};

  const tabClass = (key: TabKey) =>
    tab === key ? "block" : "hidden print:block";

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <HistorySidebar
        items={history}
        onPick={(name) => {
          router.push(`/report?q=${encodeURIComponent(name)}`);
          setMobileHistory(false);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-hidden sticky top-0 z-20 border-b border-zinc-200/80 bg-card/85 px-4 py-3.5 backdrop-blur-md dark:border-zinc-800/80">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Culture Research
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 lg:hidden dark:border-zinc-700 dark:text-zinc-200"
                onClick={() => setMobileHistory((v) => !v)}
              >
                History
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {mobileHistory && (
          <div className="print-hidden border-b border-zinc-200 bg-zinc-50/95 p-3 lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
            <HistorySidebar
              variant="drawer"
              items={history}
              onPick={(name) => {
                router.push(`/report?q=${encodeURIComponent(name)}`);
                setMobileHistory(false);
              }}
            />
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {apiOnline === false && (
            <div
              className="print-hidden mb-6 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
              role="status"
            >
              <strong className="font-semibold">API unreachable.</strong> Start the
              backend on port 8000 or set{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">
                NEXT_PUBLIC_API_BASE_URL
              </code>{" "}
              in{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">
                .env.local
              </code>
              . You can still use <strong>Load sample report</strong> for UI-only demos.
            </div>
          )}

          <form
            onSubmit={onSubmitSearch}
            className="print-hidden mb-8 flex flex-col gap-4 rounded-2xl border border-zinc-200/90 bg-card p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 md:flex-row md:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-muted"
                htmlFor="company"
              >
                Company
              </label>
              <input
                id="company"
                name="company"
                key={q || "empty"}
                defaultValue={q}
                placeholder="e.g. Google, Infosys, Deloitte"
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-inner outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-[var(--ring)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              Force new research
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Run research
              </button>
              <button
                type="button"
                onClick={() => void run(q || "Sample Corp", { mock: true })}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Sample report
              </button>
            </div>
          </form>

          {!q && !loading && (
            <p className="print-hidden text-sm text-muted">
              Enter a company above, or return to the{" "}
              <Link
                href="/"
                className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
              >
                dashboard
              </Link>
              .
            </p>
          )}

          {loading && q && (
            <div className="print-hidden">
              <ResearchStages active />
              <ReportSkeleton />
            </div>
          )}

          {Boolean(error) && !loading && (
            <div className="print-hidden">
            <ErrorPanel
              title="Research didn’t complete"
              message={errMsg}
              code={errM.code}
              status={errM.status}
              onRetry={q ? () => void run(q) : undefined}
            />
            </div>
          )}

          {report && !loading && (
            <div id="report-print-area" className="mt-2 space-y-8">
              <div className="mb-6 hidden border-b border-zinc-300 pb-4 print:block">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Culture Research — printed report
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {typeof window !== "undefined"
                    ? new Date().toLocaleString()
                    : ""}
                </p>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white via-zinc-50/80 to-indigo-50/50 p-8 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950/20">
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      Intelligence report
                    </p>
                    <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
                      {report.company_name}
                    </h1>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <SentimentBadge value={report.overall_sentiment} />
                      {report.cached && (
                        <span className="rounded-full bg-zinc-200/90 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          From cache
                        </span>
                      )}
                      {report.report_id != null && (
                        <span className="text-xs text-muted">
                          ID {report.report_id}
                        </span>
                      )}
                    </div>
                    <ConfidenceBar value={report.confidence_score} />
                    {report.message && (
                      <p className="mt-4 rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                        {report.message}
                      </p>
                    )}
                  </div>
                  <div className="print-hidden flex shrink-0 flex-wrap gap-2 md:flex-col">
                    <button
                      type="button"
                      onClick={() => void copyReport()}
                      className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {copied ? "Copied" : "Copy JSON"}
                    </button>
                    <button
                      type="button"
                      onClick={printReport}
                      className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      Print / Save as PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100/95">
                {report.disclaimer}
              </div>

              <nav
                className="print-hidden flex flex-wrap gap-1.5 border-b border-zinc-200/80 pb-3 dark:border-zinc-800"
                aria-label="Report sections"
              >
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      tab === t.key
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>

              <section className={`space-y-6 ${tabClass("overview")}`}>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      Company overview
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {report.company_overview || "No overview in this run."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      What they do
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {report.what_company_does || "—"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Fact vs opinion
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {report.fact_vs_opinion_note || "—"}
                    </p>
                  </div>
                </section>

              <section className={tabClass("culture")}>
                  <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Culture summary
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {report.culture_summary || "—"}
                  </p>
                  {!!report.recurring_themes?.length && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Recurring themes
                      </h3>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {report.recurring_themes.map((t) => (
                          <li
                            key={t}
                            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                          >
                            {formatThemeLabel(t)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

              <section className={`space-y-5 ${tabClass("sentiment")}`}>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      Sentiment snapshot
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {report.employee_sentiment_summary || "—"}
                    </p>
                  </div>
                  <CitedSection
                    title="Leadership & management"
                    items={report.leadership_signals}
                    evidence={report.evidence_snippets}
                  />
                  <CitedSection
                    title="Work–life balance"
                    items={report.work_life_balance_signals}
                    evidence={report.evidence_snippets}
                  />
                  <CitedSection
                    title="Compensation & growth"
                    items={report.career_growth_signals}
                    evidence={report.evidence_snippets}
                    accent="emerald"
                  />
                </section>

                <div className={tabClass("pros")}>
                <CitedSection
                  title="Pros"
                  items={report.pros}
                  evidence={report.evidence_snippets}
                  accent="emerald"
                />
                </div>

                <div className={tabClass("cons")}>
                <CitedSection
                  title="Cons"
                  items={report.cons}
                  evidence={report.evidence_snippets}
                  accent="amber"
                />
                </div>

                <div className={tabClass("flags")}>
                <CitedSection
                  title="Red flags"
                  items={report.red_flags}
                  evidence={report.evidence_snippets}
                  accent="rose"
                />
                </div>

                <div className={tabClass("signals")}>
                <CitedSection
                  title="Recent public signals"
                  items={report.recent_signals}
                  evidence={report.evidence_snippets}
                />
                </div>

              <section className={tabClass("sources")}>
                  <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Sources
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Pages consulted for this research run (deduplicated).
                  </p>
                  <div className="mt-6">
                    <SourceList sources={report.sources} />
                  </div>
                </section>

              <section className={`space-y-6 ${tabClass("evidence")}`}>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      Evidence & clusters
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Rule-based theme clusters; citation indices match the numbered
                      evidence order.
                    </p>
                  </div>
                  {!report.evidence_clusters.length &&
                  !report.evidence_snippets.length ? (
                    <p className="text-sm text-muted">No evidence rows returned.</p>
                  ) : (
                    <>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {report.evidence_clusters.map((c) => (
                          <li
                            key={c.theme}
                            className="rounded-xl border border-zinc-200/90 bg-card px-4 py-3 text-sm dark:border-zinc-800"
                          >
                            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {formatThemeLabel(c.theme)}
                            </span>
                            <span className="mt-1 block text-xs text-muted">
                              Rows {c.evidence_indices.join(", ") || "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-3">
                        {report.evidence_snippets.map((ev, i) => (
                          <article
                            key={`${ev.source_url}-${i}`}
                            className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                                {i + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                                  {ev.source_title || ev.domain || "Source"}
                                </div>
                                <a
                                  href={ev.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 block truncate text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                >
                                  {ev.source_url}
                                </a>
                                {ev.snippet && (
                                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                                    {ev.snippet}
                                  </p>
                                )}
                                {ev.extracted_text && (
                                  <p className="mt-2 line-clamp-6 text-zinc-700 dark:text-zinc-300">
                                    {ev.extracted_text}
                                  </p>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </section>
            </div>
          )}
        </main>

        <footer className="print-hidden border-t border-zinc-200/80 py-6 text-center text-xs text-muted dark:border-zinc-800">
          <Link href="/compare" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Compare (beta)
          </Link>
          <span className="mx-2 text-zinc-300 dark:text-zinc-700">·</span>
          <Link href="/dev/evidence" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Developer
          </Link>
        </footer>
      </div>
    </div>
  );
}
