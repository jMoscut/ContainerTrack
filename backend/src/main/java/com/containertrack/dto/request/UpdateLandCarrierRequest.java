package com.containertrack.dto.request;

import lombok.Data;

@Data
public class UpdateLandCarrierRequest {
    private String name;
    private String plateNumber;
    private String phone;
    private String company;
    private String notes;
}
