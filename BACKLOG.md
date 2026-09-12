# Harbor Backlog

_Repo-scoped backlog. Cross-cutting family and homelab initiatives live in `~/Developer/Projects/agent-backlog/projects/`; see `~/Developer/Projects/CLAUDE.md` for the split._

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
     *Field evidence (2026-08-01): wiring the OMV deployment meant storing the same long ntfy URL on
     all 17 rules, so changing the topic later would mean editing every rule individually.*
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
   - **Note (2026-08-01): the receiver now exists.** A Cloudflare Worker
     (`homelab-heartbeat`) already accepts authenticated beats from the OMV and Hermes boxes and
     alerts via Telegram when one goes silent for 45 minutes. Harbor emitting its own beat to that
     endpoint would be a small, concrete first implementation of this item.

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

10. **Notifier Robustness And Delivery Semantics**

    Found while putting Harbor's alerting into real production use on the OMV box
    (2026-08-01: 17 container rules wired to a self-hosted ntfy topic, verified end-to-end by
    stopping a throwaway container). These are gaps in the existing `notifier.py` path rather
    than new features, and they surfaced only under actual operation. Complements the reusable
    notification destinations in item 6 — that item fixes *where* alerts go; this one fixes
    *what gets sent* and *whether the send is trustworthy*.

    - **Provider-shaped payloads (or a configurable body template).**
      `Notifier._send()` always POSTs a fixed `{"text": ..., "container": ...}` body, which is
      Slack-shaped. Anything else renders it as a raw JSON blob. The live workaround is to make
      the *URL* do the formatting — ntfy's `?tpl=1` message templating with
      `title=Harbor%3A%20{{.container}}&message={{.text}}` — which pushes provider-specific
      knowledge into a config field and breaks silently if the payload keys ever change.
      Either emit per-provider payloads (paired with item 6's destination types) or expose a
      body template with documented placeholders.
    - **Distinguish down from recovery.** Down and recovery messages go through the same
      `webhook_url`, so any priority/tags baked into that URL apply to both — in the live
      deployment recovery notifications arrive at `priority=high` alongside genuine outages.
      Severity should be expressible per event type.
    - **Persist the alert cooldown.** `_cooldown` is a module-level in-memory dict, so restarting
      harbor-backend clears it and a still-down container immediately re-alerts. `NotificationLog`
      (or the unused `settings` table) already provides somewhere durable to keep it.
    - **A way to test-fire an existing rule.** `POST /api/notifications/test-webhook` only proves
      the URL is reachable; nothing exercises `check_and_fire()`'s real detection path. Verifying
      the deployment required creating a throwaway container with a 0-minute threshold, stopping
      it, and watching for the alert. A "simulate this rule firing" action would make alerting
      verifiable without touching real services.
    - **Guard against thresholds shorter than routine maintenance.** Hosts that stop containers
      on a schedule will false-alarm if `down_threshold_minutes` is set too low — the OMV box's
      nightly appdata backup stops ~27 containers for ~75 seconds, which a sub-2-minute threshold
      would turn into a nightly page storm. Warn on very low thresholds in the UI, or document a
      recommended floor.

    - **Acceptance criteria:**
      - A rule can deliver a correctly-rendered message to at least one non-Slack-shaped target
        (ntfy or Gotify) without encoding a template in the URL.
      - Recovery notifications can carry a different severity/priority than down notifications.
      - Restarting harbor-backend does not cause an immediate re-alert for a container that was
        already alerted and is still down.
      - A rule can be test-fired from the UI, producing a real notification and a
        `NotificationLog` entry, without stopping a real container.
    - **Prerequisite:** none beyond a working notification channel; item 6's destinations would
      make the payload work cleaner but are not required.

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
