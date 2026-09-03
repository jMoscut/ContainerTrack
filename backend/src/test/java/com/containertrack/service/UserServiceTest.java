package com.containertrack.service;

import com.containertrack.dto.request.CreateUserRequest;
import com.containertrack.dto.request.UpdateUserStatusRequest;
import com.containertrack.dto.response.UserDTO;
import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.ConflictException;
import com.containertrack.mapper.UserMapper;
import com.containertrack.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserMapper userMapper;
    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock
    private AuditService auditService;
    @Mock
    private NotificationService notificationService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, userMapper, passwordEncoder, auditService, notificationService);
        lenient().when(userMapper.toDto(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return UserDTO.builder().id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
                    .status(u.getStatus() == null ? null : u.getStatus().name())
                    .mustChangePassword(u.getMustChangePassword())
                    .build();
        });
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void creatingUserWithDuplicateEmailThrowsConflict() {
        CreateUserRequest request = new CreateUserRequest();
        request.setFullName("Jane Doe");
        request.setEmail("jane@example.com");
        request.setRole(Role.OPERATOR);

        when(userRepository.existsByEmail("jane@example.com")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> userService.create(request, 1L));

        assertEquals("EMAIL_ALREADY_EXISTS", ex.getCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void reactivatingInactiveUserGeneratesTempPasswordAndForcesPasswordChange() {
        User user = User.builder()
                .id(5L)
                .email("bob@example.com")
                .fullName("Bob")
                .role(Role.OPERATOR)
                .status(UserStatus.INACTIVE)
                .mustChangePassword(false)
                .build();
        when(userRepository.findById(5L)).thenReturn(java.util.Optional.of(user));

        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.ACTIVE);

        UserDTO dto = userService.updateStatus(5L, request, 1L);

        assertEquals("ACTIVE", dto.getStatus());
        assertTrue(dto.getMustChangePassword());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals(UserStatus.ACTIVE, saved.getStatus());
        assertTrue(saved.getMustChangePassword());
        assertNotNull(saved.getPasswordHash());

        verify(notificationService, times(1)).sendReactivationEmail(any(User.class), anyString());
    }

    @Test
    void activatingAlreadyActiveUserDoesNotSendReactivationEmail() {
        User user = User.builder()
                .id(6L).email("amy@example.com").fullName("Amy").role(Role.OPERATOR)
                .status(UserStatus.ACTIVE).mustChangePassword(false)
                .build();
        when(userRepository.findById(6L)).thenReturn(java.util.Optional.of(user));

        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.ACTIVE);

        userService.updateStatus(6L, request, 1L);

        verify(notificationService, never()).sendReactivationEmail(any(), any());
    }

    @Test
    void deactivatingLastActiveAdminIsBlocked() {
        User admin = User.builder()
                .id(1L).email("admin@example.com").fullName("Admin").role(Role.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();
        when(userRepository.findById(1L)).thenReturn(java.util.Optional.of(admin));
        when(userRepository.countByRoleAndStatus(Role.ADMIN, UserStatus.ACTIVE)).thenReturn(1L);

        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.INACTIVE);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> userService.updateStatus(1L, request, 1L));

        assertEquals("LAST_ADMIN", ex.getCode());
        verify(userRepository, never()).save(any());
    }
}
