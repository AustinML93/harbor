import { useEffect } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useStore } from "../../store";
import type { Toast } from "../../store";

const ICONS = {
  success: <CheckCircle size={15} />,
  error: <XCircle size={15} />,
  info: <Info size={15} />,
};

const COLORS = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  info: "var(--color-accent)",
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useStore((s) => s.removeToast);

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, removeToast]);

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border px-4 py-3 shadow-lg animate-slide-up"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        color: "var(--color-text)",
        minWidth: "260px",
        maxWidth: "380px",
      }}
    >
      <span style={{ color: COLORS[toast.type] }}>{ICONS[toast.type]}</span>
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0"
        style={{ color: "var(--color-muted)" }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
