# Harbor

**A polished, self-hosted command center for your homelab.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Active Development](https://img.shields.io/badge/status-active%20development-orange)](#roadmap)

---

## What is this?

Harbor is a homelab dashboard that gives you real-time visibility into your Docker containers and server health — CPU, RAM, disk, network, uptime, alerts, and per-container resource trends — from a single polished UI. Start, stop, and restart containers without touching a terminal. Configure quick-launch tiles for all your self-hosted services so everything is one click away.

It's designed to be dead simple to deploy (`docker compose up -d`), opinionated about doing a few things well, and good-looking enough that you'd actually want it open on a second monitor. No Kubernetes required, no cloud dependency, no telemetry.

> **Note:** Harbor is in active development. Core features work, but rough edges exist. See the [roadmap](#roadmap) for current status.

---

## Screenshots

Screenshots are coming next. The README is ready for these image slots once captures are added under `docs/screenshots/`:

| View | Planned image |
|------|---------------|
| Dashboard and service launcher | `docs/screenshots/dashboard.png` |
| Container list with resource sparklines | `docs/screenshots/containers.png` |
| Container resource trend deep dive | `docs/screenshots/container-resource-trends.png` |
| Settings and alert rules | `docs/screenshots/settings.png` |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

### 1. Clone the repo

```bash
git clone https://github.com/AustinML93/harbor.git
cd harbor
```

### 2. Run the installer

```bash
chmod +x install.sh
./install.sh
```

This non-interactive script will automatically generate your `.env` file, configure Docker socket permissions, set a default password, and start the containers.

### 3. Open the dashboard

```
http://localhost:3113
```

Log in with the default credentials:
- **Username:** `admin` (or any string, currently single-user)
- **Password:** `admin`

> **Important:** Change your password from the UI immediately after logging in!

### Updating

A one-command deploy script is included for OMV and Linux servers:

```bash
chmod +x deploy.sh   # first time only
./deploy.sh
```

The script runs through 6 steps with clear status output:
1. Stashes any local changes (`.env`, `services.yml`, etc.)
2. Pulls latest code from GitHub
3. Prints the 3 most recent commits so you can verify what changed
4. Stops running containers
5. Rebuilds images from scratch (no cache)
6. Starts containers

Your stashed changes are preserved — run `git stash pop` after deploying to restore them.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` — that file has generation instructions for each value.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes** | — | Random string used to sign JWTs. Generate with `openssl rand -hex 32`. |
| `PASSWORD_HASH` | **Yes** | — | Initial bcrypt hash for login. Change your password in the UI Settings later. |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm. No reason to change this. |
| `JWT_EXPIRE_MINUTES` | No | `10080` | Session length in minutes. Default is 7 days. |
| `DOCKER_SOCKET` | No | `unix:///var/run/docker.sock` | Docker socket path. Change for rootless Docker. |
| `DATABASE_URL` | No | `sqlite:///./data/harbor.db` | SQLite path. The `data/` directory is bind-mounted by default. |
| `SERVICES_CONFIG_PATH` | No | `./services.yml` | Path to your services config file. |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins. Only needed when running the backend standalone in dev. |

### Changing the port

Harbor runs on port `3113` by default. To change it, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:80"   # change 3113 to whatever port you want
```

### Data volume

The `docker-compose.yml` bind-mounts `./backend/data` for SQLite persistence. Update this path to match your server's appdata location. On **OpenMediaVault (OMV)**, a typical pattern is:

```yaml
volumes:
  - /srv/dev-disk-by-uuid-xxxx/appdata/harbor/data:/app/data
```

### Docker socket access (OMV / non-root)

The backend container runs as a non-root user. At startup, the entrypoint maps the container's `docker` group to your host Docker GID using `DOCKER_GID` from `.env`, then adds the app user to that group. **`982` is just an OMV example** — it may differ on your system. Check your Docker group GID with:

```bash
getent group docker
```

Update `DOCKER_GID` in `.env` to match.

### Rootless Docker

If you're running rootless Docker, update `DOCKER_SOCKET` in `.env`:

```env
DOCKER_SOCKET=unix:///run/user/1000/docker.sock
```

And update the socket path in `docker-compose.yml` to match.

---

## services.yml

The `services.yml` file defines the quick-launch tiles on the Services page. It's a simple YAML list:

```yaml
services:
  - name: Grafana
    url: http://192.168.1.100:3000
    icon: grafana
    description: Metrics & dashboards
    category: Monitoring

  - name: Portainer
    url: http://192.168.1.100:9000
    icon: portainer
    description: Container management
    category: Infrastructure
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | **Yes** | Display name shown on the tile |
| `url` | **Yes** | Full URL — opened in a new tab when clicked |
| `icon` | No | Dashboard icon slug (auto-matched from name if omitted) |
| `description` | No | One-line description shown below the name |
| `category` | No | Groups tiles by section (default: `General`) |

### Service icons

Service tiles display icons from [homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons) via jsDelivr CDN. Icons are matched in this order:

1. **Icon slug** — if the `icon` field is set, loads `cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/{slug}.png`
2. **Auto-match** — if `icon` is empty, the service name is lowercased and hyphenated (e.g. "Home Assistant" → `home-assistant`) and used as the slug
3. **Favicon fallback** — if the CDN icon fails to load, tries `{service-url}/favicon.ico`
4. **Letter avatar** — if all else fails, shows a colored letter avatar

The add/edit form includes a searchable icon picker with 60+ curated homelab slugs and live CDN previews. You can also type any custom slug from the [full icon list](https://github.com/homarr-labs/dashboard-icons/tree/main/png).

### Auto-Discovery
Don't want to type out all your services? Harbor includes an **Auto-Discovery** feature that scans your running Docker containers for exposed public ports and automatically generates service tiles for you. Access this directly from the Dashboard.

Services are completely editable from the UI — you don't have to hand-edit the YAML file after initial setup. Changes made in the UI instantly write back to `services.yml`.

The example file at `services.example.yml` has 15 common homelab services to start from if you prefer a text-based setup.

---

## Roadmap

Harbor is being built in phases. Here's where things stand:

### Phase 1 — Core (Complete)

- [x] Dashboard with real-time CPU, RAM, disk, and network stats
- [x] Container list with status, uptime, and image info
- [x] Start / stop / restart containers from the UI
- [x] Container log viewer
- [x] Quick-launch service tiles with auto-discovery
- [x] Real-time updates via WebSocket
- [x] Dark / light theme
- [x] Single-password authentication with JWT
- [x] Mobile responsive layout

### Phase 2 — Analytics & Alerting (Complete)

- [x] Historical system stats (CPU, RAM, Disk) with sparkline visualizations
- [x] Per-container resource history backend (CPU/RAM samples and history endpoints)
- [x] Per-container CPU and RAM sparklines
- [x] Container detail resource trend views
- [x] Top container resource users summary
- [x] Container down alerts with webhook delivery (Slack, ntfy, Gotify, etc.)
- [x] Notification rule management UI
- [x] Alert history log

### Phase 3 — Command Center Polish (Up Next)

- Richer activity history for failures, recoveries, and restarts
- Public launch polish: screenshots, demo notes, and first-pass forum feedback

### Future / considering

- Multi-host support (remote Docker via TCP)
- Guided compose-aware workflows
- Docker Compose file viewer
- Image management (pull, prune, list)
- Additional notification channels (email, Pushover)
- Port mapping visual map

Have a feature request? [Open an issue](../../issues) — especially interested in what the self-hosted community actually uses day-to-day.

---

## Contributing

Harbor is open source and contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code conventions, and PR guidelines.

If you find a bug, please [open an issue](../../issues) with your Docker version, host OS, and steps to reproduce.

---

## Python Version

Harbor's backend is developed, tested, and shipped on **Python 3.11**. The Docker image and GitHub Actions workflow both use Python 3.11, and the repo includes a `.python-version` file for version managers such as pyenv.

Avoid creating the backend virtualenv with newer Homebrew/system Python versions unless you are intentionally doing compatibility work. Python 3.14 currently exposes SQLAlchemy typing issues with the pinned backend dependency set, including errors like:

```
TypeError: descriptor '__getitem__' requires a 'typing.Union' object but received a 'tuple'
```

If Python 3.14 support becomes important, treat it as a deliberate dependency-upgrade task and add CI coverage for that version.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.11 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Real-time | WebSockets |
| Database | SQLite |
| Container management | Docker SDK for Python |
| System stats | psutil |
| Auth | JWT (HS256) + bcrypt |

---

## License

MIT — see [LICENSE](LICENSE).

Copyright © 2026 Austin ML / Mike Larsen.
