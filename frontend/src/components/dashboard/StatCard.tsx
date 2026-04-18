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
      className="mt-4 h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(percent, 100)}%`,
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}`,
          transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

export function StatCard({ label, value, detail, icon, accent, percent, loading }: Props) {
  if (loading) {
    return (
      <div className="harbor-card animate-pulse p-5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-14 rounded" style={{ backgroundColor: "var(--color-border)" }} />
          <div className="h-9 w-9 rounded-xl" style={{ backgroundColor: "var(--color-border)" }} />
        </div>
        <div className="mt-4 h-8 w-24 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-2 h-3 w-32 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-4 h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
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
      {percent !== undefined && <ProgressBar percent={percent} />}
    </div>
  );
}
