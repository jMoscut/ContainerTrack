package com.containertrack.service;

import com.containertrack.dto.request.ChangePasswordRequest;
import com.containertrack.dto.request.LoginRequest;
import com.containertrack.dto.response.AccessTokenResponse;
import com.containertrack.dto.response.LoginResponse;
import com.containertrack.dto.response.UserSummaryDTO;
import com.containertrack.entity.AuditAction;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import com.containertrack.exception.ApiException;
import com.containertrack.exception.BadRequestException;
import com.containertrack.repository.UserRepository;
import com.containertrack.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_MINUTES = 15;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenciales inválidas."));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new ApiException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                    "Cuenta bloqueada hasta " + user.getLockedUntil() + " debido a múltiples intentos fallidos.");
        }

        if (user.getStatus() != UserStatus.ACTIVE && user.getStatus() != UserStatus.PENDING_ACTIVATION) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "La cuenta no está activa.");
        }

        boolean matches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
        if (!matches) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(LOCK_MINUTES));
            }
            userRepository.save(user);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenciales inválidas.");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken();
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC).plus(java.time.Duration.ofMillis(jwtService.getRefreshExpirationMs())));
        userRepository.save(user);

        auditService.log("USER", user.getId(), AuditAction.LOGIN, null, null, null, user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(toSummary(user))
                .build();
    }

    @Transactional
    public AccessTokenResponse refresh(String refreshToken) {
        User user = userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Token de actualización inválido."));

        if (user.getRefreshTokenExpiry() == null || user.getRefreshTokenExpiry().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_EXPIRED", "El token de actualización ha expirado.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        return AccessTokenResponse.builder().accessToken(accessToken).build();
    }

    @Transactional
    public void logout(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Usuario no encontrado."));
        user.setRefreshToken(null);
        user.setRefreshTokenExpiry(null);
        userRepository.save(user);
        auditService.log("USER", user.getId(), AuditAction.LOGOUT, null, null, null, user.getId());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Usuario no encontrado."));

        if (!Boolean.TRUE.equals(user.getMustChangePassword())) {
            if (request.getCurrentPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                throw new BadRequestException("INVALID_CURRENT_PASSWORD", "La contraseña actual es incorrecta.");
            }
        }

        PasswordPolicy.validate(request.getNewPassword());

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        if (user.getStatus() == UserStatus.PENDING_ACTIVATION) {
            user.setStatus(UserStatus.ACTIVE);
        }
        userRepository.save(user);
        auditService.log("USER", user.getId(), AuditAction.UPDATE, "password", null, null, user.getId());
    }

    public UserSummaryDTO toSummary(User user) {
        return UserSummaryDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .mustChangePassword(user.getMustChangePassword())
                .build();
    }
}
