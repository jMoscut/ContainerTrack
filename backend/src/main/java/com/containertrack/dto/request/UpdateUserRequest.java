package com.containertrack.dto.request;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String fullName;
    private com.containertrack.entity.Role role;
}
