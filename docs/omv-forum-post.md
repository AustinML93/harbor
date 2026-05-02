# Draft OMV Forum Post

Title idea: **Harbor: a polished homelab command center for Docker on OMV**

Hey folks, I have been building a small self-hosted dashboard for my own OMV box and wanted to share it for feedback.

Harbor is meant to sit somewhere between a bookmark dashboard and a full Docker admin UI. It gives you a polished first screen for:

- launching your homelab services from configurable tiles
- seeing live CPU, RAM, disk, network, and uptime
- checking Docker container status from the browser
- starting, stopping, restarting, and viewing logs for containers
- seeing per-container CPU/RAM sparklines and 24h resource trends
- sending webhook alerts when containers go down
- scanning recent container activity and alert/recovery events

It is intentionally not trying to be a full Portainer replacement. The goal is more of a focused homelab command center: quick orientation, useful operational signals, and a UI that is pleasant enough to leave open.

The OMV-specific bit I cared about was Docker socket access from a non-root backend container. Harbor uses a `DOCKER_GID` setting so the container can join the host Docker group without running the whole app as root. The README has setup notes for checking your Docker group GID with:

```bash
getent group docker
```

Basic deploy:

```bash
cp .env.example .env
# set SECRET_KEY, PASSWORD_HASH, and DOCKER_GID
docker compose up -d
```

By default the UI runs on:

```text
http://your-omv-host:3113
```

The app is still in active development, so I would love feedback from other OMV/self-hosted users on:

- what the dashboard should surface first when something needs attention
- whether the Docker socket setup notes are clear enough
- what would make this more useful day-to-day than bookmarks plus Portainer
- where the line should be between "command center" and "full Docker management UI"

Repo: https://github.com/AustinML93/harbor
