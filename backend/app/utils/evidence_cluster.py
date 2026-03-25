"""
Rule-based theme clustering for evidence snippets.
Replace `THEME_KEYWORDS` with embedding k-means later without changing the public API.
"""

from __future__ import annotations

from typing import TypedDict


class EvidenceDict(TypedDict, total=False):
    source_title: str | None
    source_url: str
    domain: str | None
    query: str | None
    snippet: str | None
    extracted_text: str | None
    category_hint: str | None
    trust_score: float | None
    theme: str | None


THEME_KEYWORDS: dict[str, tuple[str, ...]] = {
    "work_life_balance": (
        "work life",
        "work-life",
        "wlb",
        "overtime",
        "burnout",
        "hours",
        "flexible",
        "weekend",
    ),
    "management": (
        "manager",
        "management",
        "micromanag",
        "leadership",
        "hierarchy",
        "feedback",
    ),
    "compensation": (
        "salary",
        "pay",
        "compensation",
        "bonus",
        "rsu",
        "stock",
        "benefits",
    ),
    "growth": (
        "promotion",
        "career",
        "growth",
        "learning",
        "upskill",
        "ladder",
    ),
    "learning": (
        "training",
        "course",
        "certification",
        "mentor",
        "learning",
    ),
    "stress": (
        "stress",
        "pressure",
        "deadline",
        "toxic",
        "harass",
    ),
    "benefits": (
        "benefits",
        "pto",
        "leave",
        "insurance",
        "perks",
        "wellness",
    ),
    "leadership": (
        "ceo",
        "executive",
        "founder",
        "vision",
        "strategy",
    ),
    "layoffs": (
        "layoff",
        "laid off",
        "riff",
        "downsiz",
        "restructur",
    ),
    "ethics": (
        "ethics",
        "compliance",
        "lawsuit",
        "discrimination",
        "whistle",
    ),
    "employee_sentiment": (
        "employees say",
        "current employee",
        "former employee",
        "review",
        "rating",
    ),
    "brand_public_reputation": (
        "reputation",
        "brand",
        "public",
        "media",
        "news",
    ),
}


def _blob(ev: EvidenceDict) -> str:
    parts = [
        ev.get("snippet") or "",
        ev.get("extracted_text") or "",
        ev.get("query") or "",
        ev.get("category_hint") or "",
    ]
    return " ".join(parts).lower()


def cluster_evidence_themes(evidence: list[EvidenceDict]) -> dict[str, list[int]]:
    """
    Map theme -> list of evidence indices (0-based).
    Evidence may belong to multiple themes.
    """
    themes: dict[str, list[int]] = {k: [] for k in THEME_KEYWORDS}
    for idx, ev in enumerate(evidence):
        text = _blob(ev)
        if not text.strip():
            continue
        for theme, kws in THEME_KEYWORDS.items():
            if any(kw in text for kw in kws):
                themes[theme].append(idx)
    return themes


def primary_theme_for_evidence(ev: EvidenceDict) -> str | None:
    """Pick the single strongest theme for display (first match in fixed order)."""
    text = _blob(ev)
    if not text.strip():
        return None
    for theme, kws in THEME_KEYWORDS.items():
        if any(kw in text for kw in kws):
            return theme
    return "employee_sentiment" if "review" in text else None
