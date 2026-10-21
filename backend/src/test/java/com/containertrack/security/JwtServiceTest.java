package com.containertrack.security;

import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    // HS256 requires a key of at least 256 bits (32 bytes) — any shorter and Keys.hmacShaKeyFor throws.
    private static final String SECRET = "test-secret-key-at-least-32-bytes-long-for-hs256";

    private JwtService service(long expirationMs) {
        return new JwtService(SECRET, expirationMs, 604_800_000L);
    }

    private User testUser() {
        return User.builder()
                .id(42L)
                .email("jane@example.com")
                .fullName("Jane Doe")
                .role(Role.OPERATOR)
                .build();
    }

    @Test
    void generateAccessToken_canBeParsedBackToTheSameClaims() {
        JwtService jwtService = service(60_000L);
        String token = jwtService.generateAccessToken(testUser());

        var claims = jwtService.parseClaims(token);

        assertEquals("jane@example.com", claims.getSubject());
        assertEquals(42, claims.get("userId", Integer.class));
        assertEquals("jane@example.com", claims.get("email", String.class));
        assertEquals("OPERATOR", claims.get("role", String.class));
    }

    @Test
    void extractEmail_returnsTheTokenSubject() {
        JwtService jwtService = service(60_000L);
        String token = jwtService.generateAccessToken(testUser());

        assertEquals("jane@example.com", jwtService.extractEmail(token));
    }

    @Test
    void isExpired_falseForAFreshToken() {
        JwtService jwtService = service(60_000L);
        String token = jwtService.generateAccessToken(testUser());

        assertFalse(jwtService.isExpired(token));
    }

    @Test
    void isExpired_trueOnceThePastItsExpirationInstant() {
        // Negative expiration puts the `exp` claim in the past the instant it's generated —
        // deterministic, no Thread.sleep() needed to prove expiry handling.
        JwtService jwtService = service(-1_000L);
        String token = jwtService.generateAccessToken(testUser());

        assertTrue(jwtService.isExpired(token));
    }

    @Test
    void parseClaims_rejectsATokenSignedWithADifferentSecret() {
        JwtService signer = service(60_000L);
        String token = signer.generateAccessToken(testUser());

        JwtService verifier = new JwtService("another-totally-different-secret-key-32-bytes!!", 60_000L, 604_800_000L);

        assertThrows(SignatureException.class, () -> verifier.parseClaims(token));
    }

    @Test
    void generateRefreshToken_producesANonEmptyUrlSafeRandomString() {
        JwtService jwtService = service(60_000L);

        String token1 = jwtService.generateRefreshToken();
        String token2 = jwtService.generateRefreshToken();

        assertNotNull(token1);
        assertFalse(token1.isBlank());
        assertTrue(token1.matches("^[A-Za-z0-9_-]+$"), "refresh token should be URL-safe base64");
        assertFalse(token1.equals(token2), "two generated refresh tokens should not collide");
    }

    @Test
    void getRefreshExpirationMs_returnsTheConfiguredValue() {
        JwtService jwtService = service(60_000L);

        assertEquals(604_800_000L, jwtService.getRefreshExpirationMs());
    }
}
