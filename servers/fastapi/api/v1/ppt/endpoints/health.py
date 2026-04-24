"""Health check endpoint for Azure Container Apps probes."""

from fastapi import APIRouter

HEALTH_ROUTER = APIRouter(tags=["Health"])


@HEALTH_ROUTER.get("/health")
async def health_check():
    """Lightweight health check — no database or external dependency checks."""
    return {"status": "ok"}
