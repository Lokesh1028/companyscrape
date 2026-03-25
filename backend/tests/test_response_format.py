from app.schemas.research import ResearchResponse
from app.services.summarize_service import merge_llm_into_response
from app.utils.evidence_cluster import EvidenceDict


def test_merge_llm_into_response_shape():
    evidence: list[EvidenceDict] = [
        {
            "source_title": "T",
            "source_url": "https://ex.com",
            "domain": "ex.com",
            "snippet": "s",
            "extracted_text": "body",
            "category_hint": "reviews",
            "trust_score": 0.7,
        }
    ]
    llm = {
        "company_overview": "o",
        "culture_summary": "c",
        "overall_sentiment": "Mixed",
        "confidence_score": 0.5,
        "fact_vs_opinion_note": "n",
        "employee_sentiment_summary": "e",
        "pros": [{"point": "p", "citations": [1]}],
        "cons": [],
        "red_flags": [],
        "recent_signals": [],
        "leadership_signals": [],
        "work_life_balance_signals": [],
        "career_growth_signals": [],
        "recurring_themes": ["t1"],
    }
    from app.schemas.research import EvidenceCluster, SourceCard

    cards = [SourceCard(title="T", url="https://ex.com", domain="ex.com", snippet="s")]
    clusters = [EvidenceCluster(theme="stress", evidence_indices=[0])]
    r = merge_llm_into_response("Co", llm, evidence, cards, clusters)
    assert isinstance(r, ResearchResponse)
    assert r.overall_sentiment == "Mixed"
    assert len(r.pros) == 1
    assert r.evidence_snippets[0].source_url == "https://ex.com"
