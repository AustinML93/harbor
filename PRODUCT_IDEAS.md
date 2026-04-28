# Harbor Product Ideas

This document captures product direction, feature ideas, and positioning notes that are worth preserving, but are not necessarily committed backlog items yet.

## Differentiators

- Harbor should lean into being a beautiful, opinionated homelab command center rather than a generic Portainer clone.
- The strongest product angle is a tool that feels polished enough to leave open all day, while still being useful for real operational work.
- Service tiles, system health, and real-time status already give Harbor personality. Future work should reinforce that identity instead of flattening it into a purely administrative interface.

## Near-Term Bets

- Health summary:
  make the dashboard answer "what needs attention?" with down containers, recent alerts, hot containers, stale data, and other operational signals.
- Resource attribution over time:
  help the owner quickly answer which containers have been using CPU/RAM recently, not just what is hot right now.
- Container detail experience:
  make one service easy to inspect through Overview, Resources, Logs, Events, and Alerts without turning the app into a generic Docker admin panel.
- Anomaly hints:
  start with simple language such as "higher than usual" or "memory rising" when recent averages differ from baseline behavior.
- First-run setup checklist:
  reduce confusion by confirming password change, Docker socket access, config writability, first stat sample, and alert setup.
- Status confidence:
  show whether Harbor itself is connected, current, and watching correctly through WebSocket/Docker/sample freshness indicators.
- Demo mode:
  provide realistic sample data for screenshots, GitHub evaluation, and quick forum demos without requiring a fully loaded homelab.
- Better service discovery heuristics:
  infer likely URLs, categories, icons, and descriptions from running containers and exposed ports.
- Notifier polish:
  clearer alert messaging, better state wording, and richer event context.
- Operations visibility:
  surface recent failures, restart history, unhealthy containers, recoveries, and other issues that matter in day-to-day homelab management.

## Longer-Term Ideas

- Compose-aware workflows that help users understand and manage stacks without turning Harbor into a raw YAML editor first.
- Compose-aware read-only views:
  detect compose projects and show which containers belong together before adding write controls.
- Guided orchestration features that make common self-hosted tasks easier while staying opinionated.
- Service dependency groups:
  group services into areas such as Core, Media, Network, and Home Automation, then summarize health by group.
- Maintenance mode:
  temporarily suppress alerts for selected containers during upgrades or planned downtime.
- Update awareness:
  surface available image updates without necessarily automating updates in the first version.
- Backup awareness:
  identify containers with mounted volumes and appdata paths as groundwork for future backup guidance.
- Port conflict and exposed-port awareness:
  help users quickly understand what is running where.
- Event timelines:
  combine uptime transitions, notifications, and container state changes into a useful activity history.

## Completed Directional Bets

- Per-container resource history:
  Harbor now collects CPU/RAM samples over time, shows table sparklines, highlights top resource users, and provides a 24h resource trend deep dive.
- Operations timeline:
  dashboard now combines container lifecycle transitions, alerts, and recoveries into a useful activity stream.
- Recovery notifications:
  Harbor now records and sends a recovery event after a down alert when the container comes back up.

## Strategic Cautions

- Avoid drifting too quickly into “generic Docker admin panel.”
- Multi-host support is promising, but it should come after the single-host experience feels excellent.
- Full Portainer-style management is not a near-term goal. Compose-aware workflows may still make sense later if they feel guided, opinionated, and aligned with Harbor as a homelab command center.

## Open Questions

- How far should Harbor go toward orchestration versus staying focused on observability and lightweight control?
- Should the main dashboard prioritize service launching, operational awareness, or both equally?
- What would make Harbor feel immediately more useful than an existing mix of Portainer, dashboards, and bookmarks?
