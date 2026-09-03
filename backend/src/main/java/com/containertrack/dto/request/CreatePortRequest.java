package com.containertrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePortRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String country;

    private Boolean isGuatemalan;
}
