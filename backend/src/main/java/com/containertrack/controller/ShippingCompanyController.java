package com.containertrack.controller;

import com.containertrack.dto.request.CreateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.ShippingCompanyDTO;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.ShippingCompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shipping-companies")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
public class ShippingCompanyController {

    private final ShippingCompanyService shippingCompanyService;

    @GetMapping
    public ResponseEntity<Page<ShippingCompanyDTO>> list(
            @RequestParam(defaultValue = "false") boolean includeInactive,
            Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean effectiveIncludeInactive = includeInactive && principal.getRole() == com.containertrack.entity.Role.ADMIN;
        return ResponseEntity.ok(shippingCompanyService.list(effectiveIncludeInactive, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShippingCompanyDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(shippingCompanyService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ShippingCompanyDTO> create(@Valid @RequestBody CreateShippingCompanyRequest request,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(shippingCompanyService.create(request, principal.getId()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ShippingCompanyDTO> update(@PathVariable Long id, @RequestBody UpdateShippingCompanyRequest request,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(shippingCompanyService.update(id, request, principal.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ShippingCompanyDTO> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request,
                                                             @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(shippingCompanyService.updateStatus(id, request, principal.getId()));
    }
}
