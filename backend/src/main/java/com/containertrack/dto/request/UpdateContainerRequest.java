package com.containertrack.dto.request;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * Partial update DTO for CU-12: only non-null fields are treated as "sent" and compared
 * against the current entity state. shippingCompanyId, originPort, destinationPort,
 * cargoDescription, responsibleOperatorId, estimatedDepartureDate, internalNotes are editable
 * descriptive fields per RN-EDIT-01; state-transition dates are handled via /transition.
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
    private String internalNotes;
    private Integer version;
}
