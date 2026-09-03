package com.containertrack.dto.request;

import lombok.Data;

@Data
public class UpdateShippingCompanyRequest {
    private String name;
    private String country;
    private String contactEmail;
    private String contactPhone;
    private String notes;
    private Integer freeDaysLimit;
}
