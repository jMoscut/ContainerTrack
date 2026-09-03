import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { DashboardRealtimeMessage } from "../types/dashboard";

/**
 * Subscribes to the dashboard-wide /topic/dashboard STOMP-over-SockJS channel
 * while the dashboard page is open, calling onEvent for each realtime
 * message (container created / status changed / discharged). Mirrors
 * useContainerRealtime's connection/cleanup logic, pointed at the dashboard
 * topic instead of a per-container one.
 */
export function useDashboardRealtime(onEvent: (message: DashboardRealtimeMessage) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL}/ws`) as unknown as WebSocket,
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      client.subscribe("/topic/dashboard", (message) => {
        try {
          const payload = JSON.parse(message.body) as DashboardRealtimeMessage;
          onEventRef.current(payload);
        } catch {
          // ignore malformed payloads
        }
      });
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);
}
