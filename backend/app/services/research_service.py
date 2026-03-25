"""
Orchestrates search → scrape → extract → cluster → summarize → persist.
All real API calls — no mock fallbacks.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ResearchPipelineError
from app.models.company import Company
from app.schemas.research import EvidenceCluster, ResearchResponse, SourceCard
from app.services.cache_service import (
    create_pending_report,
    get_fresh_report,
    get_or_create_company,
    mark_report_failed,
    normalize_company_name,
    report_json_to_response,
    save_completed_report,
)
from app.services.extract_service import extract_from_html
from app.services.scrape_service import ScrapeService
from app.services.search_service import get_search_provider
from app.services.summarize_service import SummarizeService, merge_llm_into_response
from app.utils.evidence_cluster import EvidenceDict, cluster_evidence_themes, primary_theme_for_evidence
from app.utils.query_generator import generate_research_queries
from app.utils.source_ranker import category_hint_from_query_and_url, rank_and_prioritize_urls, trust_score_for_domain

logger = logging.getLogger(__name__)


def _domain(url: str) -> str | None:
    try:
        return urlparse(url).netloc.lower().removeprefix("www.") or None
    except Exception:
        return None


def _text_fingerprint(text: str) -> str:
    norm = re.sub(r"\s+", " ", (text or "").lower().strip())[:900]
    return hashlib.sha256(norm.encode("utf-8", errors="ignore")).hexdigest()


async def run_research_pipeline(
    session: AsyncSession,
    company_name: str,
    *,
    force_refresh: bool = False,
) -> ResearchResponse:
    settings = get_settings()
    display_name = company_name.strip()
    norm = normalize_company_name(display_name)
    company = await get_or_create_company(session, display_name)

    if not force_refresh:
        fresh = await get_fresh_report(
            session,
            company.id,
            ttl_hours=settings.report_cache_ttl_hours,
        )
        if fresh and fresh.report_json:
            logger.info("Cache hit for company %s", norm)
            cached_resp = report_json_to_response(
                display_name,
                fresh.report_json,
                cached=True,
                report_id=fresh.id,
            )
            if cached_resp is not None:
                return cached_resp
            logger.warning("Invalid cached payload for %s — re-running", norm)

    report = await create_pending_report(session, company.id)
    await session.commit()
    await session.refresh(report)

    try:
        # --- 1. Search via SerpAPI ---
        queries = generate_research_queries(
            display_name,
            max_queries=settings.max_search_queries,
        )
        logger.info("Running %d search queries for %r", len(queries), display_name)
        provider = get_search_provider(settings)
        logger.info("Search backend: %s", type(provider).__name__)
        search = provider.search
        sem = asyncio.Semaphore(4)

        async def run_query(q: str) -> list[dict[str, Any]]:
            async with sem:
                try:
                    items = await search(q, num_results=6)
                    return [
                        {
                            "title": it.title,
                            "url": it.url,
                            "snippet": it.snippet,
                            "query_used": q,
                            "rank": it.rank,
                        }
                        for it in items
                    ]
                except Exception as e:
                    logger.warning("Search failed for query %r: %s", q, e)
                    return []

        nested = await asyncio.gather(*[run_query(q) for q in queries])
        flat: list[dict[str, Any]] = []
        for chunk in nested:
            flat.extend(chunk)

        if not flat:
            await mark_report_failed(session, report, "No search results found")
            await session.commit()
            raise ResearchPipelineError(
                f"SerpAPI returned no search results for '{display_name}'. "
                "Check the company name or try again later.",
                code="no_search_results",
            )

        logger.info("Got %d raw search results for %r", len(flat), display_name)

        for row in flat:
            url = row.get("url") or ""
            row["trust_score"] = trust_score_for_domain(url, row.get("title"))
            row["domain"] = _domain(url)

        ranked = rank_and_prioritize_urls(flat, max_urls=settings.max_urls_to_scrape)

        # --- 2. Scrape pages ---
        scraper = ScrapeService(settings)
        extract_sem = asyncio.Semaphore(5)

        async def scrape_one(row: dict[str, Any]) -> EvidenceDict | None:
            url = row["url"]
            async with extract_sem:
                try:
                    res = await scraper.fetch_html(url)
                    if not res.get("ok"):
                        return None
                    extracted = extract_from_html(
                        res["html"],
                        url,
                        max_chars=settings.max_extract_chars_per_page,
                    )
                    text = extracted.get("text") or ""
                    if len(text.strip()) < 80:
                        return None
                    q = row.get("query_used") or ""
                    ev: EvidenceDict = {
                        "source_title": extracted.get("title") or row.get("title"),
                        "source_url": url,
                        "domain": row.get("domain") or _domain(url),
                        "query": q,
                        "snippet": row.get("snippet"),
                        "extracted_text": text,
                        "category_hint": category_hint_from_query_and_url(q, url),
                        "trust_score": float(row.get("trust_score") or trust_score_for_domain(url)),
                    }
                    theme = primary_theme_for_evidence(ev)
                    if theme:
                        ev["theme"] = theme
                    return ev
                except Exception as e:
                    logger.warning("Scrape/extract failed for %s: %s", url, e)
                    return None

        evidence_list = [e for e in await asyncio.gather(*[scrape_one(r) for r in ranked]) if e]

        # Deduplicate near-identical bodies
        seen_fp: set[str] = set()
        deduped: list[EvidenceDict] = []
        seen_urls: set[str] = set()
        for ev in evidence_list:
            u = ev.get("source_url") or ""
            if u in seen_urls:
                continue
            seen_urls.add(u)
            fp = _text_fingerprint(ev.get("extracted_text") or "")
            if fp in seen_fp:
                continue
            seen_fp.add(fp)
            deduped.append(ev)

        if not deduped:
            # Use search snippets as minimal evidence so LLM can still produce something
            for row in ranked[:6]:
                snip = (row.get("snippet") or "").strip()
                if len(snip) < 20:
                    continue
                q = row.get("query_used") or ""
                deduped.append({
                    "source_title": row.get("title"),
                    "source_url": row.get("url") or "",
                    "domain": row.get("domain") or _domain(row.get("url") or ""),
                    "query": q,
                    "snippet": snip,
                    "extracted_text": snip,
                    "category_hint": category_hint_from_query_and_url(q, row.get("url") or ""),
                    "trust_score": float(row.get("trust_score") or 0.3),
                })

        if not deduped:
            await mark_report_failed(session, report, "Could not extract any evidence")
            await session.commit()
            raise ResearchPipelineError(
                f"Found search results for '{display_name}' but could not extract any usable content. "
                "Try again later.",
                code="no_evidence",
            )

        logger.info("Extracted %d evidence items for %r", len(deduped), display_name)

        # --- 3. Summarize via LLM (Groq / OpenAI) ---
        summarizer = SummarizeService(settings)
        try:
            llm_payload = await summarizer.summarize(display_name, deduped)
        except Exception as e:
            logger.exception("LLM summarization failed: %s", e)
            await mark_report_failed(session, report, f"LLM failed: {e}")
            await session.commit()
            raise ResearchPipelineError(
                f"Search succeeded but LLM summarization failed: {e}",
                code="llm_failed",
            ) from e

        # --- 4. Build response ---
        theme_map = cluster_evidence_themes(deduped)
        clusters = [
            EvidenceCluster(theme=k, summary=None, evidence_indices=v)
            for k, v in theme_map.items()
            if v
        ]

        source_cards: list[SourceCard] = []
        for row in ranked:
            source_cards.append(
                SourceCard(
                    title=row.get("title"),
                    url=row["url"],
                    domain=row.get("domain"),
                    snippet=row.get("snippet"),
                    trust_score=row.get("trust_score"),
                    category_hint=category_hint_from_query_and_url(
                        row.get("query_used") or "",
                        row["url"],
                    ),
                )
            )

        response = merge_llm_into_response(
            display_name,
            llm_payload,
            deduped,
            source_cards,
            clusters,
            cached=False,
            report_id=report.id,
        )

        sources_payload: list[dict[str, Any]] = []
        for row in ranked:
            ex = next((e for e in deduped if e.get("source_url") == row["url"]), None)
            sources_payload.append(
                {
                    "title": row.get("title"),
                    "url": row["url"],
                    "domain": row.get("domain"),
                    "snippet": row.get("snippet"),
                    "extracted_text": (ex or {}).get("extracted_text"),
                    "trust_score": row.get("trust_score"),
                    "category_hint": category_hint_from_query_and_url(row.get("query_used") or "", row["url"]),
                    "query_used": row.get("query_used"),
                    "rank": row.get("rank"),
                }
            )

        await session.refresh(report)
        await save_completed_report(
            session,
            report=report,
            response=response,
            queries=queries,
            sources_payload=sources_payload,
        )
        await session.commit()
        return response

    except ResearchPipelineError:
        raise
    except Exception as e:
        logger.exception("Research pipeline failed: %s", e)
        await session.refresh(report)
        await mark_report_failed(session, report, str(e))
        await session.commit()
        raise ResearchPipelineError(
            f"Research failed for '{display_name}': {e}",
            code="research_pipeline_error",
        ) from e


async def get_cached_by_name(session: AsyncSession, company_name: str) -> ResearchResponse | None:
    settings = get_settings()
    norm = normalize_company_name(company_name)
    result = await session.execute(select(Company).where(Company.normalized_name == norm))
    company = result.scalar_one_or_none()
    if not company:
        return None
    fresh = await get_fresh_report(
        session,
        company.id,
        ttl_hours=settings.report_cache_ttl_hours,
    )
    if not fresh or not fresh.report_json:
        return None
    return report_json_to_response(
        company.name,
        fresh.report_json,
        cached=True,
        report_id=fresh.id,
    )
