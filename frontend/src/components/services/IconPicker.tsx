import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { ServiceIcon } from "./ServiceIcon";

/**
 * Curated list of common homelab service slugs from homarr-labs/dashboard-icons.
 * These are the most popular self-hosted apps — covers ~95% of homelabs.
 * Users can also type any custom slug not in this list.
 */
const ICON_SLUGS = [
  "adguard-home", "authelia", "bazarr", "bitwarden", "caddy",
  "cloudflare", "code-server", "dashy", "dockge", "duplicati",
  "emby", "filebrowser", "freshrss", "gitea", "grafana",
  "grocy", "guacamole", "heimdall", "home-assistant", "homepage",
  "homarr", "immich", "jellyfin", "jellyseerr", "kavita",
  "lidarr", "mealie", "minio", "mysql", "n8n",
  "nextcloud", "nginx", "nginx-proxy-manager", "node-red", "nzbget", "omv",
  "overseerr", "paperless-ngx", "pfsense", "photoprism", "pi-hole",
  "plex", "portainer", "postgres", "prometheus", "prowlarr",
  "proxmox", "qbittorrent", "radarr", "redis", "sonarr",
  "syncthing", "tautulli", "traefik", "transmission", "truenas",
  "unifi", "uptime-kuma", "vaultwarden", "watchtower", "wireguard",
];

interface Props {
  value: string;
  onChange: (slug: string) => void;
}

export function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = ICON_SLUGS.filter((slug) =>
    slug.includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="harbor-input flex items-center gap-2 text-left"
      >
        <ServiceIcon slug={value} size={18} />
        <span className="flex-1 truncate">{value || "Choose icon…"}</span>
        <Search size={13} style={{ color: "var(--color-muted)" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 z-30 mt-1 w-full overflow-hidden rounded-lg border shadow-lg animate-scale-in"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="harbor-input w-full text-sm"
            />
          </div>

          {/* Grid */}
          <div className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto p-2">
            {filtered.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  onChange(slug);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex flex-col items-center gap-1 rounded-md p-1.5 transition-colors"
                style={{
                  backgroundColor: slug === value ? "var(--color-accent-dim)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (slug !== value) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (slug !== value) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }
                }}
                title={slug}
              >
                <ServiceIcon slug={slug} size={22} />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-6 py-3 text-center text-xs" style={{ color: "var(--color-muted)" }}>
                No matches. Type a custom slug above.
              </p>
            )}
          </div>

          {/* Custom slug hint */}
          <div
            className="px-3 py-2 text-xs"
            style={{ color: "var(--color-muted)", borderTop: "1px solid var(--color-border)" }}
          >
            Type any slug from{" "}
            <a
              href="https://github.com/homarr-labs/dashboard-icons/tree/main/png"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-accent)" }}
            >
              dashboard-icons
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
