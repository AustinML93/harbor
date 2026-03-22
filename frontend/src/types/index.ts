// ============================================================
// Shared TypeScript types — mirrors backend Pydantic schemas
// ============================================================

export interface SystemStats {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  uptime_seconds: number;
}

export interface DiskInfo {
  device: string;
  mountpoint: string;
  fstype: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

export type ContainerState = "running" | "exited" | "paused" | "restarting" | "dead" | "created";

export interface ContainerSummary {
  id: string;
  short_id: string;
  name: string;
  image: string;
  state: ContainerState;
  status: string;
  created: string;
  uptime_24h_pct: number | null;
}

export interface PortMapping {
  host_port: string | null;
  container_port: string;
  protocol: string;
}

export interface ContainerDetail extends ContainerSummary {
  ports: PortMapping[];
  labels: Record<string, string>;
  env: string[];
  mounts: string[];
  restart_policy: string;
  exit_code: number | null;
  started_at: string | null;
  finished_at: string | null;
}

export type ContainerAction = "start" | "stop" | "restart";

export interface ServiceItem {
  name: string;
  url: string;
  icon: string;
  description: string | null;
  category: string;
}

export interface NotificationRule {
  id: number;
  container_id: string;
  container_name: string;
  enabled: boolean;
  down_threshold_minutes: number;
  webhook_url: string | null;
  created_at: string;
}

export interface NotificationLogItem {
  id: number;
  rule_id: number | null;
  container_name: string;
  message: string;
  sent_at: string;
}

// WebSocket message union type
export type WsMessage =
  | { type: "stats"; data: SystemStats }
  | { type: "containers"; data: ContainerSummary[] }
  | { type: "pong" }
  | { type: "error"; message: string };
