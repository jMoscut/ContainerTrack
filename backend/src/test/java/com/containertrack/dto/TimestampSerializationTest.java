package com.containertrack.dto;

import com.containertrack.dto.response.ContainerDTO;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Confirms timestamp fields serialize as ISO-8601 UTC with a "Z" suffix (RN: never local time,
 * always UTC).
 *
 * <p>Spring Boot 4 (this project's version) uses Jackson 3 ({@code tools.jackson.*}) as its HTTP
 * message converter, not the older Jackson 2 ({@code com.fasterxml.jackson.*}, only present here
 * transitively via jjwt-jackson for JWT signing). Jackson 3's jackson-databind bundles java.time
 * (JSR-310) support directly -- no separate jackson-datatype-jsr310 module is needed or present,
 * unlike Jackson 2. This test uses {@link JsonMapper}, matching what Spring Boot actually wires
 * up for REST responses. In Jackson 3, the WRITE_DATES_AS_TIMESTAMPS toggle lives on
 * {@link DateTimeFeature} (not SerializationFeature as in Jackson 2) and is disabled by default,
 * matching Spring Boot's default of spring.jackson.serialization.write-dates-as-timestamps=false
 * -- dates serialize as ISO-8601 strings instead of numeric epoch arrays.
 */
class TimestampSerializationTest {

    private static final Pattern ISO_8601_UTC = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$");

    @Test
    void offsetDateTimeFieldSerializesAsIso8601Utc() {
        JsonMapper mapper = JsonMapper.builder()
                .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();

        ContainerDTO dto = ContainerDTO.builder()
                .id(1L)
                .containerNumber("CSQU3054383")
                .lastUpdatedAt(OffsetDateTime.of(2024, 11, 15, 14, 30, 0, 0, ZoneOffset.UTC))
                .build();

        String json = mapper.writeValueAsString(dto);
        String lastUpdatedAtValue = extractField(json, "lastUpdatedAt");

        assertTrue(ISO_8601_UTC.matcher(lastUpdatedAtValue).matches(),
                "Expected ISO-8601 UTC (Z-suffixed) timestamp but got: " + lastUpdatedAtValue);
    }

    private String extractField(String json, String fieldName) {
        var m = Pattern.compile("\"" + fieldName + "\":\"([^\"]+)\"").matcher(json);
        assertTrue(m.find(), "Field " + fieldName + " not found in JSON: " + json);
        return m.group(1);
    }
}
