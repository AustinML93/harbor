from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import auth, containers, notifications, operations, services, system
from app.ws.manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    broadcast_task = asyncio.create_task(ws_manager.broadcast_loop())
    yield
    # Shutdown
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Harbor",
    description="Homelab server dashboard",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(containers.router, prefix="/api/containers", tags=["containers"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(services.router, prefix="/api/services", tags=["services"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(operations.router, prefix="/api/operations", tags=["operations"])

# WebSocket endpoint lives on the manager
app.include_router(ws_manager.router, tags=["websocket"])


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "harbor"}
