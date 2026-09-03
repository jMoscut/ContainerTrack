package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortDTO {
    private Long id;
    private String name;
    private String country;
    private Boolean isGuatemalan;
    private Boolean isActive;
}
