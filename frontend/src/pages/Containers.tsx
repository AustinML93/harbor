import { useState } from "react";
import { useContainers, useContainerAction } from "../hooks/useContainers";
import { ContainerTable } from "../components/containers/ContainerTable";
import { Modal } from "../components/ui/Modal";

export default function Containers() {
  const containers = useContainers();
  const { mutate: runAction, isPending } = useContainerAction();
  const [logContainerId, setLogContainerId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  async function openLogs(containerId: string) {
    setLogContainerId(containerId);
    setLogsLoading(true);
    setLogs([]);
    try {
      const { default: api } = await import("../lib/api");
      const { data } = await api.get(`/containers/${containerId}/logs?lines=200`);
      setLogs(data.logs ?? []);
    } catch {
      setLogs(["Failed to load logs."]);
    } finally {
      setLogsLoading(false);
    }
  }

  const logContainer = containers.find((c) => c.id === logContainerId);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Containers
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
          {containers.filter((c) => c.state === "running").length} running ·{" "}
          {containers.length} total
        </p>
      </div>

      <ContainerTable
        containers={containers}
        onAction={(id, action) => runAction({ id, action })}
        onViewLogs={openLogs}
        actionPending={isPending}
      />

      {/* Log drawer modal */}
      <Modal
        isOpen={logContainerId !== null}
        onClose={() => setLogContainerId(null)}
        title={`Logs — ${logContainer?.name ?? ""}`}
        size="xl"
      >
        <div
          className="h-96 overflow-y-auto rounded-md p-3 font-mono text-xs leading-relaxed"
          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
        >
          {logsLoading ? (
            <span style={{ color: "var(--color-muted)" }}>Loading…</span>
          ) : logs.length === 0 ? (
            <span style={{ color: "var(--color-muted)" }}>No logs available.</span>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
