package com.containertrack.service;

import com.containertrack.dto.request.LoginRequest;
import com.containertrack.dto.response.LoginResponse;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import com.containertrack.exception.ApiException;
import com.containertrack.repository.UserRepository;
import com.containertrack.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuditService auditService;

    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService, auditService);

        activeUser = User.builder()
                .id(1L)
                .email("operator@containertrack.com")
                .passwordHash("hashed-password")
                .fullName("Test Operator")
                .role(com.containertrack.entity.Role.OPERATOR)
                .status(UserStatus.ACTIVE)
                .failedLoginAttempts(0)
                .mustChangePassword(false)
                .build();
    }

    private LoginRequest loginRequest(String email, String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    @Test
    void loginWithCorrectCredentialsReturnsTokens() {
        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("correct-password", activeUser.getPasswordHash())).thenReturn(true);
        when(jwtService.generateAccessToken(activeUser)).thenReturn("access-token-123");
        when(jwtService.generateRefreshToken()).thenReturn("refresh-token-456");
        lenient().when(jwtService.getRefreshExpirationMs()).thenReturn(3600000L);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        LoginResponse response = authService.login(loginRequest(activeUser.getEmail(), "correct-password"));

        assertNotNull(response);
        assertNotNull(response.getAccessToken());
        assertFalse(response.getAccessToken().isEmpty());
        assertEquals("access-token-123", response.getAccessToken());
        assertEquals("refresh-token-456", response.getRefreshToken());
        assertNotNull(response.getUser());
        assertEquals(activeUser.getEmail(), response.getUser().getEmail());
    }

    @Test
    void loginWithWrongPasswordThrowsApiExceptionWithInvalidCredentialsCode() {
        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong-password", activeUser.getPasswordHash())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(loginRequest(activeUser.getEmail(), "wrong-password")));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("INVALID_CREDENTIALS", ex.getCode());
    }

    @Test
    void fifthConsecutiveFailedLoginLocksAccount() {
        activeUser.setFailedLoginAttempts(4);
        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong-password", activeUser.getPasswordHash())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThrows(ApiException.class,
                () -> authService.login(loginRequest(activeUser.getEmail(), "wrong-password")));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();

        assertEquals(5, saved.getFailedLoginAttempts());
        assertNotNull(saved.getLockedUntil());
        assertTrue(saved.getLockedUntil().isAfter(OffsetDateTime.now(ZoneOffset.UTC)));
    }

    @Test
    void loginAgainstLockedAccountThrowsAccountLockedException() {
        activeUser.setFailedLoginAttempts(5);
        activeUser.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10));
        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(loginRequest(activeUser.getEmail(), "correct-password")));

        assertEquals(HttpStatus.LOCKED, ex.getStatus());
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void loginWithInactiveUserThrowsAccountInactiveException() {
        activeUser.setStatus(UserStatus.INACTIVE);
        when(userRepository.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(loginRequest(activeUser.getEmail(), "correct-password")));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("ACCOUNT_INACTIVE", ex.getCode());
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void loginWithUnknownEmailThrowsInvalidCredentialsException() {
        when(userRepository.findByEmail("unknown@containertrack.com")).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(loginRequest("unknown@containertrack.com", "any-password")));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("INVALID_CREDENTIALS", ex.getCode());
    }
}
