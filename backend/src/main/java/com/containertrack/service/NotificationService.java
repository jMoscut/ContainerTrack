package com.containertrack.service;

import com.containertrack.entity.Container;
import com.containertrack.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final EmailService emailService;

    @Value("${frontend.url}")
    private String frontendUrl;

    public void sendActivationEmail(User user, String temporaryPassword) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("fullName", user.getFullName());
            vars.put("email", user.getEmail());
            vars.put("temporaryPassword", temporaryPassword);
            vars.put("activationToken", user.getActivationToken());
            vars.put("loginUrl", frontendUrl + "/login");
            emailService.sendTemplateEmail(user.getEmail(), "[ContainerTrack] Activación de cuenta", "welcome-activation", vars);
        } catch (Exception e) {
            log.warn("Could not send activation email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    public void sendReactivationEmail(User user, String temporaryPassword) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("fullName", user.getFullName());
            vars.put("email", user.getEmail());
            vars.put("temporaryPassword", temporaryPassword);
            vars.put("loginUrl", frontendUrl + "/login");
            emailService.sendTemplateEmail(user.getEmail(), "[ContainerTrack] Reactivación de cuenta", "reactivation", vars);
        } catch (Exception e) {
            log.warn("Could not send reactivation email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendEditConfirmationEmail(Container container, List<String> changedFields, User editor) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("containerNumber", container.getContainerNumber());
            vars.put("changedFields", changedFields);
            vars.put("editorName", editor.getFullName());
            emailService.sendTemplateEmail(editor.getEmail(),
                    "[ContainerTrack] Confirmación de edición de " + container.getContainerNumber(),
                    "edit-confirmation", vars);
        } catch (Exception e) {
            log.warn("Could not send edit confirmation email for container {}: {}", container.getId(), e.getMessage());
        }
    }

    @Async
    public void sendDischargeConfirmationEmail(Container container, User performedBy, String recipientEmail) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("containerNumber", container.getContainerNumber());
            vars.put("dischargeStartAt", container.getDischargeStartAt());
            vars.put("dischargeEndAt", container.getDischargeEndAt());
            vars.put("performedByName", performedBy.getFullName());
            emailService.sendTemplateEmail(recipientEmail,
                    "[ContainerTrack] Contenedor " + container.getContainerNumber() + " descargado",
                    "discharge-confirmation", vars);
        } catch (Exception e) {
            log.warn("Could not send discharge confirmation email for container {}: {}", container.getId(), e.getMessage());
        }
    }
}
