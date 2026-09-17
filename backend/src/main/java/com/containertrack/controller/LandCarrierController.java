package com.containertrack.controller;

import com.containertrack.dto.request.CreateLandCarrierRequest;
import com.containertrack.dto.request.UpdateLandCarrierRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.LandCarrierDTO;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.LandCarrierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/land-carriers")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class LandCarrierController {

    private final LandCarrierService landCarrierService;

    // Every role reads the carrier list (needed for the container form's optional
    // "transporte terrestre" field). Mutating endpoints below stay ADMIN-only.
    @GetMapping
    public ResponseEntity<Page<LandCarrierDTO>> list(
            @RequestParam(defaultValue = "false") boolean includeInactive,
            Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean effectiveIncludeInactive = includeInactive && principal.getRole() == com.containertrack.entity.Role.ADMIN;
        return ResponseEntity.ok(landCarrierService.list(effectiveIncludeInactive, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LandCarrierDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(landCarrierService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LandCarrierDTO> create(@Valid @RequestBody CreateLandCarrierRequest request,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(landCarrierService.create(request, principal.getId()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LandCarrierDTO> update(@PathVariable Long id, @RequestBody UpdateLandCarrierRequest request,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(landCarrierService.update(id, request, principal.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LandCarrierDTO> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request,
                                                         @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(landCarrierService.updateStatus(id, request, principal.getId()));
    }
}
