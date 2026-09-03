package com.containertrack.controller;

import com.containertrack.dto.request.ChangePasswordRequest;
import com.containertrack.dto.request.LoginRequest;
import com.containertrack.dto.request.RefreshTokenRequest;
import com.containertrack.dto.response.AccessTokenResponse;
import com.containertrack.dto.response.LoginResponse;
import com.containertrack.dto.response.UserSummaryDTO;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AccessTokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request.getRefreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.getId(), request);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns the current authenticated user's profile, derived from the SecurityContext.
     * Lets the frontend restore a session after a hard reload using only a valid access token,
     * without re-sending credentials.
     */
    @GetMapping("/me")
    public ResponseEntity<UserSummaryDTO> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.toSummary(principal.getUser()));
    }
}
