package com.containertrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateLandCarrierRequest {
    @NotBlank
    private String name;

    private String plateNumber;
    private String phone;
    private String company;
    private String notes;
}
