import { useState } from "react";
import { IconPicker } from "./IconPicker";
import type { ServiceItem } from "../../types";

export function ServiceForm({
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
    icon: initial?.icon ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "General",
  });

  const field = (key: keyof ServiceItem) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const autoSlug = form.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const submitted = { ...form, icon: form.icon || autoSlug };
        onSave(submitted);
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Name</label>
        <input className="harbor-input w-full" {...field("name")} required />
      </div>
      <div>
        <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>URL</label>
        <input className="harbor-input w-full" {...field("url")} required />
      </div>
      <div>
        <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Icon</label>
        <IconPicker
          value={form.icon || autoSlug}
          onChange={(slug) => setForm((f) => ({ ...f, icon: slug }))}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
          Auto-matched from name. Click to browse or type a custom slug.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Description</label>
        <input className="harbor-input w-full" {...field("description")} />
      </div>
      <div>
        <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Category</label>
        <input className="harbor-input w-full" {...field("category")} />
      </div>
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
