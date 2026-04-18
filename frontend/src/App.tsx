import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { isAuthenticated } from "./lib/auth";
import { useStore } from "./store";
import { useWebSocket } from "./hooks/useWebSocket";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Containers from "./pages/Containers";
import Settings from "./pages/Settings";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { ToastContainer } from "./components/ui/Toast";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = isAuthenticated();
  if (!auth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  // Connect WebSocket for the lifetime of the authenticated session
  useWebSocket();

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const setAuthenticated = useStore((s) => s.setAuthenticated);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, [setAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/containers"
          element={
            <ProtectedRoute>
              <AppShell>
                <Containers />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppShell>
                <Settings />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
