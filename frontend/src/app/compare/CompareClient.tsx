"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompareColumn } from "@/components/CompareColumn";
import { ErrorPanel, errorMessage, errorMeta } from "@/components/ErrorPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  getCachedResearch,
  postResearch,
  checkApiReachable,
} from "@/lib/api";
import { sharedRecurringThemes } from "@/lib/compare-utils";
import { formatThemeLabel } from "@/lib/format";
import type { ResearchResponse } from "@/types/research";

export function CompareClient() {
  const params = useSearchParams();
  const router = useRouter();
  const bootstrapped = useRef(false);

  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [reportA, setReportA] = useState<ResearchResponse | null>(null);
  const [reportB, setReportB] = useState<ResearchResponse | null>(null);
  const [missingA, setMissingA] = useState(false);
  const [missingB, setMissingB] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningFresh, setRunningFresh] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const loadPair = useCallback(async (a: string, b: string) => {
    const ta = a.trim();
    const tb = b.trim();
    if (!ta || !tb) {
      setError(new Error("Enter both company names."));
      return;
    }
    setLoading(true);
    setError(null);
    setMissingA(false);
    setMissingB(false);
    setReportA(null);
    setReportB(null);
    try {
      const [ra, rb] = await Promise.all([
        getCachedResearch(ta),
        getCachedResearch(tb),
      ]);
      setReportA(ra);
      setReportB(rb);
      setMissingA(ra === null);
      setMissingB(rb === null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (bootstrapped.current) return;
    const a = params.get("a")?.trim() ?? "";
    const b = params.get("b")?.trim() ?? "";
    if (a) setNameA(a);
    if (b) setNameB(b);
    if (a && b) {
      bootstrapped.current = true;
      void loadPair(a, b);
    }
  }, [params, loadPair]);

  const runFreshForMissing = useCallback(async () => {
    setRunningFresh(true);
    setError(null);
    try {
      if (missingA && nameA.trim()) {
        const r = await postResearch({ company_name: nameA.trim() });
        setReportA(r);
        setMissingA(false);
      }
      if (missingB && nameB.trim()) {
        const r = await postResearch({ company_name: nameB.trim() });
        setReportB(r);
        setMissingB(false);
      }
    } catch (e) {
      setError(e);
    } finally {
      setRunningFresh(false);
    }
  }, [missingA, missingB, nameA, nameB]);

  const shared = useMemo(
    () => sharedRecurringThemes(reportA, reportB),
    [reportA, reportB],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = nameA.trim();
    const b = nameB.trim();
    router.replace(
      `/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
      { scroll: false },
    );
    void loadPair(a, b);
  };

  const errMsg = error ? errorMessage(error) : "";
  const errM = error ? errorMeta(error) : {};

  const prosA = reportA ? reportA.pros.slice(0, 4).map((p) => p.point) : [];
  const consA = reportA ? reportA.cons.slice(0, 4).map((p) => p.point) : [];
  const prosB = reportB ? reportB.pros.slice(0, 4).map((p) => p.point) : [];
  const consB = reportB ? reportB.cons.slice(0, 4).map((p) => p.point) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-zinc-200/80 bg-card/80 px-4 py-4 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/"
            className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Culture Research
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Home
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Compare companies
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Loads <strong>cached</strong> reports via{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            GET /research/&#123;name&#125;
          </code>
          . Run research on each company first, or use{" "}
          <strong>Run research for missing</strong>.
        </p>

        {apiOnline === false && (
          <div
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            API offline — start the backend on port <strong>8000</strong> or set{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_API_BASE_URL</code>.
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-8 grid gap-4 rounded-2xl border border-zinc-200/90 bg-card p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50 md:grid-cols-2"
        >
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Company A
            </label>
            <input
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="e.g. Google"
              autoComplete="organization"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Company B
            </label>
            <input
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="e.g. Microsoft"
              autoComplete="organization"
            />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {loading ? "Loading…" : "Compare (from cache)"}
            </button>
            {(missingA || missingB) && (
              <button
                type="button"
                disabled={runningFresh || apiOnline === false}
                onClick={() => void runFreshForMissing()}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-900 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100"
              >
                {runningFresh
                  ? "Running research…"
                  : "Run research for missing"}
              </button>
            )}
          </div>
        </form>

        {Boolean(error) && !loading && (
          <ErrorPanel
            title="Could not compare"
            message={errMsg}
            code={errM.code}
            status={errM.status}
            onRetry={
              nameA && nameB ? () => void loadPair(nameA, nameB) : undefined
            }
          />
        )}

        {reportA && reportB && !missingA && !missingB && shared.length > 0 && (
          <section className="mt-10 rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Shared recurring themes
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {shared.map((t) => (
                <li
                  key={t}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-900 shadow-sm dark:bg-zinc-900 dark:text-indigo-200"
                >
                  {formatThemeLabel(t)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <CompareColumn
            label="Company A"
            companyName={nameA}
            report={reportA}
            missingCache={missingA}
            researchHref={`/report?q=${encodeURIComponent(nameA || "company")}`}
            pros={prosA}
            cons={consA}
          />
          <CompareColumn
            label="Company B"
            companyName={nameB}
            report={reportB}
            missingCache={missingB}
            researchHref={`/report?q=${encodeURIComponent(nameB || "company")}`}
            pros={prosB}
            cons={consB}
          />
        </div>
      </main>
    </div>
  );
}
