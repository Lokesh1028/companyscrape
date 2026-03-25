"""
Search provider abstraction: SerpAPI, Google Programmable Search, or mock.
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

from app.core.config import Settings, get_settings
from app.schemas.research import SearchResultItem

logger = logging.getLogger(__name__)


def _domain_from_url(url: str) -> str | None:
    try:
        return urlparse(url).netloc.lower().removeprefix("www.") or None
    except Exception:
        return None


class SearchProvider(ABC):
    @abstractmethod
    async def search(self, query: str, *, num_results: int = 8) -> list[SearchResultItem]:
        pass


class SerpAPIProvider(SearchProvider):
    def __init__(self, api_key: str, timeout: float):
        self.api_key = api_key
        self.timeout = timeout

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_not_exception_type(ValueError),
    )
    async def search(self, query: str, *, num_results: int = 8) -> list[SearchResultItem]:
        params = {
            "engine": "google",
            "q": query,
            "api_key": self.api_key,
            "num": min(num_results, 10),
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.get("https://serpapi.com/search.json", params=params)
            r.raise_for_status()
            data = r.json()
        if err := data.get("error"):
            logger.warning("SerpAPI returned error for query %r: %s", query, err)
            raise ValueError(str(err))
        meta = data.get("search_metadata") or {}
        if meta.get("status") == "Error":
            err = meta.get("error") or meta.get("google_url") or "SerpAPI search failed"
            logger.warning("SerpAPI search_metadata error for %r: %s", query, err)
            raise ValueError(str(err))
        organic = data.get("organic_results") or []
        if not organic:
            logger.info(
                "SerpAPI returned no organic_results for query %r (status=%s)",
                query,
                meta.get("status"),
            )
        out: list[SearchResultItem] = []
        for i, item in enumerate(organic[:num_results]):
            url = item.get("link") or ""
            if not url:
                continue
            out.append(
                SearchResultItem(
                    title=item.get("title"),
                    url=url,
                    snippet=item.get("snippet"),
                    source=_domain_from_url(url),
                    rank=i + 1,
                    query_used=query,
                )
            )
        return out


class GoogleCseProvider(SearchProvider):
    def __init__(self, api_key: str, cx: str, timeout: float):
        self.api_key = api_key
        self.cx = cx
        self.timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def search(self, query: str, *, num_results: int = 8) -> list[SearchResultItem]:
        params = {
            "key": self.api_key,
            "cx": self.cx,
            "q": query,
            "num": min(num_results, 10),
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params=params,
            )
            r.raise_for_status()
            data = r.json()
        items = data.get("items") or []
        out: list[SearchResultItem] = []
        for i, item in enumerate(items[:num_results]):
            url = item.get("link") or ""
            if not url:
                continue
            out.append(
                SearchResultItem(
                    title=item.get("title"),
                    url=url,
                    snippet=item.get("snippet"),
                    source=_domain_from_url(url),
                    rank=i + 1,
                    query_used=query,
                )
            )
        return out


class MockSearchProvider(SearchProvider):
    """Deterministic mock results for local UI/dev without API keys."""

    async def search(self, query: str, *, num_results: int = 8) -> list[SearchResultItem]:
        fixture = Path(__file__).resolve().parent.parent / "data" / "mock_search_results.json"
        if fixture.exists():
            raw = json.loads(fixture.read_text(encoding="utf-8"))
            pool: list[dict[str, Any]] = raw.get("results", [])
        else:
            pool = _BUILTIN_MOCK

        q_lower = query.lower()
        tokens = [t for t in q_lower.split() if len(t) > 2][:5]
        picked = [
            r
            for r in pool
            if any(
                (tok in (r.get("query_match") or "").lower())
                or (tok in (r.get("snippet") or "").lower())
                for tok in tokens
            )
        ]
        if not picked:
            picked = list(pool)
        out: list[SearchResultItem] = []
        for i, row in enumerate(picked[:num_results]):
            out.append(
                SearchResultItem(
                    title=row.get("title"),
                    url=row["url"],
                    snippet=row.get("snippet"),
                    source=_domain_from_url(row["url"]),
                    rank=i + 1,
                    query_used=query,
                )
            )
        return out


_BUILTIN_MOCK: list[dict[str, Any]] = [
    {
        "title": "Example Corp — Life & Culture",
        "url": "https://example.com/careers/culture",
        "snippet": "We value transparency, flexible hours, and continuous learning.",
        "query_match": "culture reviews employee",
    },
    {
        "title": "Example Corp employee reviews | Glassdoor",
        "url": "https://www.glassdoor.com/Reviews/Example-Corp",
        "snippet": "Mixed reviews: great peers, but management varies by team.",
        "query_match": "glassdoor reviews",
    },
    {
        "title": "r/careeradvice — Example Corp WLB?",
        "url": "https://www.reddit.com/r/careeradvice/comments/example",
        "snippet": "Anecdotal: long hours during releases; otherwise flexible.",
        "query_match": "reddit culture",
    },
    {
        "title": "Example Corp announces restructuring",
        "url": "https://news.example.com/example-corp-restructuring",
        "snippet": "Company cites market conditions; limited role reductions mentioned.",
        "query_match": "layoffs news",
    },
]


def get_search_provider(settings: Settings | None = None) -> SearchProvider:
    s = settings or get_settings()
    if s.search_provider == "serpapi":
        if not s.serpapi_api_key:
            logger.warning(
                "SEARCH_PROVIDER=serpapi but SERPAPI_API_KEY is empty — using mock search "
                "(same results for every company). Set SERPAPI_API_KEY in backend/.env."
            )
            return MockSearchProvider()
        return SerpAPIProvider(s.serpapi_api_key, s.http_timeout_seconds)
    if s.search_provider == "google_cse":
        if not s.google_api_key or not s.google_cse_id:
            logger.warning("Google CSE not fully configured — falling back to mock search")
            return MockSearchProvider()
        return GoogleCseProvider(
            s.google_api_key,
            s.google_cse_id,
            s.http_timeout_seconds,
        )
    # explicit mock
    if s.serpapi_api_key:
        logger.warning(
            "SEARCH_PROVIDER=mock but SERPAPI_API_KEY is set — still using mock search. "
            "Set SEARCH_PROVIDER=serpapi to fetch real Google results via SerpAPI."
        )
    return MockSearchProvider()
