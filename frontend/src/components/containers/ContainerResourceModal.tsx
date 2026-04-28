import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ContainerStatPoint, ContainerSummary } from "../../types";

interface Props {
  container: ContainerSummary | null;
  history: ContainerStatPoint[];
  loading?: boolean;
}

function formatBytes(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return "—";
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function MetricTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)" }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          {label}
        </span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
        {value}
      </p>
    </div>
  );
}

export function ContainerResourceModal({ container, history, loading }: Props) {
  const latest = history[history.length - 1];
  const cpuValues = history.map((point) => point.cpu_percent);
  const memoryValues = history.map((point) => point.memory_percent);
  const peakCpu = Math.max(0, ...cpuValues);
  const peakMemory = Math.max(0, ...memoryValues);
  const chartData = history.map((point) => ({
    ...point,
    time: formatTime(point.timestamp),
  }));

  if (!container) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" style={{ color: "var(--color-text)" }}>
            {container.image}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
            Last 24 hours · {history.length} samples
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="CPU now"
          value={latest ? `${latest.cpu_percent.toFixed(latest.cpu_percent >= 10 ? 0 : 1)}%` : "—"}
          icon={<Cpu size={15} />}
          accent="var(--color-accent)"
        />
        <MetricTile
          label="CPU peak"
          value={`${peakCpu.toFixed(peakCpu >= 10 ? 0 : 1)}%`}
          icon={<Cpu size={15} />}
          accent="var(--color-accent)"
        />
        <MetricTile
          label="Memory now"
          value={latest ? `${latest.memory_percent.toFixed(latest.memory_percent >= 10 ? 0 : 1)}%` : "—"}
          icon={<MemoryStick size={15} />}
          accent="var(--color-warning)"
        />
        <MetricTile
          label="Memory peak"
          value={`${peakMemory.toFixed(peakMemory >= 10 ? 0 : 1)}%`}
          icon={<HardDrive size={15} />}
          accent="var(--color-warning)"
        />
      </div>

      <div
        className="h-72 rounded-lg border p-3"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-card)" }}
      >
        {loading ? (
          <div className="h-full w-full animate-pulse rounded" style={{ backgroundColor: "var(--color-border)" }} />
        ) : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="time"
                minTickGap={28}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              />
              <YAxis
                width={42}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text)",
                }}
                labelStyle={{ color: "var(--color-muted)" }}
                formatter={(value, name) => {
                  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                  return [
                    `${numericValue.toFixed(numericValue >= 10 ? 0 : 1)}%`,
                    name === "cpu_percent" ? "CPU" : "Memory",
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="cpu_percent"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="memory_percent"
                stroke="var(--color-warning)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--color-muted)" }}>
            Trends will appear after Harbor collects more samples.
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="CPU avg"
          value={`${average(cpuValues).toFixed(average(cpuValues) >= 10 ? 0 : 1)}%`}
          icon={<Cpu size={15} />}
          accent="var(--color-accent)"
        />
        <MetricTile
          label="Memory avg"
          value={`${average(memoryValues).toFixed(average(memoryValues) >= 10 ? 0 : 1)}%`}
          icon={<MemoryStick size={15} />}
          accent="var(--color-warning)"
        />
        <MetricTile
          label="Memory used"
          value={formatBytes(latest?.memory_usage_bytes)}
          icon={<HardDrive size={15} />}
          accent="var(--color-success)"
        />
      </div>
    </div>
  );
}
