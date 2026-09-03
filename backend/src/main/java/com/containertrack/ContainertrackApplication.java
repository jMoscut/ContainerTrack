package com.containertrack;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ContainertrackApplication {

	public static void main(String[] args) {
		// Safety net: force the JVM default timezone to UTC regardless of the host
		// server's configured timezone (Railway, local dev machine, etc). All
		// timestamps are stored/serialized in UTC (ISO-8601 'Z'); Guatemala-time
		// conversion happens only in the frontend presentation layer. This makes
		// any accidental Instant/OffsetDateTime.now() call (without an explicit
		// zone) still resolve to UTC instead of silently picking up server-local
		// time.
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		SpringApplication.run(ContainertrackApplication.class, args);
	}

}
