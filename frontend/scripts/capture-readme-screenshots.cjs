const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.HARBOR_SCREENSHOT_URL || "http://127.0.0.1:5173";
const outputDir = path.resolve(__dirname, "../../docs/screenshots");

const now = Date.now();
const token = `x.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString("base64url")}.x`;

const containers = [
  ["1", "jellyfin", "ghcr.io/jellyfin/jellyfin:latest", "running", 99.9],
  ["2", "sonarr", "lscr.io/linuxserver/sonarr:latest", "running", 100],
  ["3", "radarr", "lscr.io/linuxserver/radarr:latest", "running", 99.8],
  ["4", "homeassistant", "ghcr.io/home-assistant/home-assistant:stable", "running", 100],
  ["5", "sabnzbd", "lscr.io/linuxserver/sabnzbd:latest", "running", 98.7],
  ["6", "adguardhome", "adguard/adguardhome:latest", "running", 100],
  ["7", "watchtower", "containrrr/watchtower:latest", "exited", 96.2],
].map(([id, name, image, state, uptime]) => ({
  id,
  short_id: `demo${id}`,
  name,
  image,
  state,
  status: state === "running" ? "Up 2 days" : "Exited",
  created: new Date(now - Number(id) * 86400000).toISOString(),
  uptime_24h_pct: uptime,
}));

const services = [
  ["Jellyfin", "http://harbor-demo.local/jellyfin", "jellyfin", "Movies, TV, and music", "Media"],
  ["Sonarr", "http://harbor-demo.local/sonarr", "sonarr", "TV automation", "Media"],
  ["Radarr", "http://harbor-demo.local/radarr", "radarr", "Movie automation", "Media"],
  ["Home Assistant", "http://harbor-demo.local/home", "home-assistant", "Home automation", "Home"],
  ["SABnzbd", "http://harbor-demo.local/sabnzbd", "sabnzbd", "NZB downloader", "Downloaders"],
  ["AdGuard", "http://harbor-demo.local/adguard", "adguard-home", "Network DNS filtering", "Network"],
].map(([name, url, icon, description, category]) => ({
  name,
  url,
  icon,
  description,
  category,
}));

const recentStats = containers.map((container, index) => ({
  timestamp: new Date(now - index * 60000).toISOString(),
  container_id: container.id,
  container_name: container.name,
  cpu_percent: index === 1 ? 83.2 : 8 + index * 4.7,
  memory_usage_bytes: (300 + index * 180) * 1024 * 1024,
  memory_limit_bytes: 4 * 1024 * 1024 * 1024,
  memory_percent: index === 1 ? 88.4 : 18 + index * 5.2,
  net_rx_bytes: 1200000 + index * 90000,
  net_tx_bytes: 220000 + index * 45000,
  block_read_bytes: 5000000 + index * 1000000,
  block_write_bytes: 2000000 + index * 800000,
}));

const topStats = containers.map((container, index) => {
  const peakCpu = index === 1 ? 83.2 : 18 + index * 5.4;
  const peakMemory = index === 1 ? 88.4 : 24 + index * 4.9;
  return {
    container_id: container.id,
    container_name: container.name,
    sample_count: 24,
    first_sample_at: new Date(now - 24 * 3600000).toISOString(),
    last_sample_at: new Date(now - index * 60000).toISOString(),
    avg_cpu_percent: Math.max(2, peakCpu * 0.42),
    peak_cpu_percent: peakCpu,
    avg_memory_percent: Math.max(8, peakMemory * 0.68),
    peak_memory_percent: peakMemory,
    latest_memory_usage_bytes: recentStats[index].memory_usage_bytes,
    latest_memory_limit_bytes: recentStats[index].memory_limit_bytes,
  };
});

function historyFor(containerId, hours = 24) {
  return Array.from({ length: 24 }, (_, i) => {
    const base = Number(containerId) * 2;
    return {
      timestamp: new Date(now - (24 - i) * 3600000).toISOString(),
      container_id: containerId,
      container_name: containers.find((container) => container.id === containerId)?.name ?? "container",
      cpu_percent: Math.max(1, base + Math.sin(i / 2) * 8 + i * 0.45),
      memory_usage_bytes: (420 + base * 18 + i * 12) * 1024 * 1024,
      memory_limit_bytes: 4 * 1024 * 1024 * 1024,
      memory_percent: Math.max(8, 20 + base + Math.cos(i / 3) * 5 + i * 0.28),
      net_rx_bytes: 1000000 + i * 24000,
      net_tx_bytes: 180000 + i * 12000,
      block_read_bytes: 5000000 + i * 120000,
      block_write_bytes: 2000000 + i * 90000,
    };
  }).slice(-hours);
}

