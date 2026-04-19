import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { StatHistoryRecord } from "../../hooks/useSystemStats";

interface Props {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  accent?: { bg: string; fg: string };
  percent?: number;
  loading?: boolean;
  history?: StatHistoryRecord[];
  historyDataKey?: keyof StatHistoryRecord;
}

function Sparkline({ data, dataKey, percent, defaultColor }: { data: StatHistoryRecord[], dataKey: keyof StatHistoryRecord, percent?: number, defaultColor: string }) {
  if (!data || data.length === 0) {
    return <div className="mt-4 h-12 w-full" />;
  }

  const p = percent ?? 0;
  const color =
    p > 90
      ? "var(--color-danger)"
      : p > 70
      ? "var(--color-warning)"
      : defaultColor;

  return (
    <div className="mt-4 h-12 w-full -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#gradient-${dataKey})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatCard({ label, value, detail, icon, accent, percent, loading, history, historyDataKey }: Props) {
  if (loading) {
    return (
      <div className="harbor-card animate-pulse p-5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-14 rounded" style={{ backgroundColor: "var(--color-border)" }} />
          <div className="h-9 w-9 rounded-xl" style={{ backgroundColor: "var(--color-border)" }} />
        </div>
        <div className="mt-4 h-8 w-24 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-2 h-3 w-32 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-4 h-12 w-full rounded" style={{ backgroundColor: "var(--color-border)" }} />
      </div>
    );
  }

  return (
    <div className="harbor-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
          {label}
        </span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            backgroundColor: accent?.bg ?? "var(--color-accent-dim)",
            color: accent?.fg ?? "var(--color-accent)",
            boxShadow: `0 2px 10px ${accent?.bg ?? "var(--color-accent-dim)"}`
          }}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums" style={{ color: "var(--color-text)" }}>
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          {detail}
        </p>
      )}
      {history && historyDataKey && (
        <Sparkline 
          data={history} 
          dataKey={historyDataKey} 
          percent={percent} 
          defaultColor={accent?.fg ?? "var(--color-accent)"} 
        />
      )}
    </div>
  );
}
