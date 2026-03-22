import type { ContainerState } from "../../types";

interface Props {
  state: ContainerState;
}

const STATE_CONFIG: Record<ContainerState, { label: string; color: string; bg: string; dot: boolean }> = {
  running: {
    label: "Running",
    color: "var(--color-success)",
    bg: "rgba(63, 185, 80, 0.12)",
    dot: true,
  },
  exited: {
    label: "Exited",
    color: "var(--color-muted)",
    bg: "var(--color-border)",
    dot: false,
  },
  paused: {
    label: "Paused",
    color: "var(--color-warning)",
    bg: "rgba(210, 153, 34, 0.12)",
    dot: false,
  },
  restarting: {
    label: "Restarting",
    color: "var(--color-warning)",
    bg: "rgba(210, 153, 34, 0.12)",
    dot: true,
  },
  dead: {
    label: "Dead",
    color: "var(--color-danger)",
    bg: "var(--color-danger-dim)",
    dot: false,
  },
  created: {
    label: "Created",
    color: "var(--color-muted)",
    bg: "var(--color-border)",
    dot: false,
  },
};

export function Badge({ state }: Props) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.exited;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.dot && (
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: cfg.color }}
        />
      )}
      {cfg.label}
    </span>
  );
}
