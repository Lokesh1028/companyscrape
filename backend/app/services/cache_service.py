"""
Persistence helpers for companies, reports, sources, and search queries.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from pydantic import ValidationError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.company import Company
from app.models.research import ResearchReport, SearchQuery, Source
from app.schemas.research import ResearchResponse, SourceCard

logger = logging.getLogger(__name__)


def normalize_company_name(name: str) -> str:
    """Stable key for deduplication and cache lookup."""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    slug = re.sub(r"[^a-z0-9]+", "-", cleaned.lower()).strip("-")
    return slug or "unknown"


async def get_or_create_company(session: AsyncSession, display_name: str) -> Company:
    norm = normalize_company_name(display_name)
    result = await session.execute(select(Company).where(Company.normalized_name == norm))
    row = result.scalar_one_or_none()
    if row:
        return row
    c = Company(name=display_name.strip(), normalized_name=norm)
    session.add(c)
    await session.flush()
    return c


async def get_fresh_report(
    session: AsyncSession,
    company_id: int,
    *,
    ttl_hours: int,
) -> ResearchReport | None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
    q = (
        select(ResearchReport)
        .where(
            ResearchReport.company_id == company_id,
            ResearchReport.status == "completed",
        )
        .order_by(ResearchReport.id.desc())
        .limit(30)
    )
    result = await session.execute(q)
    rows = result.scalars().all()
    for r in rows:
        if not r.report_json:
            continue
        ref = r.refreshed_at or r.updated_at
        if ref is None:
            continue
        if ref.tzinfo is None:
            ref = ref.replace(tzinfo=timezone.utc)
        if ref >= cutoff:
            return r
    return None


def report_json_to_response(
    company_display: str,
    data: dict[str, Any],
    *,
    cached: bool,
    report_id: int,
) -> ResearchResponse | None:
    """Hydrate Pydantic model from stored JSON; None if the blob is incompatible."""
    raw = json.loads(json.dumps(data))
    payload = {**raw, "company_name": company_display, "cached": cached, "report_id": report_id}
    try:
        return ResearchResponse.model_validate(payload)
    except ValidationError as e:
        logger.warning("Skipping invalid cached report id=%s: %s", report_id, e)
        return None


async def save_completed_report(
    session: AsyncSession,
    *,
    report: ResearchReport,
    response: ResearchResponse,
    queries: list[str],
    sources_payload: list[dict[str, Any]],
) -> None:
    now = datetime.now(timezone.utc)
    report.status = "completed"
    report.overall_sentiment = response.overall_sentiment
    report.confidence_score = response.confidence_score
    report.report_json = json.loads(response.model_dump_json())
    report.error_message = None
    report.refreshed_at = now

    await session.execute(delete(SearchQuery).where(SearchQuery.report_id == report.id))
    await session.execute(delete(Source).where(Source.report_id == report.id))
    await session.flush()

    for qt in queries:
        session.add(SearchQuery(report_id=report.id, query_text=qt))

    for sp in sources_payload:
        session.add(
            Source(
                report_id=report.id,
                title=sp.get("title"),
                url=sp["url"],
                domain=sp.get("domain"),
                snippet=sp.get("snippet"),
                extracted_text=sp.get("extracted_text"),
                trust_score=sp.get("trust_score"),
                category_hint=sp.get("category_hint"),
                query_used=sp.get("query_used"),
                rank=sp.get("rank"),
            )
        )


async def create_pending_report(session: AsyncSession, company_id: int) -> ResearchReport:
    r = ResearchReport(company_id=company_id, status="processing")
    session.add(r)
    await session.flush()
    return r


async def mark_report_failed(session: AsyncSession, report: ResearchReport, msg: str) -> None:
    report.status = "failed"
    report.error_message = msg[:4000]


async def list_recent_reports(session: AsyncSession, limit: int = 20) -> list[dict[str, Any]]:
    q = (
        select(ResearchReport, Company)
        .join(Company, ResearchReport.company_id == Company.id)
        .where(ResearchReport.status == "completed")
        .order_by(ResearchReport.id.desc())
        .limit(limit)
    )
    result = await session.execute(q)
    out: list[dict[str, Any]] = []
    for rep, co in result.all():
        out.append(
            {
                "report_id": rep.id,
                "company_name": co.name,
                "normalized_name": co.normalized_name,
                "overall_sentiment": rep.overall_sentiment,
                "confidence_score": rep.confidence_score,
                "refreshed_at": rep.refreshed_at.isoformat() if rep.refreshed_at else None,
            }
        )
    return out


def sources_to_cards(rows: list[Source]) -> list[SourceCard]:
    return [
        SourceCard(
            title=r.title,
            url=r.url,
            domain=r.domain,
            snippet=r.snippet,
            trust_score=r.trust_score,
            category_hint=r.category_hint,
        )
        for r in rows
    ]
