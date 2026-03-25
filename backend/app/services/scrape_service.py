"""
HTTP fetch with optional Playwright fallback for JS-heavy pages.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import Settings, get_settings
from app.utils.robots import can_fetch_url

logger = logging.getLogger(__name__)

USER_AGENT = (
    "CompanyCultureResearchBot/1.0 (+https://example.local; research assistant; contact: admin@example.local)"
)


class ScrapeService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=0.5, max=6))
    async def fetch_html(self, url: str) -> dict[str, Any]:
        allowed = await can_fetch_url(
            url,
            USER_AGENT,
            respect=self.settings.respect_robots_txt,
        )
        if not allowed:
            return {"ok": False, "error": "disallowed_by_robots_txt", "html": ""}

        timeout = httpx.Timeout(self.settings.http_timeout_seconds)
        headers = {"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"}
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            try:
                r = await client.get(url, headers=headers)
                r.raise_for_status()
                html = r.text
                if len(html.strip()) < 400 and self.settings.playwright_enabled:
                    pw = await self._playwright_fetch(url)
                    if pw:
                        html = pw
                return {"ok": True, "html": html, "error": None}
            except Exception as e:
                logger.warning("HTTP fetch failed for %s: %s", url, e)
                if self.settings.playwright_enabled:
                    pw = await self._playwright_fetch(url)
                    if pw:
                        return {"ok": True, "html": pw, "error": None}
                return {"ok": False, "html": "", "error": str(e)}

    async def _playwright_fetch(self, url: str) -> str | None:
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.warning("Playwright not installed")
            return None

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(user_agent=USER_AGENT)
                page = await context.new_page()
                await page.goto(url, timeout=self.settings.playwright_timeout_ms, wait_until="networkidle")
                html = await page.content()
                await browser.close()
                return html
        except Exception as e:
            logger.warning("Playwright fetch failed for %s: %s", url, e)
            return None
