package com.containertrack.service;

import com.containertrack.dto.response.DashboardEventDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Default no-op implementation so the app compiles/runs standalone without WebSocket wiring.
 * The WebSocket phase provides a @Primary SimpMessagingTemplate-backed bean that takes precedence.
 */
@Component
@Slf4j
public class NoopContainerRealtimeNotifier implements ContainerRealtimeNotifier {
    @Override
    public void notifyContainerUpdated(Long containerId, List<String> changedFields, String editorName) {
        log.debug("No-op realtime notify for container {} fields={} editor={}", containerId, changedFields, editorName);
    }

    @Override
    public void notifyDashboardEvent(DashboardEventDTO event) {
        log.debug("No-op dashboard notify event={}", event);
    }
}
