import { Suspense } from "react";
import { EvidenceInspector } from "./EvidenceInspector";

export default function DevEvidencePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          Loading…
        </div>
      }
    >
      <EvidenceInspector />
    </Suspense>
  );
}
