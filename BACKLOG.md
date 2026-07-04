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

### Active & External Monitoring (Uptime Kuma / healthchecks.io / autoheal parity)

Items 7-9 turn Harbor from "is the container running?" into "is the service actually
healthy, is the host still alive, and can it recover on its own?" — letting it replace a
few standalone tools. All three deliver through the existing alert path
(`notifier._send` → `NotificationLog` → webhook), so a configured notification channel
is a shared prerequisite. This also motivates the reusable notification destinations
noted under Beszel-Inspired Monitoring Depth above.

7. **Service-Level Health Checks (Active Probes)**
   - **Problem:** Alerting today is container-state only. `notifier.check_and_fire()`
     compares Docker states from `docker_service.get_states()` against each
     `NotificationRule.down_threshold_minutes`, so a container can report `running`
     while the app inside is hung or returning errors and Harbor stays silent.
   - Add active probes that verify a service actually responds, as a new monitor type
     alongside the container-state rules:
     HTTP(S) status code + optional keyword/body match, TCP port open, ICMP ping, and
     optional TLS-cert-expiry warnings.
   - Each monitor gets its own check interval and a retry/failure threshold that must be
     crossed before it alerts (avoid flapping on a single blip).
   - Backend: a new monitor model/table (sibling to `NotificationRule`) plus a probe
     runner driven from `ws/manager.py`'s `broadcast_loop` on its own tick, offloaded via
     `run_in_executor` like the notifier; reuse the existing `_send` / `NotificationLog`
     + cooldown path so probe failures flow through the same webhook.
   - Frontend: monitor management UI on the Settings page next to notification rules;
     surface each monitor's last-check status, latency, and next-check time.
   - **Acceptance criteria:**
     - Can define an HTTP(S), TCP, or ICMP monitor with URL/host, interval, and failure
       threshold, independent of any container rule.
     - HTTP monitor can optionally assert a status code range and/or a body keyword match.
     - Alert fires only after the configured consecutive-failure threshold and recovers
       (clears) when the probe passes again.
     - Optional TLS-cert-expiry warning fires ahead of expiry for HTTPS monitors.
   - **Prerequisite:** a working notification channel (Slack/ntfy/Gotify webhook).

8. **External Heartbeat / Dead-Man's-Switch**
   - **Problem:** Harbor runs on the same host it monitors, so it cannot alert when the
     whole host or its network goes down — the alerter dies with the box. This is the
     biggest blind spot for a homelab accessed remotely.
   - Add an outbound heartbeat: Harbor periodically pings an external endpoint
     (healthchecks.io-style, also compatible with an Uptime Kuma push monitor), so the
     *absence* of an expected ping is what triggers the alert — outside the failed host.
   - Config: heartbeat ping URL + interval, exposed as env vars in `.env` /
     `core/config.py` and editable from the Settings page. Drive the outbound ping from a
     dedicated tick in `broadcast_loop`.
   - **Acceptance criteria:**
     - When enabled, Harbor pings the configured URL on the configured interval while
       healthy.
     - Stopping Harbor (or losing host/network) causes the external service to fire a
       missed-heartbeat alert within its grace window.
     - Heartbeat is independent of internal alerts — it works even with no container
       rules or probes defined.
   - **Prerequisite:** an external heartbeat receiver (healthchecks.io, Uptime Kuma push,
     or self-hosted equivalent) with its own notification channel configured; complements
     rather than replaces Harbor's on-host alerting.

9. **Opt-In Auto-Restart (Autoheal-Style)**
   - **Problem:** An unhealthy or crash-looping container currently only alerts (at best)
     and then waits for a manual start/stop/restart via the Containers UI /
     `api/routes/operations.py`. Common failures that a restart would clear still need a
     human.
   - Add an optional per-container rule: if a container reports `unhealthy` (Docker
     healthcheck) or its restart count keeps climbing (crash-loop) for N minutes, Harbor
     auto-restarts it through the existing `docker_service` restart path.
   - Must be strictly opt-in per container — via a Docker label (autoheal-style, e.g.
     `harbor.autoheal=true`) or an explicit toggle in the UI — never on by default.
   - Must still send an alert on *every* auto-restart (through `notifier._send` /
     `NotificationLog`) so a restart never silently hides a recurring problem; include a
     max-restarts/backoff guard so a crash-loop doesn't turn into an infinite restart loop.
   - **Sub-dependency:** `docker_service` / the container schema do not yet surface Docker
     healthcheck status (`State.Health.Status`) or `RestartCount`; exposing these is a
     prerequisite step for both this item and the health-signal parts of item 7.
   - **Acceptance criteria:**
     - Auto-restart never acts on a container that has not been explicitly opted in.
     - An `unhealthy` (or crash-looping) opted-in container is restarted after the
       configured N-minute window.
     - Every auto-restart emits an alert and a `NotificationLog` entry.
     - A container that keeps failing hits the backoff/max-restarts guard instead of
       looping forever, and that condition is itself surfaced.
   - **Prerequisite:** a working notification channel (Slack/ntfy/Gotify webhook).

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
