import { NavLink } from "react-router-dom";
import { Anchor, LayoutDashboard, Container, Grid3X3 } from "lucide-react";
import { useStore } from "../../store";
import { ThemeToggle } from "./ThemeToggle";
import { clearToken } from "../../lib/auth";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/containers", label: "Containers", icon: Container },
  { to: "/services", label: "Services", icon: Grid3X3 },
];

export function Sidebar() {
  const wsConnected = useStore((s) => s.wsConnected);
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <aside
      className="flex w-56 flex-shrink-0 flex-col border-r"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 border-b px-4 py-4"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
        >
          <Anchor size={16} strokeWidth={1.75} />
        </div>
        <span className="font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
          Harbor
        </span>
        {/* WS connection dot */}
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
        className="flex items-center justify-between border-t px-3 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="harbor-btn-ghost rounded-md p-1.5"
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
