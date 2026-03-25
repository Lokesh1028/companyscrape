import { Suspense } from "react";
import { ReportClient } from "./ReportClient";

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          Loading…
        </div>
      }
    >
      <ReportClient />
    </Suspense>
  );
}
