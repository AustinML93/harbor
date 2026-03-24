# Harbor Build Plan

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## Phase 1 — Foundation

Backend skeleton and authentication working end-to-end.

### Tasks
- `[ ]` FastAPI app scaffold (`main.py`, lifespan, CORS, exception handlers)
- `[ ]` pydantic-settings config (`SECRET_KEY`, `PASSWORD_HASH`, `DOCKER_SOCKET`, etc.)
- `[ ]` SQLAlchemy engine setup + `init_db()` on startup
- `[ ]` bcrypt password hashing + JWT create/verify helpers
- `[ ]` `POST /api/auth/login` — verify password, return JWT
- `[ ]` JWT Bearer dependency (`deps.py`) applied to all protected routes
- `[ ]` `GET /health` — unauthenticated health check
- `[ ]` Frontend: Login page with password form
- `[ ]` Frontend: JWT stored in localStorage, Axios interceptor adds `Authorization` header
- `[ ]` Frontend: Protected route wrapper — redirect to `/login` if no token
- `[ ]` Frontend: Logout clears token, redirects to login

### Acceptance Criteria
- Can POST to `/api/auth/login` with correct password and receive a JWT
- Invalid password returns 401
- Accessing protected endpoint without JWT returns 401
- Frontend login form stores token and redirects to dashboard

---

## Phase 2 — System Stats API

Real system data flowing to the frontend.

### Tasks
- `[ ]` `SystemService` — psutil wrappers for CPU %, RAM %, disk usage, network I/O
- `[ ]` `GET /api/system/stats` — returns current snapshot
- `[ ]` `GET /api/system/disks` — returns all mounted disks
- `[ ]` Frontend: Dashboard page skeleton with layout
- `[ ]` Frontend: `StatCard` component — icon, label, value, sparkline placeholder
- `[ ]` Frontend: Four stat cards wired to `GET /api/system/stats`
- `[ ]` Frontend: Auto-refresh every 5s via TanStack Query `refetchInterval`
- `[x]` **Dashboard Icons integration** — homarr-labs/dashboard-icons PNGs via jsDelivr CDN. Auto-match by service name, favicon fallback, letter avatar fallback. Searchable IconPicker in add/edit form.

### Acceptance Criteria
- Stats endpoint returns valid CPU/RAM/disk/network data
- Dashboard shows live numbers, updates every 5s
- Values are human-readable (percentages, GB, MB/s)

---

## Phase 3 — Container Management

List, inspect, and control Docker containers.

### Tasks
- `[ ]` `DockerService` — Docker SDK wrapper for list/inspect/start/stop/restart/logs
- `[ ]` `GET /api/containers` — all containers with id, name, image, state, uptime, ports
- `[ ]` `GET /api/containers/{id}` — single container detail
- `[ ]` `POST /api/containers/{id}/start` — start container
- `[ ]` `POST /api/containers/{id}/stop` — stop container
- `[ ]` `POST /api/containers/{id}/restart` — restart container
- `[ ]` `GET /api/containers/{id}/logs` — last N lines (query param `lines=100`)
- `[ ]` `UptimeEvent` model — record state transitions to SQLite
- `[ ]` Uptime calculation — from events, compute % uptime over last 24h / 7d
- `[ ]` Frontend: Containers page with `ContainerTable`
- `[ ]` Frontend: Status `Badge` component (running/stopped/restarting/paused)
- `[ ]` Frontend: `ActionMenu` with start/stop/restart buttons + confirmation for stop
- `[ ]` Frontend: Log drawer — slide-out panel with scrollable container logs
- `[ ]` Frontend: Optimistic UI for actions (state updates immediately, rolls back on error)
- `[ ]` **Backlog:** Container remove/delete action — `DELETE /api/containers/{id}` endpoint + confirmation modal in UI. Currently only start/stop/restart are exposed; delete is a destructive action requiring explicit user confirmation before proceeding.

### Acceptance Criteria
- Container list shows all running and stopped containers
- Start/stop/restart works and UI reflects new state
- Log viewer shows recent container logs
- Uptime percentage computed from event history

---

## Phase 4 — WebSocket Real-Time Layer

Push live data to all connected browser tabs.

### Tasks
- `[ ]` `ConnectionManager` — track active WS connections, broadcast, handle disconnects
- `[ ]` `GET /ws` — WS endpoint, authenticates via `?token=` query param
- `[ ]` Background task: 1s loop collects system stats, broadcasts `{ type: "stats", data: {...} }`
- `[ ]` Background task: 5s loop polls container states, broadcasts `{ type: "containers", data: [...] }`
- `[ ]` Broadcast only diffs for containers to reduce payload size
- `[ ]` Heartbeat / ping-pong to detect dead connections
- `[ ]` Frontend: `useWebSocket` hook — connect on mount, reconnect with exponential backoff
- `[ ]` Frontend: WS messages dispatched to Zustand store
- `[ ]` Frontend: `useSystemStats` hook reads from store (no polling — WS only)
- `[ ]` Frontend: Dashboard stat cards fed from WS store
- `[ ]` Frontend: Container status badges update live from WS
- `[ ]` Frontend: Connection status indicator in TopBar

