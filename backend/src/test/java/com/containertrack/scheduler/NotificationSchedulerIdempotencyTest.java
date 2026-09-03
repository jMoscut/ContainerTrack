package com.containertrack.scheduler;

import com.containertrack.entity.*;
import com.containertrack.repository.ContainerRepository;
import com.containertrack.repository.NotificationLogRepository;
import com.containertrack.repository.UserRepository;
import com.containertrack.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Verifies RN-NOT-01 idempotency: once a notification_log row exists with status=SENT for a given
 * (container, type, recipient) triple, a second scheduler pass must not resend the email.
 */
@ExtendWith(MockitoExtension.class)
class NotificationSchedulerIdempotencyTest {

    @Mock
    private ContainerRepository containerRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationLogRepository notificationLogRepository;
    @Mock
    private EmailService emailService;

    private NotificationScheduler scheduler;

    private Container container;
    private User operator;
    private User admin;

    // In-memory log store to simulate DB state persisting SENT rows across scheduler runs.
    private final List<NotificationLog> savedLogs = new ArrayList<>();

    @BeforeEach
    void setUp() {
        scheduler = new NotificationScheduler(containerRepository, userRepository, notificationLogRepository, emailService);

        operator = User.builder().id(1L).email("operator@containertrack.gt").fullName("Operador")
                .role(Role.OPERATOR).status(UserStatus.ACTIVE).build();
        admin = User.builder().id(2L).email("admin@containertrack.gt").fullName("Admin")
                .role(Role.ADMIN).status(UserStatus.ACTIVE).build();

        container = Container.builder()
                .id(100L)
                .containerNumber("MSCU1234565")
                .status(ContainerStatus.ARRIVED_PORT)
                .responsibleOperatorId(operator.getId())
                .estimatedArrivalPort(OffsetDateTime.now().plusHours(12)) // falls in [now, now+24h] -> ARRIVAL_PORT_24H
                .estimatedDepartureDate(OffsetDateTime.now().minusDays(5))
                .build();

        when(containerRepository.findByStatusNot(ContainerStatus.DISCHARGED)).thenReturn(List.of(container));
        when(userRepository.findByStatus(UserStatus.ACTIVE)).thenReturn(List.of(operator, admin));
        when(userRepository.findById(operator.getId())).thenReturn(Optional.of(operator));

        // Simulate notification_log persistence + idempotency lookup.
        when(notificationLogRepository.save(any(NotificationLog.class))).thenAnswer(inv -> {
            NotificationLog log = inv.getArgument(0);
            if (log.getId() == null) {
                log.setId((long) (savedLogs.size() + 1));
            }
            savedLogs.removeIf(l -> l.getId().equals(log.getId()));
            savedLogs.add(log);
            return log;
        });
        when(notificationLogRepository.findFirstByContainerIdAndNotificationTypeAndRecipientEmailAndStatus(
                anyLong(), anyString(), anyString(), eq(NotificationStatus.SENT)))
                .thenAnswer(inv -> savedLogs.stream()
                        .filter(l -> l.getContainerId().equals(inv.getArgument(0))
                                && l.getNotificationType().equals(inv.getArgument(1))
                                && l.getRecipientEmail().equals(inv.getArgument(2))
                                && l.getStatus() == NotificationStatus.SENT)
                        .findFirst());
    }

    @Test
    void secondSchedulerPassDoesNotResendAlreadySentNotification() {
        // First pass: should send.
        scheduler.run();
        verify(emailService, atLeastOnce()).sendTemplateEmail(eq(operator.getEmail()), anyString(), anyString(), anyMap());

        int firstPassSendCount = mockingDetails(emailService).getInvocations().size();
        reset(emailService);
        // reset() clears interaction history but we still need the stub on notificationLogRepository intact (Mockito objects unaffected).

        // Second pass over the same container/window: notification_log now has a SENT row, so no resend.
        scheduler.run();
        verify(emailService, never()).sendTemplateEmail(eq(operator.getEmail()), anyString(), eq("arrival-port"), anyMap());
    }
}
