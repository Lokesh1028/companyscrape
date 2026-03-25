"""
Pydantic contracts shared with the Next.js client.
Indices in `citations` refer to 1-based positions in the flattened evidence list
sent to the LLM (documented in summarize prompt).
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ResearchRequest(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=512)
    force_refresh: bool = False


class SearchResultItem(BaseModel):
    title: str | None = None
    url: str
    snippet: str | None = None
    source: str | None = Field(None, description="Domain or provider label")
    rank: int | None = None
    query_used: str | None = None


class EvidenceItem(BaseModel):
    """Single piece of extracted evidence (API-facing)."""

    source_title: str | None = None
    source_url: str
    domain: str | None = None
    query: str | None = None
    snippet: str | None = None
    extracted_text: str | None = None
    category_hint: str | None = None
    trust_score: float | None = Field(None, ge=0.0, le=1.0)
    theme: str | None = Field(None, description="Clustered theme key")


class EvidenceCluster(BaseModel):
    theme: str
    summary: str | None = None
    evidence_indices: list[int] = Field(default_factory=list)


class CitedPoint(BaseModel):
    point: str
    citations: list[int] = Field(default_factory=list)


class SourceCard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    url: str
    domain: str | None = None
    snippet: str | None = None
    trust_score: float | None = Field(default=None, ge=0.0, le=1.0)
    category_hint: str | None = None


SentimentLiteral = Literal["Positive", "Mixed", "Negative"]
ReportStatusLiteral = Literal["completed", "processing", "failed", "pending"]


class ResearchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    company_name: str
    company_overview: str = ""
    what_company_does: str = ""
    culture_summary: str = ""
    employee_sentiment_summary: str = ""
    overall_sentiment: SentimentLiteral = "Mixed"
    confidence_score: float = Field(0.0, ge=0.0, le=1.0)
    fact_vs_opinion_note: str = Field(
        default="",
        description="Short note separating factual claims from opinions in sources.",
    )
    pros: list[CitedPoint] = Field(default_factory=list)
    cons: list[CitedPoint] = Field(default_factory=list)
    red_flags: list[CitedPoint] = Field(default_factory=list)
    recent_signals: list[CitedPoint] = Field(default_factory=list)
    leadership_signals: list[CitedPoint] = Field(default_factory=list)
    work_life_balance_signals: list[CitedPoint] = Field(default_factory=list)
    career_growth_signals: list[CitedPoint] = Field(default_factory=list)
    recurring_themes: list[str] = Field(default_factory=list)
    sources: list[SourceCard] = Field(default_factory=list)
    evidence_clusters: list[EvidenceCluster] = Field(default_factory=list)
    evidence_snippets: list[EvidenceItem] = Field(default_factory=list)
    disclaimer: str = Field(
        default=(
            "This report is an automated research summary based on public web sources. "
            "It may include subjective opinions from reviewers and forums, not verified facts. "
            "Do not use as sole input for employment or investment decisions."
        )
    )
    cached: bool = False
    report_id: int | None = None
    status: ReportStatusLiteral = "completed"
    message: str | None = Field(
        None,
        description="Optional user-facing note (e.g. partial data, limited confidence).",
    )

    @field_validator("overall_sentiment", mode="before")
    @classmethod
    def coerce_sentiment(cls, v: object) -> str:
        if v in ("Positive", "Mixed", "Negative"):
            return str(v)
        return "Mixed"

    @field_validator("confidence_score", mode="before")
    @classmethod
    def coerce_confidence(cls, v: object) -> float:
        try:
            x = float(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, x))

    @field_validator("status", mode="before")
    @classmethod
    def coerce_status(cls, v: object) -> str:
        allowed = {"completed", "processing", "failed", "pending"}
        if isinstance(v, str) and v in allowed:
            return v
        return "completed"


class ResearchHistoryItem(BaseModel):
    company_name: str
    normalized_name: str
    overall_sentiment: str | None = None
    confidence_score: float | None = None
    refreshed_at: str | None = None
    report_id: int
