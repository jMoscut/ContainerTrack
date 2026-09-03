package com.containertrack.service;

import com.containertrack.entity.AuditAction;
import com.containertrack.entity.AuditLog;
import com.containertrack.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditService auditService;

    private MockedStatic<RequestContextHolder> requestContextHolderMock;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditLogRepository);
        requestContextHolderMock = mockStatic(RequestContextHolder.class);
    }

    @AfterEach
    void tearDown() {
        requestContextHolderMock.close();
    }

    @Test
    void logCreatePersistsExpectedFieldsIncludingIpFromXForwardedFor() {
        HttpServletRequest servletRequest = org.mockito.Mockito.mock(HttpServletRequest.class);
        when(servletRequest.getHeader("X-Forwarded-For")).thenReturn("203.0.113.5, 10.0.0.1");
        ServletRequestAttributes attrs = new ServletRequestAttributes(servletRequest);
        requestContextHolderMock.when(RequestContextHolder::currentRequestAttributes).thenReturn(attrs);

        auditService.logCreate("CONTAINER", 42L, 7L);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();

        assertEquals("CONTAINER", saved.getEntityType());
        assertEquals(42L, saved.getEntityId());
        assertEquals(AuditAction.CREATE, saved.getAction());
        assertEquals(7L, saved.getPerformedBy());
        assertEquals("203.0.113.5", saved.getIpAddress());
    }

    @Test
    void logFallsBackToRemoteAddrWhenNoForwardedForHeader() {
        HttpServletRequest servletRequest = org.mockito.Mockito.mock(HttpServletRequest.class);
        when(servletRequest.getHeader("X-Forwarded-For")).thenReturn(null);
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.10");
        ServletRequestAttributes attrs = new ServletRequestAttributes(servletRequest);
        requestContextHolderMock.when(RequestContextHolder::currentRequestAttributes).thenReturn(attrs);

        auditService.logStatusChange("CONTAINER", 1L, "REGISTERED", "DEPARTED_ORIGIN", 1L);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("192.168.1.10", captor.getValue().getIpAddress());
    }

    @Test
    void logDoesNotBlowUpWhenNoRequestContextIsAvailable() {
        // Simulates the scheduler path (NotificationScheduler doesn't touch audit_log today,
        // but the helper must stay safe if a future non-HTTP caller ever logs an audit entry).
        requestContextHolderMock.when(RequestContextHolder::currentRequestAttributes)
                .thenThrow(new IllegalStateException("No thread-bound request found"));

        auditService.logCreate("CONTAINER", 1L, 1L);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertNull(captor.getValue().getIpAddress());
    }

    @Test
    void logFieldChangeIfDiffersReturnsFalseAndDoesNotSaveWhenValuesAreEqual() {
        boolean changed = auditService.logFieldChangeIfDiffers("CONTAINER", 1L, "notes", "same", "same", 1L);

        assertEquals(false, changed);
        verify(auditLogRepository, org.mockito.Mockito.never()).save(any());
    }
}
