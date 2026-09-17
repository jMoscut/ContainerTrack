package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandCarrierDTO {
    private Long id;
    private String name;
    private String plateNumber;
    private String phone;
    private String company;
    private String notes;
    private Boolean isActive;
}
