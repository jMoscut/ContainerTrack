package com.containertrack.security;

import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserPrincipalTest {

    private User baseUser() {
        return User.builder()
                .id(1L)
                .email("jane@example.com")
                .passwordHash("hash")
                .fullName("Jane Doe")
                .role(Role.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();
    }

    @Test
    void delegatesBasicFieldsToTheWrappedUser() {
        UserPrincipal principal = new UserPrincipal(baseUser());

        assertEquals(1L, principal.getId());
        assertEquals("Jane Doe", principal.getFullName());
        assertEquals(Role.ADMIN, principal.getRole());
        assertEquals("jane@example.com", principal.getUsername());
        assertEquals("hash", principal.getPassword());
    }

    @Test
    void getAuthorities_prefixesTheRoleWithRole_() {
        UserPrincipal principal = new UserPrincipal(baseUser());

        assertEquals("ROLE_ADMIN", principal.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void accountFlags_defaultToUnexpiredAndCredentialsValid() {
        UserPrincipal principal = new UserPrincipal(baseUser());

        assertTrue(principal.isAccountNonExpired());
        assertTrue(principal.isCredentialsNonExpired());
    }

    @Test
    void isAccountNonLocked_trueWhenLockedUntilIsNull() {
        UserPrincipal principal = new UserPrincipal(baseUser());

        assertTrue(principal.isAccountNonLocked());
    }

    @Test
    void isAccountNonLocked_falseWhileStillWithinTheLockWindow() {
        User locked = baseUser();
        locked.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10));

        assertFalse(new UserPrincipal(locked).isAccountNonLocked());
    }

    @Test
    void isAccountNonLocked_trueOnceTheLockWindowHasPassed() {
        User expiredLock = baseUser();
        expiredLock.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));

        assertTrue(new UserPrincipal(expiredLock).isAccountNonLocked());
    }

    @Test
    void isEnabled_falseOnlyForInactiveStatus() {
        User inactive = baseUser();
        inactive.setStatus(UserStatus.INACTIVE);

        assertFalse(new UserPrincipal(inactive).isEnabled());
        assertTrue(new UserPrincipal(baseUser()).isEnabled());
    }
}
