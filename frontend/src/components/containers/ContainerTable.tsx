import { ScrollText } from "lucide-react";
import { Badge } from "../ui/Badge";
import { ActionMenu } from "./ActionMenu";
import type { ContainerAction, ContainerSummary } from "../../types";

interface Props {
  containers: ContainerSummary[];
  onAction: (id: string, action: ContainerAction) => void;
  onViewLogs: (id: string) => void;
  onDelete: (container: ContainerSummary) => void;
  actionPending: boolean;
}

export function ContainerTable({ containers, onAction, onViewLogs, onDelete, actionPending }: Props) {
  if (containers.length === 0) {
    return (
      <div
        className="rounded-lg border py-12 text-center text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
      >
        No containers found. Make sure Docker is running.
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--color-border)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            className="border-b text-xs uppercase tracking-wider"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-muted)",
            }}
          >
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Image</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Uptime 24h</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c, i) => (
            <tr
              key={c.id}
              className="border-b last:border-0 transition-colors"
              style={{
                backgroundColor: i % 2 === 0 ? "var(--color-card)" : "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  i % 2 === 0 ? "var(--color-card)" : "var(--color-surface)")
              }
            >
              <td className="px-4 py-3">
                <span className="font-medium" style={{ color: "var(--color-text)" }}>
                  {c.name}
                </span>
                <span
                  className="ml-2 font-mono text-xs"
                  style={{ color: "var(--color-muted)" }}
                >
                  {c.short_id}
                </span>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--color-muted)" }}
                  title={c.image}
                >
                  {c.image.length > 40 ? c.image.slice(0, 40) + "…" : c.image}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge state={c.state} />
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                {c.uptime_24h_pct !== null && c.uptime_24h_pct !== undefined ? (
                  <span
                    className="text-xs"
                    style={{
                      color:
                        c.uptime_24h_pct >= 99
                          ? "var(--color-success)"
                          : c.uptime_24h_pct >= 95
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                    }}
                  >
                    {c.uptime_24h_pct.toFixed(1)}%
                  </span>
                ) : (
                  <span style={{ color: "var(--color-muted)" }}>—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onViewLogs(c.id)}
                    className="harbor-btn-ghost rounded p-1.5"
                    title="View logs"
                  >
                    <ScrollText size={14} />
                  </button>
                  <ActionMenu
                    container={c}
                    onAction={(action) => onAction(c.id, action)}
                    onDelete={() => onDelete(c)}
                    disabled={actionPending}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
