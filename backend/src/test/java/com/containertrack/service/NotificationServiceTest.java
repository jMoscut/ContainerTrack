package com.containertrack.service;

import com.containertrack.entity.Container;
import com.containertrack.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

/**
 * NotificationService is mostly a thin wrapper over EmailService (I/O), but two things
 * are worth locking down with pure-logic unit tests: (1) the try/catch containment around
 * each send* method — a failed email must never propagate and break the caller's transaction
 * (e.g. a container edit shouldn't fail just because Mailpit is down), and (2) the correct
 * template name / variable map is built per notification type.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private EmailService emailService;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(emailService);
        ReflectionTestUtils.setField(notificationService, "frontendUrl", "https://app.containertrack.test");
    }

    @Test
    void sendActivationEmailDoesNotPropagateWhenEmailServiceFails() {
        User user = User.builder().id(1L).fullName("Jane").email("jane@example.com")
                .activationToken("tok-123").build();
        doThrow(new RuntimeException("SMTP down")).when(emailService)
                .sendTemplateEmail(anyString(), anyString(), anyString(), anyMap());

        assertDoesNotThrow(() -> notificationService.sendActivationEmail(user, "TempPass1!"));
    }

    @Test
    void sendReactivationEmailUsesReactivationTemplateWithExpectedVars() {
        User user = User.builder().id(2L).fullName("Bob").email("bob@example.com").build();

        notificationService.sendReactivationEmail(user, "NewTemp9!");

        ArgumentCaptor<Map<String, Object>> varsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplateEmail(eq("bob@example.com"), anyString(), eq("reactivation"), varsCaptor.capture());

        Map<String, Object> vars = varsCaptor.getValue();
        assertEquals("Bob", vars.get("fullName"));
        assertEquals("bob@example.com", vars.get("email"));
        assertEquals("NewTemp9!", vars.get("temporaryPassword"));
        assertEquals("https://app.containertrack.test/login", vars.get("loginUrl"));
    }

    @Test
    void sendDischargeConfirmationEmailIncludesContainerNumberInSubject() {
        Container container = Container.builder().id(1L).containerNumber("MSKU1234565").build();
        User performer = User.builder().id(3L).fullName("Carla").email("carla@example.com").build();

        notificationService.sendDischargeConfirmationEmail(container, performer, "recipient@example.com");

        ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendTemplateEmail(eq("recipient@example.com"), subjectCaptor.capture(),
                eq("discharge-confirmation"), anyMap());
        assertEquals("[ContainerTrack] Contenedor MSKU1234565 descargado", subjectCaptor.getValue());
    }

    @Test
    void sendEditConfirmationEmailDoesNotPropagateWhenEmailServiceFails() {
        Container container = Container.builder().id(1L).containerNumber("MSKU1234565").build();
        User editor = User.builder().id(4L).fullName("Dana").email("dana@example.com").build();
        doThrow(new RuntimeException("SMTP down")).when(emailService)
                .sendTemplateEmail(anyString(), anyString(), anyString(), anyMap());

        assertDoesNotThrow(() -> notificationService.sendEditConfirmationEmail(container, List.of("originPort"), editor));
    }
}
