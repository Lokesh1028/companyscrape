"""
Heuristic source trust and prioritization.
Designed for easy replacement with ML or allowlist/blocklist configs later.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

# Domains tiers: approximate trust for employee/culture research (not legal advice).
_OFFICIAL_SUFFIXES = (
    "/about",
    "/careers",
    "/jobs",
    "/company",
    "/culture",
    "/lifeat",
)

_MAJOR_REVIEW = frozenset(
    {
        "glassdoor.com",
        "indeed.com",
        "ambitionbox.com",
        "teamblind.com",
        "blind.com",
    }
)

_LINKEDIN = frozenset({"linkedin.com", "www.linkedin.com"})

_NEWS = frozenset(
    {
        "reuters.com",
        "bloomberg.com",
        "ft.com",
        "wsj.com",
        "techcrunch.com",
        "thehindu.com",
        "economictimes.indiatimes.com",
        "livemint.com",
    }
)

_REDDIT = frozenset({"reddit.com", "www.reddit.com"})

_GLASSDOOR_INDEED = frozenset({"glassdoor.com", "indeed.com", "www.glassdoor.com", "www.indeed.com"})


def _root_domain(host: str) -> str:
    host = host.lower().removeprefix("www.")
    return host


def trust_score_for_domain(url: str, title: str | None = None) -> float:
    """
    Return 0.0–1.0 trust heuristic. Higher = more structured / attributable sources.
    """
    try:
        parsed = urlparse(url)
        host = _root_domain(parsed.netloc or "")
    except Exception:
        return 0.35

    path = (parsed.path or "").lower()
    score = 0.55  # default unknown

    if any(host.endswith(d.removeprefix("www.")) for d in _LINKEDIN):
        score = 0.82
    elif any(host.endswith(d) for d in _MAJOR_REVIEW):
        score = 0.78
    elif any(host.endswith(d.removeprefix("www.")) for d in _NEWS):
        score = 0.8
    elif host in _REDDIT or host.endswith("reddit.com"):
        score = 0.52
    elif "glassdoor" in host or "indeed" in host:
        score = 0.78

    # Boost official-looking career pages (still treat as self-reported marketing).
    if any(seg in path for seg in _OFFICIAL_SUFFIXES):
        score = max(score, 0.7)

    # Penalize very thin or file URLs
    if re.search(r"\.(pdf|zip)$", path):
        score *= 0.85

    if title and len(title.strip()) < 8:
        score *= 0.95

    return max(0.25, min(0.95, round(score, 3)))


def category_hint_from_query_and_url(query: str, url: str) -> str:
    q, u = query.lower(), url.lower()
    if "glassdoor" in u or "indeed" in u or "ambition" in u or "review" in q:
        return "reviews"
    if "linkedin.com" in u:
        return "company_profile"
    if "news" in q or any(n in u for n in ("reuters", "bloomberg", "ft.com", "mint", "times")):
        return "news"
    if "reddit" in u or "blind" in u:
        return "employee_discussion"
    if "layoff" in q or "layoff" in u:
        return "layoffs"
    if "management" in q or "leadership" in q or "ceo" in q:
        return "management"
    return "culture"


def rank_and_prioritize_urls(
    items: list[dict],
    *,
    max_urls: int,
) -> list[dict]:
    """
    `items` dicts expect keys: url, title?, snippet?, query_used?, rank?
    Sort by composite: trust desc, then original rank asc.
    """
    scored: list[tuple[float, int, dict]] = []
    for i, it in enumerate(items):
        url = it.get("url") or ""
        title = it.get("title")
        t = trust_score_for_domain(url, title)
        r = it.get("rank")
        r_val = r if isinstance(r, int) else 999
        scored.append((t, r_val, {**it, "trust_score": t}))

    scored.sort(key=lambda x: (-x[0], x[1], x[2].get("url", "")))
    out: list[dict] = []
    seen_url: set[str] = set()
    for _t, _r, row in scored:
        u = row["url"]
        if u in seen_url:
            continue
        seen_url.add(u)
        out.append(row)
        if len(out) >= max_urls:
            break
    return out
