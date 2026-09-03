package com.containertrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InvalidatePhotoRequest {
    @NotBlank
    private String invalidationReason;
}
