package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Lightweight event payload broadcast to the dashboard-wide WebSocket channel
 * (/topic/dashboard) whenever a container is created, transitions state, or is discharged —
 * the events that actually move dashboard counters.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardEventDTO {
    private EventType type;
    private Long containerId;
    private String containerNumber;
    private String newStatus;
    private OffsetDateTime timestamp;

    public enum EventType {
        CREATED, STATUS_CHANGED, DISCHARGED
    }
}
