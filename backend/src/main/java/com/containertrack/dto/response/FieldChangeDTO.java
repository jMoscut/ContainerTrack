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
public class FieldChangeDTO {
    private String type; // "FIELD_CHANGE" or "STATUS_CHANGE"
    private String fieldName;
    private String oldValue;
    private String newValue;
    private Long updatedById;
    private String updatedByName;
    private OffsetDateTime updatedAt;
}
