# Harbor Backlog

This document tracks upcoming features and architectural improvements for Harbor.

## Up Next

1. **Public Launch Polish**
   - Capture README/GitHub screenshots:
     dashboard, container sparklines, resource trend deep dive, and settings/alerts.
   - Draft a short OMV forum post with setup expectations, Docker socket notes, and current limitations.
   - Gather first-pass feedback before adding broader Docker management features.

2. **Operations Visibility Polish**
   - Expand the activity timeline with richer event types.
   - Surface recent failures, restart history, unhealthy containers, and recovery events clearly.
   - Consider a dedicated Activity page once dashboard timeline density becomes limiting.

## Recently Completed
- Frontend per-container resource views:
  top CPU/RAM users, container table sparklines, and 24h resource trend details.
- Backend groundwork for per-container resource history.
- Frontend ESLint setup so `npm run lint` works again.
- Timeline filtering by event type and severity in the dashboard Recent Activity panel and `/api/operations/timeline`.
- Startup warning when `services.yml` is missing from an unwritable path or exists but cannot be written.
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
