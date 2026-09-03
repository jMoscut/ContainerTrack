package com.containertrack.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    @NotNull
    private com.containertrack.entity.UserStatus status;
}
