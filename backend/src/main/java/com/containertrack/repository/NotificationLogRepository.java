package com.containertrack.repository;

import com.containertrack.entity.NotificationLog;
import com.containertrack.entity.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {
    Optional<NotificationLog> findFirstByContainerIdAndNotificationTypeAndRecipientEmailAndStatus(
            Long containerId, String notificationType, String recipientEmail, NotificationStatus status);
}
