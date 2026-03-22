import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../store";
import api from "../lib/api";
import type { ContainerAction, ContainerSummary } from "../types";

export function useContainers() {
  // Live container data comes from the WebSocket store
  return useStore((s) => s.containers);
}

export function useContainerAction() {
  const queryClient = useQueryClient();
  const { addToast, setContainers, containers } = useStore();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: ContainerAction }) =>
      api.post(`/containers/${id}/${action}`),

    onMutate: ({ id, action }) => {
      // Optimistic update
      const optimisticState =
        action === "start" ? "running" : action === "stop" ? "exited" : "restarting";
      setContainers(
        containers.map((c) =>
          c.id === id ? { ...c, state: optimisticState as ContainerSummary["state"] } : c
        )
      );
    },

    onSuccess: (_data, { action }) => {
      addToast({
        type: "success",
        message: `Container ${action}ed successfully`,
      });
    },

    onError: (_err, _vars, _ctx) => {
      addToast({ type: "error", message: "Action failed. Check Docker connectivity." });
    },
  });
}
