export function ReportSkeleton() {
  return (
    <div className="mt-8 animate-pulse space-y-6" aria-hidden>
      <div className="rounded-3xl border border-zinc-200/80 bg-white/60 p-8 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="h-9 w-2/3 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-7 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="mt-6 h-2.5 w-full max-w-sm rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-36 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="h-36 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      </div>
      <div className="h-48 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
    </div>
  );
}
