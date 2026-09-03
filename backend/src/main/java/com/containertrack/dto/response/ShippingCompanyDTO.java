package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingCompanyDTO {
    private Long id;
    private String name;
    private String shortCode;
    private String country;
    private String contactEmail;
    private String contactPhone;
    private String notes;
    private Integer freeDaysLimit;
    private Boolean isActive;
}
