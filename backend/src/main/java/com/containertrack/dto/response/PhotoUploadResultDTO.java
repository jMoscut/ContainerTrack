package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoUploadResultDTO {
    private List<PhotoDTO> uploaded;
    private List<String> failedFilenames;
}
