# Harbor Backlog

This document tracks upcoming features and architectural improvements for Harbor.

## Up Next

Start next session by reviewing first-pass OMV/forum feedback if available. If there is no feedback yet, continue with **Operations Visibility Polish** before opening larger product bets.

1. **Public Launch Polish**
   - Gather first-pass feedback before adding broader Docker management features.
   - Refresh README/GitHub screenshots after meaningful UI changes using `npm run screenshots`.
   - Iterate the OMV forum post draft after feedback from real OMV/self-hosted users.

2. **Operations Visibility Polish**
   - Expand the activity timeline with richer event types.
   - Surface recent failures, restart history, unhealthy containers, and recovery events clearly.
   - Consider a dedicated Activity page once dashboard timeline density becomes limiting.

3. **Resource Insight Polish**
   - Extend top resource users beyond current samples:
     top CPU/RAM over the last 24h and recent peak usage.
   - Add lightweight anomaly hints such as "higher than usual" or "memory rising" from recent averages.
   - Make empty/loading states explicit:
     resource trends appear after Harbor has collected a few 60s samples.
   - Revisit metric card context while polishing the dashboard:
     RAM/disk absolute values and capacity subtitles are useful when they do not make the cards feel crowded.

4. **Container Detail Experience**
   - Grow the resource deep-dive into a fuller container detail drawer/page.
   - Candidate tabs:
     Overview, Resources, Logs, Events, and Alerts.
   - Keep the experience read-oriented and operational; avoid broad orchestration controls in this pass.

5. **First-Run And Reliability UX**
   - Add a first-run checklist:
     password changed, Docker socket connected, `services.yml` writable, first resource sample collected, alerts configured.
   - Add status confidence indicators:
     WebSocket connected, Docker reachable, last stats sample time, alerts active.
   - Consider a demo mode or seed script for GitHub screenshots and forum evaluation.

## Recently Completed
- Public launch assets:
  sanitized README screenshots for dashboard, container sparklines, resource trends, and settings/alerts; repeatable Playwright capture script; and a draft OMV forum post.
- Operations attention summary:
  dashboard banner now calls out down containers, recent warning/danger events, hot containers, stale live data, and uptime.
- Dashboard orientation and service tile polish:
  status banner, 3-4 column service grid, category counts, subtle external-link affordance, quieter System Health hover behavior, and no service-tile port badges/status dots/quick actions.
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
