interface Props {
  percent: number;
  showLabel?: boolean;
}

export function UptimeBar({ percent, showLabel = true }: Props) {
  const color =
    percent >= 99
      ? "var(--color-success)"
      : percent >= 95
      ? "var(--color-warning)"
      : "var(--color-danger)";

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs" style={{ color: "var(--color-muted)" }}>
          <span>Uptime (24h)</span>
          <span style={{ color }}>{percent.toFixed(1)}%</span>
        </div>
      )}
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
