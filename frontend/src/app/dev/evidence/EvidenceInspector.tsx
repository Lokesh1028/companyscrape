"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadMockReport } from "@/lib/api";
import { parseResearchResponse } from "@/lib/validate-report";
import type { ResearchResponse } from "@/types/research";

const STORAGE_KEY = "last_report_json";

type Tab = "edit" | "pretty" | "evidence";

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function evidenceToCsv(report: ResearchResponse): string {
  const headers = [
    "index",
    "domain",
    "theme",
    "trust_score",
    "source_url",
    "snippet",
  ];
  const rows = report.evidence_snippets.map((ev, i) =>
    [
      String(i + 1),
      ev.domain ?? "",
      ev.theme ?? "",
      ev.trust_score != null ? String(ev.trust_score) : "",
      ev.source_url,
      (ev.snippet ?? "").replace(/\s+/g, " ").trim(),
    ].map(escapeCsvCell),
  );
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function EvidenceInspector() {
  const [raw, setRaw] = useState<string>("");
  const [tab, setTab] = useState<Tab>("edit");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reloadFromStorage = useCallback(() => {
    try {
      const j = sessionStorage.getItem(STORAGE_KEY);
      setRaw(j ?? "");
      setParseError(null);
    } catch {
      setRaw("");
      setParseError("sessionStorage is not available in this context.");
    }
  }, []);

  useEffect(() => {
    reloadFromStorage();
  }, [reloadFromStorage]);

  const parsed = useMemo((): ResearchResponse | null => {
    if (!raw.trim()) return null;
    try {
      const data: unknown = JSON.parse(raw);
      return parseResearchResponse(data);
    } catch {
      return null;
    }
  }, [raw]);

  const validateMessage = useMemo(() => {
    if (!raw.trim()) return "Paste JSON, reload from session, or load sample.";
    try {
      JSON.parse(raw);
    } catch (e) {
      return `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`;
    }
    try {
      parseResearchResponse(JSON.parse(raw));
      return "Valid research report shape.";
    } catch (e) {
      return e instanceof Error ? e.message : "Validation failed.";
    }
  }, [raw]);

  const applyPretty = () => {
    try {
      const obj = JSON.parse(raw);
      setRaw(JSON.stringify(obj, null, 2));
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const loadSample = async () => {
    try {
      const r = await loadMockReport();
      setRaw(JSON.stringify(r, null, 2));
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Failed to load sample");
    }
  };

  const downloadCsv = () => {
    if (!parsed) return;
    const csv = evidenceToCsv(parsed);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = parsed.company_name.replace(/\s+/g, "-").slice(0, 40) || "export";
    a.download = `evidence-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prettyText = useMemo(() => {
    if (!raw.trim()) return "";
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }, [raw]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/report"
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
        >
          ← Report
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Evidence inspector
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Inspect and export research payloads from{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            {STORAGE_KEY}
          </code>{" "}
          (populated after a successful run on{" "}
          <Link href="/report" className="font-medium underline">
            /report
          </Link>
          ).
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reloadFromStorage}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-950"
          >
            Reload from session
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-950"
          >
            Load sample JSON
          </button>
          <button
            type="button"
            onClick={applyPretty}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-950"
          >
            Format JSON
          </button>
          <button
            type="button"
            onClick={() => void copyAll()}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-950"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRaw("");
              setParseError(null);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-950"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={!parsed}
            onClick={downloadCsv}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
          >
            Download evidence CSV
          </button>
        </div>

        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            validateMessage.startsWith("Valid")
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
              : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          }`}
          role="status"
        >
          {validateMessage}
        </div>

        {parseError && (
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
            {parseError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          {(
            [
              ["edit", "Edit JSON"],
              ["pretty", "Formatted"],
              ["evidence", "Evidence table"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === k
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "edit" && (
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            className="mt-4 h-[min(60vh,520px)] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-xs text-zinc-100 dark:border-zinc-800"
            placeholder='{ "company_name": "...", ... }'
          />
        )}

        {tab === "pretty" && (
          <pre className="mt-4 max-h-[min(60vh,520px)] overflow-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-xs text-zinc-100 dark:border-zinc-800">
            {prettyText || "// Empty"}
          </pre>
        )}

        {tab === "evidence" && parsed && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold dark:border-zinc-800">
                    #
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold dark:border-zinc-800">
                    Domain
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold dark:border-zinc-800">
                    Theme
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold dark:border-zinc-800">
                    Trust
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold dark:border-zinc-800">
                    Snippet / URL
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsed.evidence_snippets.map((ev, i) => (
                  <tr
                    key={`${ev.source_url}-${i}`}
                    className="border-b border-zinc-100 dark:border-zinc-800/80"
                  >
                    <td className="px-3 py-2 align-top tabular-nums text-muted">
                      {i + 1}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 align-top">
                      {ev.domain ?? "—"}
                    </td>
                    <td className="max-w-[100px] truncate px-3 py-2 align-top">
                      {ev.theme ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums">
                      {ev.trust_score != null
                        ? `${Math.round(ev.trust_score * 100)}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-zinc-600 dark:text-zinc-400">
                      <a
                        href={ev.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-1 block font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {ev.source_url}
                      </a>
                      {(ev.snippet || ev.extracted_text || "—").slice(0, 280)}
                      {(ev.snippet || ev.extracted_text || "").length > 280
                        ? "…"
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "evidence" && !parsed && (
          <p className="mt-4 text-sm text-muted">
            No valid parsed report — fix JSON on the Edit tab first.
          </p>
        )}
      </main>
    </div>
  );
}
