import { useCallback, useEffect, useRef } from "react";
import { getToken } from "../lib/auth";
import { useStore } from "../store";
import type { WsMessage } from "../types";

const WS_URL = "/ws";
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { setStats, setContainers, setWsConnected } = useStore();

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}${WS_URL}?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      reconnectAttempt.current = 0;

      // Send ping every 30s to keep connection alive
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        switch (msg.type) {
          case "stats":
            setStats(msg.data);
            break;
          case "containers":
            setContainers(msg.data);
            break;
          case "pong":
            break;
          case "error":
            console.warn("WS server error:", msg.message);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      if (pingInterval.current) clearInterval(pingInterval.current);

      // Exponential backoff reconnect
      const delay =
        RECONNECT_DELAYS[
          Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
        ];
      reconnectAttempt.current++;
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [setStats, setContainers, setWsConnected]);

  useEffect(() => {
    connect();
    return () => {
      if (pingInterval.current) clearInterval(pingInterval.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
