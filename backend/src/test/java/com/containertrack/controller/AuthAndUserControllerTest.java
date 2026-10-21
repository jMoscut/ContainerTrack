package com.containertrack.controller;

import com.containertrack.dto.request.ChangePasswordRequest;
import com.containertrack.dto.request.CreateUserRequest;
import com.containertrack.dto.request.LoginRequest;
import com.containertrack.dto.request.RefreshTokenRequest;
import com.containertrack.dto.request.ResetUserPasswordRequest;
import com.containertrack.dto.request.UpdateUserRequest;
import com.containertrack.dto.request.UpdateUserStatusRequest;
import com.containertrack.dto.response.AccessTokenResponse;
import com.containertrack.dto.response.LoginResponse;
import com.containertrack.dto.response.UserDTO;
import com.containertrack.dto.response.UserSummaryDTO;
import com.containertrack.entity.User;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.AuthService;
import com.containertrack.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthAndUserControllerTest {

    @Mock
    private AuthService authService;
    @Mock
    private UserService userService;

    private UserPrincipal principalWithId(long id) {
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(id);
        return principal;
    }

    // --- AuthController ----------------------------------------------------

    @Test
    void login_delegatesToService() {
        AuthController controller = new AuthController(authService);
        LoginRequest request = new LoginRequest();
        LoginResponse response = LoginResponse.builder().build();
        when(authService.login(request)).thenReturn(response);

        assertEquals(response, controller.login(request).getBody());
    }

    @Test
    void refresh_delegatesTheTokenValueToService() {
        AuthController controller = new AuthController(authService);
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("the-refresh-token");
        AccessTokenResponse response = AccessTokenResponse.builder().build();
        when(authService.refresh("the-refresh-token")).thenReturn(response);

        assertEquals(response, controller.refresh(request).getBody());
    }

    @Test
    void logout_delegatesThePrincipalIdAndReturnsNoContent() {
        AuthController controller = new AuthController(authService);

        var response = controller.logout(principalWithId(5L));

        verify(authService).logout(5L);
        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void changePassword_delegatesToServiceAndReturnsNoContent() {
        AuthController controller = new AuthController(authService);
        ChangePasswordRequest request = new ChangePasswordRequest();

        var response = controller.changePassword(principalWithId(5L), request);

        verify(authService).changePassword(5L, request);
        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void me_summarizesTheWrappedUser() {
        AuthController controller = new AuthController(authService);
        User user = User.builder().id(5L).build();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getUser()).thenReturn(user);
        UserSummaryDTO summary = UserSummaryDTO.builder().id(5L).build();
        when(authService.toSummary(user)).thenReturn(summary);

        assertEquals(summary, controller.me(principal).getBody());
    }

    // --- UserController ------------------------------------------------------

    @Test
    void list_delegatesToService() {
        UserController controller = new UserController(userService);
        Page<UserDTO> page = new PageImpl<>(java.util.List.of());
        when(userService.list(any(Pageable.class))).thenReturn(page);

        assertEquals(page, controller.list(Pageable.unpaged()).getBody());
    }

    @Test
    void listActive_delegatesToService() {
        UserController controller = new UserController(userService);
        when(userService.listActiveOptions()).thenReturn(java.util.List.of());

        assertEquals(java.util.List.of(), controller.listActive().getBody());
    }

    @Test
    void get_delegatesToService() {
        UserController controller = new UserController(userService);
        UserDTO dto = UserDTO.builder().id(1L).build();
        when(userService.get(1L)).thenReturn(dto);

        assertEquals(dto, controller.get(1L).getBody());
    }

    @Test
    void create_passesThePerformingUserId() {
        UserController controller = new UserController(userService);
        CreateUserRequest request = new CreateUserRequest();
        UserDTO dto = UserDTO.builder().id(1L).build();
        when(userService.create(request, 9L)).thenReturn(dto);

        assertEquals(dto, controller.create(request, principalWithId(9L)).getBody());
    }

    @Test
    void update_delegatesToService() {
        UserController controller = new UserController(userService);
        UpdateUserRequest request = new UpdateUserRequest();
        UserDTO dto = UserDTO.builder().id(1L).build();
        when(userService.update(1L, request, 9L)).thenReturn(dto);

        assertEquals(dto, controller.update(1L, request, principalWithId(9L)).getBody());
    }

    @Test
    void resetPassword_delegatesToService() {
        UserController controller = new UserController(userService);
        ResetUserPasswordRequest request = new ResetUserPasswordRequest();
        UserDTO dto = UserDTO.builder().id(1L).build();
        when(userService.resetPassword(1L, request, 9L)).thenReturn(dto);

        assertEquals(dto, controller.resetPassword(1L, request, principalWithId(9L)).getBody());
    }

    @Test
    void updateStatus_delegatesToService() {
        UserController controller = new UserController(userService);
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        UserDTO dto = UserDTO.builder().id(1L).build();
        when(userService.updateStatus(1L, request, 9L)).thenReturn(dto);

        assertEquals(dto, controller.updateStatus(1L, request, principalWithId(9L)).getBody());
    }

    @Test
    void resendActivation_delegatesToServiceAndReturnsNoContent() {
        UserController controller = new UserController(userService);

        var response = controller.resendActivation(1L, principalWithId(9L));

        verify(userService).resendActivation(1L, 9L);
        assertEquals(204, response.getStatusCode().value());
    }
}
