package com.containertrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateShippingCompanyRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String shortCode;

    private String country;
    private String contactEmail;
    private String contactPhone;
    private String notes;
    private Integer freeDaysLimit;
}
