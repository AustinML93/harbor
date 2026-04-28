import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { ContainerStatPoint } from "../../types";

interface Props {
  data: ContainerStatPoint[];
  dataKey: "cpu_percent" | "memory_percent";
  color: string;
  label: string;
  latest?: number;
  loading?: boolean;
}

export function ResourceSparkline({ data, dataKey, color, label, latest, loading }: Props) {
  const hasTrend = data.length > 1;
  const value = latest ?? data[data.length - 1]?.[dataKey];

  return (
    <div className="flex min-w-[92px] items-center justify-end gap-2">
      <span
        className="w-10 text-right font-mono text-xs tabular-nums"
        style={{ color: value === undefined ? "var(--color-muted)" : "var(--color-text)" }}
      >
        {value === undefined ? "—" : `${value.toFixed(value >= 10 ? 0 : 1)}%`}
      </span>
      <div
        className="h-8 w-20 overflow-hidden rounded border"
        style={{ borderColor: "var(--color-border)" }}
        aria-label={label}
      >
        {loading ? (
          <div className="h-full w-full animate-pulse" style={{ backgroundColor: "var(--color-border)" }} />
        ) : hasTrend ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={1.5}
                fill={color}
                fillOpacity={0.18}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[10px]" style={{ color: "var(--color-muted)" }}>
            No trend
          </div>
        )}
      </div>
    </div>
  );
}
