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
public class PhotoDTO {
    private Long photoId;
    private String r2Key;
    private String presignedUrl;
    private String originalFilename;
    private Boolean isValid;
    private OffsetDateTime uploadedAt;
}
