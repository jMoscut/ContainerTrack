package com.containertrack.service;

import com.containertrack.dto.response.DashboardEventDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Real ContainerRealtimeNotifier backed by STOMP over WebSocket, publishing to /topic/container/{id}.
 * Marked @Primary so it takes precedence over NoopContainerRealtimeNotifier.
 */
@Component
@Primary
@RequiredArgsConstructor
public class WebSocketContainerRealtimeNotifier implements ContainerRealtimeNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void notifyContainerUpdated(Long containerId, List<String> changedFields, String updatedBy) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("containerId", containerId);
        payload.put("changedFields", changedFields.stream()
                .map(f -> Map.of("fieldName", f))
                .collect(Collectors.toList()));
        payload.put("updatedBy", updatedBy);
        payload.put("updatedAt", OffsetDateTime.now(ZoneOffset.UTC).toString());

        messagingTemplate.convertAndSend("/topic/container/" + containerId, (Object) payload);
    }

    @Override
    public void notifyDashboardEvent(DashboardEventDTO event) {
        messagingTemplate.convertAndSend("/topic/dashboard", (Object) event);
    }
}
