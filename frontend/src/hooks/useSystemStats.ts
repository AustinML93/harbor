import { useStore } from "../store";

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

export function useSystemStats() {
  const stats = useStore((s) => s.stats);

  if (!stats) {
    return { stats: null, formatted: null };
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

  return { stats, formatted };
}