const timelineEvents = [
  {
    id: "notification-1",
    kind: "notification",
    severity: "danger",
    title: "Alert sent",
    message: "watchtower has been down for 15 minutes.",
    container_id: null,
    container_name: "watchtower",
    timestamp: new Date(now - 12 * 60000).toISOString(),
  },
  {
    id: "uptime-1",
    kind: "container",
    severity: "success",
    title: "Container started",
    message: "jellyfin started.",
    container_id: "1",
    container_name: "jellyfin",
    timestamp: new Date(now - 28 * 60000).toISOString(),
  },
  {
    id: "notification-2",
    kind: "notification",
    severity: "success",
    title: "Container recovered",
    message: "adguardhome recovered after a restart.",
    container_id: null,
    container_name: "adguardhome",
    timestamp: new Date(now - 54 * 60000).toISOString(),
  },
];

function filteredTimeline(url) {
  const parsed = new URL(url);
  const severities = parsed.searchParams.getAll("severity");
  const kinds = parsed.searchParams.getAll("kind");
  const limit = Number(parsed.searchParams.get("limit") || 8);
  return timelineEvents
    .filter((event) => severities.length === 0 || severities.includes(event.severity))
    .filter((event) => kinds.length === 0 || kinds.includes(event.kind))
    .slice(0, limit);
}

async function installMocks(page) {
  await page.addInitScript(({ token, containers }) => {
    localStorage.setItem("harbor_token", token);
    class FakeWebSocket {
      static OPEN = 1;
      readyState = 1;
      constructor() {
        setTimeout(() => {
          const stats = {
            cpu_percent: 18.4,
            ram_percent: 41.6,
            ram_used_gb: 13.3,
            ram_total_gb: 32,
            disk_percent: 38.2,
            disk_used_gb: 764,
            disk_total_gb: 2000,
            net_rx_bytes: 1600000,
            net_tx_bytes: 240000,
            uptime_seconds: 1393200,
          };
          this.onopen?.({});
          this.onmessage?.({ data: JSON.stringify({ type: "stats", data: stats }) });
          this.onmessage?.({ data: JSON.stringify({ type: "containers", data: containers }) });
        }, 25);
      }
      send() {}
      close() {
        this.onclose?.({ code: 1000 });
      }
    }
    window.WebSocket = FakeWebSocket;
  }, { token, containers });

  await page.route("**/api/services", (route) => route.fulfill({ json: services }));
  await page.route("**/api/system/history", (route) => route.fulfill({
    json: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(now - (24 - i) * 300000).toISOString(),
      cpu_percent: 10 + Math.sin(i / 2) * 6 + i * 0.3,
      ram_percent: 38 + Math.cos(i / 3) * 2,
      disk_percent: 38.2,
    })),
  }));
  await page.route("**/api/operations/timeline?**", (route) => route.fulfill({ json: filteredTimeline(route.request().url()) }));
  await page.route("**/api/containers/stats/recent?**", (route) => route.fulfill({ json: recentStats }));
  await page.route("**/api/containers/stats/top?**", (route) => route.fulfill({ json: topStats }));
  await page.route("**/api/containers/*/stats/history?**", (route) => {
    const match = route.request().url().match(/\/api\/containers\/([^/]+)\/stats\/history/);
    route.fulfill({ json: historyFor(match?.[1] ?? "1", 24) });
  });
  await page.route("**/api/notifications/rules", (route) => route.fulfill({
    json: [
      {
        id: 1,
        container_id: "7",
        container_name: "watchtower",
        enabled: true,
        down_threshold_minutes: 15,
        webhook_url: "https://ntfy.example/harbor",
        created_at: new Date(now - 86400000).toISOString(),
      },
    ],
  }));
  await page.route("**/api/notifications/log", (route) => route.fulfill({
    json: [
      {
        id: 1,
        rule_id: 1,
        container_name: "watchtower",
        message: "watchtower has been down for 15 minutes.",
        sent_at: new Date(now - 12 * 60000).toISOString(),
      },
    ],
  }));
}

async function capture(page, route, fileName) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await installMocks(page);

  await capture(page, "/", "dashboard.png");
  await capture(page, "/containers", "containers.png");
  await page.locator('button[title="View resource trends"]').first().click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outputDir, "container-resource-trends.png"), fullPage: true });
  await capture(page, "/settings", "settings.png");

  await browser.close();
  console.log(`Captured README screenshots in ${outputDir}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
