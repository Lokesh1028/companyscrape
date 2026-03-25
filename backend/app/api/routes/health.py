from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.errors import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    s = get_settings()
    return HealthResponse(
        status="ok",
        version=s.api_version,
        environment=s.environment,
    )
