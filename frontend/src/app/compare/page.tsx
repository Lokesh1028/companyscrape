import { Suspense } from "react";
import { CompareClient } from "./CompareClient";

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          Loading comparison…
        </div>
      }
    >
      <CompareClient />
    </Suspense>
  );
}
