/** Mirrors backend contracts (`app/schemas/research.py`) for type-safe integration. */

export type OverallSentiment = "Positive" | "Mixed" | "Negative";

export type ReportStatus =
  | "completed"
  | "processing"
  | "failed"
  | "pending";

export interface CitedPoint {
  point: string;
  citations: number[];
}

export interface SourceCard {
  title?: string | null;
  url: string;
  domain?: string | null;
  snippet?: string | null;
  trust_score?: number | null;
  category_hint?: string | null;
}

export interface EvidenceItem {
  source_title?: string | null;
  source_url: string;
  domain?: string | null;
  query?: string | null;
  snippet?: string | null;
  extracted_text?: string | null;
  category_hint?: string | null;
  trust_score?: number | null;
  theme?: string | null;
}

export interface EvidenceCluster {
  theme: string;
  summary?: string | null;
  evidence_indices: number[];
}

export interface ResearchResponse {
  company_name: string;
  company_overview: string;
  what_company_does: string;
  culture_summary: string;
  employee_sentiment_summary: string;
  overall_sentiment: OverallSentiment;
  confidence_score: number;
  fact_vs_opinion_note: string;
  pros: CitedPoint[];
  cons: CitedPoint[];
  red_flags: CitedPoint[];
  recent_signals: CitedPoint[];
  leadership_signals: CitedPoint[];
  work_life_balance_signals: CitedPoint[];
  career_growth_signals: CitedPoint[];
  recurring_themes: string[];
  sources: SourceCard[];
  evidence_clusters: EvidenceCluster[];
  evidence_snippets: EvidenceItem[];
  disclaimer: string;
  cached: boolean;
  report_id?: number | null;
  status: ReportStatus;
  message?: string | null;
}

export interface ResearchHistoryItem {
  company_name: string;
  normalized_name: string;
  overall_sentiment?: string | null;
  confidence_score?: number | null;
  refreshed_at?: string | null;
  report_id: number;
}
