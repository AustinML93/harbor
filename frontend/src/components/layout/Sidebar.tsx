import { NavLink, useNavigate } from "react-router-dom";
import { Anchor, Container, LayoutDashboard, Settings, LogOut, Moon, Sun } from "lucide-react";
import { useStore } from "../../store";
import { useSystemStats } from "../../hooks/useSystemStats";
import { clearToken } from "../../lib/auth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/containers", label: "Containers", icon: Container },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const wsConnected = useStore((s) => s.wsConnected);
  const { theme, toggleTheme } = useStore();
  const { formatted } = useSystemStats();
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <aside
      className="flex w-64 flex-shrink-0 flex-col glass-panel"
      style={{ borderRightWidth: "1px", zIndex: 20 }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ boxShadow: "inset 0 -1px 0 var(--color-border)" }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
        >
          <Anchor size={22} strokeWidth={1.75} />
        </div>
        <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          Harbor
        </span>
        <span
          className="ml-auto h-2 w-2 rounded-full"
          style={{ backgroundColor: wsConnected ? "var(--color-success)" : "var(--color-danger)" }}
          title={wsConnected ? "Live" : "Disconnected"}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "active-nav" : ""
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? "var(--color-accent-dim)" : "transparent",
              color: isActive ? "var(--color-accent)" : "var(--color-muted)",
              borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
            })}
            onMouseEnter={(e) => {
              if (!(e.currentTarget as HTMLElement).classList.contains("active-nav")) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
              }
            }}
            onMouseLeave={(e) => {
              if (!(e.currentTarget as HTMLElement).classList.contains("active-nav")) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
              }
            }}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="space-y-1 px-2 py-3"
        style={{ boxShadow: "inset 0 1px 0 var(--color-border)" }}
      >
        {formatted?.uptime && (
          <div className="px-3 pb-1 text-xs" style={{ color: "var(--color-muted)" }}>
            Uptime {formatted.uptime}
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
          }}
        >
          {theme === "dark" ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
