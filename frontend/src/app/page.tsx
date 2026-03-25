import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const EXAMPLES = ["Google", "Infosys", "Deloitte", "TCS", "Accenture"];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent)]"
        aria-hidden
      />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Culture Research
        </span>
        <ThemeToggle />
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pt-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl dark:text-zinc-50">
            Employer intelligence, backed by sources.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
            Multi-query web research, extracted evidence, and structured summaries
            with sentiment, confidence, and citations—ready for serious hiring
            decisions.
          </p>
        </div>

        <form
          action="/report"
          method="get"
          className="mx-auto mt-12 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="q" className="sr-only">
              Company name
            </label>
            <input
              id="q"
              name="q"
              required
              placeholder="Enter company name…"
              className="h-14 w-full rounded-2xl border border-zinc-200 bg-card px-5 text-base text-zinc-900 shadow-sm outline-none ring-2 ring-transparent transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-[var(--ring)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
            />
          </div>
          <button
            type="submit"
            className="h-14 shrink-0 rounded-2xl bg-zinc-900 px-8 text-base font-semibold text-white shadow-lg shadow-zinc-900/15 transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:shadow-none dark:hover:bg-zinc-200"
          >
            Research
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">Try an example</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex}
              href={`/report?q=${encodeURIComponent(ex)}`}
              className="rounded-full border border-zinc-200 bg-card px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/30"
            >
              {ex}
            </Link>
          ))}
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-5 sm:grid-cols-3">
          {[
            {
              t: "Evidence pipeline",
              d: "Search abstraction, fetch, extract, dedupe, and theme clustering before any summarization.",
            },
            {
              t: "Honest outputs",
              d: "Sentiment, confidence, fact vs opinion notes, and expandable citations per claim.",
            },
            {
              t: "Production hooks",
              d: "Postgres or SQLite, rate limits, CORS, structured errors, and a path to background jobs.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-zinc-200/90 bg-card/80 p-6 text-left shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {c.t}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {c.d}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-16 max-w-2xl rounded-2xl border border-amber-200/70 bg-amber-50/50 px-5 py-4 text-center text-xs leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100/90">
          <strong className="font-semibold">Disclaimer:</strong> Automated summaries
          from public sources may include subjective opinions. Not verified facts or
          legal, investment, or employment advice.
        </p>
      </main>
    </div>
  );
}
