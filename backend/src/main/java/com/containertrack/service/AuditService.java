package com.containertrack.service;

import com.containertrack.entity.AuditAction;
import com.containertrack.entity.AuditLog;
import com.containertrack.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(String entityType, Long entityId, AuditAction action, String fieldName,
                     Object oldValue, Object newValue, Long performedBy) {
        AuditLog entry = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .fieldName(fieldName)
                .oldValue(oldValue == null ? null : String.valueOf(oldValue))
                .newValue(newValue == null ? null : String.valueOf(newValue))
                .performedBy(performedBy)
                .ipAddress(extractClientIp())
                .build();
        auditLogRepository.save(entry);
    }

    /**
     * Extracts the caller's IP from the current HTTP request thread, preferring the first
     * hop of X-Forwarded-For (set by reverse proxies like Railway) and falling back to
     * request.getRemoteAddr(). Returns null when there is no request context at all
     * (e.g. if this ever ran from a @Scheduled job rather than an HTTP-triggered action).
     */
    private String extractClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletRequest request = attrs.getRequest();
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        } catch (IllegalStateException e) {
            log.debug("No HTTP request context available for audit IP capture: {}", e.getMessage());
            return null;
        }
    }

    public void logCreate(String entityType, Long entityId, Long performedBy) {
        log(entityType, entityId, AuditAction.CREATE, null, null, null, performedBy);
    }

    public void logStatusChange(String entityType, Long entityId, String oldStatus, String newStatus, Long performedBy) {
        log(entityType, entityId, AuditAction.STATUS_CHANGE, "status", oldStatus, newStatus, performedBy);
    }

    /** Compares two field values and logs an UPDATE entry only if they differ. Returns true if a change was logged. */
    public boolean logFieldChangeIfDiffers(String entityType, Long entityId, String fieldName,
                                            Object oldValue, Object newValue, Long performedBy) {
        if (Objects.equals(oldValue, newValue)) {
            return false;
        }
        log(entityType, entityId, AuditAction.UPDATE, fieldName, oldValue, newValue, performedBy);
        return true;
    }
}
