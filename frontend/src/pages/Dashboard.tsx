import { Cpu, HardDrive, MemoryStick, Network } from "lucide-react";
import { useContainers } from "../hooks/useContainers";
import { useSystemStats } from "../hooks/useSystemStats";
import { useStore } from "../store";
import { StatCard } from "../components/dashboard/StatCard";
import { ContainerCard } from "../components/dashboard/ContainerCard";

export default function Dashboard() {
  const { stats, formatted } = useSystemStats();
  const containers = useContainers();
  const wsConnected = useStore((s) => s.wsConnected);

  const runningCount = containers.filter((c) => c.state === "running").length;
  const totalCount = containers.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Overview
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
          {runningCount} of {totalCount} containers running
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="CPU"
          value={formatted?.cpu ?? "—"}
          detail={stats ? `${stats.cpu_percent.toFixed(1)}% utilization` : undefined}
          icon={<Cpu size={16} />}
          accent={{ bg: "var(--color-accent-dim)", fg: "var(--color-accent)" }}
          percent={stats?.cpu_percent}
          loading={!stats}
        />
        <StatCard
          label="Memory"
          value={formatted?.ram ?? "—"}
          detail={formatted?.ramDetail}
          icon={<MemoryStick size={16} />}
          accent={{ bg: "var(--color-warning-dim)", fg: "var(--color-warning)" }}
          percent={stats?.ram_percent}
          loading={!stats}
        />
        <StatCard
          label="Disk"
          value={formatted?.disk ?? "—"}
          detail={formatted?.diskDetail}
          icon={<HardDrive size={16} />}
          accent={{ bg: "var(--color-success-dim)", fg: "var(--color-success)" }}
          percent={stats?.disk_percent}
          loading={!stats}
        />
        <StatCard
          label="Network ↓"
          value={formatted?.netRx ?? "—"}
          detail={`↑ ${formatted?.netTx ?? "—"} total sent`}
          icon={<Network size={16} />}
          accent={{ bg: "var(--color-border)", fg: "var(--color-muted)" }}
          loading={!stats}
        />
      </div>

      {/* Container health */}
      <div>
        <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--color-muted)" }}>
          CONTAINERS
        </h2>
        {containers.length === 0 && !wsConnected ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="harbor-card h-28 animate-pulse"
                style={{ backgroundColor: "var(--color-card)" }}
              />
            ))}
          </div>
        ) : containers.length === 0 ? (
          <div
            className="rounded-lg border py-10 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            No containers found
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {containers.map((container) => (
              <ContainerCard key={container.id} container={container} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
