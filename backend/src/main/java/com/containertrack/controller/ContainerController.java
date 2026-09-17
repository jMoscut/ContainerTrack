package com.containertrack.controller;

import com.containertrack.dto.request.AssignWarehouseRequest;
import com.containertrack.dto.request.CreateContainerRequest;
import com.containertrack.dto.request.TransitionRequest;
import com.containertrack.dto.request.UpdateContainerRequest;
import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.dto.response.FieldChangeDTO;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.ContainerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/containers")
@RequiredArgsConstructor
public class ContainerController {

    private final ContainerService containerService;

    @GetMapping
    public ResponseEntity<Page<ContainerDTO>> list(
            @RequestParam(required = false) ContainerStatus status,
            @RequestParam(required = false) Long shippingCompanyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime dateTo,
            @RequestParam(required = false) Long operatorId,
            Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(containerService.list(status, shippingCompanyId, dateFrom, dateTo, operatorId,
                principal.getRole(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContainerDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(containerService.get(id));
    }

    @PostMapping
    public ResponseEntity<ContainerDTO> create(@Valid @RequestBody CreateContainerRequest request,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(containerService.create(request, principal.getId()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ContainerDTO> update(@PathVariable Long id, @RequestBody UpdateContainerRequest request,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(containerService.update(id, request, principal.getId(), principal.getRole()));
    }

    @PatchMapping("/{id}/assign-warehouse")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ContainerDTO> assignWarehouse(@PathVariable Long id, @Valid @RequestBody AssignWarehouseRequest request,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(containerService.assignWarehouse(id, request.getWarehouseAssigneeId(),
                principal.getId(), principal.getRole()));
    }

    @PostMapping("/{id}/transition")
    public ResponseEntity<ContainerDTO> transition(@PathVariable Long id, @Valid @RequestBody TransitionRequest request,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(containerService.transition(id, request, principal.getId(), principal.getRole()));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<FieldChangeDTO>> history(@PathVariable Long id) {
        return ResponseEntity.ok(containerService.history(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        containerService.delete(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
