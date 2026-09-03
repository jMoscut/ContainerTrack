package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private String status;
    private Boolean mustChangePassword;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
