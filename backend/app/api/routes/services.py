from fastapi import APIRouter, Depends, HTTPException

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
async def discover_services(_: str = Depends(get_current_user)):
    """Auto-discover potential services from running Docker containers."""
    from app.services.docker_service import _get_client
    
    try:
        client = _get_client()
        containers = client.containers.list()
    except Exception:
        return []
        
    discovered = []
    
    for c in containers:
        name = c.name.lstrip("/")
        # We look for public ports
        ports = c.attrs.get("NetworkSettings", {}).get("Ports", {})
        public_port = None
        for container_port, bindings in ports.items():
            if bindings:
                public_port = bindings[0].get("HostPort")
                break
        
        if public_port:
            slug = name.lower().replace(" ", "-")
            discovered.append(ServiceItem(
                name=name.capitalize(),
                url=f"http://localhost:{public_port}",
                icon=slug,
                description="Auto-discovered service",
                category="Discovered"
            ))
            
    return discovered
