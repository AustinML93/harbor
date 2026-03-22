import { Box } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { ContainerSummary } from "../../types";
import { UptimeBar } from "./UptimeBar";

interface Props {
  container: ContainerSummary;
}

export function ContainerCard({ container }: Props) {
  return (
    <div
      className="harbor-card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--color-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: "var(--color-border)" }}
          >
            <Box size={14} style={{ color: "var(--color-muted)" }} />
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
