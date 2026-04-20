import { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import { KeyRound, Bell, BellOff, Trash2, Plus, History, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { useStore } from "../store";
import { useContainers } from "../hooks/useContainers";
import { Modal } from "../components/ui/Modal";
import type { NotificationRule, NotificationLogItem } from "../types";

// ─── Rule modal (add / edit) ────────────────────────────────────────────────

interface RuleFormState {
  container_id: string;
  container_name: string;
  enabled: boolean;
  down_threshold_minutes: number;
  webhook_url: string;
}

const defaultForm = (): RuleFormState => ({
  container_id: "",
  container_name: "",
  enabled: true,
  down_threshold_minutes: 5,
  webhook_url: "",
});

interface RuleModalProps {
  isOpen: boolean;
  editRule: NotificationRule | null;
  existingContainerIds: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}

function RuleModal({ isOpen, editRule, existingContainerIds, onClose, onSaved }: RuleModalProps) {
  const addToast = useStore((s) => s.addToast);
  const containers = useContainers();
  const [form, setForm] = useState<RuleFormState>(
    editRule
      ? {
          container_id: editRule.container_id,
          container_name: editRule.container_name,
          enabled: editRule.enabled,
          down_threshold_minutes: editRule.down_threshold_minutes,
          webhook_url: editRule.webhook_url ?? "",
        }
      : defaultForm()
  );
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  useEffect(() => {
    if (isOpen) {
      setForm(
        editRule
          ? {
              container_id: editRule.container_id,
              container_name: editRule.container_name,
              enabled: editRule.enabled,
              down_threshold_minutes: editRule.down_threshold_minutes,
              webhook_url: editRule.webhook_url ?? "",
            }
          : defaultForm()
      );
      setTestStatus("idle");
    }
  }, [isOpen, editRule]);

  const isEdit = editRule !== null;

  const availableContainers = containers.filter(
    (c) => !existingContainerIds.has(c.id) || c.id === editRule?.container_id
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(isEdit ? {} : { container_id: form.container_id, container_name: form.container_name }),
        enabled: form.enabled,
        down_threshold_minutes: form.down_threshold_minutes,
        webhook_url: form.webhook_url || null,
      };
      return isEdit
        ? api.put(`/notifications/rules/${editRule.id}`, payload)
        : api.post("/notifications/rules", payload);
    },
    onSuccess: () => {
      addToast({ type: "success", message: isEdit ? "Rule updated" : "Rule created" });
      onSaved();
    },
    onError: () => addToast({ type: "error", message: "Failed to save rule" }),
  });

  async function testWebhook() {
    if (!form.webhook_url) return;
    setTestStatus("testing");
    try {
      const { data } = await api.post("/notifications/test-webhook", { url: form.webhook_url });
      setTestStatus(data.ok ? "ok" : "fail");
      addToast({
        type: data.ok ? "success" : "error",
        message: data.ok ? `Webhook responded ${data.status}` : `Webhook returned ${data.status}`,
      });
    } catch (err) {
      setTestStatus("fail");
      addToast({
        type: "error",
        message: isAxiosError(err) ? (err.response?.data?.detail ?? "Webhook unreachable") : "Webhook unreachable",
      });
    } finally {
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  }

  function handleContainerChange(id: string) {
    const c = containers.find((c) => c.id === id);
    setForm((f) => ({ ...f, container_id: id, container_name: c?.name ?? "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !form.container_id) return;
    saveMutation.mutate();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit rule" : "Add notification rule"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEdit ? (
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Container</label>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{editRule.container_name}</p>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Container</label>
            <select
              className="harbor-input w-full"
              value={form.container_id}
              onChange={(e) => handleContainerChange(e.target.value)}
              required
            >
              <option value="">— select container —</option>
              {availableContainers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>
            Alert after down (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={1440}
            className="harbor-input w-full"
            value={form.down_threshold_minutes}
            onChange={(e) => setForm((f) => ({ ...f, down_threshold_minutes: parseInt(e.target.value) || 5 }))}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>
            Webhook URL <span className="opacity-60">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              className="harbor-input flex-1"
              placeholder="https://hooks.slack.com/…"
              value={form.webhook_url}
              onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))}
            />
            <button
              type="button"
              className="harbor-btn-ghost px-3 text-sm"
              disabled={!form.webhook_url || testStatus === "testing"}
              onClick={testWebhook}
              style={
                testStatus === "ok"
                  ? { color: "var(--color-success)" }
                  : testStatus === "fail"
                  ? { color: "var(--color-danger)" }
                  : {}
              }
            >
              {testStatus === "testing" ? "…" : testStatus === "ok" ? "✓ OK" : testStatus === "fail" ? "✗ Fail" : "Test"}
            </button>
          </div>
        </div>

        {isEdit && (
          <label className="flex cursor-pointer items-center gap-3">
            <div
              className="relative h-5 w-9 rounded-full transition-colors"
              style={{ backgroundColor: form.enabled ? "var(--color-accent)" : "var(--color-border)" }}
              onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
            >
              <div
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: form.enabled ? "translateX(16px)" : "translateX(2px)" }}
              />
            </div>
            <span className="text-sm" style={{ color: "var(--color-text)" }}>
              {form.enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="harbor-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="harbor-btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : isEdit ? "Update" : "Add rule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Settings page ───────────────────────────────────────────────────────────

export default function Settings() {
  const addToast = useStore((s) => s.addToast);
  const queryClient = useQueryClient();

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Notification rule modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editRule, setEditRule] = useState<NotificationRule | null>(null);

  const { data: rules = [] } = useQuery<NotificationRule[]>({
    queryKey: ["notification-rules"],
    queryFn: () => api.get("/notifications/rules").then((r) => r.data),
  });

  const { data: alertLog = [] } = useQuery<NotificationLogItem[]>({
    queryKey: ["notification-log"],
    queryFn: () => api.get("/notifications/log").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const deleteRule = useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      addToast({ type: "success", message: "Rule deleted" });
    },
    onError: () => addToast({ type: "error", message: "Failed to delete rule" }),
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.put(`/notifications/rules/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-rules"] }),
    onError: () => addToast({ type: "error", message: "Failed to update rule" }),
  });

  const existingContainerIds = new Set(rules.map((r) => r.container_id));

  function openAdd() {
    setEditRule(null);
    setShowRuleModal(true);
  }

  function openEdit(rule: NotificationRule) {
    setEditRule(rule);
    setShowRuleModal(true);
  }

  function onRuleSaved() {
    setShowRuleModal(false);
    queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ type: "error", message: "New passwords do not match" });
      return;
    }
    setPwLoading(true);
    try {
      await api.put("/auth/password", { current_password: currentPassword, new_password: newPassword });
      addToast({ type: "success", message: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      addToast({
        type: "error",
        message: isAxiosError(err) ? (err.response?.data?.detail ?? "Failed to change password") : "Failed to change password",
      });
    } finally {
      setPwLoading(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const cardStyle = {
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-card)",
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Settings</h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>Manage your Harbor configuration</p>
      </div>

      {/* Password */}
      <div className="rounded-lg border p-6" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={20} style={{ color: "var(--color-accent)" }} />
          <h2 className="text-lg font-medium" style={{ color: "var(--color-text)" }}>Change Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Current Password</label>
            <input type="password" className="harbor-input w-full" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>New Password</label>
            <input type="password" className="harbor-input w-full" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Confirm New Password</label>
            <input type="password" className="harbor-input w-full" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="harbor-btn-primary w-full justify-center" disabled={pwLoading}>
            {pwLoading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>

      {/* Notification rules */}
      <div className="rounded-lg border p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={20} style={{ color: "var(--color-accent)" }} />
            <h2 className="text-lg font-medium" style={{ color: "var(--color-text)" }}>Notification Rules</h2>
          </div>
          <button className="harbor-btn-primary px-3 py-1.5 text-sm" onClick={openAdd}>
            <Plus size={14} />
            Add rule
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--color-muted)" }}>
            No rules yet. Add one to get alerted when a container goes down.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                <button
                  onClick={() => toggleRule.mutate({ id: rule.id, enabled: !rule.enabled })}
                  className="flex-shrink-0"
                  title={rule.enabled ? "Disable" : "Enable"}
                >
                  {rule.enabled ? (
                    <Bell size={16} style={{ color: "var(--color-accent)" }} />
                  ) : (
                    <BellOff size={16} style={{ color: "var(--color-muted)" }} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                    {rule.container_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                    Alert after {rule.down_threshold_minutes}m down
                    {rule.webhook_url && (
                      <span className="ml-2 inline-flex items-center gap-0.5">
                        <ExternalLink size={10} />
                        {new URL(rule.webhook_url).hostname}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    className="harbor-btn-ghost rounded p-1.5 text-xs"
                    onClick={() => openEdit(rule)}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    className="harbor-btn-ghost rounded p-1.5"
                    onClick={() => deleteRule.mutate(rule.id)}
                    title="Delete"
                    style={{ color: "var(--color-danger)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert history */}
      <div className="rounded-lg border p-6" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <History size={20} style={{ color: "var(--color-accent)" }} />
          <h2 className="text-lg font-medium" style={{ color: "var(--color-text)" }}>Alert History</h2>
          <span className="ml-auto text-xs" style={{ color: "var(--color-muted)" }}>last 50</span>
        </div>

        {alertLog.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--color-muted)" }}>
            No alerts fired yet.
          </p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {alertLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <span className="flex-shrink-0 text-xs tabular-nums pt-0.5" style={{ color: "var(--color-muted)" }}>
                  {formatTime(entry.sent_at)}
                </span>
                <span className="font-medium flex-shrink-0" style={{ color: "var(--color-danger)" }}>
                  {entry.container_name}
                </span>
                <span className="text-xs truncate" style={{ color: "var(--color-muted)" }} title={entry.message}>
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <RuleModal
        isOpen={showRuleModal}
        editRule={editRule}
        existingContainerIds={existingContainerIds}
        onClose={() => setShowRuleModal(false)}
        onSaved={onRuleSaved}
      />
    </div>
  );
}
