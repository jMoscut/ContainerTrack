package com.containertrack.service;

import com.containertrack.dto.response.DashboardEventDTO;

import java.util.List;

/**
 * Publishes real-time container update events (e.g. over WebSocket/STOMP).
 * A no-op default implementation is provided so the app compiles/runs standalone;
 * the WebSocket phase provides the real SimpMessagingTemplate-backed bean.
 */
public interface ContainerRealtimeNotifier {
    void notifyContainerUpdated(Long containerId, List<String> changedFields, String editorName);

    /** Broadcasts a summary event to the dashboard-wide channel (/topic/dashboard). */
    void notifyDashboardEvent(DashboardEventDTO event);
}
