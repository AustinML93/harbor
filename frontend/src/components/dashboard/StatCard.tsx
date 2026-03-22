interface Props {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
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
      className="mt-3 h-1 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: "var(--color-border)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function StatCard({ label, value, detail, icon, percent, loading }: Props) {
  if (loading) {
    return (
      <div
        className="harbor-card animate-pulse p-4"
        style={{ backgroundColor: "var(--color-card)" }}
      >
        <div className="h-4 w-16 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-3 h-7 w-24 rounded" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="mt-2 h-3 w-32 rounded" style={{ backgroundColor: "var(--color-border)" }} />
      </div>
    );
  }

  return (
    <div
      className="harbor-card p-4 transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--color-card)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
          {label}
        </span>
        <span style={{ color: "var(--color-accent)" }}>{icon}</span>
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
