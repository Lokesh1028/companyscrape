"""Standard error payloads for OpenAPI and clients."""

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """FastAPI-compatible shape: { \"detail\": ... } extended with optional code."""

    detail: str = Field(..., description="Human-readable error message")
    code: str | None = Field(None, description="Stable machine-readable code")


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    environment: str = Field(..., description="dev | staging | production")
