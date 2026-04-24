# Harbor Architecture

## Overview

Harbor is a self-hosted homelab dashboard providing real-time visibility and control over Docker containers and system resources. It is designed as a single-owner tool — one password, one admin — deployed via a single `docker compose up`.

---

## System Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                             │
│  ┌──────────────┐   ┌─────────────────┐    │
│  │  React SPA   │   │  WebSocket      │    │
│  │  (Vite)      │   │  Client         │    │
│  └──────┬───────┘   └────────┬────────┘    │
└─────────┼────────────────────┼─────────────┘
          │ HTTP/REST (JWT)     │ WS (JWT query param)
          ▼                     ▼
┌─────────────────────────────────────────────┐
│               Nginx (port 80)               │
│                                             │
│  /          → serve React build             │
│  /api/*     → proxy → backend:8000          │
│  /ws        → proxy upgrade → backend:8000  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│          FastAPI Backend (port 8000)        │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ REST API │  │ WS       │  │ BG Tasks │ │
│  │ Routes   │  │ Manager  │  │ (asyncio)│ │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘ │
│        │            │             │        │
│  ┌─────▼────────────▼─────────────▼──────┐ │
│  │           Service Layer               │ │
│  │  DockerService  SystemService  Notifier│ │
│  └─────┬─────────────┬──────────────┬────┘ │
│        │             │              │      │
│        ▼             ▼              ▼      │
│  Docker SDK       psutil         SQLite    │
│  (docker.sock)                   (ORM)     │
└─────────────────────────────────────────────┘
```

---

## Components

### Frontend

**Framework:** React 18 + TypeScript + Vite
**Styling:** Tailwind CSS with CSS custom properties for theming
**State:** Zustand (global store) + TanStack Query (server state/caching)
**Routing:** React Router v6
**HTTP:** Axios with JWT interceptor
**Real-time:** Native WebSocket API

**Theme system:** A `data-theme` attribute on `<html>` drives CSS custom properties (`--color-bg`, `--color-accent`, etc.). Tailwind's custom colors reference these variables, enabling instant theme switching without page reload. Theme preference is persisted in `localStorage`.

**WebSocket data flow:**
```
WS message (JSON) → Zustand store → React components re-render
```
All real-time data (stats, container states) flows through a single WebSocket connection managed by `useWebSocket`. Components subscribe to the Zustand store, not the socket directly.

---

### Backend

**Framework:** FastAPI (Python 3.11)
**Auth:** Single shared password (bcrypt hashed, initially sourced from env, then overrideable from the UI and stored in SQLite). Login returns a HS256 JWT. All REST routes and the WS handshake require a valid JWT.
**Database:** SQLite via SQLAlchemy (sync). Four tables: `uptime_events`, `notification_rules`, `notification_log`, `settings`.
**Docker:** Official `docker` Python SDK. Socket path is configurable.
**System stats:** `psutil` for CPU, RAM, disk, network.
**Real-time:** FastAPI native WebSockets. A single `ConnectionManager` maintains all active connections and fan-outs broadcast messages.

**Background task loop (asyncio):**
```
every 1s  → collect system stats → broadcast to all WS clients
every 5s  → poll container states → if changed, broadcast delta + record uptime event
every 30s → run notification rule engine → fire alerts for containers down > threshold
```

---

### Data Layer

**SQLite schema:**

```sql
-- Records when containers start/stop for uptime calculation
CREATE TABLE uptime_events (
    id          INTEGER PRIMARY KEY,
    container_id TEXT NOT NULL,
    container_name TEXT NOT NULL,
    event_type  TEXT NOT NULL,  -- 'start' | 'stop' | 'die'
    timestamp   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Per-container alert configuration
CREATE TABLE notification_rules (
    id              INTEGER PRIMARY KEY,
    container_id    TEXT NOT NULL UNIQUE,
    container_name  TEXT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT 1,
    down_threshold_minutes INTEGER NOT NULL DEFAULT 5,
    webhook_url     TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alert history for dedup and audit
CREATE TABLE notification_log (
    id              INTEGER PRIMARY KEY,
    rule_id         INTEGER REFERENCES notification_rules(id),
    container_name  TEXT NOT NULL,
    message         TEXT NOT NULL,
    sent_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Auth Model

Harbor is a single-owner tool. There is no user database. Auth works as follows:

1. `POST /api/auth/login` with `{ "password": "..." }`
2. Server verifies against `PASSWORD_HASH` env var (bcrypt)
3. Returns JWT with `sub: "harbor-admin"`, expiry configurable (default 7 days)
4. All protected routes require `Authorization: Bearer <token>`
5. WS connection requires `?token=<jwt>` query parameter

**Generating a password hash:**
```bash
docker run --rm harbor-backend python -c "from app.core.security import get_password_hash; print(get_password_hash('yourpassword'))"
```

---

### Services Config

Quick-launch service tiles are defined in `services.yml` (mounted volume):

```yaml
services:
  - name: Grafana
    url: http://192.168.1.100:3000
    icon: chart-bar         # heroicon name
    description: Metrics & dashboards
    category: Monitoring

  - name: Portainer
    url: http://192.168.1.100:9000
    icon: server
    description: Container management
    category: Infrastructure
```

The backend reads and validates this file on each request to `GET /api/services`. Edits via the UI write back to this file.

---

## Deployment

### Single-command deploy
```bash
docker compose up -d
```

### Volumes
| Volume | Purpose |
|--------|---------|
| `./backend/data` | SQLite database persistence |
| `/var/run/docker.sock` | Docker socket (read + control) |
| `./services.yml` | Service tile configuration |

### Ports
| Port | Service |
|------|---------|
| `3113` | Harbor UI (nginx, proxies to backend) |

---

## Security Considerations

- The Docker socket gives the backend **full Docker control**. Run Harbor on a trusted network only.
- `SECRET_KEY` must be a strong random value in production. Never use the default.
- `PASSWORD_HASH` must be set — if missing, login returns 500.
- JWT expiry defaults to 7 days; tune with `JWT_EXPIRE_MINUTES`.
- CORS origins are locked to the configured frontend URL in production.
- All container action endpoints (start/stop/restart) require a valid JWT.

---

## File Structure

```
harbor/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # JWT auth FastAPI dependency
│   │   │   └── routes/
│   │   │       ├── auth.py          # POST /api/auth/login
│   │   │       ├── containers.py    # Container list + actions
│   │   │       ├── notifications.py # Notification rules CRUD
│   │   │       ├── services.py      # services.yml read/write
│   │   │       └── system.py        # CPU/RAM/disk/network stats
│   │   ├── core/
│   │   │   ├── config.py            # pydantic-settings (env vars)
│   │   │   ├── database.py          # SQLAlchemy engine + session
│   │   │   └── security.py          # bcrypt + JWT helpers
│   │   ├── models/
│   │   │   ├── notification.py      # NotificationRule, NotificationLog ORM
│   │   │   ├── setting.py           # Persistent app settings (password hash, etc.)
│   │   │   ├── system_stat.py       # Historical CPU/RAM/disk snapshots
│   │   │   └── uptime.py            # UptimeEvent ORM
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── container.py
│   │   │   ├── notification.py
│   │   │   ├── service.py
│   │   │   └── system.py
│   │   ├── services/
│   │   │   ├── docker_service.py    # Docker SDK wrapper
│   │   │   ├── notifier.py          # Alert rule engine
│   │   │   └── system_service.py    # psutil wrapper
│   │   ├── ws/
│   │   │   └── manager.py           # WS ConnectionManager + broadcast loop
│   │   └── main.py                  # FastAPI app + lifespan + router mounts
│   ├── data/                        # SQLite DB (gitignored, volume mount)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── containers/          # ContainerTable, ActionMenu
│   │   │   ├── dashboard/           # StatCard, ContainerCard, UptimeBar
│   │   │   ├── layout/              # Sidebar, TopBar, ThemeToggle
│   │   │   ├── services/            # ServiceGrid, ServiceTile
│   │   │   └── ui/                  # Badge, Modal, Toast (shared primitives)
│   │   ├── hooks/
│   │   │   ├── useContainers.ts     # TanStack Query + optimistic actions
│   │   │   ├── useSystemStats.ts    # Reads from Zustand WS store
│   │   │   └── useWebSocket.ts      # WS lifecycle + message dispatch
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios instance with JWT interceptor
│   │   │   └── auth.ts              # Token get/set/clear in localStorage
│   │   ├── pages/
│   │   │   ├── Containers.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Settings.tsx
│   │   ├── store/
│   │   │   └── index.ts             # Zustand: auth + live stats + containers
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript interfaces
│   │   ├── App.tsx                  # Router + protected route wrapper
│   │   ├── index.css                # Tailwind directives + CSS custom properties
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── .env.example
├── .gitignore
├── ARCHITECTURE.md
├── BUILD_PLAN.md
├── CLAUDE.md
├── docker-compose.yml
└── services.example.yml
```
