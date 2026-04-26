import { useState, useMemo } from "react";
import { Activity, Bell, CheckCircle2, Cpu, HardDrive, MemoryStick, Network, Plus, Search, Compass } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSystemStats } from "../hooks/useSystemStats";
import { useContainers } from "../hooks/useContainers";
import { useStore } from "../store";
import api from "../lib/api";
import type { ServiceItem } from "../types";

import { StatCard } from "../components/dashboard/StatCard";
import { ServiceGrid } from "../components/services/ServiceGrid";
import { ServiceForm } from "../components/services/ServiceForm";
import { DiscoveryModal } from "../components/services/DiscoveryModal";
import { Modal } from "../components/ui/Modal";
import type { OperationEvent } from "../types";

type TimelineFilter = "all" | "problems" | "containers" | "notifications";

const timelineFilters: { value: TimelineFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "problems", label: "Issues" },
  { value: "containers", label: "Containers" },
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
    <div className="harbor-card p-5 space-y-4">
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
              className="h-8 rounded-md px-2 text-xs font-medium"
              style={{
                backgroundColor: active ? "var(--color-accent-dim)" : "transparent",
                color: active ? "var(--color-accent)" : "var(--color-muted)",
              }}
            >
              {option.label}
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

function DockerSummary() {
  const containers = useContainers();
  const running = containers.filter(c => c.state === "running").length;
  const stopped = containers.filter(c => c.state !== "running").length;
  const total = containers.length;
  
  return (
    <div className="harbor-card p-5 space-y-4">
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

export default function Dashboard() {
  const { stats, formatted, history } = useSystemStats();
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: services = [], isLoading } = useQuery<ServiceItem[]>({
    queryKey: ["services"],
    queryFn: () => api.get("/services").then((r) => r.data),
  });

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

        <DockerSummary />

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
