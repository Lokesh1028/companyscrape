from app.core.config import Settings


def test_groq_settings_are_selected_when_provider_is_groq():
    settings = Settings(
        LLM_PROVIDER="groq",
        GROQ_API_KEY="test-groq-key",
        GROQ_BASE_URL="https://api.groq.com/openai/v1",
        GROQ_MODEL="llama-3.3-70b-versatile",
    )

    assert settings.llm_api_key == "test-groq-key"
    assert settings.llm_base_url == "https://api.groq.com/openai/v1"
    assert settings.llm_model_name == "llama-3.3-70b-versatile"


def test_openai_settings_remain_default_for_openai_provider():
    settings = Settings(
        LLM_PROVIDER="openai_compatible",
        OPENAI_API_KEY="test-openai-key",
        OPENAI_BASE_URL="https://api.openai.com/v1",
        OPENAI_MODEL="gpt-4o-mini",
    )

    assert settings.llm_api_key == "test-openai-key"
    assert settings.llm_base_url == "https://api.openai.com/v1"
    assert settings.llm_model_name == "gpt-4o-mini"
