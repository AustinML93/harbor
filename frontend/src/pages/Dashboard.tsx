import { useEffect, useState, useMemo } from "react";
import { Activity, AlertTriangle, Bell, CheckCircle2, CircleDashed, Cpu, HardDrive, MemoryStick, Network, Plus, Search, Compass } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSystemStats } from "../hooks/useSystemStats";
import { useContainers } from "../hooks/useContainers";
import { useRecentContainerStats } from "../hooks/useContainerStats";
import { useStore } from "../store";
import api from "../lib/api";
import type { ContainerRecentStat, ServiceItem } from "../types";

import { StatCard } from "../components/dashboard/StatCard";
import { ServiceGrid } from "../components/services/ServiceGrid";
import { ServiceForm } from "../components/services/ServiceForm";
import { DiscoveryModal } from "../components/services/DiscoveryModal";
import { Modal } from "../components/ui/Modal";
import type { ContainerSummary, OperationEvent } from "../types";

type TimelineFilter = "all" | "problems" | "containers" | "notifications";

interface NotificationRuleSummary {
  id: number;
  enabled: boolean;
}

const timelineFilters: { value: TimelineFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "problems", label: "Issues" },
  { value: "containers", label: "Docker" },
  { value: "notifications", label: "Alerts" },
];

function formatEventTime(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function severityColor(severity: OperationEvent["severity"]) {
  switch (severity) {
    case "success":
      return "var(--color-success)";
    case "warning":
      return "var(--color-warning)";
    case "danger":
      return "var(--color-danger)";
    default:
      return "var(--color-accent)";
  }
}

function severityBackground(severity: OperationEvent["severity"]) {
  switch (severity) {
    case "success":
      return "var(--color-success-dim)";
    case "warning":
      return "var(--color-warning-dim)";
    case "danger":
      return "var(--color-danger-dim)";
    default:
      return "var(--color-accent-dim)";
  }
}

function OperationsTimeline() {
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const { data: events = [], isLoading } = useQuery<OperationEvent[]>({
    queryKey: ["operations-timeline", filter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "8" });
      if (filter === "problems") {
        params.append("severity", "danger");
        params.append("severity", "warning");
      }
      if (filter === "containers") params.append("kind", "container");
      if (filter === "notifications") params.append("kind", "notification");
      return api.get(`/operations/timeline?${params.toString()}`).then((r) => r.data);
    },
    refetchInterval: 30000,
  });

  return (
    <div className="harbor-card harbor-card-static p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Recent Activity</h3>
        <Activity size={16} style={{ color: "var(--color-muted)" }} />
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }}>
        {timelineFilters.map((option) => {
          const active = option.value === filter;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`h-8 min-w-0 rounded-md px-1 text-xs font-medium ${
                active ? "timeline-filter-active" : "timeline-filter"
              }`}
            >
              <span className="block truncate">{option.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-border)" }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-6 text-sm text-center" style={{ color: "var(--color-muted)" }}>
          No activity recorded yet.
        </div>
      ) : (
        <div className="space-y-1">
          {events.map((event) => {
            const color = severityColor(event.severity);
            const backgroundColor = severityBackground(event.severity);
            const Icon = event.kind === "notification" ? Bell : event.severity === "success" ? CheckCircle2 : Activity;

            return (
              <div key={event.id} className="flex gap-3 rounded-lg px-2 py-3">
                <div
                  className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor, color }}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {event.title}
                    </p>
                    <span className="flex-shrink-0 text-xs" style={{ color: "var(--color-muted)" }}>
                      {formatEventTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5" style={{ color: "var(--color-muted)" }}>
                    {event.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashboardStatusBanner({
  containers,
  uptime,
  hasStats,
  wsConnected,
  problemEvents,
  recentStats,
}: {
  containers: ContainerSummary[];
  uptime?: string;
  hasStats: boolean;
  wsConnected: boolean;
  problemEvents: OperationEvent[];
  recentStats: ContainerRecentStat[];
}) {
  const total = containers.length;
  const issueCount = containers.filter((c) => c.state !== "running").length;
  const recentProblemCount = problemEvents.length;
  const hotContainers = recentStats.filter(
    (stat) => stat.cpu_percent >= 80 || stat.memory_percent >= 85
  );
  const hotCount = hotContainers.length;
  const waitingForLiveData = !hasStats || total === 0;
  const staleData = hasStats && !wsConnected;
  const needsAttention = issueCount > 0 || recentProblemCount > 0 || hotCount > 0 || staleData;
  const Icon = needsAttention || waitingForLiveData ? AlertTriangle : CheckCircle2;

  const label = waitingForLiveData
    ? "Waiting for live status"
    : staleData
    ? "Live connection interrupted"
    : issueCount > 0
    ? `${issueCount} container${issueCount === 1 ? "" : "s"} need attention`
    : recentProblemCount > 0
    ? `${recentProblemCount} recent issue${recentProblemCount === 1 ? "" : "s"} need review`
    : hotCount > 0
    ? `${hotCount} hot container${hotCount === 1 ? "" : "s"}`
    : `All ${total} container${total === 1 ? "" : "s"} running`;

  const detailItems = [
    issueCount > 0 ? `${issueCount} down` : null,
    recentProblemCount > 0 ? `${recentProblemCount} recent issue${recentProblemCount === 1 ? "" : "s"}` : null,
    hotCount > 0 ? `${hotCount} hot` : null,
    uptime ? `Uptime ${uptime}` : "Live telemetry",
  ].filter(Boolean);
  const detail = detailItems.join(" · ");
  const color = needsAttention || waitingForLiveData ? "var(--color-warning)" : "var(--color-success)";
  const backgroundColor = needsAttention || waitingForLiveData ? "var(--color-warning-dim)" : "var(--color-success-dim)";

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ backgroundColor, borderColor: color }}
    >
      <div className="flex items-center gap-2.5 font-medium" style={{ color }}>
        <Icon size={17} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xs font-semibold sm:text-right" style={{ color }}>
        {detail}
      </span>
    </div>
  );
}

function DockerSummary({ containers }: { containers: ContainerSummary[] }) {
  const running = containers.filter(c => c.state === "running").length;
  const stopped = containers.filter(c => c.state !== "running").length;
  const total = containers.length;
  
  return (
    <div className="harbor-card harbor-card-static p-5 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Docker Status</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-success)" }}></span> 
            Running
          </span>
          <span className="font-bold" style={{ color: "var(--color-text)" }}>{running}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-danger)" }}></span> 
            Stopped
          </span>
          <span className="font-bold" style={{ color: "var(--color-text)" }}>{stopped}</span>
        </div>
      </div>
      <div className="pt-3 border-t flex justify-between items-center text-sm font-medium" style={{ borderColor: "var(--color-border)" }}>
        <span style={{ color: "var(--color-muted)" }}>Total Containers</span>
        <span style={{ color: "var(--color-text)" }}>{total}</span>
      </div>
    </div>
  );
}

