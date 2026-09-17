package com.containertrack.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "containers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Container {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "container_number", nullable = false, length = 11)
    private String containerNumber;

    @Column(name = "bl_number", nullable = false, length = 50)
    private String blNumber;

    @Column(name = "shipping_company_id", nullable = false)
    private Long shippingCompanyId;

    @Column(name = "land_carrier_id")
    private Long landCarrierId;

    @Column(name = "warehouse_assignee_id")
    private Long warehouseAssigneeId;

    @Column(name = "origin_port", nullable = false)
    private String originPort;

    @Column(name = "destination_port", nullable = false)
    private String destinationPort;

    @Column(name = "cargo_description", length = 500)
    private String cargoDescription;

    @Column(name = "responsible_operator_id", nullable = false)
    private Long responsibleOperatorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ContainerStatus status = ContainerStatus.REGISTERED;

    @Version
    @Column(nullable = false)
    private Integer version;

    @Column(name = "last_updated_by")
    private Long lastUpdatedBy;

    @Column(name = "last_updated_at")
    private OffsetDateTime lastUpdatedAt;

    @Column(name = "estimated_departure_date", nullable = false)
    private OffsetDateTime estimatedDepartureDate;

    @Column(name = "actual_departure_date")
    private OffsetDateTime actualDepartureDate;

    @Column(name = "estimated_arrival_port")
    private OffsetDateTime estimatedArrivalPort;

    @Column(name = "actual_arrival_port")
    private OffsetDateTime actualArrivalPort;

    @Column(name = "free_days_limit", nullable = false)
    @Builder.Default
    private Integer freeDaysLimit = 10;

    @Column(name = "free_days_expiry")
    private OffsetDateTime freeDaysExpiry;

    @Column(name = "estimated_departure_port")
    private OffsetDateTime estimatedDeparturePort;

    @Column(name = "actual_departure_port")
    private OffsetDateTime actualDeparturePort;

    @Column(name = "estimated_arrival_warehouse")
    private OffsetDateTime estimatedArrivalWarehouse;

    @Column(name = "actual_arrival_warehouse")
    private OffsetDateTime actualArrivalWarehouse;

    @Column(name = "discharge_start_at")
    private OffsetDateTime dischargeStartAt;

    @Column(name = "discharge_end_at")
    private OffsetDateTime dischargeEndAt;

    @Column(name = "discharge_notes", columnDefinition = "TEXT")
    private String dischargeNotes;

    @Column(name = "delay_flag", nullable = false)
    @Builder.Default
    private Boolean delayFlag = false;

    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
