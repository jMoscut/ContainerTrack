package com.containertrack.dto.request;

import com.containertrack.validation.ContainerNumber;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class CreateContainerRequest {
    @NotBlank
    @ContainerNumber
    private String containerNumber;

    @NotNull
    private Long shippingCompanyId;

    @NotBlank
    private String originPort;

    @NotBlank
    private String destinationPort;

    private String cargoDescription;

    @NotNull
    private Long responsibleOperatorId;

    @NotNull
    @Future
    private OffsetDateTime estimatedDepartureDate;

    private String internalNotes;
}
