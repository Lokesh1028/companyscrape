import { ApiError } from "@/lib/api-error";

export function ErrorPanel({
  title,
  message,
  code,
  status,
  onRetry,
}: {
  title: string;
  message: string;
  code?: string;
  status?: number;
  onRetry?: () => void;
}) {
  return (
    <div
      className="mt-6 overflow-hidden rounded-2xl border border-rose-200/80 bg-rose-50/90 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/35"
      role="alert"
    >
      <div className="border-b border-rose-200/60 bg-rose-100/50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/50">
        <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
          {title}
        </p>
        {(code || status) && (
          <p className="mt-0.5 font-mono text-xs text-rose-700/80 dark:text-rose-300/80">
            {status != null && <span>{status} </span>}
            {code && <span>· {code}</span>}
          </p>
        )}
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed text-rose-900/90 dark:text-rose-100/90">
        {message}
      </div>
      {onRetry && (
        <div className="border-t border-rose-200/60 px-4 py-3 dark:border-rose-900/40">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function errorMeta(err: unknown): { code?: string; status?: number } {
  if (err instanceof ApiError) {
    return { code: err.code, status: err.status };
  }
  return {};
}
