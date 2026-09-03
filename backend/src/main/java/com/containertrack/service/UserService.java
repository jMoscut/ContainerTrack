package com.containertrack.service;

import com.containertrack.dto.request.CreateUserRequest;
import com.containertrack.dto.request.UpdateUserRequest;
import com.containertrack.dto.request.UpdateUserStatusRequest;
import com.containertrack.dto.response.UserDTO;
import com.containertrack.dto.response.UserOptionDTO;
import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.ConflictException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.mapper.UserMapper;
import com.containertrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public Page<UserDTO> list(Pageable pageable) {
        return userRepository.findAll(pageable).map(userMapper::toDto);
    }

    /** Lightweight, role-agnostic listing of active users for select/dropdown use
     *  (e.g. "operador responsable" when registering a container) — any authenticated
     *  role may call this, unlike the full admin user-management listing above. */
    public List<UserOptionDTO> listActiveOptions() {
        return userRepository.findByStatus(UserStatus.ACTIVE).stream()
                .map(u -> UserOptionDTO.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .role(u.getRole().name())
                        .build())
                .toList();
    }

    public UserDTO get(Long id) {
        return userMapper.toDto(findUser(id));
    }

    private User findUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Usuario no encontrado."));
    }

    @Transactional
    public UserDTO create(CreateUserRequest request, Long performedBy) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("EMAIL_ALREADY_EXISTS", "Ya existe un usuario con ese correo electrónico.");
        }

        String tempPassword = generateTempPassword();
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .role(request.getRole())
                .status(UserStatus.PENDING_ACTIVATION)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .mustChangePassword(true)
                .failedLoginAttempts(0)
                .activationToken(UUID.randomUUID().toString())
                .activationTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC).plusHours(48))
                .build();
        user = userRepository.save(user);

        auditService.logCreate("USER", user.getId(), performedBy);
        notificationService.sendActivationEmail(user, tempPassword);

        return userMapper.toDto(user);
    }

    @Transactional
    public UserDTO update(Long id, UpdateUserRequest request, Long performedBy) {
        User user = findUser(id);

        if (request.getFullName() != null && !Objects.equals(request.getFullName(), user.getFullName())) {
            auditService.logFieldChangeIfDiffers("USER", id, "fullName", user.getFullName(), request.getFullName(), performedBy);
            user.setFullName(request.getFullName());
        }
        if (request.getRole() != null && request.getRole() != user.getRole()) {
            auditService.logFieldChangeIfDiffers("USER", id, "role", user.getRole(), request.getRole(), performedBy);
            user.setRole(request.getRole());
        }

        user = userRepository.save(user);
        return userMapper.toDto(user);
    }

    @Transactional
    public UserDTO updateStatus(Long id, UpdateUserStatusRequest request, Long performedBy) {
        User user = findUser(id);
        UserStatus oldStatus = user.getStatus();
        UserStatus newStatus = request.getStatus();

        if (newStatus == UserStatus.INACTIVE && user.getRole() == Role.ADMIN) {
            long activeAdmins = userRepository.countByRoleAndStatus(Role.ADMIN, UserStatus.ACTIVE);
            if (activeAdmins <= 1) {
                throw new BadRequestException("LAST_ADMIN", "No se puede desactivar al último administrador activo.");
            }
        }

        boolean reactivating = oldStatus == UserStatus.INACTIVE && newStatus == UserStatus.ACTIVE;

        user.setStatus(newStatus);
        if (newStatus == UserStatus.INACTIVE) {
            user.setRefreshToken(null);
            user.setRefreshTokenExpiry(null);
        }

        String tempPassword = null;
        if (reactivating) {
            // Mirrors the create() flow: fresh temp password + forced change on next login,
            // but the end state here stays ACTIVE (not PENDING_ACTIVATION).
            tempPassword = generateTempPassword();
            user.setPasswordHash(passwordEncoder.encode(tempPassword));
            user.setMustChangePassword(true);
            user.setActivationToken(UUID.randomUUID().toString());
            user.setActivationTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC).plusHours(48));
        }

        user = userRepository.save(user);

        auditService.logFieldChangeIfDiffers("USER", id, "status", oldStatus, newStatus, performedBy);

        if (reactivating) {
            notificationService.sendReactivationEmail(user, tempPassword);
        }

        return userMapper.toDto(user);
    }

    @Transactional
    public void resendActivation(Long id, Long performedBy) {
        User user = findUser(id);
        String tempPassword = generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setActivationToken(UUID.randomUUID().toString());
        user.setActivationTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC).plusHours(48));
        user.setMustChangePassword(true);
        userRepository.save(user);

        auditService.log("USER", id, com.containertrack.entity.AuditAction.UPDATE, "activation", null, null, performedBy);
        notificationService.sendActivationEmail(user, tempPassword);
    }

    private String generateTempPassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(random.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        // Ensure policy compliance (upper+digit+special) by construction of charset; append guaranteed chars.
        String candidate = sb.toString();
        return candidate + "aA1!";
    }
}
