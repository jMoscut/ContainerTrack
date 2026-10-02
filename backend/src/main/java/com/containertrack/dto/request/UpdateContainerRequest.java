package com.containertrack.dto.request;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * Partial update DTO for CU-12: only non-null fields are treated as "sent" and compared
 * against the current entity state. Lifecycle dates (estimated and actual) are normally
 * set via /transition as the container progresses, but can also be corrected here after
 * the fact — e.g. a container registered late, with its whole history already known.
 * Any such correction requires a non-blank dateChangeReason, enforced in the service.
 */
@Data
public class UpdateContainerRequest {
    private String blNumber;
    private Long shippingCompanyId;
    private Long landCarrierId;
    private String originPort;
    private String destinationPort;
    private String cargoDescription;
    private Long responsibleOperatorId;
    private OffsetDateTime estimatedDepartureDate;
    private OffsetDateTime estimatedArrivalPort;
    private OffsetDateTime actualDepartureDate;
    private OffsetDateTime actualArrivalPort;
    private OffsetDateTime actualDeparturePort;
    private OffsetDateTime estimatedArrivalWarehouse;
    private OffsetDateTime actualArrivalWarehouse;
    private Integer freeDaysLimit;
    private OffsetDateTime freeDaysExpiry;
    private String internalNotes;
    /** Required (non-blank) whenever any of the date/free-days fields above are being changed. */
    private String dateChangeReason;
    private Integer version;
}
