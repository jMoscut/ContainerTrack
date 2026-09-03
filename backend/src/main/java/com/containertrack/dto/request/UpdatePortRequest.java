package com.containertrack.dto.request;

import lombok.Data;

@Data
public class UpdatePortRequest {
    private String name;
    private String country;
    private Boolean isGuatemalan;
}
