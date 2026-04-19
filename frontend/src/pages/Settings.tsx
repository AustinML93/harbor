import { useState } from "react";
import { isAxiosError } from "axios";
import { KeyRound } from "lucide-react";
import api from "../lib/api";
import { useStore } from "../store";

export default function Settings() {
  const addToast = useStore((s) => s.addToast);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ type: "error", message: "New passwords do not match" });
      return;
    }
    
    setLoading(true);
    try {
      await api.put("/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
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
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Settings
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
          Manage your Harbor configuration
        </p>
      </div>

      <div className="rounded-lg border p-6" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-card)" }}>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={20} style={{ color: "var(--color-accent)" }} />
          <h2 className="text-lg font-medium" style={{ color: "var(--color-text)" }}>Change Password</h2>
        </div>
        
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Current Password</label>
            <input 
              type="password"
              className="harbor-input w-full" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>New Password</label>
            <input 
              type="password"
              className="harbor-input w-full" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--color-muted)" }}>Confirm New Password</label>
            <input 
              type="password"
              className="harbor-input w-full" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          </div>
          <button 
            type="submit" 
            className="harbor-btn-primary w-full justify-center"
            disabled={loading}
          >
            {loading ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
