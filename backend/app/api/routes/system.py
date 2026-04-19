from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.system import DiskInfo, SystemStats
from app.services.system_service import system_service

router = APIRouter()


@router.get("/stats", response_model=SystemStats)
async def get_stats(_: str = Depends(get_current_user)):
    """Current system snapshot: CPU, RAM, disk, network."""
    return system_service.get_stats()


@router.get("/history")
async def get_history(_: str = Depends(get_current_user)):
    """Historical system snapshot data for sparklines."""
    return system_service.get_history()


@router.get("/disks", response_model=list[DiskInfo])
async def get_disks(_: str = Depends(get_current_user)):
    """All mounted disk partitions with usage info."""
    return system_service.get_disks()
