package com.containertrack.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    /**
     * Renders a Thymeleaf template under templates/email/{template}.html and sends it.
     * Throws RuntimeException on failure so callers can track retries; callers that don't
     * care about delivery failures (e.g. user creation) should wrap this call in try/catch.
     */
    public void sendTemplateEmail(String to, String subject, String template, Map<String, Object> vars) {
        try {
            Context context = new Context();
            context.setVariables(vars);
            String html = templateEngine.process("email/" + template, context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException | RuntimeException e) {
            log.warn("Failed to send email to {} with template {}: {}", to, template, e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
