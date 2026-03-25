"""Optional robots.txt compliance before fetching URLs."""

from __future__ import annotations

import asyncio
import logging
import urllib.robotparser
from urllib.parse import urljoin, urlparse

from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

_robot_cache: dict[str, urllib.robotparser.RobotFileParser] = {}


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, min=0.5, max=4))
def _fetch_robots_txt(robots_url: str) -> urllib.robotparser.RobotFileParser:
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(robots_url)
    rp.read()
    return rp


async def can_fetch_url(url: str, user_agent: str, *, respect: bool) -> bool:
    if not respect:
        return True
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return False
        base = f"{parsed.scheme}://{parsed.netloc}"
        robots_url = urljoin(base, "/robots.txt")
        if robots_url not in _robot_cache:
            rp = await asyncio.to_thread(_fetch_robots_txt, robots_url)
            _robot_cache[robots_url] = rp
        rp = _robot_cache[robots_url]
        return rp.can_fetch(user_agent, url)
    except Exception as e:
        logger.warning("robots.txt check failed for %s: %s — allowing fetch", url, e)
        return True
