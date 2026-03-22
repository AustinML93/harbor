from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.schemas.container import ContainerDetail, ContainerSummary
from app.services.docker_service import docker_service

router = APIRouter()


@router.get("", response_model=list[ContainerSummary])
async def list_containers(_: str = Depends(get_current_user)):
    """List all containers (running and stopped)."""
    return docker_service.list_containers()


@router.get("/{container_id}", response_model=ContainerDetail)
async def get_container(container_id: str, _: str = Depends(get_current_user)):
    """Get details for a single container."""
    container = docker_service.get_container(container_id)
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    return container


@router.post("/{container_id}/start")
async def start_container(container_id: str, _: str = Depends(get_current_user)):
    docker_service.start(container_id)
    return {"status": "started"}


@router.post("/{container_id}/stop")
async def stop_container(container_id: str, _: str = Depends(get_current_user)):
    docker_service.stop(container_id)
    return {"status": "stopped"}


@router.post("/{container_id}/restart")
async def restart_container(container_id: str, _: str = Depends(get_current_user)):
    docker_service.restart(container_id)
    return {"status": "restarted"}


@router.get("/{container_id}/logs")
async def get_logs(
    container_id: str,
    lines: int = Query(default=100, ge=1, le=1000),
    _: str = Depends(get_current_user),
):
    """Retrieve the last N lines of container logs."""
    logs = docker_service.get_logs(container_id, tail=lines)
    return {"logs": logs}
