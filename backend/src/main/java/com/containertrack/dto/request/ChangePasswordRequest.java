package com.containertrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    private String currentPassword;

    @NotBlank
    private String newPassword;
}
