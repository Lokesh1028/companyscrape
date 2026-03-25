import { confidencePercent } from "@/lib/format";

export function ConfidenceBar({
  value,
  label = "Model confidence",
}: {
  value: number;
  label?: string;
}) {
  const pct = confidencePercent(value);
  const low = pct < 40;

  return (
    <div className="mt-4 w-full max-w-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span
          className={`text-sm font-semibold tabular-nums ${
            low
              ? "text-amber-600 dark:text-amber-400"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {pct}%
        </span>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/90 ring-1 ring-zinc-900/5 dark:bg-zinc-800 dark:ring-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct} percent`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out ${
            low
              ? "from-amber-500 to-orange-500"
              : "from-violet-500 via-indigo-500 to-sky-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {low && (
        <p className="mt-1.5 text-xs text-amber-700/90 dark:text-amber-300/90">
          Limited evidence — interpret with caution.
        </p>
      )}
    </div>
  );
}
