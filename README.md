# Harbor

**A clean, self-hosted dashboard for your homelab.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Active Development](https://img.shields.io/badge/status-active%20development-orange)](#roadmap)

---

## What is this?

Harbor is a homelab dashboard that gives you real-time visibility into your Docker containers and server health — CPU, RAM, disk, network — from a single polished UI. Start, stop, and restart containers without touching a terminal. Configure quick-launch tiles for all your self-hosted services so everything is one click away.

It's designed to be dead simple to deploy (`docker compose up -d`), opinionated about doing a few things well, and good-looking enough that you'd actually want it open on a second monitor. No Kubernetes required, no cloud dependency, no telemetry.

> **Note:** Harbor is in active development. Core features work, but rough edges exist. See the [roadmap](#roadmap) for current status.

---

## Screenshots

> Screenshots coming once the UI is complete. Follow along or contribute!

```
┌─────────────────────────────────────────────────────┐
│  [Dashboard screenshot will go here]                │
│  — stat cards, container health grid, live updates  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [Containers screenshot will go here]               │
│  — table with status badges, start/stop/restart     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [Services screenshot will go here]                 │
│  — quick-launch tiles grouped by category           │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/harbor.git
cd harbor
```

### 2. Generate a secret key

```bash
openssl rand -hex 32
```

Copy the output — you'll need it in the next step.

### 3. Configure your environment

```bash
cp .env.example .env
```

Open `.env` and set two required values:

```env
SECRET_KEY=<paste your generated key here>
PASSWORD_HASH=<see below>
```

**Generate a password hash:**

```bash
docker run --rm python:3.11-slim python -c \
  "import bcrypt; print(bcrypt.hashpw(b'yourpassword', bcrypt.gensalt()).decode())"
```

Replace `yourpassword` with your actual password. Paste the output as `PASSWORD_HASH`.

> **Important:** bcrypt hashes contain `$` signs. In your `.env` file, wrap the value in **single quotes** to prevent Docker Compose from treating `$` as variable substitution:
>
> ```env
> PASSWORD_HASH='$2b$12$abcdef...'
> ```
>
> Double quotes or no quotes will cause authentication to fail silently.

### 4. Set up services (optional)

```bash
cp services.example.yml services.yml
chmod 666 services.yml
```

Make the file writable by the container. Without this, services can be viewed but not added, edited, or deleted from the UI.

Edit `services.yml` to add your homelab services — Grafana, Portainer, Nextcloud, whatever you're running. The example file has common ones to start from. You can also skip this and add services from the UI later.

### 5. Start Harbor

```bash
docker compose up -d
```

First run will build the images, which takes a minute or two.

### 6. Open the dashboard

```
http://localhost:3113
```

Log in with the password you hashed above.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` — that file has generation instructions for each value.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes** | — | Random string used to sign JWTs. Generate with `openssl rand -hex 32`. |
| `PASSWORD_HASH` | **Yes** | — | bcrypt hash of your login password. See Quick Start above. |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm. No reason to change this. |
| `JWT_EXPIRE_MINUTES` | No | `10080` | Session length in minutes. Default is 7 days. |
| `DOCKER_SOCKET` | No | `unix:///var/run/docker.sock` | Docker socket path. Change for rootless Docker. |
| `DATABASE_URL` | No | `sqlite:///./data/harbor.db` | SQLite path. The `data/` directory is bind-mounted by default. |
| `SERVICES_CONFIG_PATH` | No | `./services.yml` | Path to your services config file. |
| `CORS_ORIGINS` | No | `http://localhost:3113,...` | Allowed CORS origins. Only needed when running the backend standalone in dev. |

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

The compose file includes `group_add: ["982"]` so the backend container can read the Docker socket without running as root. **This GID is specific to OMV** — it may differ on your system. Check your Docker group GID with:

```bash
getent group docker
```

Update the `group_add` value in `docker-compose.yml` to match.

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

Services are editable from the UI — you don't have to hand-edit the YAML file after initial setup. Changes made in the UI write back to `services.yml`.

The example file at `services.example.yml` has 15 common homelab services to start from.

---

## Roadmap

Harbor is being built in phases. Here's where things stand:

### Phase 1 — Core (in progress)

- [ ] Dashboard with real-time CPU, RAM, disk, and network stats
- [ ] Container list with status, uptime, and image info
- [ ] Start / stop / restart containers from the UI
- [ ] Container log viewer
- [ ] Quick-launch service tiles
- [ ] Real-time updates via WebSocket
- [ ] Dark / light theme
- [ ] Single-password authentication with JWT
- [ ] Mobile responsive layout

### Phase 2 — Coming soon

- [ ] Uptime history graphs (24h / 7d)
- [ ] Container down alerts with webhook delivery (Slack, ntfy, Gotify, etc.)
- [ ] Per-container CPU and RAM sparklines
- [ ] Notification rule management UI
- [ ] Alert history log

### Future / considering

- Multi-host support (remote Docker via TCP)
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

## Known compatibility issues

### Python 3.14 + SQLAlchemy — `X | None` union syntax

If you're developing with Python 3.14, SQLAlchemy will raise a `TypeError` on startup when processing `Mapped[X | None]` annotations in model files:

```
TypeError: descriptor '__getitem__' requires a 'typing.Union' object but received a 'tuple'
```

Python 3.14 changed how PEP 604 unions (`str | None`) are represented internally — they become `types.UnionType` instead of `typing.Union`, which SQLAlchemy's type introspection rejects. All models in this project use `Optional[X]` from `typing` to avoid this. If you add new model columns, do the same:

```python
# Bad — breaks on Python 3.14
webhook_url: Mapped[str | None] = mapped_column(String, nullable=True)

# Good
from typing import Optional
webhook_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
```

The Docker image uses Python 3.11 and is unaffected.

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
