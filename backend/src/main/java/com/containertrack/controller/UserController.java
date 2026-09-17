package com.containertrack.controller;

import com.containertrack.dto.request.CreateUserRequest;
import com.containertrack.dto.request.ResetUserPasswordRequest;
import com.containertrack.dto.request.UpdateUserRequest;
import com.containertrack.dto.request.UpdateUserStatusRequest;
import com.containertrack.dto.response.UserDTO;
import com.containertrack.dto.response.UserOptionDTO;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<UserDTO>> list(Pageable pageable) {
        return ResponseEntity.ok(userService.list(pageable));
    }

    // Any authenticated role may populate a "responsible user" select — overrides
    // the class-level ADMIN restriction for this one lean, non-sensitive endpoint.
    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UserOptionDTO>> listActive() {
        return ResponseEntity.ok(userService.listActiveOptions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(userService.get(id));
    }

    @PostMapping
    public ResponseEntity<UserDTO> create(@Valid @RequestBody CreateUserRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.create(request, principal.getId()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserDTO> update(@PathVariable Long id, @RequestBody UpdateUserRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.update(id, request, principal.getId()));
    }

    @PatchMapping("/{id}/password")
    public ResponseEntity<UserDTO> resetPassword(@PathVariable Long id, @Valid @RequestBody ResetUserPasswordRequest request,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.resetPassword(id, request, principal.getId()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserDTO> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateUserStatusRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.updateStatus(id, request, principal.getId()));
    }

    @PostMapping("/{id}/resend-activation")
    public ResponseEntity<Void> resendActivation(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        userService.resendActivation(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
