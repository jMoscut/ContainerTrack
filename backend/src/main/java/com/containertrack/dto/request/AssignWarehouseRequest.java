package com.containertrack.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignWarehouseRequest {
    @NotNull
    private Long warehouseAssigneeId;
}
