package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContainerDTO {
    private Long id;
    private String containerNumber;
    private String blNumber;
    private Long shippingCompanyId;
    private String shippingCompanyName;
    private Long landCarrierId;
    private String landCarrierName;
    private Long warehouseAssigneeId;
    private String warehouseAssigneeName;
    private String originPort;
    private String destinationPort;
    private String cargoDescription;
    private Long responsibleOperatorId;
    private String responsibleOperatorName;
    private String status;
    private Integer version;
    private Long lastUpdatedBy;
    private String lastUpdatedByName;
    private OffsetDateTime lastUpdatedAt;

    private OffsetDateTime estimatedDepartureDate;
    private OffsetDateTime actualDepartureDate;

    private OffsetDateTime estimatedArrivalPort;
    private OffsetDateTime actualArrivalPort;
    private Integer freeDaysLimit;
    private OffsetDateTime freeDaysExpiry;

    private OffsetDateTime estimatedDeparturePort;
    private OffsetDateTime actualDeparturePort;

    private OffsetDateTime estimatedArrivalWarehouse;
    private OffsetDateTime actualArrivalWarehouse;

    private OffsetDateTime dischargeStartAt;
    private OffsetDateTime dischargeEndAt;
    private String dischargeNotes;

    private Boolean delayFlag;
    private String internalNotes;

    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    private Integer photoCount;
}
