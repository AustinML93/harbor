import { useQuery } from "@tanstack/react-query";
import { useStore } from "../store";
import api from "../lib/api";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export interface StatHistoryRecord {
  timestamp: string;
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
}

export function useSystemStats() {
  const stats = useStore((s) => s.stats);

  const { data: history = [], isLoading: historyLoading } = useQuery<StatHistoryRecord[]>({
    queryKey: ["system-history"],
    queryFn: () => api.get("/system/history").then((r) => r.data),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes to stay somewhat fresh
  });

  if (!stats) {
    return { stats: null, formatted: null, history, historyLoading };
  }

  const formatted = {
    cpu: `${stats.cpu_percent.toFixed(1)}%`,
    ram: `${stats.ram_percent.toFixed(1)}%`,
    ramDetail: `${stats.ram_used_gb.toFixed(1)} / ${stats.ram_total_gb.toFixed(1)} GB`,
    disk: `${stats.disk_percent.toFixed(1)}%`,
    diskDetail: `${stats.disk_used_gb.toFixed(0)} / ${stats.disk_total_gb.toFixed(0)} GB`,
    netRx: formatBytes(stats.net_rx_bytes),
    netTx: formatBytes(stats.net_tx_bytes),
    uptime: formatUptime(stats.uptime_seconds),
  };

  return { stats, formatted, history, historyLoading };
}
