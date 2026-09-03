package com.containertrack.dto.request;

import com.containertrack.entity.ContainerStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class TransitionRequest {
    @NotNull
    private ContainerStatus targetStatus;

    // DEPARTED_ORIGIN
    private OffsetDateTime actualDepartureDate;
    private OffsetDateTime estimatedArrivalPort;

    // ARRIVED_PORT
    private OffsetDateTime actualArrivalPort;
    private Integer freeDaysLimitOverride;

    // DEPARTED_PORT
    private OffsetDateTime actualDeparturePort;
    private OffsetDateTime estimatedArrivalWarehouse;

    // ARRIVED_WAREHOUSE
    private OffsetDateTime actualArrivalWarehouse;
}
