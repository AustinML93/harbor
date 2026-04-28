import { Cpu, MemoryStick } from "lucide-react";
import type { ContainerRecentStat } from "../../types";

interface Props {
  stats: ContainerRecentStat[];
  loading?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function TopList({
  title,
  icon,
  stats,
  valueKey,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  stats: ContainerRecentStat[];
  valueKey: "cpu_percent" | "memory_percent";
  accent: string;
}) {
  const top = [...stats].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 3);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--color-border)", color: accent }}
        >
          {icon}
        </span>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {title}
        </h2>
      </div>

      {top.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Waiting for resource samples.
        </p>
      ) : (
        <div className="space-y-2">
          {top.map((item) => (
            <div key={`${valueKey}-${item.container_id}`} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {item.container_name}
                </p>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  {valueKey === "memory_percent" ? formatBytes(item.memory_usage_bytes) : "Latest sample"}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: accent }}>
                {item[valueKey].toFixed(item[valueKey] >= 10 ? 0 : 1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourceUsageSummary({ stats, loading }: Props) {
  return (
    <div className="harbor-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Top resource users
          </h2>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            Latest container samples
          </p>
        </div>
        {loading && (
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            Updating…
          </span>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TopList
          title="CPU"
          icon={<Cpu size={15} />}
          stats={stats}
          valueKey="cpu_percent"
          accent="var(--color-accent)"
        />
        <TopList
          title="Memory"
          icon={<MemoryStick size={15} />}
          stats={stats}
          valueKey="memory_percent"
          accent="var(--color-warning)"
        />
      </div>
    </div>
  );
}
