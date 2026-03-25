from app.utils.query_generator import generate_research_queries


def test_generate_queries_nonempty():
    qs = generate_research_queries("  Acme Corp  ")
    assert len(qs) >= 8
    assert all("Acme Corp" in q for q in qs)


def test_max_queries_truncates():
    qs = generate_research_queries("X", max_queries=3)
    assert len(qs) == 3


def test_empty_name():
    assert generate_research_queries("   ") == []
