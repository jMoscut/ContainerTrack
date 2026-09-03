import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { ContainerRealtimeMessage } from "../types/container";

/**
 * Subscribes to /topic/container/{id} over STOMP-over-SockJS while a
 * container detail page is open, calling onUpdate for each realtime message.
 */
export function useContainerRealtime(
  containerId: string | undefined,
  onUpdate: (message: ContainerRealtimeMessage) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!containerId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL}/ws`) as unknown as WebSocket,
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/container/${containerId}`, (message) => {
        try {
          const payload = JSON.parse(message.body) as ContainerRealtimeMessage;
          onUpdateRef.current(payload);
        } catch {
          // ignore malformed payloads
        }
      });
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [containerId]);
}
