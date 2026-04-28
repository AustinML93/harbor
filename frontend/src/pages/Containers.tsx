import { useMemo, useState } from "react";
import { useContainers, useContainerAction, useContainerDelete } from "../hooks/useContainers";
import { useContainerStatsHistories, useContainerStatsHistory, useRecentContainerStats } from "../hooks/useContainerStats";
import api from "../lib/api";
import { ContainerTable } from "../components/containers/ContainerTable";
import { ContainerResourceModal } from "../components/containers/ContainerResourceModal";
import { ResourceUsageSummary } from "../components/containers/ResourceUsageSummary";
import { Modal } from "../components/ui/Modal";
import type { ContainerRecentStat, ContainerStatPoint, ContainerSummary } from "../types";

export default function Containers() {
  const containers = useContainers();
  const { mutate: runAction, isPending } = useContainerAction();
  const { mutate: deleteContainer, isPending: isDeleting } = useContainerDelete();
  const { data: recentStats = [], isLoading: recentStatsLoading } = useRecentContainerStats(50);

  const [logContainerId, setLogContainerId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContainerSummary | null>(null);
  const [resourceTarget, setResourceTarget] = useState<ContainerSummary | null>(null);

  const containerIds = useMemo(() => containers.map((container) => container.id), [containers]);
  const historyQueries = useContainerStatsHistories(containerIds, 6);
  const { data: selectedHistory = [], isLoading: selectedHistoryLoading } = useContainerStatsHistory(
    resourceTarget?.id ?? null,
    24
  );

  const recentStatsById = useMemo<Record<string, ContainerRecentStat | undefined>>(
    () => Object.fromEntries(recentStats.map((stat) => [stat.container_id, stat])),
    [recentStats]
  );

  const historyById = useMemo<Record<string, ContainerStatPoint[] | undefined>>(
    () =>
      Object.fromEntries(
        containers.map((container, index) => [container.id, historyQueries[index]?.data ?? []])
      ),
    [containers, historyQueries]
  );

  const statsLoadingById = useMemo<Record<string, boolean | undefined>>(
    () =>
      Object.fromEntries(
        containers.map((container, index) => [container.id, historyQueries[index]?.isLoading])
      ),
    [containers, historyQueries]
  );

  async function openLogs(containerId: string) {
    setLogContainerId(containerId);
    setLogsLoading(true);
    setLogs([]);
    try {
      const { data } = await api.get(`/containers/${containerId}/logs?lines=200`);
      setLogs(data.logs ?? []);
    } catch {
      setLogs(["Failed to load logs."]);
    } finally {
      setLogsLoading(false);
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteContainer(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
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

      <ResourceUsageSummary stats={recentStats} loading={recentStatsLoading} />

      <ContainerTable
        containers={containers}
        onAction={(id, action) => runAction({ id, action })}
        onViewLogs={openLogs}
        onViewStats={setResourceTarget}
        onDelete={setDeleteTarget}
        actionPending={isPending}
        recentStatsById={recentStatsById}
        historyById={historyById}
        statsLoadingById={statsLoadingById}
      />

      {/* Log drawer */}
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

      {/* Resource trend drawer */}
      <Modal
        isOpen={resourceTarget !== null}
        onClose={() => setResourceTarget(null)}
        title={`Resource trends — ${resourceTarget?.name ?? ""}`}
        size="xl"
      >
        <ContainerResourceModal
          container={resourceTarget}
          history={selectedHistory}
          loading={selectedHistoryLoading}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Remove container"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--color-text)" }}>
            Remove{" "}
            <span className="font-semibold">{deleteTarget?.name}</span>? This cannot be undone.
            {deleteTarget?.state === "running" && (
              <span className="mt-2 block" style={{ color: "var(--color-danger)" }}>
                Stop the container before removing it.
              </span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <button className="harbor-btn-ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              className="harbor-btn-primary"
              style={{ backgroundColor: "var(--color-danger)", borderColor: "var(--color-danger)" }}
              onClick={confirmDelete}
              disabled={isDeleting || deleteTarget?.state === "running"}
            >
              {isDeleting ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
