import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Plus } from "lucide-react";
import api from "../lib/api";
import { ServiceGrid } from "../components/services/ServiceGrid";
import { Modal } from "../components/ui/Modal";
import { useStore } from "../store";
import type { ServiceItem } from "../types";

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ServiceItem>;
  onSave: (item: ServiceItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ServiceItem>({
    name: initial?.name ?? "",
    url: initial?.url ?? "",
    icon: initial?.icon ?? "globe-alt",
    description: initial?.description ?? "",
    category: initial?.category ?? "General",
  });

  const field = (key: keyof ServiceItem) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-3"
    >
      {(["name", "url", "icon", "description", "category"] as const).map((key) => (
        <div key={key}>
          <label className="mb-1 block text-sm capitalize" style={{ color: "var(--color-muted)" }}>
            {key}
          </label>
          <input className="harbor-input" {...field(key)} required={key === "name" || key === "url"} />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="harbor-btn-ghost">
          Cancel
        </button>
        <button type="submit" className="harbor-btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}

export default function Services() {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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

  function handleImport() {
    queryClient.invalidateQueries({ queryKey: ["services"] });
    addToast({ type: "info", message: "Reloading services from services.yml…" });
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            Services
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
            Quick-launch links for your homelab
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="harbor-btn-primary">
          <Plus size={15} />
          Add service
        </button>
      </div>

      {services.length === 0 && !isLoading ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border py-16 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-border)" }}
          >
            <Globe size={24} style={{ color: "var(--color-muted)" }} />
          </div>
          <h3 className="mb-1 text-base font-semibold" style={{ color: "var(--color-text)" }}>
            No services yet
          </h3>
          <p className="mb-6 max-w-sm text-sm" style={{ color: "var(--color-muted)" }}>
            Services are quick-launch links to your self-hosted apps. Add them manually or import
            from services.yml.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAdd(true)} className="harbor-btn-primary">
              <Plus size={15} />
              Add your first service
            </button>
            <button onClick={handleImport} className="harbor-btn-ghost">
              Import from services.yml
            </button>
          </div>
        </div>
      ) : (
        <ServiceGrid
          services={services}
          loading={isLoading}
          onEdit={setEditItem}
          onDelete={handleDelete}
        />
      )}

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
    </div>
  );
}
