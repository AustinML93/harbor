# Harbor Build Plan

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## Phase 1 — Foundation

Backend skeleton and authentication working end-to-end.

### Tasks
- `[x]` FastAPI app scaffold (`main.py`, lifespan, CORS, exception handlers)
- `[x]` pydantic-settings config (`SECRET_KEY`, `PASSWORD_HASH`, `DOCKER_SOCKET`, etc.)
- `[x]` SQLAlchemy engine setup + `init_db()` on startup
- `[x]` bcrypt password hashing + JWT create/verify helpers
- `[x]` `POST /api/auth/login` — verify password, return JWT
- `[x]` JWT Bearer dependency (`deps.py`) applied to all protected routes
- `[x]` `GET /health` — unauthenticated health check
- `[x]` Frontend: Login page with password form
- `[x]` Frontend: JWT stored in localStorage, Axios interceptor adds `Authorization` header
- `[x]` Frontend: Protected route wrapper — redirect to `/login` if no token
- `[x]` Frontend: Logout clears token, redirects to login

### Acceptance Criteria
- Can POST to `/api/auth/login` with correct password and receive a JWT
- Invalid password returns 401
- Accessing protected endpoint without JWT returns 401
- Frontend login form stores token and redirects to dashboard

---

## Phase 2 — System Stats API

Real system data flowing to the frontend.

### Tasks
- `[x]` `SystemService` — psutil wrappers for CPU %, RAM %, disk usage, network I/O
- `[x]` `GET /api/system/stats` — returns current snapshot
- `[x]` `GET /api/system/disks` — returns all mounted disks
- `[x]` Frontend: Dashboard page skeleton with layout
- `[x]` Frontend: `StatCard` component — icon, label, value, sparkline placeholder
- `[x]` Frontend: Four stat cards wired to `GET /api/system/stats`
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
- `[x]` `DockerService` — Docker SDK wrapper for list/inspect/start/stop/restart/logs
- `[x]` `GET /api/containers` — all containers with id, name, image, state, uptime, ports
- `[x]` `GET /api/containers/{id}` — single container detail
- `[x]` `POST /api/containers/{id}/start` — start container
- `[x]` `POST /api/containers/{id}/stop` — stop container
- `[x]` `POST /api/containers/{id}/restart` — restart container
- `[x]` `GET /api/containers/{id}/logs` — last N lines (query param `lines=100`)
- `[x]` `UptimeEvent` model — record state transitions to SQLite
- `[x]` Uptime calculation — from events, compute % uptime over last 24h
- `[x]` Frontend: Containers page with `ContainerTable`
- `[x]` Frontend: Status `Badge` component (running/stopped/restarting/paused)
- `[x]` Frontend: `ActionMenu` with start/stop/restart buttons + confirmation for stop
- `[x]` Frontend: Log drawer — slide-out panel with scrollable container logs
- `[x]` Frontend: Optimistic UI for actions (state updates immediately, rolls back on error)
- `[x]` **Container remove/delete** — `DELETE /api/containers/{id}` + confirmation modal (blocks removal if container is running).

### Acceptance Criteria
- Container list shows all running and stopped containers
- Start/stop/restart works and UI reflects new state
- Log viewer shows recent container logs
- Uptime percentage computed from event history

---

## Phase 4 — WebSocket Real-Time Layer

Push live data to all connected browser tabs.

### Tasks
- `[x]` `ConnectionManager` — track active WS connections, broadcast, handle disconnects
- `[x]` `GET /ws` — WS endpoint, authenticates via `?token=` query param
- `[x]` Background task: 1s loop collects system stats, broadcasts `{ type: "stats", data: {...} }`
- `[x]` Background task: 5s loop polls container states, broadcasts `{ type: "containers", data: [...] }`
- `[ ]` Broadcast only diffs for containers to reduce payload size
- `[x]` Heartbeat / ping-pong to detect dead connections
- `[x]` Frontend: `useWebSocket` hook — connect on mount, reconnect with exponential backoff
- `[x]` Frontend: WS messages dispatched to Zustand store
- `[x]` Frontend: `useSystemStats` hook reads from store (no polling — WS only)
- `[x]` Frontend: Dashboard stat cards fed from WS store
- `[x]` Frontend: Container status badges update live from WS
- `[x]` Frontend: Connection status indicator in TopBar

### Acceptance Criteria
- Browser receives system stats ~1s after they change
- Container state change (e.g., stop) reflects in UI within 5s without page refresh
- Closing and reopening tab reconnects automatically
- Multiple browser tabs all receive live updates

---

## Phase 5 — Services Quick-Launch

Configurable tiles for navigating to homelab services.

### Tasks
- `[x]` `services.yml` schema + Pydantic validation (name, url, icon, description, category)
- `[x]` `GET /api/services` — parse and return validated service list
- `[x]` `PUT /api/services` — write updated list back to `services.yml`
- `[x]` `services.example.yml` provided in repo with common homelab services
- `[x]` Frontend: Services grid embedded in Dashboard (ServiceGrid, ServiceTile, add/edit/delete modal)
- `[x]` Frontend: Auto-discovery modal — scan running containers by image name and offer to add as tiles
- `[x]` Frontend: Icon picker with CDN-backed dashboard-icons library
- `[x]` **Backlog:** `services.yml` permissions — add a backend startup check that warns if `services.yml` is not writable.

