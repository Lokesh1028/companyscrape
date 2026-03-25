from app.utils.source_ranker import rank_and_prioritize_urls, trust_score_for_domain


def test_trust_glassdoor_higher_than_reddit():
    g = trust_score_for_domain("https://www.glassdoor.com/Reviews/Foo")
    r = trust_score_for_domain("https://www.reddit.com/r/foo")
    assert g > r


def test_rank_dedupes_urls():
    items = [
        {"url": "https://a.com/1", "title": "A", "rank": 2},
        {"url": "https://a.com/1", "title": "A dup", "rank": 1},
        {"url": "https://linkedin.com/company/foo", "title": "L", "rank": 5},
    ]
    out = rank_and_prioritize_urls(items, max_urls=10)
    urls = [x["url"] for x in out]
    assert urls.count("https://a.com/1") == 1
    assert "https://linkedin.com/company/foo" in urls
