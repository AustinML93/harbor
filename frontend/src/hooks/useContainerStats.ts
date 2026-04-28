import { useQueries, useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import type { ContainerRecentStat, ContainerStatPoint } from "../types";

export function useRecentContainerStats(limit = 50) {
  return useQuery<ContainerRecentStat[]>({
    queryKey: ["container-stats-recent", limit],
    queryFn: () =>
      api.get(`/containers/stats/recent?limit=${limit}`).then((response) => response.data),
    refetchInterval: 60000,
  });
}

export function useContainerStatsHistory(containerId: string | null, hours = 24) {
  return useQuery<ContainerStatPoint[]>({
    queryKey: ["container-stats-history", containerId, hours],
    queryFn: () =>
      api
        .get(`/containers/${containerId}/stats/history?hours=${hours}`)
        .then((response) => response.data),
    enabled: Boolean(containerId),
    refetchInterval: 60000,
  });
}

export function useContainerStatsHistories(containerIds: string[], hours = 6) {
  return useQueries({
    queries: containerIds.map((containerId) => ({
      queryKey: ["container-stats-history", containerId, hours],
      queryFn: () =>
        api
          .get(`/containers/${containerId}/stats/history?hours=${hours}`)
          .then((response) => response.data as ContainerStatPoint[]),
      refetchInterval: 60000,
      staleTime: 30000,
    })),
  });
}
