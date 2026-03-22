import { useLocation } from "react-router-dom";
import { useSystemStats } from "../../hooks/useSystemStats";
import { useStore } from "../../store";
import { Clock } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/containers": "Containers",
  "/services": "Services",
};

export function TopBar() {
  const location = useLocation();
  const { formatted } = useSystemStats();
  const wsConnected = useStore((s) => s.wsConnected);
  const title = PAGE_TITLES[location.pathname] ?? "Harbor";

  return (
    <header
      className="flex h-14 flex-shrink-0 items-center justify-between border-b px-6"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
        {title}
      </h2>

      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-muted)" }}>
        {formatted && (
          <>
            <span>CPU {formatted.cpu}</span>
            <span>RAM {formatted.ram}</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatted.uptime}
            </span>
          </>
        )}
        <span
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
          style={{
            backgroundColor: wsConnected ? "rgba(63, 185, 80, 0.1)" : "var(--color-danger-dim)",
            color: wsConnected ? "var(--color-success)" : "var(--color-danger)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: wsConnected ? "var(--color-success)" : "var(--color-danger)" }}
          />
          {wsConnected ? "Live" : "Offline"}
        </span>
      </div>
    </header>
  );
}
