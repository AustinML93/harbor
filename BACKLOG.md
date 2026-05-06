# Harbor Backlog

This document tracks upcoming features and architectural improvements for Harbor.

## Up Next

Start next session by reviewing first-pass OMV/forum feedback if available. If there is no feedback yet, continue with **Operations Visibility Polish** before opening larger product bets.

1. **Public Launch Polish**
   - Gather first-pass feedback before adding broader Docker management features.
   - Refresh README/GitHub screenshots after meaningful UI changes using `npm run screenshots`.
   - Iterate the OMV forum post draft after feedback from real OMV/self-hosted users.
   - Revisit dashboard/sidebar UX density after the Harbor Status addition:
     reduce the "too much blank space" feel, keep the left service area useful when there are few services, and make the right rail feel balanced rather than long.

2. **Operations Visibility Polish**
   - Expand the activity timeline with richer event types.
   - Surface recent failures, restart history, unhealthy containers, and recovery events clearly.
   - Consider a dedicated Activity page once dashboard timeline density becomes limiting.

3. **Resource Insight Polish**
   - Add lightweight anomaly hints such as "higher than usual" or "memory rising" from recent averages.

4. **Container Detail Experience**
   - Grow the resource deep-dive into a fuller container detail drawer/page.
   - Candidate tabs:
     Overview, Resources, Logs, Events, and Alerts.
   - Keep the experience read-oriented and operational; avoid broad orchestration controls in this pass.

5. **First-Run And Reliability UX**
   - Add a first-run checklist:
     password changed, Docker socket connected, `services.yml` writable, first resource sample collected, alerts configured.
   - Consider a demo mode or seed script for GitHub screenshots and forum evaluation.

6. **Beszel-Inspired Monitoring Depth**
   - Add host-level alert rules for CPU, RAM, disk usage, bandwidth, load average, and stale stats samples.
   - Introduce reusable notification destinations with test buttons instead of only per-rule webhook URLs.
   - Prioritize common homelab channels first:
     ntfy, Gotify, Pushover, Slack, Discord, Telegram, and email.
   - Grow the system health area into a system detail page with historical host metrics, disk/network context, container attribution, and alert history.
   - Explore hardware health signals after the core monitoring UX is solid:
     S.M.A.R.T. status, temperature sensors, disk I/O, and GPU metrics.

## Recently Completed
- Dashboard confidence and metric context:
  RAM/disk cards now include absolute capacity context, and the dashboard shows WebSocket, Docker stream, stat freshness, resource-history, and alert-rule confidence.
- Resource insight empty/loading polish:
  top users, table sparklines, and container trend details now explain when Harbor is still collecting 60s samples.
- Top resource users now ranks containers by peak CPU/RAM over the last 24h, with average usage context.
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
- Optional Harbor agent for watching an additional NAS, mini-PC, or VPS after the single-host command center experience is excellent
- Backup/restore workflow for Harbor config, `services.yml`, SQLite history, and screenshot/demo data
- Compose-aware workflows, but not full Portainer-style management in the near term
- Expand backend automated test coverage
  Focus next on auth flows, services.yml persistence/validation, and a few more notifier positive-path/error-path cases.
