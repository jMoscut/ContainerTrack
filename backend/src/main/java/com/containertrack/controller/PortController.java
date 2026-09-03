package com.containertrack.controller;

import com.containertrack.dto.request.CreatePortRequest;
import com.containertrack.dto.request.UpdatePortRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.PortDTO;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.PortService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ports")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class PortController {

    private final PortService portService;

    @GetMapping
    public ResponseEntity<Page<PortDTO>> list(
            @RequestParam(defaultValue = "false") boolean includeInactive,
            Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean effectiveIncludeInactive = includeInactive && principal.getRole() == com.containertrack.entity.Role.ADMIN;
        return ResponseEntity.ok(portService.list(effectiveIncludeInactive, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PortDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(portService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PortDTO> create(@Valid @RequestBody CreatePortRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(portService.create(request, principal.getId()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PortDTO> update(@PathVariable Long id, @RequestBody UpdatePortRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(portService.update(id, request, principal.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PortDTO> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(portService.updateStatus(id, request, principal.getId()));
    }
}
