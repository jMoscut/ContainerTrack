package com.containertrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetUserPasswordRequest {
    @NotBlank
    private String temporaryPassword;
}
