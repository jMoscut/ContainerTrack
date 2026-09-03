package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Lean projection for populating user-select dropdowns (e.g. "operador responsable")
 *  without exposing email/status to non-ADMIN roles. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserOptionDTO {
    private Long id;
    private String fullName;
    private String role;
}
