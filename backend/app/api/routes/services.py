from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.deps import get_current_user
from app.schemas.service import ServiceConfig, ServiceItem
from app.services.services_service import services_service

router = APIRouter()


@router.get("", response_model=list[ServiceItem])
async def list_services(_: str = Depends(get_current_user)):
    """Return all configured quick-launch services."""
    return services_service.list_services()


@router.put("")
async def update_services(body: ServiceConfig, _: str = Depends(get_current_user)):
    """Replace the full services list (writes back to services.yml)."""
    try:
        services_service.save_services(body.services)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not write services.yml: {e}")
    return {"saved": len(body.services)}


@router.get("/discover", response_model=list[ServiceItem])
async def discover_services(request: Request, _: str = Depends(get_current_user)):
    """Auto-discover potential services from running Docker containers."""
    from app.services.docker_service import docker_service

    host = request.url.hostname or "localhost"
    scheme = request.url.scheme or "http"
    return [ServiceItem(**item) for item in docker_service.discover_services(host=host, scheme=scheme)]
