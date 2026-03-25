import type { OverallSentiment } from "@/types/research";

const styles: Record<OverallSentiment, string> = {
  Positive:
    "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20",
  Mixed:
    "bg-amber-500/15 text-amber-950 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/20",
  Negative:
    "bg-rose-500/15 text-rose-900 ring-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/20",
};

export function SentimentBadge({ value }: { value: OverallSentiment }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${styles[value]}`}
    >
      {value}
    </span>
  );
}
