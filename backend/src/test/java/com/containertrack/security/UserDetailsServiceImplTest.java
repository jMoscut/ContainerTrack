package com.containertrack.security;

import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import com.containertrack.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Test
    void loadUserByUsername_returnsAUserPrincipalWrappingTheFoundUser() {
        UserDetailsServiceImpl svc = new UserDetailsServiceImpl(userRepository);
        User user = User.builder()
                .id(1L)
                .email("jane@example.com")
                .passwordHash("hash")
                .fullName("Jane Doe")
                .role(Role.OPERATOR)
                .status(UserStatus.ACTIVE)
                .build();
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));

        var details = svc.loadUserByUsername("jane@example.com");

        assertEquals("jane@example.com", details.getUsername());
        assertEquals("hash", details.getPassword());
    }

    @Test
    void loadUserByUsername_throwsWhenNoUserMatchesTheEmail() {
        UserDetailsServiceImpl svc = new UserDetailsServiceImpl(userRepository);
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> svc.loadUserByUsername("ghost@example.com"));
    }
}
