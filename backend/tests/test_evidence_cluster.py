from app.utils.evidence_cluster import cluster_evidence_themes


def test_cluster_finds_work_life():
    ev = [
        {
            "source_url": "https://ex.com",
            "snippet": "Great work life balance and flexible hours",
            "extracted_text": "",
        }
    ]
    themes = cluster_evidence_themes(ev)
    assert "work_life_balance" in themes
    assert 0 in themes["work_life_balance"]
