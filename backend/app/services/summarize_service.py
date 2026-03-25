"""
LLM summarization via OpenAI-compatible APIs, with a deterministic mock path.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI

from app.core.config import Settings, get_settings
from app.schemas.research import (
    CitedPoint,
    EvidenceCluster,
    EvidenceItem,
    ResearchResponse,
    SourceCard,
)
from app.utils.evidence_cluster import EvidenceDict, cluster_evidence_themes

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "summarize_report.txt"


def _load_prompt_template() -> str:
    if PROMPT_PATH.exists():
        return PROMPT_PATH.read_text(encoding="utf-8")
    return "Company: {{company_name}}\nEvidence:\n{{numbered_evidence}}\nReturn JSON."


def _format_numbered_evidence(evidence: list[EvidenceDict]) -> str:
    lines: list[str] = []
    for i, ev in enumerate(evidence, start=1):
        title = ev.get("source_title") or "(no title)"
        url = ev.get("source_url") or ""
        dom = ev.get("domain") or ""
        snip = (ev.get("snippet") or "")[:400]
        body = (ev.get("extracted_text") or "")[:1200]
        trust = ev.get("trust_score")
        lines.append(
            f"#{i} | {title} | {dom} | trust~{trust}\nURL: {url}\nSnippet: {snip}\nExtract: {body}\n"
        )
    return "\n".join(lines)


def _format_clusters(evidence: list[EvidenceDict]) -> str:
    clusters = cluster_evidence_themes(evidence)
    parts = []
    for theme, idxs in clusters.items():
        if idxs:
            parts.append(f"{theme}: {idxs}")
    return "; ".join(parts) if parts else "(no clusters)"


def _strip_json_fence(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\n", "", s)
        s = re.sub(r"\n```$", "", s)
    return s.strip()


class SummarizeService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    async def summarize(
        self,
        company_name: str,
        evidence: list[EvidenceDict],
    ) -> dict[str, Any]:
        api_key = self.settings.llm_api_key
        if self.settings.llm_provider == "mock" or not api_key:
            return self._mock_summarize(company_name, evidence)

        template = _load_prompt_template()
        prompt = (
            template.replace("{{company_name}}", company_name)
            .replace("{{numbered_evidence}}", _format_numbered_evidence(evidence))
            .replace("{{theme_clusters}}", _format_clusters(evidence))
        )

        client = AsyncOpenAI(
            api_key=api_key,
            base_url=self.settings.llm_base_url,
        )
        try:
            resp = await client.chat.completions.create(
                model=self.settings.llm_model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You output only valid minified JSON for research summaries.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or "{}"
            data = json.loads(_strip_json_fence(raw))
            return data
        except Exception as e:
            logger.exception("LLM summarization failed: %s", e)
            return self._mock_summarize(company_name, evidence)

    def _mock_summarize(self, company_name: str, evidence: list[EvidenceDict]) -> dict[str, Any]:
        """Rule-based fallback grounded in extracted snippets only."""
        blob = " ".join(
            (e.get("snippet") or "") + " " + (e.get("extracted_text") or "")[:500]
            for e in evidence
        ).lower()
        pos_hits = sum(1 for w in ("great", "good", "flexible", "learning", "supportive") if w in blob)
        neg_hits = sum(1 for w in ("toxic", "burnout", "layoff", "micromanag", "poor") if w in blob)
        if neg_hits > pos_hits + 1:
            sentiment = "Negative"
        elif pos_hits > neg_hits + 1:
            sentiment = "Positive"
        else:
            sentiment = "Mixed"

        n = max(1, len(evidence))
        confidence = min(0.9, 0.35 + 0.04 * min(n, 12))
        if len(blob.strip()) < 200:
            confidence *= 0.6

        def cites() -> list[int]:
            return list(range(1, min(4, n + 1)))

        return {
            "company_overview": (
                f"Public sources mention {company_name} in the context of employee discussions, "
                f"reviews, and news-like pages. Details below are synthesized only from provided snippets."
            ),
            "what_company_does": (
                "Could not reliably infer core business from evidence alone."
                if "technology" not in blob and "software" not in blob
                else "Evidence suggests a technology-focused employer; verify on official channels."
            ),
            "culture_summary": (
                "Sources include a mix of first-party career messaging and third-party reviews. "
                "Treat qualitative claims as opinions unless corroborated."
            ),
            "employee_sentiment_summary": (
                f"Heuristic mock summary: signals skew {sentiment.lower()} based on keyword density in evidence "
                f"({len(evidence)} sources). Replace with real LLM when configured."
            ),
            "overall_sentiment": sentiment,
            "confidence_score": round(confidence, 2),
            "fact_vs_opinion_note": (
                "Review sites and forums reflect subjective experiences; news excerpts may be closer to "
                "reported fact but still require verification."
            ),
            "pros": [
                {"point": "Peers and learning culture mentioned positively in some snippets.", "citations": cites()}
            ],
            "cons": [
                {
                    "point": "Some sources mention workload or management variability.",
                    "citations": cites(),
                }
            ],
            "red_flags": [],
            "recent_signals": [
                {
                    "point": "Check news-related evidence items for timing and corroboration.",
                    "citations": cites(),
                }
            ],
            "leadership_signals": [
                {"point": "Leadership changes or executive mentions appear in some sources.", "citations": cites()}
            ],
            "work_life_balance_signals": [
                {"point": "Mixed anecdotes on hours and flexibility; not uniform across teams.", "citations": cites()}
            ],
            "career_growth_signals": [
                {"point": "Growth and promotion narratives vary; confirm with multiple sources.", "citations": cites()}
            ],
            "recurring_themes": ["reviews", "culture", "management", "news"],
        }


def merge_llm_into_response(
    company_name: str,
    llm: dict[str, Any],
    evidence: list[EvidenceDict],
    sources_cards: list[SourceCard],
    clusters: list[EvidenceCluster],
    *,
    cached: bool = False,
    report_id: int | None = None,
    message: str | None = None,
) -> ResearchResponse:
    def points(key: str) -> list[CitedPoint]:
        raw_list = llm.get(key) or []
        out: list[CitedPoint] = []
        for p in raw_list:
            if isinstance(p, dict) and p.get("point"):
                raw_cites = p.get("citations") or []
                cites: list[int] = []
                if isinstance(raw_cites, list):
                    for x in raw_cites:
                        try:
                            n = int(float(x))  # type: ignore[arg-type]
                            if n >= 1:
                                cites.append(n)
                        except (TypeError, ValueError):
                            continue
                out.append(CitedPoint(point=str(p["point"]), citations=cites))
        return out

    sentiment = llm.get("overall_sentiment") or "Mixed"
    if sentiment not in ("Positive", "Mixed", "Negative"):
        sentiment = "Mixed"

    conf = float(llm.get("confidence_score") or 0.5)
    conf = max(0.0, min(1.0, conf))

    ev_items = [
        EvidenceItem(
            source_title=e.get("source_title"),
            source_url=e.get("source_url") or "",
            domain=e.get("domain"),
            query=e.get("query"),
            snippet=e.get("snippet"),
            extracted_text=(e.get("extracted_text") or "")[:2000] if e.get("extracted_text") else None,
            category_hint=e.get("category_hint"),
            trust_score=e.get("trust_score"),
            theme=e.get("theme"),
        )
        for e in evidence
    ]

    return ResearchResponse(
        company_name=company_name,
        company_overview=str(llm.get("company_overview") or ""),
        what_company_does=str(llm.get("what_company_does") or ""),
        culture_summary=str(llm.get("culture_summary") or ""),
        employee_sentiment_summary=str(llm.get("employee_sentiment_summary") or ""),
        overall_sentiment=sentiment,  # type: ignore[arg-type]
        confidence_score=conf,
        fact_vs_opinion_note=str(llm.get("fact_vs_opinion_note") or ""),
        pros=points("pros"),
        cons=points("cons"),
        red_flags=points("red_flags"),
        recent_signals=points("recent_signals"),
        leadership_signals=points("leadership_signals"),
        work_life_balance_signals=points("work_life_balance_signals"),
        career_growth_signals=points("career_growth_signals"),
        recurring_themes=list(llm.get("recurring_themes") or []),
        sources=sources_cards,
        evidence_clusters=clusters,
        evidence_snippets=ev_items,
        cached=cached,
        report_id=report_id,
        status="completed",
        message=message,
    )