### Acceptance Criteria
- Browser receives system stats ~1s after they change
- Container state change (e.g., stop) reflects in UI within 5s without page refresh
- Closing and reopening tab reconnects automatically
- Multiple browser tabs all receive live updates

---

## Phase 5 — Services Quick-Launch

Configurable tiles for navigating to homelab services.

### Tasks
- `[ ]` `services.yml` schema + Pydantic validation (name, url, icon, description, category)
- `[ ]` `GET /api/services` — parse and return validated service list
- `[ ]` `PUT /api/services` — write updated list back to `services.yml`
- `[ ]` `services.example.yml` provided in repo with common homelab services
- `[ ]` Frontend: Services page with `ServiceGrid`
- `[ ]` Frontend: `ServiceTile` — icon, name, description, external link
- `[ ]` Frontend: Add/edit service modal
- `[ ]` Frontend: Drag-to-reorder (nice-to-have, defer if complex)
- `[ ]` Frontend: Category grouping / filter tabs
- `[ ]` **Backlog:** Auto-discovery — scan running containers for known service images (Grafana, Portainer, etc.) and offer to add them as tiles
- `[ ]` **Backlog:** `services.yml` permissions — currently requires manual `chmod 666` on the host file. Fix by adding a backend startup check that warns if `services.yml` is not writable, or by setting correct ownership in the Dockerfile entrypoint.

### Acceptance Criteria
- `services.yml` additions appear in UI on next page load
- Can add/edit/delete services from the UI
- Clicking a tile opens the service URL in a new tab
- Invalid `services.yml` gracefully returns empty list with error detail

---

## Phase 6 — Notifications

Alert when containers go down.

### Tasks
- `[ ]` `NotificationRule` model — per-container, enabled, threshold, webhook_url
- `[ ]` `NotificationLog` model — sent alert history
- `[ ]` `GET /api/notifications/rules` — list all rules
- `[ ]` `POST /api/notifications/rules` — create rule
- `[ ]` `PUT /api/notifications/rules/{id}` — update rule
- `[ ]` `DELETE /api/notifications/rules/{id}` — delete rule
- `[ ]` `Notifier` service — runs every 30s, checks containers against rules
- `[ ]` Cooldown logic — don't re-alert within cooldown window (default 1h)
- `[ ]` Webhook delivery — HTTP POST with JSON payload to configured URL
- `[ ]` Frontend: Notification rules section in Settings
- `[ ]` Frontend: Enable/disable toggle per container
- `[ ]` Frontend: Webhook URL input + test button

### Acceptance Criteria
- Container down > threshold triggers webhook POST
- Alert does not re-fire within cooldown period
- Rule can be disabled without deletion
- Alert history visible in UI (last 20 alerts)

---

## Phase 7 — Polish & Production Readiness

### UI/UX
- `[ ]` Skeleton loaders for all data-loading states
- `[ ]` Empty states with helpful messages (no containers, no services)
- `[ ]` Toast notifications for action results (container started, error, etc.)
- `[ ]` Error boundaries with friendly fallback UI
- `[ ]` Mobile responsive layout (sidebar collapses to bottom nav on mobile)
- `[ ]` Keyboard navigation for container action menus

### Theme
- `[ ]` Dark theme (default) fully implemented
- `[ ]` Light theme fully implemented
- `[ ]` Theme preference persisted in localStorage
- `[ ]` Smooth theme transition (CSS transition on bg/text)

### Performance
- `[ ]` TanStack Query cache tuning (stale times, background refetch)
- `[ ]` WS message debouncing — don't re-render faster than 60fps
- `[ ]` Lazy load pages with React.lazy + Suspense

### Deploy
- `[ ]` Frontend multi-stage Dockerfile (build → nginx)
- `[ ]` Backend Dockerfile with non-root user
- `[ ]` `docker-compose.yml` health checks on both services
- `[ ]` `docker-compose.yml` restart policies
- `[ ]` README with quickstart, env var documentation, screenshot

---

## Deferred / Future Phases

These are intentionally out of scope for Phase 1 but worth noting:

- **Docker Compose file management** — view/edit compose files in UI
- **Container resource graphs** — per-container CPU/RAM sparklines (requires Docker stats streaming)
- **Multi-host** — connect to remote Docker hosts via TCP
- **Notification channels beyond webhooks** — email, Slack, ntfy.sh, Gotify
- **User management** — multiple users with roles (beyond single-password)
- **Port mapping view** — visual map of which ports are exposed
- **Image management** — pull, prune, list images
- **Volume browser** — inspect named volumes
- **Service auto-discovery** — detect known homelab images from running containers and suggest adding them as service tiles
