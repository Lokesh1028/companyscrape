"""
Extract readable article text from HTML using trafilatura, readability, and BeautifulSoup fallbacks.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import trafilatura
from bs4 import BeautifulSoup

try:
    from readability.readability import Document
except ImportError:  # pragma: no cover
    from readability import Document

logger = logging.getLogger(__name__)


def extract_from_html(
    html: str,
    url: str,
    *,
    max_chars: int,
) -> dict[str, Any]:
    """
    Returns dict with keys: title, description, text, method
    """
    title = ""
    description = ""
    text = ""
    method = "none"

    # Meta from BeautifulSoup (fast path)
    try:
        soup = BeautifulSoup(html, "lxml")
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        og = soup.find("meta", property="og:description")
        if og and og.get("content"):
            description = og["content"].strip()
        elif soup.find("meta", attrs={"name": "description"}):
            m = soup.find("meta", attrs={"name": "description"})
            if m and m.get("content"):
                description = m["content"].strip()
    except Exception as e:
        logger.debug("BeautifulSoup meta parse failed for %s: %s", url, e)

    # Trafilatura (good boilerplate removal)
    try:
        downloaded = trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
        )
        if downloaded and len(downloaded.strip()) > 120:
            text = downloaded.strip()
            method = "trafilatura"
    except Exception as e:
        logger.debug("trafilatura failed for %s: %s", url, e)

    # Readability-lxml
    if len(text) < 200:
        try:
            doc = Document(html)
            summary_html = doc.summary()
            title = doc.short_title() or title
            inner = BeautifulSoup(summary_html, "lxml")
            t = inner.get_text("\n", strip=True)
            if len(t) > len(text):
                text = t
                method = "readability"
        except Exception as e:
            logger.debug("readability failed for %s: %s", url, e)

    # Last resort: body text
    if len(text) < 200:
        try:
            soup = BeautifulSoup(html, "lxml")
            for tag in soup(["script", "style", "noscript", "nav", "footer", "header"]):
                tag.decompose()
            t = soup.get_text("\n", strip=True)
            t = re.sub(r"\n{3,}", "\n\n", t)
            if len(t) > len(text):
                text = t
                method = "beautifulsoup_body"
        except Exception as e:
            logger.debug("BS body fallback failed for %s: %s", url, e)

    if len(text) > max_chars:
        text = text[:max_chars] + "\n…"

    return {
        "title": title,
        "description": description,
        "text": text.strip(),
        "method": method,
    }
