import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import api from "../../lib/api";
import { Modal } from "../ui/Modal";
import type { ServiceItem } from "../../types";
import { ServiceIcon } from "./ServiceIcon";

export function DiscoveryModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (services: ServiceItem[]) => void;
}) {
  const [discovered, setDiscovered] = useState<ServiceItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get<ServiceItem[]>("/services/discover");
        if (isMounted) {
          // Map localhost to current host
          const hostname = window.location.hostname;
          const mapped = data.map(s => ({
            ...s,
            url: s.url.replace("localhost", hostname)
          }));
          setDiscovered(mapped);
          setSelected(new Set(mapped.map((_, i) => i)));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    load();
    return () => { isMounted = false; };
  }, [isOpen]);

  function handleSave() {
    const toAdd = discovered.filter((_, i) => selected.has(i));
    onAdd(toAdd);
  }

  function toggle(index: number) {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Discover Services">
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm" style={{ color: "var(--color-muted)" }}>
            <Loader2 className="animate-spin mb-2" size={24} />
            Scanning running containers...
          </div>
        ) : discovered.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: "var(--color-muted)" }}>
            No new services with public ports found.
          </div>
        ) : (
          <>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Select the services you'd like to add to your dashboard:
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {discovered.map((s, i) => (
                <label 
                  key={i} 
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <input 
                    type="checkbox" 
                    checked={selected.has(i)}
                    onChange={() => toggle(i)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <ServiceIcon slug={s.icon} url={s.url} name={s.name} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{s.name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--color-muted)" }}>{s.url}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="harbor-btn-ghost">
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={selected.size === 0}
                className="harbor-btn-primary"
              >
                Add {selected.size} Service{selected.size !== 1 && "s"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
