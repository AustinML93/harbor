# Harbor Backlog

This document tracks upcoming features and architectural improvements for Harbor.

## Up Next

1. **Container Resource History**
   - Track per-container CPU and RAM usage over time.
   - Add lightweight sparklines and historical views that reveal which services are using system resources.
   - Keep the experience focused on observability before adding heavier orchestration features.
   - Suggested implementation path:
     - Add a `container_stats` SQLite table keyed by container id/name/timestamp.
     - Collect stats from Docker SDK `container.stats(stream=False)` on a timed backend loop.
     - Store CPU %, memory bytes/limit/%, and optional network/block IO counters.
     - Prune old rows to a fixed retention window, likely 24h or 7d.
     - Add a history endpoint for dashboard/table sparklines and a detail endpoint for deeper inspection.
     - Start with read-only observability; avoid resource limits or orchestration controls for this pass.

2. **Operations Visibility Polish**
   - Expand the activity timeline with richer event types and filtering.
   - Surface recent failures, restart history, unhealthy containers, and recovery events clearly.
   - Consider a dedicated Activity page once dashboard timeline density becomes limiting.

## Recently Completed
- Operations timeline on the dashboard, backed by `uptime_events` and `notification_log`.
- Recovery notifications when a previously alerted container returns to running.
- Python 3.11 guardrails for local development, CI, and Docker runtime.
- Main-branch cleanup: `main` is now the only active branch locally, remotely, and on the OMV server.

## Future Considerations
- Alerting & Webhooks (Apprise integration)
- OMV OS Integration (check for `apt` updates)
- Persistent Volume Backup Manager
- Compose-aware workflows, but not full Portainer-style management in the near term
- Expand backend automated test coverage
  Focus next on auth flows, services.yml persistence/validation, and a few more notifier positive-path/error-path cases.
