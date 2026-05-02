import { ServiceTile } from "./ServiceTile";
import type { ServiceItem } from "../../types";

interface Props {
  services: ServiceItem[];
  loading: boolean;
  onEdit: (item: ServiceItem) => void;
  onDelete: (item: ServiceItem) => void;
}

function groupByCategory(services: ServiceItem[]): Record<string, ServiceItem[]> {
  return services.reduce<Record<string, ServiceItem[]>>((acc, service) => {
    const cat = service.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});
}

const GRID_CLASSES = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

export function ServiceGrid({ services, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className={GRID_CLASSES}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="harbor-card h-[58px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div
        className="rounded-lg border py-16 text-center text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
      >
        No services configured yet. Add one to get started.
      </div>
    );
  }

  const grouped = groupByCategory(services);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
            <span>{category}</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
              style={{
                backgroundColor: "var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              {items.length}
            </span>
          </h3>
          <div className={GRID_CLASSES}>
            {items.map((service) => (
              <ServiceTile
                key={service.name}
                service={service}
                onEdit={() => onEdit(service)}
                onDelete={() => onDelete(service)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
