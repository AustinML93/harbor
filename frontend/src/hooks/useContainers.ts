import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useStore } from "../store";
import api from "../lib/api";
import type { ContainerAction, ContainerSummary } from "../types";

export function useContainers() {
  // Live container data comes from the WebSocket store
  return useStore((s) => s.containers);
}

export function useContainerAction() {
  const { addToast, setContainers, containers } = useStore();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: ContainerAction }) =>
      api.post(`/containers/${id}/${action}`),

    onMutate: ({ id, action }) => {
      const previousContainers = containers;
      const optimisticState =
        action === "start" ? "running" : action === "stop" ? "exited" : "restarting";
      setContainers(
        containers.map((c) =>
          c.id === id ? { ...c, state: optimisticState as ContainerSummary["state"] } : c
        )
      );
      return { previousContainers };
    },

    onSuccess: (_data, { action }) => {
      addToast({
        type: "success",
        message: `Container ${action}ed successfully`,
      });
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousContainers) {
        setContainers(ctx.previousContainers);
      }
      addToast({ type: "error", message: "Action failed. Check Docker connectivity." });
    },
  });
}

export function useContainerDelete() {
  const addToast = useStore((s) => s.addToast);

  return useMutation({
    mutationFn: (id: string) => api.delete(`/containers/${id}`),
    onSuccess: (_data, id) => {
      const { containers, setContainers } = useStore.getState();
      setContainers(containers.filter((c) => c.id !== id));
      addToast({ type: "success", message: "Container removed" });
    },
    onError: (err) => {
      const msg = isAxiosError(err)
        ? (err.response?.data?.detail ?? "Failed to remove container")
        : "Failed to remove container";
      addToast({ type: "error", message: msg });
    },
  });
}
