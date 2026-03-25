"""
Robust multi-query generator for company culture research.
Templates are explicit so embeddings or ML reranking can replace ordering later.
"""

from __future__ import annotations

import re
from typing import Iterable


def _sanitize_company_name(name: str) -> str:
    """Strip control chars and collapse whitespace; keep unicode company names."""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def generate_research_queries(
    company_name: str,
    *,
    max_queries: int | None = None,
) -> list[str]:
    """
    Build a diverse set of search queries for reviews, culture, news, and leadership signals.
    `max_queries` truncates while preserving high-value templates first.
    """
    company = _sanitize_company_name(company_name)
    if not company:
        return []

    # Order matters: higher-signal templates first (reviews, culture, major platforms).
    templates: list[str] = [
        "{c} employee reviews",
        "{c} company reviews",
        "{c} work culture",
        "{c} Glassdoor reviews",
        "{c} AmbitionBox reviews",
        "{c} Indeed reviews",
        "{c} LinkedIn company",
        "{c} Reddit work culture",
        "{c} layoffs",
        "{c} management reviews",
        "{c} salary career growth",
        "{c} company news",
        "{c} leadership CEO",
        "{c} benefits employee experience",
        "{c} toxic workplace",
        "{c} work life balance",
    ]

    queries = [t.format(c=company) for t in templates]
    # Dedupe while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        key = q.casefold()
        if key not in seen:
            seen.add(key)
            unique.append(q)

    if max_queries is not None:
        unique = unique[: max(0, max_queries)]

    return unique


def queries_for_company_variants(company_name: str) -> Iterable[str]:
    """Optional: yield base name + common legal suffix variants for recall."""
    base = _sanitize_company_name(company_name)
    if not base:
        return
    yield base
    for suffix in (" Inc", " LLC", " Ltd"):
        if not base.endswith(suffix):
            yield f"{base}{suffix}"
