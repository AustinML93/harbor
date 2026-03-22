interface Props {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  accent?: { bg: string; fg: string };
  percent?: number;
  loading?: boolean;
}

function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent > 90
      ? "var(--color-danger)"
      : percent > 70
      ? "var(--color-warning)"
      : "var(--color-accent)";

  return (
    <div
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: "var(--color-border)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(percent, 100)}%`,
          backgroundColor: color,
          transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

export function StatCard({ label, value, detail, icon, accent, percent, loading }: Props) {
  if (loading) {
    return (
      <div className="harbor-card animate-pulse p-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-14 rounded" style={{ backgroundColor: "var(--color-border)" }} />
          <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: "var(--color-border)" }} />
        </div>
        <div className="mt-3 h-7 w-20 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-2 h-3 w-28 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-3 h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
      </div>
    );
  }

  return (
    <div className="harbor-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
          {label}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: accent?.bg ?? "var(--color-accent-dim)",
            color: accent?.fg ?? "var(--color-accent)",
          }}
        >
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
        {value}
      </p>
      {detail && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
          {detail}
        </p>
      )}
      {percent !== undefined && <ProgressBar percent={percent} />}
    </div>
  );
}
