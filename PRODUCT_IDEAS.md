# Harbor Product Ideas

This document captures product direction, feature ideas, and positioning notes that are worth preserving, but are not necessarily committed backlog items yet.

## Differentiators

- Harbor should lean into being a beautiful, opinionated homelab command center rather than a generic Portainer clone.
- The strongest product angle is a tool that feels polished enough to leave open all day, while still being useful for real operational work.
- Service tiles, system health, and real-time status already give Harbor personality. Future work should reinforce that identity instead of flattening it into a purely administrative interface.

## Near-Term Bets

- Per-container CPU and RAM history, especially lightweight sparklines and recent trend views.
- Operations timeline:
  combine container lifecycle transitions, alerts, recoveries, and restart history into a useful activity stream.
- Better service discovery heuristics:
  infer likely URLs, categories, icons, and descriptions from running containers and exposed ports.
- Notifier polish:
  clearer alert messaging, better state wording, and possibly recovery notifications when a container comes back up.
- Operations visibility:
  surface recent failures, restart history, unhealthy containers, and other issues that matter in day-to-day homelab management.

## Longer-Term Ideas

- Compose-aware workflows that help users understand and manage stacks without turning Harbor into a raw YAML editor first.
- Guided orchestration features that make common self-hosted tasks easier while staying opinionated.
- Port conflict and exposed-port awareness:
  help users quickly understand what is running where.
- Event timelines:
  combine uptime transitions, notifications, and container state changes into a useful activity history.

## Strategic Cautions

- Avoid drifting too quickly into “generic Docker admin panel.”
- Multi-host support is promising, but it should come after the single-host experience feels excellent.
- Full Portainer-style management is not a near-term goal. Compose-aware workflows may still make sense later if they feel guided, opinionated, and aligned with Harbor as a homelab command center.

## Open Questions

- How far should Harbor go toward orchestration versus staying focused on observability and lightweight control?
- Should the main dashboard prioritize service launching, operational awareness, or both equally?
- What would make Harbor feel immediately more useful than an existing mix of Portainer, dashboards, and bookmarks?
