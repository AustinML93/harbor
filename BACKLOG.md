# Harbor Backlog

This document tracks upcoming features and architectural improvements for Harbor.

## Up Next

1. **Docker Compose / Stack Management (The Portainer Killer)**
   - Upgrade the backend to read, manage, and execute `docker-compose.yml` files.
   - Allow users to deploy new apps, edit configurations, and spin stacks up/down directly from the Harbor UI.
   - Transform Harbor from a simple monitoring tool into a full-fledged deployment manager.

2. **Historical Stats & Sparklines**
   - Implement a background worker in FastAPI to log system and container stats to the SQLite database periodically.
   - Add historical trend graphs (sparklines) to the dashboard StatCards to visualize performance over time (e.g., last 24 hours).

## Future Considerations
- Alerting & Webhooks (Apprise integration)
- OMV OS Integration (check for `apt` updates)
- Persistent Volume Backup Manager
- Expand backend automated test coverage
  Focus next on auth flows, services.yml persistence/validation, and a few more notifier positive-path/error-path cases.
