"""
Application configuration loaded from environment variables.
All secrets and provider toggles are env-driven — never hardcode API keys.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Company Culture Research Assistant API"
    debug: bool = False
    api_prefix: str = ""

    @field_validator("debug", mode="before")
    @classmethod
    def _normalize_debug(cls, v: object) -> bool:
        if isinstance(v, bool):
            return v
        if v is None:
            return False
        raw = str(v).strip().lower()
        if raw in {"1", "true", "yes", "on", "debug", "development", "dev"}:
            return True
        if raw in {"0", "false", "no", "off", "release", "production", "prod"}:
            return False
        return raw == "true"

    # Database: postgresql+asyncpg://... or sqlite+aiosqlite:///./dev.db
    database_url: str = Field(
        default="sqlite+aiosqlite:///./dev.db",
        alias="DATABASE_URL",
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: object) -> str:
        raw = str(v).strip() if v is not None else ""
        if not raw:
            return "sqlite+aiosqlite:///./dev.db"
        # Render Postgres exposes a standard postgresql:// URL, but the app uses
        # SQLAlchemy's async engine and therefore needs the asyncpg driver prefix.
        if raw.startswith("postgresql://"):
            return raw.replace("postgresql://", "postgresql+asyncpg://", 1)
        if raw.startswith("postgres://"):
            return raw.replace("postgres://", "postgresql+asyncpg://", 1)
        return raw

    # CORS — comma-separated origins (include 127.0.0.1 for local Next.js)
    cors_origins: str = Field(
        default=(
            "http://localhost:3000,http://127.0.0.1:3000,"
            "http://localhost:3001,http://127.0.0.1:3001"
        ),
        alias="CORS_ORIGINS",
    )
    # Optional regex (e.g. https://.*\\.vercel\\.app) — merged with explicit origins
    cors_origin_regex: str | None = Field(default=None, alias="CORS_ORIGIN_REGEX")

    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        alias="ENVIRONMENT",
    )
    api_version: str = Field(default="1.0.0", alias="API_VERSION")

    # Search providers (default serpapi: uses real Google results when SERPAPI_API_KEY is set; else mock)
    search_provider: Literal["serpapi", "google_cse", "mock"] = Field(
        default="serpapi",
        alias="SEARCH_PROVIDER",
    )
    serpapi_api_key: str | None = Field(default=None, alias="SERPAPI_API_KEY")

    @field_validator("serpapi_api_key", mode="before")
    @classmethod
    def _strip_serpapi_key(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s or None
        return str(v).strip() or None
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    google_cse_id: str | None = Field(default=None, alias="GOOGLE_CSE_ID")

    # LLM (OpenAI-compatible or Groq)
    llm_provider: Literal["openai_compatible", "groq", "mock"] = Field(
        default="mock",
        alias="LLM_PROVIDER",
    )
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        alias="OPENAI_BASE_URL",
    )
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    groq_base_url: str = Field(
        default="https://api.groq.com/openai/v1",
        alias="GROQ_BASE_URL",
    )
    groq_model: str = Field(
        default="llama-3.3-70b-versatile",
        alias="GROQ_MODEL",
    )

    # Scraping / research limits
    http_timeout_seconds: float = Field(default=20.0, alias="HTTP_TIMEOUT_SECONDS")
    max_search_queries: int = Field(default=12, alias="MAX_SEARCH_QUERIES")
    max_urls_to_scrape: int = Field(default=22, alias="MAX_URLS_TO_SCRAPE")
    max_extract_chars_per_page: int = Field(
        default=12000,
        alias="MAX_EXTRACT_CHARS_PER_PAGE",
    )
    respect_robots_txt: bool = Field(default=True, alias="RESPECT_ROBOTS_TXT")
    playwright_enabled: bool = Field(default=False, alias="PLAYWRIGHT_ENABLED")
    playwright_timeout_ms: int = Field(default=30000, alias="PLAYWRIGHT_TIMEOUT_MS")

    # Cache TTL for completed reports (hours)
    report_cache_ttl_hours: int = Field(default=24, alias="REPORT_CACHE_TTL_HOURS")

    # Rate limit: requests per minute per IP for /research
    research_rate_limit_per_minute: int = Field(
        default=8,
        alias="RESEARCH_RATE_LIMIT_PER_MINUTE",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        raw = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        if "*" in raw:
            return ["*"]
        # Next often uses 3001 when 3000 is busy; .env may only list 3000 → preflight OPTIONS → 400
        if self.environment == "development":
            dev_origins = (
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            )
            seen = set(raw)
            for o in dev_origins:
                if o not in seen:
                    raw.append(o)
                    seen.add(o)
        return raw

    @property
    def llm_api_key(self) -> str | None:
        if self.llm_provider == "groq":
            return self.groq_api_key
        if self.llm_provider == "openai_compatible":
            return self.openai_api_key
        return None

    @property
    def llm_base_url(self) -> str:
        if self.llm_provider == "groq":
            return self.groq_base_url
        return self.openai_base_url

    @property
    def llm_model_name(self) -> str:
        if self.llm_provider == "groq":
            return self.groq_model
        return self.openai_model


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
