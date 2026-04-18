import { useState } from "react";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ServiceItem } from "../../types";
import { ServiceIcon } from "./ServiceIcon";

interface Props {
  service: ServiceItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceTile({ service, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="harbor-card group relative px-4 py-3 hover-lift"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "";
      }}
    >
      {/* Main link area */}
      <a
        href={service.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105">
          <ServiceIcon key={service.icon} slug={service.icon} name={service.name} url={service.url} size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="truncate text-sm font-medium"
              style={{ color: "var(--color-text)" }}
            >
              {service.name}
            </span>
            <ExternalLink
              size={11}
              className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
              style={{ color: "var(--color-muted)" }}
            />
          </div>
          {service.description && (
            <p
              className="truncate text-xs"
              style={{ color: "var(--color-muted)" }}
            >
              {service.description}
            </p>
          )}
        </div>
      </a>

      {/* Context menu */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
          }
        >
          <MoreHorizontal size={13} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-lg border py-1 shadow-lg animate-scale-in"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <button
                onClick={() => { onEdit(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                style={{ color: "var(--color-text)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                }
              >
                <Pencil size={11} /> Edit
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                style={{ color: "var(--color-danger)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-border)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                }
              >
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
