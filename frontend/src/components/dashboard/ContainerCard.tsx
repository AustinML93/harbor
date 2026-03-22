import { Box } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { ContainerSummary } from "../../types";
import { UptimeBar } from "./UptimeBar";

interface Props {
  container: ContainerSummary;
}

const STATE_COLORS: Record<string, { border: string; iconBg: string; iconFg: string }> = {
  running: {
    border: "var(--color-success)",
    iconBg: "var(--color-success-dim)",
    iconFg: "var(--color-success)",
  },
  exited: {
    border: "var(--color-muted)",
    iconBg: "var(--color-border)",
    iconFg: "var(--color-muted)",
  },
  restarting: {
    border: "var(--color-warning)",
    iconBg: "var(--color-warning-dim)",
    iconFg: "var(--color-warning)",
  },
  paused: {
    border: "var(--color-warning)",
    iconBg: "var(--color-warning-dim)",
    iconFg: "var(--color-warning)",
  },
  dead: {
    border: "var(--color-danger)",
    iconBg: "var(--color-danger-dim)",
    iconFg: "var(--color-danger)",
  },
};

const DEFAULT_COLORS = STATE_COLORS.exited;

export function ContainerCard({ container }: Props) {
  const colors = STATE_COLORS[container.state] ?? DEFAULT_COLORS;

  return (
    <div
      className="harbor-card flex flex-col gap-3 p-4"
      style={{ borderLeft: `3px solid ${colors.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.iconBg }}
          >
            <Box size={14} style={{ color: colors.iconFg }} />
          </div>
          <div className="min-w-0">
            <p
              className="truncate text-sm font-medium"
              style={{ color: "var(--color-text)" }}
              title={container.name}
            >
              {container.name}
            </p>
            <p
              className="truncate text-xs"
              style={{ color: "var(--color-muted)" }}
              title={container.image}
            >
              {container.image}
            </p>
          </div>
        </div>
        <Badge state={container.state} />
      </div>

      {container.uptime_24h_pct !== null && container.uptime_24h_pct !== undefined && (
        <UptimeBar percent={container.uptime_24h_pct} />
      )}

      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
        {container.status}
      </p>
    </div>
  );
}
