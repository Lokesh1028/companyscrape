"""
Research endpoints: run pipeline, fetch cache, list history.
More specific routes must be registered before `/{company_name}`.
"""

from __future__ import annotations

import logging
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError, ResearchPipelineError
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.schemas.research import ResearchHistoryItem, ResearchRequest, ResearchResponse
from app.services.cache_service import list_recent_reports
from app.services.research_service import get_cached_by_name, run_research_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/research", tags=["research"])

_RESEARCH_RATE = f"{get_settings().research_rate_limit_per_minute}/minute"


@router.get("/history/recent", response_model=list[ResearchHistoryItem])
async def research_history(
    session: AsyncSession = Depends(get_db),
    limit: int = 20,
) -> list[ResearchHistoryItem]:
    rows = await list_recent_reports(session, limit=min(max(limit, 1), 50))
    return [ResearchHistoryItem.model_validate(r) for r in rows]


@router.post("", response_model=ResearchResponse)
@limiter.limit(_RESEARCH_RATE)
async def post_research(
    request: Request,
    body: ResearchRequest,
    session: AsyncSession = Depends(get_db),
) -> ResearchResponse:
    """
    Run (or return cached) deep research for a company name.
    Rate-limited per client IP.
    """
    rid = getattr(request.state, "request_id", None)
    try:
        return await run_research_pipeline(
            session,
            body.company_name,
            force_refresh=body.force_refresh,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception(
            "POST /research failed request_id=%s company=%r: %s",
            rid,
            body.company_name[:80] if body.company_name else "",
            e,
        )
        raise ResearchPipelineError(
            "Research could not be completed. Verify search/LLM configuration or try again.",
            code="research_unexpected_error",
        ) from e


@router.get("/{company_name}", response_model=ResearchResponse)
async def get_research_by_name(
    company_name: str,
    session: AsyncSession = Depends(get_db),
) -> ResearchResponse:
    """
    Return a cached report if fresh (within TTL). Does not trigger new research.
    Path segment should be URL-encoded (e.g. Google%20Inc).
    """
    name = unquote(company_name).strip()
    if not name:
        raise HTTPException(status_code=400, detail="company_name required")
    cached = await get_cached_by_name(session, name)
    if not cached:
        raise HTTPException(
            status_code=404,
            detail="No cached report for this company within the freshness window.",
        )
    return cached
