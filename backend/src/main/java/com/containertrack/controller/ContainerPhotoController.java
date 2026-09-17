package com.containertrack.controller;

import com.containertrack.dto.request.DischargeRequest;
import com.containertrack.dto.request.InvalidatePhotoRequest;
import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.dto.response.PhotoDTO;
import com.containertrack.dto.response.PhotoUploadResultDTO;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.ContainerPhotoService;
import com.containertrack.service.DischargeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/containers/{id}")
@RequiredArgsConstructor
public class ContainerPhotoController {

    private final ContainerPhotoService containerPhotoService;
    private final DischargeService dischargeService;

    @PostMapping(value = "/photos", consumes = "multipart/form-data")
    public ResponseEntity<PhotoUploadResultDTO> uploadPhotos(@PathVariable Long id,
                                                               @RequestParam("files") List<MultipartFile> files,
                                                               @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(containerPhotoService.uploadPhotos(id, files, principal.getId()));
    }

    @GetMapping("/photos")
    public ResponseEntity<List<PhotoDTO>> listPhotos(@PathVariable Long id) {
        return ResponseEntity.ok(containerPhotoService.listPhotos(id));
    }

    @PatchMapping("/photos/{photoId}/invalidate")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE')")
    public ResponseEntity<Void> invalidatePhoto(@PathVariable Long id, @PathVariable Long photoId,
                                                 @Valid @RequestBody InvalidatePhotoRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        containerPhotoService.invalidatePhoto(id, photoId, request.getInvalidationReason(), principal.getId(),
                principal.getRole());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/discharge")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE')")
    public ResponseEntity<ContainerDTO> discharge(@PathVariable Long id, @Valid @RequestBody DischargeRequest request,
                                                    @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(dischargeService.discharge(id, request, principal.getId()));
    }
}
