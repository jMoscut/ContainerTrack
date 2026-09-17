package com.containertrack.dto.request;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String fullName;
    private String email;
    private com.containertrack.entity.Role role;
}