function formatFreshness(timestamp: number | null, now: number) {
  if (!timestamp) return "No sample yet";

  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSeconds < 5) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  return `${Math.floor(diffSeconds / 3600)}h ago`;
}

function confidenceTone(ok: boolean, waiting = false) {
  if (ok) return { color: "var(--color-success)", backgroundColor: "var(--color-success-dim)" };
  if (waiting) return { color: "var(--color-muted)", backgroundColor: "var(--color-border)" };
  return { color: "var(--color-warning)", backgroundColor: "var(--color-warning-dim)" };
}

function StatusConfidence({
  wsConnected,
  lastStatsAt,
  lastContainersAt,
  historyCount,
  activeRuleCount,
  rulesLoading,
  now,
}: {
  wsConnected: boolean;
  lastStatsAt: number | null;
  lastContainersAt: number | null;
  historyCount: number;
  activeRuleCount: number;
  rulesLoading: boolean;
  now: number;
}) {
  const statsAgeSeconds = lastStatsAt ? (now - lastStatsAt) / 1000 : null;
  const containersAgeSeconds = lastContainersAt ? (now - lastContainersAt) / 1000 : null;
  const statsFresh = statsAgeSeconds !== null && statsAgeSeconds < 10;
  const containersFresh = containersAgeSeconds !== null && containersAgeSeconds < 15;
  const historyReady = historyCount >= 2;

  const checks = [
    {
      label: "WebSocket",
      value: wsConnected ? "Connected" : "Disconnected",
      ok: wsConnected,
      waiting: false,
    },
    {
      label: "Docker stream",
      value: lastContainersAt ? formatFreshness(lastContainersAt, now) : "Waiting",
      ok: containersFresh,
      waiting: !lastContainersAt,
    },
    {
      label: "Stats sample",
      value: formatFreshness(lastStatsAt, now),
      ok: statsFresh,
      waiting: !lastStatsAt,
    },
    {
      label: "Resource history",
      value: historyReady ? `${historyCount} samples` : historyCount === 1 ? "Collecting" : "Waiting",
      ok: historyReady,
      waiting: historyCount === 0,
    },
    {
      label: "Alerts",
      value: rulesLoading ? "Checking" : activeRuleCount > 0 ? `${activeRuleCount} active` : "None active",
      ok: activeRuleCount > 0,
      waiting: rulesLoading,
    },
  ];

  return (
    <div className="harbor-card harbor-card-static p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
          Harbor Status
        </h3>
        <CircleDashed size={16} style={{ color: "var(--color-muted)" }} />
      </div>

      <div className="space-y-2">
        {checks.map((check) => {
          const tone = confidenceTone(check.ok, check.waiting);
          const Icon = check.ok ? CheckCircle2 : check.waiting ? CircleDashed : AlertTriangle;
          return (
            <div key={check.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2" style={{ color: "var(--color-text)" }}>
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                  style={tone}
                >
                  <Icon size={13} />
                </span>
                <span className="truncate">{check.label}</span>
              </span>
              <span className="flex-shrink-0 text-xs font-medium tabular-nums" style={{ color: "var(--color-muted)" }}>
                {check.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { stats, formatted, history } = useSystemStats();
  const containers = useContainers();
  const wsConnected = useStore((s) => s.wsConnected);
  const lastStatsAt = useStore((s) => s.lastStatsAt);
  const lastContainersAt = useStore((s) => s.lastContainersAt);
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(interval);
  }, []);

  const { data: services = [], isLoading } = useQuery<ServiceItem[]>({
    queryKey: ["services"],
    queryFn: () => api.get("/services").then((r) => r.data),
  });
  const { data: problemEvents = [] } = useQuery<OperationEvent[]>({
    queryKey: ["operations-timeline", "dashboard-problems"],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "20" });
      params.append("severity", "danger");
      params.append("severity", "warning");
      return api.get(`/operations/timeline?${params.toString()}`).then((r) => r.data);
    },
    refetchInterval: 30000,
  });
  const { data: recentStats = [] } = useRecentContainerStats(25);
  const { data: notificationRules = [], isLoading: rulesLoading } = useQuery<NotificationRuleSummary[]>({
    queryKey: ["notification-rules"],
    queryFn: () => api.get("/notifications/rules").then((r) => r.data),
    refetchInterval: 60_000,
  });
  const activeRuleCount = notificationRules.filter((rule) => rule.enabled).length;

  const saveMutation = useMutation({
    mutationFn: (updated: ServiceItem[]) => api.put("/services", { services: updated }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      addToast({ type: "success", message: "Services saved" });
    },
    onError: () => addToast({ type: "error", message: "Failed to save services" }),
  });

  function handleAdd(item: ServiceItem) {
    saveMutation.mutate([...services, item]);
    setShowAdd(false);
  }

  function handleEdit(item: ServiceItem) {
    const updated = services.map((s) => (s.name === editItem?.name ? item : s));
    saveMutation.mutate(updated);
    setEditItem(null);
  }

  function handleDelete(item: ServiceItem) {
    saveMutation.mutate(services.filter((s) => s.name !== item.name));
  }

  function handleAddDiscovered(items: ServiceItem[]) {
    const existingNames = new Set(services.map(s => s.name.toLowerCase()));
    const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
    
    if (newItems.length > 0) {
      saveMutation.mutate([...services, ...newItems]);
    } else {
      addToast({ type: "info", message: "All selected services already exist." });
    }
    setShowDiscovery(false);
  }

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [services, searchQuery]);

  return (
    <div className="flex flex-col xl:flex-row gap-8 animate-fade-in">
      
      {/* Left Column: Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        <DashboardStatusBanner
          containers={containers}
          uptime={formatted?.uptime}
          hasStats={Boolean(stats)}
          wsConnected={wsConnected}
          problemEvents={problemEvents}
          recentStats={recentStats}
        />
        
        {/* Search & Actions */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} size={18} />
            <input 
              type="text" 
              autoFocus 
              className="harbor-input pl-10 h-11 text-base" 
              placeholder="Search services..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setShowDiscovery(true)} className="harbor-btn-ghost px-4">
            <Compass size={18} />
            <span className="hidden sm:inline">Discover</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="harbor-btn-primary px-4">
            <Plus size={18} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Services Grid */}
        <div>
          {services.length === 0 && !isLoading ? (
            <div
              className="rounded-xl border py-16 text-center glass-panel"
              style={{ color: "var(--color-muted)" }}
            >
              No services configured. Click Add or Discover to get started.
            </div>
          ) : filteredServices.length === 0 && !isLoading ? (
            <div
              className="rounded-xl border py-16 text-center glass-panel"
              style={{ color: "var(--color-muted)" }}
            >
              No services match your search.
            </div>
          ) : (
            <ServiceGrid
              services={filteredServices}
              loading={isLoading}
              onEdit={setEditItem}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {/* Right Column: Sidebar */}
      <div className="w-full xl:w-80 flex-shrink-0 space-y-6">
        
        <h2 className="text-xl font-bold tracking-tight h-12 flex items-center" style={{ color: "var(--color-text)" }}>
          System Health
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="CPU"
            value={formatted?.cpu ?? "—"}
            icon={<Cpu size={16} />}
            accent={{ bg: "var(--color-accent-dim)", fg: "var(--color-accent)" }}
            percent={stats?.cpu_percent}
            loading={!stats}
            history={history}
            historyDataKey="cpu_percent"
          />
          <StatCard
            label="RAM"
            value={formatted?.ram ?? "—"}
            detail={formatted?.ramDetail}
            icon={<MemoryStick size={16} />}
            accent={{ bg: "var(--color-warning-dim)", fg: "var(--color-warning)" }}
            percent={stats?.ram_percent}
            loading={!stats}
            history={history}
            historyDataKey="ram_percent"
          />
          <StatCard
            label="Disk"
            value={formatted?.disk ?? "—"}
            detail={formatted?.diskDetail}
            icon={<HardDrive size={16} />}
            accent={{ bg: "var(--color-success-dim)", fg: "var(--color-success)" }}
            percent={stats?.disk_percent}
            loading={!stats}
            history={history}
            historyDataKey="disk_percent"
          />
          <StatCard
            label="Net ↓"
            value={formatted?.netRx ?? "—"}
            icon={<Network size={16} />}
            accent={{ bg: "var(--color-border)", fg: "var(--color-muted)" }}
            loading={!stats}
          />
        </div>

        <DockerSummary containers={containers} />

        <StatusConfidence
          wsConnected={wsConnected}
          lastStatsAt={lastStatsAt}
          lastContainersAt={lastContainersAt}
          historyCount={history.length}
          activeRuleCount={activeRuleCount}
          rulesLoading={rulesLoading}
          now={now}
        />

        <OperationsTimeline />
      </div>

      {/* Modals */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add service">
        <ServiceForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal isOpen={editItem !== null} onClose={() => setEditItem(null)} title="Edit service">
        {editItem && (
          <ServiceForm
            initial={editItem}
            onSave={handleEdit}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>

      <DiscoveryModal 
        isOpen={showDiscovery} 
        onClose={() => setShowDiscovery(false)} 
        onAdd={handleAddDiscovered} 
      />
    </div>
  );
}
