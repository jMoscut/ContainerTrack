package com.containertrack.dto.request;

import com.containertrack.validation.ContainerNumber;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class CreateContainerRequest {
    @NotBlank
    @ContainerNumber
    private String containerNumber;

    @NotBlank
    private String blNumber;

    @NotNull
    private Long shippingCompanyId;

    // Optional at creation — must be set once the container reaches port (RN nueva).
    private Long landCarrierId;

    @NotBlank
    private String originPort;

    @NotBlank
    private String destinationPort;

    private String cargoDescription;

    @NotNull
    private Long responsibleOperatorId;

    // No @Future/@FutureOrPresent here on purpose: this field is date-only in the UI
    // (no time component) and the frontend sends Guatemala-local midnight for the chosen
    // day. An instant-level Future check would reject "today" for the rest of the day,
    // every day, since that midnight instant has already passed. The real "not in the
    // past" rule is enforced calendar-date-wise (Guatemala time) in ContainerService.
    @NotNull
    private OffsetDateTime estimatedDepartureDate;

    private String internalNotes;
}
