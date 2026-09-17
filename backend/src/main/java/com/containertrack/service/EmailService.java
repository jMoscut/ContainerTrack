package com.containertrack.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Sends transactional email via Brevo's HTTPS API (port 443) instead of SMTP.
 * Railway (and many container PaaS platforms) block outbound SMTP ports
 * (25/465/587) entirely, so a plain HTTPS API call is the only path that works
 * from inside the container.
 */
@Service
@Slf4j
public class EmailService {

    private static final URI BREVO_ENDPOINT = URI.create("https://api.brevo.com/v3/smtp/email");

    private final TemplateEngine templateEngine;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${brevo.api-key}")
    private String apiKey;

    @Value("${brevo.sender-email}")
    private String senderEmail;

    @Value("${brevo.sender-name:ContainerTrack}")
    private String senderName;

    public EmailService(TemplateEngine templateEngine, ObjectMapper objectMapper) {
        this.templateEngine = templateEngine;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

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

            Map<String, Object> payload = Map.of(
                    "sender", Map.of("name", senderName, "email", senderEmail),
                    "to", java.util.List.of(Map.of("email", to)),
                    "subject", subject,
                    "htmlContent", html);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(BREVO_ENDPOINT)
                    .timeout(Duration.ofSeconds(15))
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .header("api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new RuntimeException("Brevo API returned " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            log.warn("Failed to send email to {} with template {}: {}", to, template, e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
