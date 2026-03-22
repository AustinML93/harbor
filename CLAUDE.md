# Harbor — Claude Code Context

## Project Overview

Harbor is a polished, self-hosted homelab dashboard for monitoring and managing Docker containers and system resources. It is designed for the self-hosted community — something that looks professional, deploys with a single command, and would be at home on Product Hunt or r/selfhosted.

**Key goals:**
- Single-owner tool (one password, no user management)
- Real-time system stats and container state via WebSocket
- Start/stop/restart containers from the UI
- Configurable quick-launch tiles for homelab services
- Alerts when containers go down
- Deploy with `docker compose up -d`

See `ARCHITECTURE.md` for the full system design and `BUILD_PLAN.md` for phased task tracking.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI (Python 3.11+) |
| Backend auth | python-jose (JWT HS256) + passlib (bcrypt) |
| Backend config | pydantic-settings (reads `.env`) |
| ORM | SQLAlchemy (sync, SQLite) |
| Container control | docker SDK for Python |
| System stats | psutil |
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS with CSS custom properties |
| State | Zustand (global) + TanStack Query (server state) |
| HTTP client | Axios |
| Router | React Router v6 |
| Real-time | Native WebSocket API |

---

## Development Workflow

### Run locally (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env: set SECRET_KEY and PASSWORD_HASH
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
# Create frontend/.env.local with:
# VITE_API_URL=http://localhost:8000
npm run dev   # Starts on http://localhost:5173
```

**Generate a password hash:**
```bash
cd backend
python -c "from app.core.security import get_password_hash; print(get_password_hash('yourpassword'))"
```

### Run with Docker Compose (production-like)
```bash
cp .env.example .env
# Edit .env with your SECRET_KEY and PASSWORD_HASH
docker compose up -d
# Harbor available at http://localhost:3000
```

### Run tests
```bash
cd backend
pytest
```

---

## Code Conventions

### Python (Backend)

**File naming:** `snake_case.py`

**Imports order:** stdlib → third-party → local app (isort style)

**Route handlers** should be thin — delegate all logic to the service layer:
```python
# Good
@router.get("/containers")
async def list_containers(user=Depends(get_current_user)):
    return docker_service.list_containers()

# Bad — business logic in the route handler
@router.get("/containers")
async def list_containers(user=Depends(get_current_user)):
    client = docker.from_env()
    containers = client.containers.list(all=True)
    return [{"id": c.id, "name": c.name, ...} for c in containers]
```

**Services** (`app/services/`) are plain Python classes, not FastAPI-specific. They can be instantiated once at module level (singleton pattern) and used across routes.

**Schemas vs Models:**
- `app/models/` — SQLAlchemy ORM models (database tables)
- `app/schemas/` — Pydantic models (request/response shapes)
- Never return ORM model instances directly from routes — always convert to schema

**Error handling:** Use `HTTPException` for client errors. Let unhandled exceptions propagate to FastAPI's 500 handler. Don't wrap every operation in try/except.

**Database sessions:** Always use the `get_db` dependency — never create sessions directly in routes.

### TypeScript (Frontend)

**File naming:** `PascalCase.tsx` for components and pages, `camelCase.ts` for utilities, hooks, stores.

**Component pattern:** Functional components only. No class components.

**Props:** Define a `Props` interface for every component that has props:
```typescript
interface Props {
  container: Container;
  onAction: (action: ContainerAction) => void;
}

