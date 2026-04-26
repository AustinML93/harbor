from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.security import decode_token
from app.services.system_service import system_service

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: list[WebSocket] = []
        self.router = APIRouter()
        self.router.add_api_websocket_route("/ws", self.websocket_endpoint)

    async def connect(self, websocket: WebSocket) -> None:
        """Register an already-accepted WebSocket. Caller owns the accept() call."""
        self._connections.append(websocket)
        logger.info("WS client connected. Total: %d", len(self._connections))

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)
        logger.info("WS client disconnected. Total: %d", len(self._connections))

    async def broadcast(self, message: dict[str, Any]) -> None:
        if not self._connections:
            return
        payload = json.dumps(message)
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def websocket_endpoint(self, websocket: WebSocket) -> None:
        # Accept the upgrade first — close frames can only be sent after accept().
        await websocket.accept()

        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=4001, reason="Missing token")
            return
        try:
            payload = decode_token(token)
            if payload.get("sub") != "harbor-admin":
                raise ValueError("Bad subject")
        except (JWTError, ValueError):
            await websocket.close(code=4001, reason="Invalid token")
            return

        await self.connect(websocket)
        try:
            while True:
                # Listen for client messages (ping or future commands)
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except json.JSONDecodeError:
                    pass
        except WebSocketDisconnect:
            self.disconnect(websocket)

    async def broadcast_loop(self) -> None:
        """
        Background task running for the lifetime of the application.

        Intervals:
          - Every 1s:  system stats broadcast
          - Every 5s:  container list broadcast + uptime event recording
          - Every 30s: notification rule engine
          - Every 60s: per-container resource history saving

        Blocking sync calls (psutil, Docker SDK) are offloaded to the thread
        pool via run_in_executor so they never stall the event loop.
        """
        from app.services.docker_service import docker_service
        from app.services.notifier import notifier

        loop = asyncio.get_event_loop()
        container_tick = 0
        alert_tick = 0
        container_history_tick = 0
        history_tick = 0

        while True:
            await asyncio.sleep(1)
            container_tick += 1
            alert_tick += 1
            container_history_tick += 1
            history_tick += 1

            # System stats — every second
            try:
                stats = await loop.run_in_executor(None, system_service.get_stats)
                await self.broadcast({"type": "stats", "data": stats.model_dump()})
            except Exception as e:
                logger.debug("Stats broadcast error: %s", e)

            # Container list — every 5 seconds
            if container_tick >= 5:
                container_tick = 0
                try:
                    containers = await loop.run_in_executor(None, docker_service.list_containers)
                    await self.broadcast({
                        "type": "containers",
                        "data": [c.model_dump() for c in containers],
                    })
                except Exception as e:
                    logger.debug("Container broadcast error: %s", e)

            # Notification rule engine — every 30 seconds
            if alert_tick >= 30:
                alert_tick = 0
                try:
                    await loop.run_in_executor(None, notifier.check_and_fire)
                except Exception as e:
                    logger.debug("Notifier error: %s", e)

            # Container resource history saving — every 60 seconds
            if container_history_tick >= 60:
                container_history_tick = 0
                try:
                    await loop.run_in_executor(None, docker_service.save_container_stats_history)
                except Exception as e:
                    logger.debug("Container history save error: %s", e)

            # History saving — every 5 minutes (300 seconds)
            if history_tick >= 300:
                history_tick = 0
                try:
                    await loop.run_in_executor(None, system_service.save_history)
                except Exception as e:
                    logger.debug("History save error: %s", e)



ws_manager = ConnectionManager()