### Acceptance Criteria
- `services.yml` additions appear in UI on next page load
- Can add/edit/delete services from the UI
- Clicking a tile opens the service URL in a new tab
- Invalid `services.yml` gracefully returns empty list with error detail

---

## Phase 6 — Notifications

Alert when containers go down.

### Tasks
- `[x]` `NotificationRule` model — per-container, enabled, threshold, webhook_url
- `[x]` `NotificationLog` model — sent alert history
- `[x]` `GET /api/notifications/rules` — list all rules
- `[x]` `POST /api/notifications/rules` — create rule
- `[x]` `PUT /api/notifications/rules/{id}` — update rule
- `[x]` `DELETE /api/notifications/rules/{id}` — delete rule
- `[x]` `Notifier` service — runs every 30s, checks containers against rules
- `[x]` Cooldown logic — don't re-alert within cooldown window (default 1h)
- `[x]` Webhook delivery — HTTP POST with JSON payload to configured URL
- `[x]` Frontend: Notification rules section in Settings
- `[x]` Frontend: Enable/disable toggle per container
- `[x]` Frontend: Webhook URL input + test button
- `[x]` Frontend: Alert history in Settings (last 50 entries)
- `[x]` `POST /api/notifications/test-webhook` — verify webhook URL is reachable
- `[x]` Recovery notifications — log/send one recovery event after a down alert when the container returns to running

### Acceptance Criteria
- Container down > threshold triggers webhook POST
- Alert does not re-fire within cooldown period
- Rule can be disabled without deletion
- Alert history visible in UI (last 50 alerts)
- Recovery event visible in alert history/timeline after a previously alerted container returns to running

---

## Phase 7 — Operations Command Center

Make Harbor better at answering “what happened recently?” without becoming a generic Docker admin panel.

### Tasks
- `[x]` `GET /api/operations/timeline` — merge container lifecycle and notification events
- `[x]` Dashboard: Recent Activity panel
- `[x]` Product direction docs — prioritize command-center visibility over near-term Portainer-style management
- `[x]` Timeline filtering by severity/type
- `[ ]` Dedicated Activity page if dashboard density becomes limiting

### Acceptance Criteria
- Dashboard surfaces recent container starts/stops/exits, alerts, and recoveries
- Timeline remains read-only and operationally focused
- Compose/stack management remains deferred

---

## Phase 8 — Container Resource History

Attribute host resource usage to individual containers over time.

### Tasks
- `[x]` `ContainerStat` model — timestamp, container id/name, CPU %, memory bytes/limit/%, optional network/block IO counters
- `[x]` Backend collector — sample Docker stats on an interval without blocking the event loop
- `[x]` Retention policy — prune old rows to a bounded window
- `[x]` `GET /api/containers/{id}/stats/history` — per-container history endpoint
- `[x]` `GET /api/containers/stats/recent` — compact recent stats for table/dashboard sparklines
- `[ ]` Frontend: CPU/RAM sparklines in container list/cards
- `[ ]` Frontend: container detail resource trend view
- `[x]` Tests for stat normalization and retention pruning

### Acceptance Criteria
- User can identify which containers recently consumed the most CPU/RAM
- Historical views stay lightweight enough for a single-host homelab SQLite deployment
- No orchestration/resource-limit controls are introduced in this phase

---

## Phase 9 — Polish & Production Readiness

### UI/UX
- `[ ]` Skeleton loaders for all data-loading states
- `[x]` Empty states with helpful messages (no containers, no services)
- `[x]` Toast notifications for action results (container started, error, etc.)
- `[ ]` Error boundaries with friendly fallback UI
- `[x]` Mobile responsive layout (sidebar collapses to bottom nav on mobile)
- `[ ]` Keyboard navigation for container action menus

### Theme
- `[x]` Dark theme (default) fully implemented
- `[x]` Light theme fully implemented
- `[x]` Theme preference persisted in localStorage
- `[ ]` Smooth theme transition (CSS transition on bg/text)

### Performance
- `[ ]` TanStack Query cache tuning (stale times, background refetch)
- `[ ]` WS message debouncing — don't re-render faster than 60fps
- `[ ]` Lazy load pages with React.lazy + Suspense

### Deploy
- `[x]` Frontend multi-stage Dockerfile (build → nginx)
- `[ ]` Backend Dockerfile with non-root user
- `[x]` `docker-compose.yml` health checks on both services
- `[x]` `docker-compose.yml` restart policies
- `[ ]` README with quickstart, env var documentation, screenshot

---

## Deferred / Future Phases

These are intentionally out of scope for the current build but worth noting:

- **Portainer-style full container management** — compose file authoring, create/build containers from the UI, network and volume management, image browser and pruning. Large scope; treat as a future phase if Harbor grows toward a full Docker management tool.
- **Docker Compose file management** — view/edit compose files in UI (subset of the above)
- **Multi-host** — connect to remote Docker hosts via TCP
- **Notification channels beyond webhooks** — email, Slack, ntfy.sh, Gotify
- **User management** — multiple users with roles (beyond single-password)
- **Port mapping view** — visual map of which ports are exposed
- **Image management** — pull, prune, list images
- **Volume browser** — inspect named volumes
- **Service auto-discovery** — detect known homelab images from running containers and suggest adding them as service tiles
