"""
Search provider abstraction: SerpAPI or Google Programmable Search.
No mock — requires a valid API key.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
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
        stop=stop_after_attempt(2),
        wait=wait_exponential(min=1, max=6),
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
            logger.error("SerpAPI error for %r: %s", query, err)
            raise ValueError(str(err))
        meta = data.get("search_metadata") or {}
        if meta.get("status") == "Error":
            err = meta.get("error") or "SerpAPI search failed"
            logger.error("SerpAPI metadata error for %r: %s", query, err)
            raise ValueError(str(err))
        organic = data.get("organic_results") or []
        if not organic:
            logger.info("SerpAPI: no organic results for %r", query)
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

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=6))
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


def get_search_provider(settings: Settings | None = None) -> SearchProvider:
    s = settings or get_settings()
    if s.search_provider == "serpapi":
        if not s.serpapi_api_key:
            raise ValueError(
                "SEARCH_PROVIDER=serpapi but SERPAPI_API_KEY is empty. "
                "Set it in backend/.env to use real search."
            )
        return SerpAPIProvider(s.serpapi_api_key, s.http_timeout_seconds)
    if s.search_provider == "google_cse":
        if not s.google_api_key or not s.google_cse_id:
            raise ValueError(
                "SEARCH_PROVIDER=google_cse but GOOGLE_API_KEY / GOOGLE_CSE_ID missing."
            )
        return GoogleCseProvider(
            s.google_api_key,
            s.google_cse_id,
            s.http_timeout_seconds,
        )
    raise ValueError(
        f"Unknown SEARCH_PROVIDER={s.search_provider!r}. Use 'serpapi' or 'google_cse'."
    )
