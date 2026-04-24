# Harbor Backlog

This document tracks upcoming features and architectural improvements for Harbor.

## Up Next

1. **Container Resource History**
   - Track per-container CPU and RAM usage over time.
   - Add lightweight sparklines and historical views that reveal which services are using system resources.
   - Keep the experience focused on observability before adding heavier orchestration features.

2. **Operations Visibility Polish**
   - Expand the activity timeline with richer event types and filtering.
   - Surface recent failures, restart history, unhealthy containers, and recovery events clearly.
   - Consider a dedicated Activity page once dashboard timeline density becomes limiting.

## Future Considerations
- Alerting & Webhooks (Apprise integration)
- OMV OS Integration (check for `apt` updates)
- Persistent Volume Backup Manager
- Compose-aware workflows, but not full Portainer-style management in the near term
- Expand backend automated test coverage
  Focus next on auth flows, services.yml persistence/validation, and a few more notifier positive-path/error-path cases.
