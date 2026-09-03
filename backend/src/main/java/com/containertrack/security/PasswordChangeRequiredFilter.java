package com.containertrack.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Enforces that a user with must_change_password=true can only call
 * /api/auth/change-password or /api/auth/logout until they change their password.
 */
@Component
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String CHANGE_PASSWORD_PATH = "/api/auth/change-password";
    private static final String LOGOUT_PATH = "/api/auth/logout";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String uri = request.getRequestURI();

        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            boolean mustChange = Boolean.TRUE.equals(principal.getUser().getMustChangePassword());
            boolean isExempt = uri.equals(CHANGE_PASSWORD_PATH) || uri.equals(LOGOUT_PATH);
            if (mustChange && !isExempt) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("error", "PASSWORD_CHANGE_REQUIRED");
                objectMapper.writeValue(response.getWriter(), body);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
