package com.containertrack.scheduler;

import com.containertrack.entity.*;
import com.containertrack.repository.*;
import com.containertrack.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Runs every 30 minutes; evaluates 6 notification rules over all active containers
 * and sends (or logs/retries) the corresponding emails, with idempotency guaranteed
 * by checking notification_log for an existing SENT row per (container, type, recipient).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private static final int MAX_RETRIES = 3;

    private final ContainerRepository containerRepository;
    private final UserRepository userRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final EmailService emailService;

    @Scheduled(fixedRate = 1800000)
    @Transactional
    public void run() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<Container> activeContainers = containerRepository.findByStatusNot(ContainerStatus.DISCHARGED);

        List<User> allActiveUsers = userRepository.findByStatus(UserStatus.ACTIVE);
        List<User> admins = allActiveUsers.stream().filter(u -> u.getRole() == Role.ADMIN).toList();
        List<User> warehouseUsers = allActiveUsers.stream().filter(u -> u.getRole() == Role.WAREHOUSE).toList();

        for (Container container : activeContainers) {
            User operator = userRepository.findById(container.getResponsibleOperatorId()).orElse(null);

            evaluateWindow(container, container.getEstimatedArrivalPort(), now.plusHours(24), now.plusHours(48),
                    "ARRIVAL_PORT_48H", operatorAndAdmins(operator, admins), "arrival-port");
            evaluateWindow(container, container.getEstimatedArrivalPort(), now, now.plusHours(24),
                    "ARRIVAL_PORT_24H", operatorAndAdmins(operator, admins), "arrival-port");

            evaluateWindow(container, container.getFreeDaysExpiry(), now.plusHours(48), now.plusHours(72),
                    "FREE_DAYS_72H", operatorAndAdmins(operator, admins), "free-days");
            evaluateWindow(container, container.getFreeDaysExpiry(), now, now.plusHours(24),
                    "FREE_DAYS_24H", allActiveUsers, "free-days");

            if (container.getEstimatedArrivalWarehouse() != null) {
                Set<User> warehouseAndOperator = new HashSet<>(warehouseUsers);
                if (operator != null) warehouseAndOperator.add(operator);
                evaluateWindow(container, container.getEstimatedArrivalWarehouse(), now.plusHours(1), now.plusHours(2),
                        "WAREHOUSE_2H", warehouseAndOperator, "warehouse-arrival");
                evaluateWindow(container, container.getEstimatedArrivalWarehouse(), now, now.plusHours(1),
                        "WAREHOUSE_1H", warehouseAndOperator, "warehouse-arrival");
            }
        }
    }

    private Set<User> operatorAndAdmins(User operator, List<User> admins) {
        Set<User> set = new HashSet<>(admins);
        if (operator != null) set.add(operator);
        return set;
    }

    private void evaluateWindow(Container container, OffsetDateTime targetInstant, OffsetDateTime windowStart,
                                 OffsetDateTime windowEnd, String notificationType, Iterable<User> recipients, String template) {
        if (targetInstant == null) return;
        if (targetInstant.isBefore(windowStart) || targetInstant.isAfter(windowEnd)) return;

        for (User recipient : recipients) {
            sendIfNotAlreadySent(container, notificationType, recipient.getEmail(), template, targetInstant);
        }
    }

    private void sendIfNotAlreadySent(Container container, String notificationType, String recipientEmail,
                                       String template, OffsetDateTime targetInstant) {
        boolean alreadySent = notificationLogRepository
                .findFirstByContainerIdAndNotificationTypeAndRecipientEmailAndStatus(
                        container.getId(), notificationType, recipientEmail, NotificationStatus.SENT)
                .isPresent();
        if (alreadySent) {
            return;
        }

        NotificationLog logEntry = NotificationLog.builder()
                .containerId(container.getId())
                .notificationType(notificationType)
                .recipientEmail(recipientEmail)
                .scheduledFor(targetInstant)
                .status(NotificationStatus.PENDING)
                .retryCount(0)
                .build();
        logEntry = notificationLogRepository.save(logEntry);

        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("containerNumber", container.getContainerNumber());
            vars.put("notificationType", notificationType);
            vars.put("targetInstant", targetInstant);
            String subject = buildSubject(container.getContainerNumber(), notificationType);

            emailService.sendTemplateEmail(recipientEmail, subject, template, vars);

            logEntry.setStatus(NotificationStatus.SENT);
            logEntry.setSentAt(OffsetDateTime.now(ZoneOffset.UTC));
            notificationLogRepository.save(logEntry);
        } catch (Exception e) {
            int retries = logEntry.getRetryCount() + 1;
            logEntry.setRetryCount(retries);
            logEntry.setErrorMessage(e.getMessage());
            logEntry.setStatus(retries >= MAX_RETRIES ? NotificationStatus.FAILED : NotificationStatus.PENDING);
            notificationLogRepository.save(logEntry);
            log.warn("Notification send failed (attempt {}) for container {} type {} recipient {}: {}",
                    retries, container.getId(), notificationType, recipientEmail, e.getMessage());
        }
    }

    private String buildSubject(String containerNumber, String notificationType) {
        String timeLabel = switch (notificationType) {
            case "ARRIVAL_PORT_48H", "FREE_DAYS_72H" -> "48-72 horas";
            case "ARRIVAL_PORT_24H", "FREE_DAYS_24H" -> "24 horas";
            case "WAREHOUSE_2H" -> "2 horas";
            case "WAREHOUSE_1H" -> "1 hora";
            default -> "";
        };
        return "[ContainerTrack] Alerta: Arribo de " + containerNumber + " en " + timeLabel;
    }
}
