import { useState } from "react";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ServiceItem } from "../../types";

interface Props {
  service: ServiceItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceTile({ service, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="harbor-card group relative flex flex-col gap-2 p-4 transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--color-card)" }}
    >
      {/* Main link area */}
      <a
        href={service.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3"
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
        >
          {/* Placeholder icon — swap for actual icon library integration */}
          <span className="text-sm font-bold">{service.name[0].toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
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
              className="mt-0.5 truncate text-xs"
              style={{ color: "var(--color-muted)" }}
            >
              {service.description}
            </p>
          )}
        </div>
      </a>

      {/* Context menu */}
      <div className="absolute right-2 top-2">
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
              className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-lg border py-1 shadow-lg"
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