export function ContainerCard({ container, onAction }: Props) { ... }
```

**Hooks:** Custom hooks live in `src/hooks/`. They should return data and action functions, never JSX.

**API calls:** All API calls go through `src/lib/api.ts` (Axios instance). Never use `fetch` directly. Never put API URLs inline in components.

**Store:** Zustand store is in `src/store/index.ts`. Keep actions co-located with the store slice they modify. Components should read from the store, not pass store state through props.

**Types:** All shared interfaces live in `src/types/index.ts`. Don't define the same type in multiple places.

**Tailwind:** Use CSS custom property tokens (`bg-[var(--color-surface)]` or the configured aliases `bg-surface`) for themed colors. Don't hardcode hex values in className strings.

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app entry point — lifespan, middleware, router mounts |
| `backend/app/core/config.py` | All env var settings via pydantic-settings |
| `backend/app/core/security.py` | JWT creation/decode, bcrypt helpers |
| `backend/app/core/database.py` | SQLAlchemy engine, session factory, `init_db()` |
| `backend/app/api/deps.py` | `get_current_user` FastAPI dependency (JWT validation) |
| `backend/app/ws/manager.py` | WebSocket `ConnectionManager` + async broadcast loop |
| `backend/app/services/docker_service.py` | All Docker SDK interactions |
| `backend/app/services/system_service.py` | All psutil interactions |
| `backend/app/services/notifier.py` | Notification rule engine |
| `frontend/src/App.tsx` | Router setup, `ProtectedRoute` wrapper |
| `frontend/src/store/index.ts` | Zustand store: auth state, live stats, container list |
| `frontend/src/hooks/useWebSocket.ts` | WS connection lifecycle, reconnect logic, message dispatch |
| `frontend/src/lib/api.ts` | Axios instance with base URL + JWT Bearer interceptor |
| `frontend/src/index.css` | Tailwind directives + CSS custom properties for theming |
| `frontend/tailwind.config.ts` | Tailwind theme extension with CSS variable color aliases |
| `services.example.yml` | Reference for `services.yml` format |

---

## Architecture Decisions

**Why sync SQLAlchemy?** Docker SDK and psutil are synchronous. Mixing sync and async in the service layer adds complexity with no benefit for SQLite at homelab scale. If this grows to need async DB, migrate to SQLAlchemy 2.0 async.

**Why Zustand over Redux?** Much simpler for this scale. The store is small — auth state + one live data object from WebSocket. Zustand is ~1KB and zero boilerplate.

**Why TanStack Query for REST + Zustand for WebSocket?** TanStack Query handles caching, background refetch, and loading/error states for REST calls. Zustand handles the WebSocket stream where TanStack Query doesn't apply. They complement each other — don't try to do both with one tool.

**Why single-password auth?** Harbor is a personal homelab tool. Multi-user auth adds significant complexity (user table, role enforcement, token revocation) for a use case where one person owns the server. If you need multi-user, consider Authelia or Authentik as an auth proxy in front of Harbor.

**Why nginx as reverse proxy?** Avoids CORS issues by serving frontend and backend from the same origin. Also serves the React static build efficiently without a Node.js process in production.

---

## What NOT to Do

**Don't add user management.** There is one user. `sub: "harbor-admin"` in the JWT is the user. Don't create a users table or user registration endpoint.

**Don't use `docker.from_env()` outside of `DockerService`.** All Docker interactions must go through `app/services/docker_service.py`. This makes it easy to mock in tests and change the socket path.

**Don't poll from the frontend when WebSocket is available.** System stats and container state come from the WebSocket. Don't add TanStack Query polling for data already covered by the WS stream.

**Don't hardcode colors in components.** Use the Tailwind CSS variable aliases (`bg-surface`, `text-muted`, `border-border`, etc.). This is what makes dark/light theming work.

**Don't write business logic in route handlers.** Routes handle HTTP concerns (request parsing, response serialization, auth dependency). Logic goes in service classes.

**Don't catch all exceptions silently.** Don't do this:
```python
try:
    result = docker_service.restart(container_id)
except Exception:
    pass  # Bad — hides real errors
```

**Don't import `engine` or `SessionLocal` directly in routes.** Use the `get_db` dependency. This ensures sessions are properly closed.

**Don't store the JWT in sessionStorage or a React state variable.** It must survive page refreshes — use `localStorage`. The `src/lib/auth.ts` module handles this.

**Don't add features outside the current phase.** Check `BUILD_PLAN.md` for scope. The deferred section lists things explicitly not in scope for Phase 1.

**Don't use `X | None` union syntax in SQLAlchemy `Mapped[]` annotations.** Python 3.14 changed how PEP 604 unions (`str | None`) evaluate — they become `types.UnionType` rather than `typing.Union`, which SQLAlchemy's type introspection rejects with `TypeError: descriptor '__getitem__' requires a 'typing.Union' object`. Use `Optional[X]` from `typing` instead throughout all models:
```python
# Bad — breaks on Python 3.14
webhook_url: Mapped[str | None] = mapped_column(String, nullable=True)

# Good
from typing import Optional
webhook_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
```
This applies to all `Mapped[]` annotations in `app/models/`. Pydantic schemas are unaffected but use `Optional[X]` there too for consistency.

---

## Environment Variables

See `.env.example` for all variables with documentation. The critical ones:

| Variable | Required | Notes |
|----------|----------|-------|
| `SECRET_KEY` | Yes | Random string, minimum 32 chars. Use `openssl rand -hex 32` |
| `PASSWORD_HASH` | Yes | bcrypt hash. Generate with the command in Dev Workflow above |
| `DOCKER_SOCKET` | No | Default: `unix:///var/run/docker.sock` |
| `JWT_EXPIRE_MINUTES` | No | Default: 10080 (7 days) |

---

## WebSocket Message Format

All WebSocket messages are JSON with a `type` discriminator:

```typescript
// System stats (every ~1s)
{ type: "stats", data: { cpu: 23.4, ram: 67.1, disk: 45.0, net_rx: 1024, net_tx: 512 } }

// Container list (every ~5s, on change)
{ type: "containers", data: [ { id, name, image, state, uptime_pct } ] }

// Error
{ type: "error", message: "..." }

// Pong (response to client ping)
{ type: "pong" }
```

---

## Running a Fresh Setup

```bash
# 1. Clone / enter the project
cd harbor

# 2. Generate a secret key
openssl rand -hex 32

# 3. Generate a password hash
docker run --rm python:3.11-slim python -c \
  "import bcrypt; print(bcrypt.hashpw(b'yourpassword', bcrypt.gensalt()).decode())"

# 4. Configure env
cp .env.example .env
# Edit .env with your SECRET_KEY and PASSWORD_HASH

# 5. Copy services config
cp services.example.yml services.yml
# Edit services.yml with your homelab services

# 6. Start
docker compose up -d

# 7. Open
open http://localhost:3000
```
