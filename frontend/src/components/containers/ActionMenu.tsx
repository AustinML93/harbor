import { useState } from "react";
import { Play, Square, RotateCcw, MoreHorizontal } from "lucide-react";
import type { ContainerAction, ContainerSummary } from "../../types";

interface Props {
  container: ContainerSummary;
  onAction: (action: ContainerAction) => void;
  disabled?: boolean;
}

export function ActionMenu({ container, onAction, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const isRunning = container.state === "running";

  function handle(action: ContainerAction) {
    onAction(action);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="harbor-btn-ghost rounded p-1.5 disabled:opacity-40"
        title="Actions"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border py-1 shadow-lg animate-fade-in"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            {!isRunning && (
              <MenuItem icon={<Play size={13} />} label="Start" onClick={() => handle("start")} />
            )}
            {isRunning && (
              <MenuItem
                icon={<Square size={13} />}
                label="Stop"
                onClick={() => handle("stop")}
                danger
              />
            )}
            <MenuItem
              icon={<RotateCcw size={13} />}
              label="Restart"
              onClick={() => handle("restart")}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors"
      style={{ color: danger ? "var(--color-danger)" : "var(--color-text)" }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
      }
    >
      {icon}
      {label}
    </button>
  );
}
