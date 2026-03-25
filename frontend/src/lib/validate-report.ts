import type {
  CitedPoint,
  EvidenceCluster,
  EvidenceItem,
  OverallSentiment,
  ReportStatus,
  ResearchResponse,
  SourceCard,
} from "@/types/research";

const SENTIMENTS: OverallSentiment[] = ["Positive", "Mixed", "Negative"];
const STATUSES: ReportStatus[] = [
  "completed",
  "processing",
  "failed",
  "pending",
];

function isSentiment(v: unknown): v is OverallSentiment {
  return typeof v === "string" && SENTIMENTS.includes(v as OverallSentiment);
}

function isStatus(v: unknown): v is ReportStatus {
  return typeof v === "string" && STATUSES.includes(v as ReportStatus);
}

function asCitedPoints(v: unknown): CitedPoint[] {
  if (!Array.isArray(v)) return [];
  const out: CitedPoint[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const p = (x as { point?: unknown; citations?: unknown }).point;
    if (typeof p !== "string" || !p.trim()) continue;
    const c = (x as { citations?: unknown }).citations;
    const citations = Array.isArray(c)
      ? c
          .map((n) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n) : NaN))
          .filter((n): n is number => Number.isInteger(n) && n > 0)
      : [];
    out.push({ point: p, citations });
  }
  return out;
}

function asSources(v: unknown): SourceCard[] {
  if (!Array.isArray(v)) return [];
  const out: SourceCard[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const url = (x as { url?: unknown }).url;
    if (typeof url !== "string" || !url.trim()) continue;
    const ts = (x as { trust_score?: unknown }).trust_score;
    let trust_score: number | null = null;
    if (typeof ts === "number" && Number.isFinite(ts)) {
      trust_score = Math.min(1, Math.max(0, ts));
    }
    out.push({
      title: typeof (x as { title?: unknown }).title === "string" ? (x as { title: string }).title : null,
      url,
      domain:
        typeof (x as { domain?: unknown }).domain === "string"
          ? (x as { domain: string }).domain
          : null,
      snippet:
        typeof (x as { snippet?: unknown }).snippet === "string"
          ? (x as { snippet: string }).snippet
          : null,
      trust_score,
      category_hint:
        typeof (x as { category_hint?: unknown }).category_hint === "string"
          ? (x as { category_hint: string }).category_hint
          : null,
    });
  }
  return out;
}

function asEvidenceSnippets(v: unknown): EvidenceItem[] {
  if (!Array.isArray(v)) return [];
  const out: EvidenceItem[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const source_url = (x as { source_url?: unknown }).source_url;
    if (typeof source_url !== "string" || !source_url.trim()) continue;
    const ts = (x as { trust_score?: unknown }).trust_score;
    let trust_score: number | null = null;
    if (typeof ts === "number" && Number.isFinite(ts)) {
      trust_score = Math.min(1, Math.max(0, ts));
    }
    out.push({
      source_title:
        typeof (x as { source_title?: unknown }).source_title === "string"
          ? (x as { source_title: string }).source_title
          : null,
      source_url,
      domain:
        typeof (x as { domain?: unknown }).domain === "string"
          ? (x as { domain: string }).domain
          : null,
      query:
        typeof (x as { query?: unknown }).query === "string"
          ? (x as { query: string }).query
          : null,
      snippet:
        typeof (x as { snippet?: unknown }).snippet === "string"
          ? (x as { snippet: string }).snippet
          : null,
      extracted_text:
        typeof (x as { extracted_text?: unknown }).extracted_text === "string"
          ? (x as { extracted_text: string }).extracted_text
          : null,
      category_hint:
        typeof (x as { category_hint?: unknown }).category_hint === "string"
          ? (x as { category_hint: string }).category_hint
          : null,
      trust_score,
      theme:
        typeof (x as { theme?: unknown }).theme === "string"
          ? (x as { theme: string }).theme
          : null,
    });
  }
  return out;
}

function asClusters(v: unknown): EvidenceCluster[] {
  if (!Array.isArray(v)) return [];
  const out: EvidenceCluster[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const theme = (x as { theme?: unknown }).theme;
    if (typeof theme !== "string") continue;
    const idx = (x as { evidence_indices?: unknown }).evidence_indices;
    const evidence_indices = Array.isArray(idx)
      ? idx.filter((n): n is number => typeof n === "number" && Number.isInteger(n))
      : [];
    out.push({
      theme,
      summary:
        typeof (x as { summary?: unknown }).summary === "string"
          ? (x as { summary: string }).summary
          : null,
      evidence_indices,
    });
  }
  return out;
}

/**
 * Runtime normalization for POST /research JSON so the UI never assumes perfect shapes.
 */
export function parseResearchResponse(data: unknown): ResearchResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid report: expected object");
  }
  const o = data as Record<string, unknown>;
  if (typeof o.company_name !== "string") {
    throw new Error("Invalid report: missing company_name");
  }

  const overall_sentiment: OverallSentiment = isSentiment(o.overall_sentiment)
    ? o.overall_sentiment
    : "Mixed";

  let confidence_score = Number(o.confidence_score);
  if (!Number.isFinite(confidence_score)) confidence_score = 0;
  confidence_score = Math.min(1, Math.max(0, confidence_score));

  const status: ReportStatus = isStatus(o.status) ? o.status : "completed";

  return {
    company_name: o.company_name,
    company_overview: String(o.company_overview ?? ""),
    what_company_does: String(o.what_company_does ?? ""),
    culture_summary: String(o.culture_summary ?? ""),
    employee_sentiment_summary: String(o.employee_sentiment_summary ?? ""),
    overall_sentiment,
    confidence_score,
    fact_vs_opinion_note: String(o.fact_vs_opinion_note ?? ""),
    pros: asCitedPoints(o.pros),
    cons: asCitedPoints(o.cons),
    red_flags: asCitedPoints(o.red_flags),
    recent_signals: asCitedPoints(o.recent_signals),
    leadership_signals: asCitedPoints(o.leadership_signals),
    work_life_balance_signals: asCitedPoints(o.work_life_balance_signals),
    career_growth_signals: asCitedPoints(o.career_growth_signals),
    recurring_themes: Array.isArray(o.recurring_themes)
      ? o.recurring_themes.filter((t): t is string => typeof t === "string")
      : [],
    sources: asSources(o.sources),
    evidence_clusters: asClusters(o.evidence_clusters),
    evidence_snippets: asEvidenceSnippets(o.evidence_snippets),
    disclaimer: String(
      o.disclaimer ??
        "This report is an automated research summary based on public web sources.",
    ),
    cached: Boolean(o.cached),
    report_id: typeof o.report_id === "number" ? o.report_id : null,
    status,
    message: o.message == null ? null : String(o.message),
  };
}
